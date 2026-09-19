<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Booking\CheckinBookingRequest;
use App\Http\Requests\Booking\PayBookingRequest;
use App\Http\Requests\Booking\StoreBookingRequest;
use App\Models\Booking;
use App\Models\TicketType;
use App\Services\BookingService;
use App\Services\QrCodeApiService;
use App\Services\QrTicketService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Response;

class BookingController extends Controller
{
    public function __construct(
        private readonly BookingService $bookings,
        private readonly QrTicketService $qrTickets,
        private readonly QrCodeApiService $qrCodeApi,
    ) {}

    /**
     * List bookings, scoped by role: customers see only their own,
     * organisers see only bookings for events they own, admins see all.
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Booking::class);

        // Anyone looking at their bookings sees holds that have run out already released.
        $this->bookings->releaseExpired();

        $user = $request->user();

        $bookings = Booking::query()
            ->with([
                'customer:id,name,email',
                'ticketType:id,event_id,name,price',
                'ticketType.event:id,title,category,start_at,end_at,venue_id,status,mode,meeting_platform',
                'ticketType.event.venue:id,name',
                'seat:id,row_label,number',
                'payment',
            ])
            ->when($user->role === 'customer', fn ($query) => $query->where('customer_id', $user->id))
            ->when($user->role === 'organiser', fn ($query) => $query->whereHas(
                'ticketType.event',
                fn ($query) => $query->where('organiser_id', $user->id)
            ))
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->string('status')))
            ->when($request->filled('event_id'), fn ($query) => $query->whereHas(
                'ticketType',
                fn ($query) => $query->where('event_id', $request->integer('event_id'))
            ))
            ->orderByDesc('booked_at')
            ->paginate($request->integer('per_page', 15));

        $this->withWaitlistPositions($bookings->getCollection());

        return response()->json($bookings);
    }

    /**
     * A guest joins their online meeting. Only the booking's own customer, only while it is confirmed
     * and only once the meeting is open; the click counts as attending, and the link comes back here and nowhere else.
     */
    public function join(Request $request, Booking $booking): JsonResponse
    {
        abort_unless($booking->customer_id === $request->user()->id, 403, 'This is not your booking.');

        $meeting = $booking->meeting;
        abort_if($meeting === null, 422, 'This booking has no online meeting to join.');
        abort_unless($meeting['open'], 422, 'The meeting opens '.config('sentrypass.meeting_open_minutes').' minutes before it starts.');

        $event = $booking->ticketType->event;
        abort_if(blank($event->getRawOriginal('meeting_url')), 422, 'The organiser has not added a meeting link yet.');

        if ($booking->status === 'confirmed') {
            $booking->update(['status' => 'attended', 'checked_in_at' => now()]);
        }

        return response()->json(['meeting_url' => $event->getRawOriginal('meeting_url'), 'platform' => $event->meeting_platform]);
    }

    /**
     * The same numbers as withWaitlistPosition, for a whole page of bookings with one query
     * instead of one query for every waitlisted row.
     *
     * @param  \Illuminate\Support\Collection<int, Booking>  $bookings
     */
    private function withWaitlistPositions($bookings): void
    {
        $waiting = $bookings->where('status', 'waitlisted');

        if ($waiting->isEmpty()) {
            return;
        }

        $ranked = Booking::query()
            ->where('status', 'waitlisted')
            ->whereIn('ticket_type_id', $waiting->pluck('ticket_type_id')->unique())
            ->selectRaw('id, ROW_NUMBER() OVER (PARTITION BY ticket_type_id ORDER BY booked_at, id) AS position');

        $positions = DB::query()->fromSub($ranked, 'ranked')->whereIn('id', $waiting->pluck('id'))->pluck('position', 'id');

        $waiting->each(fn (Booking $booking) => $booking->setAttribute('waitlist_position', (int) $positions[$booking->id]));
    }

