<?php

namespace App\Services;

use App\Exceptions\BookingConflictException;
use App\Models\Booking;
use App\Models\TicketType;
use App\Models\User;
use Illuminate\Support\Facades\DB;

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
    public function book(User $customer, TicketType $ticketType): Booking
    {
        return DB::transaction(function () use ($customer, $ticketType) {
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

            if ($lockedTicketType->seats_remaining > 0) {
                $lockedTicketType->decrement('seats_remaining');
                $status = 'confirmed';
            }

            $booking = Booking::create([
                'customer_id' => $customer->id,
                'ticket_type_id' => $lockedTicketType->id,
                'status' => $status,
                'booked_at' => now(),
            ]);

            if ($status === 'confirmed') {
                $booking->update(['qr_token' => $this->qrTickets->generate($booking)]);
                $this->notifications->notify($booking, 'confirmation');
            }

            return $booking;
        });
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
        return DB::transaction(function () use ($booking) {
            $originalStatus = $booking->status;
            $wasHoldingASeat = in_array($originalStatus, ['confirmed', 'attended']);

            $booking->update(['status' => 'cancelled']);
            $this->notifications->notify($booking, 'cancelled');

            if ($wasHoldingASeat) {
                $ticketType = TicketType::where('id', $booking->ticket_type_id)->lockForUpdate()->first();

                $promoted = $originalStatus === 'confirmed'
                    ? Booking::where('ticket_type_id', $ticketType->id)
                        ->where('status', 'waitlisted')
                        ->orderBy('booked_at')
                        ->lockForUpdate()
                        ->first()
                    : null;

                if ($promoted) {
                    $promoted->update(['status' => 'confirmed']);
                    $promoted->update(['qr_token' => $this->qrTickets->generate($promoted)]);
                    $this->notifications->notify($promoted, 'waitlist_promoted');
                } else {
                    $ticketType->increment('seats_remaining');
                }
            }

            return $booking->fresh();
        });
    }
}
