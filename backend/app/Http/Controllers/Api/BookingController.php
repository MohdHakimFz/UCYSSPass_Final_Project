<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Booking\CheckinBookingRequest;
use App\Http\Requests\Booking\StoreBookingRequest;
use App\Models\Booking;
use App\Models\TicketType;
use App\Services\BookingService;
use App\Services\QrTicketService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BookingController extends Controller
{
    public function __construct(
        private readonly BookingService $bookings,
        private readonly QrTicketService $qrTickets,
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
            ->when($user->role === 'customer', fn ($query) => $query->where('customer_id', $user->id))
            ->when($user->role === 'organiser', fn ($query) => $query->whereHas(
                'ticketType.event',
                fn ($query) => $query->where('organiser_id', $user->id)
            ))
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->string('status')))
            ->orderByDesc('booked_at')
            ->paginate($request->integer('per_page', 15));

        return response()->json($bookings);
    }

    /**
     * Book a seat on a ticket type. Concurrency-safe (spec §5.1):
     * returns confirmed if a seat was available, waitlisted otherwise.
     */
    public function store(StoreBookingRequest $request): JsonResponse
    {
        $ticketType = TicketType::findOrFail($request->validated('ticket_type_id'));

        $booking = $this->bookings->book($request->user(), $ticketType);

        return response()->json($booking, 201);
    }

    /**
     * Show a single booking.
     */
    public function show(Booking $booking): JsonResponse
    {
        $this->authorize('view', $booking);

        return response()->json($booking);
    }

    /**
     * Cancel a booking, releasing its seat if it held one.
     */
    public function cancel(Booking $booking): JsonResponse
    {
        $this->authorize('cancel', $booking);

        $booking = $this->bookings->cancel($booking);

        return response()->json($booking);
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

        return response()->json($booking);
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