    /**
     * Where a waitlisted booking sits in its tier's queue (1 = next to be promoted),
     * using the same booked_at then id order the promotion logic uses.
     */
    private function withWaitlistPosition(Booking $booking): Booking
    {
        if ($booking->status === 'waitlisted') {
            $booking->setAttribute('waitlist_position', Booking::query()
                ->where('ticket_type_id', $booking->ticket_type_id)
                ->where('status', 'waitlisted')
                ->where(fn ($query) => $query
                    ->where('booked_at', '<', $booking->booked_at)
                    ->orWhere(fn ($query) => $query->where('booked_at', $booking->booked_at)->where('id', '<=', $booking->id)))
                ->count());
        }

        return $booking;
    }

    /**
     * Book a seat on a ticket type. Concurrency-safe (spec §5.1):
     * returns confirmed if a seat was available, waitlisted otherwise.
     */
    public function store(StoreBookingRequest $request): JsonResponse
    {
        $ticketType = TicketType::findOrFail($request->validated('ticket_type_id'));

        $booking = $this->bookings->book($request->user(), $ticketType, $request->validated('seat_id'));

        return response()->json($this->withWaitlistPosition($booking->load('seat', 'payment')), 201);
    }

    /**
     * Show a single booking.
     */
    public function show(Booking $booking): JsonResponse
    {
        $this->authorize('view', $booking);

        $this->bookings->releaseExpired($booking->ticket_type_id);

        return response()->json($this->withWaitlistPosition($booking->fresh()->load('seat', 'payment')));
    }

    /**
     * Cancel a booking, releasing its seat if it held one.
     */
    public function cancel(Booking $booking): JsonResponse
    {
        $this->authorize('cancel', $booking);

        $booking = $this->bookings->cancel($booking);

        return response()->json($booking->load('seat', 'payment'));
    }

    /**
     * Pay for a held booking (sandbox: no real money). Confirms it and issues the signed pass.
     */
    public function pay(PayBookingRequest $request, Booking $booking): JsonResponse
    {
        $paid = $this->bookings->pay($booking, $request->validated('method'), $request->validated('outcome', 'approve'));

        return response()->json($paid->load('seat', 'payment'));
    }

    /**
     * Render the booking's signed ticket as a QR code image, fetched
     * live from the third-party QR Code Generator API (spec §7).
     */
    public function qrCode(Booking $booking): Response
    {
        $this->authorize('view', $booking);

        // A cancelled booking keeps its old token, but its ticket is void, so it gets no QR code.
        if (! $booking->qr_token || ! in_array($booking->status, ['confirmed', 'attended'], true)) {
            abort(404, 'This booking has no confirmed ticket to render a QR code for.');
        }

        $apiResponse = $this->qrCodeApi->fetch($booking);

        return response($apiResponse->body())->header('Content-Type', $apiResponse->header('Content-Type'));
    }

    /**
     * Check a booking in at the venue. Verifies the HMAC signature
     * scanned off the QR code before marking the booking attended
     * (spec §5.2) — rejects tampered/forged tickets with 422.
     */
    public function checkin(CheckinBookingRequest $request, Booking $booking): JsonResponse
    {
        if ($booking->status !== 'confirmed') {
            return response()->json([
                'message' => 'Only confirmed bookings can be checked in.',
            ], 409);
        }

        if (! $this->qrTickets->verify($booking, $request->validated('qr_token'))) {
            return response()->json([
                'message' => 'Invalid or tampered ticket.',
            ], 422);
        }

        $booking->update([
            'status' => 'attended',
            'checked_in_at' => now(),
        ]);

        return response()->json($booking->load('seat'));
    }

    /**
     * Hard-delete a booking. Admin only, rare cleanup use.
     */
    public function destroy(Booking $booking): JsonResponse
    {
        $this->authorize('delete', $booking);

        $booking->delete();

        return response()->json(null, 204);
    }
}
