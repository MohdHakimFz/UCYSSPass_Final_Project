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

            return Booking::create([
                'customer_id' => $customer->id,
                'ticket_type_id' => $lockedTicketType->id,
                'status' => $status,
                'booked_at' => now(),
            ]);
        });
    }

    /**
     * Cancel a booking, releasing its seat back to the pool if it was
     * holding one (confirmed or attended).
     */
    public function cancel(Booking $booking): Booking
    {
        return DB::transaction(function () use ($booking) {
            $wasHoldingASeat = in_array($booking->status, ['confirmed', 'attended']);

            $booking->update(['status' => 'cancelled']);

            if ($wasHoldingASeat) {
                TicketType::where('id', $booking->ticket_type_id)->lockForUpdate()->increment('seats_remaining');
            }

            return $booking;
        });
    }
}
