<?php

namespace App\Services;

use App\Exceptions\BookingConflictException;
use App\Models\Booking;
use App\Models\Event;
use App\Models\Seat;
use App\Models\TicketType;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class BookingService
{
    /**
     * Active statuses that count against the "one active booking per
     * customer per ticket type" rule from spec §3.
     */
    private const ACTIVE_STATUSES = ['pending', 'confirmed', 'waitlisted'];

    public function __construct(
        private readonly QrTicketService $qrTickets,
        private readonly NotificationService $notifications,
    ) {}

    /**
     * Book a seat on a ticket type, or waitlist the customer if sold out.
     *
     * The seat check + decrement is wrapped in a DB transaction with
     * lockForUpdate() on the ticket_types row (spec §5.1) so two
     * simultaneous requests racing for the last seat can't both see
     * seats_remaining > 0 and both get confirmed.
     */
    public function book(User $customer, TicketType $ticketType, ?int $seatId = null): Booking
    {
        $notificationsToDispatch = [];

        $booking = DB::transaction(function () use ($customer, $ticketType, $seatId, &$notificationsToDispatch) {
            $hasActiveBooking = Booking::where('customer_id', $customer->id)
                ->where('ticket_type_id', $ticketType->id)
                ->whereIn('status', self::ACTIVE_STATUSES)
                ->exists();

            if ($hasActiveBooking) {
                throw new BookingConflictException(
                    'You already have an active booking for this ticket type.'
                );
            }

            $lockedTicketType = TicketType::where('id', $ticketType->id)->lockForUpdate()->first();

            $status = 'waitlisted';
            $seat = null;

            if ($lockedTicketType->seats_remaining > 0) {
                // On a seated event the customer must name the seat they want, and it must still be free.
                // The ticket_types row is locked, so two people asking for the same seat are handled one after the other.
                if ($lockedTicketType->event->seated) {
                    $seat = $this->claimSeat($lockedTicketType, $seatId);
                }

                $lockedTicketType->decrement('seats_remaining');
                $status = 'confirmed';
            }

            $booking = Booking::create([
                'customer_id' => $customer->id,
                'ticket_type_id' => $lockedTicketType->id,
                'seat_id' => $seat?->id,
                'status' => $status,
                'booked_at' => now(),
            ]);

            if ($status === 'confirmed') {
                $booking->update(['qr_token' => $this->qrTickets->generate($booking)]);
                $notificationsToDispatch[] = $this->notifications->record($booking, 'confirmation');
            }

            return $booking;
        });

        // Dispatched after commit: an external HTTP call has no business
        // holding the ticket_types row lock open for its duration.
        foreach ($notificationsToDispatch as $notification) {
            $this->notifications->dispatch($notification);
        }

        return $booking;
    }

    /**
     * Check the seat a customer asked for belongs to this tier and is free.
     */
    private function claimSeat(TicketType $ticketType, ?int $seatId): Seat
    {
        if (! $seatId) {
            throw ValidationException::withMessages(['seat_id' => ['Choose a seat for this ticket.']]);
        }

        $seat = Seat::where('id', $seatId)->where('ticket_type_id', $ticketType->id)->first();

        if (! $seat) {
            throw ValidationException::withMessages(['seat_id' => ['That seat is not part of this ticket type.']]);
        }

        if (Booking::where('seat_id', $seat->id)->exists()) {
            throw new BookingConflictException('That seat was just taken. Pick another one.');
        }

        return $seat;
    }

    /**
     * Cancel a booking (spec §5.4 state machine).
     *
     * If the cancelled booking was holding a seat (confirmed), that
     * seat is immediately handed to the oldest waitlisted booking on
     * the same ticket type instead of being released back to the pool
     * — promoting them to confirmed and notifying them. If nobody is
     * waiting, the seat is released back to seats_remaining. An
     * already-attended booking just releases its seat with no
     * promotion, since the holder already used the ticket.
     */
    public function cancel(Booking $booking): Booking
    {
        $notificationsToDispatch = [];

        $cancelled = DB::transaction(function () use ($booking, &$notificationsToDispatch) {
            $originalStatus = $booking->status;
            $wasHoldingASeat = in_array($originalStatus, ['confirmed', 'attended']);

            // The seat, if there was one, is handed on below or released.
            $seatId = $booking->seat_id;
            $booking->update(['status' => 'cancelled', 'seat_id' => null]);
            $notificationsToDispatch[] = $this->notifications->record($booking, 'cancelled');

            if ($wasHoldingASeat) {
                $ticketType = TicketType::where('id', $booking->ticket_type_id)->lockForUpdate()->first();

                $promoted = $originalStatus === 'confirmed'
                    ? Booking::where('ticket_type_id', $ticketType->id)
                        ->where('status', 'waitlisted')
                        ->orderBy('booked_at')
                        ->orderBy('id')
                        ->lockForUpdate()
                        ->first()
                    : null;

                if ($promoted) {
                    $promoted->update(['status' => 'confirmed', 'seat_id' => $seatId]);
                    $promoted->update(['qr_token' => $this->qrTickets->generate($promoted)]);
                    $notificationsToDispatch[] = $this->notifications->record($promoted, 'waitlist_promoted');
                } else {
                    $ticketType->increment('seats_remaining');
                }
            }

            return $booking->fresh();
        });

        foreach ($notificationsToDispatch as $notification) {
            $this->notifications->dispatch($notification);
        }

        return $cancelled;
    }

    /**
     * Cancel every active booking on an event that has itself been
     * cancelled, and notify each attendee. No waitlist promotion: the
     * whole event is off, so there is nobody to promote into.
     */
    public function cancelForEvent(Event $event): int
    {
        $notificationsToDispatch = [];

        $count = DB::transaction(function () use ($event, &$notificationsToDispatch) {
            $bookings = Booking::query()
                ->whereHas('ticketType', fn ($query) => $query->where('event_id', $event->id))
                ->whereIn('status', self::ACTIVE_STATUSES)
                ->lockForUpdate()
                ->get();

            foreach ($bookings as $booking) {
                $booking->update(['status' => 'cancelled', 'seat_id' => null]);
                $notificationsToDispatch[] = $this->notifications->record($booking, 'cancelled');
            }

            return $bookings->count();
        });

        foreach ($notificationsToDispatch as $notification) {
            $this->notifications->dispatch($notification);
        }

        return $count;
    }
}
