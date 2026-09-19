<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Booking\CheckinBookingRequest;
use App\Http\Requests\Booking\StoreBookingRequest;
use App\Models\Booking;
use App\Models\TicketType;
use App\Services\BookingService;
use App\Services\QrCodeApiService;
use App\Services\QrTicketService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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

        $user = $request->user();

        $bookings = Booking::query()
            ->with([
                'customer:id,name,email',
                'ticketType:id,event_id,name,price',
                'ticketType.event:id,title,category,start_at,end_at,venue_id',
                'ticketType.event.venue:id,name',
                'seat:id,row_label,number',
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

        $bookings->getCollection()->each(fn (Booking $booking) => $this->withWaitlistPosition($booking));

        return response()->json($bookings);
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

        return response()->json($this->withWaitlistPosition($booking->load('seat')), 201);
    }

    /**
     * Show a single booking.
     */
    public function show(Booking $booking): JsonResponse
    {
        $this->authorize('view', $booking);

        return response()->json($this->withWaitlistPosition($booking->load('seat')));
    }

    /**
     * Cancel a booking, releasing its seat if it held one.
     */
    public function cancel(Booking $booking): JsonResponse
    {
        $this->authorize('cancel', $booking);

        $booking = $this->bookings->cancel($booking);

        return response()->json($booking->load('seat'));
    }

    /**
     * Render the booking's signed ticket as a QR code image, fetched
     * live from the third-party QR Code Generator API (spec §7).
     */
    public function qrCode(Booking $booking): Response
    {
        $this->authorize('view', $booking);

        if (! $booking->qr_token) {
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
