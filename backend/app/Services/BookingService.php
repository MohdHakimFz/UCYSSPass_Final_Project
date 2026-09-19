<?php

namespace App\Services;

use App\Exceptions\BookingConflictException;
use App\Exceptions\PaymentDeclinedException;
use App\Models\Booking;
use App\Models\Event;
use App\Models\Payment;
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
        private readonly SandboxPaymentGateway $gateway,
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
        // Seats whose payment hold has run out go back on sale before anyone tries to take one.
        $this->releaseExpired($ticketType->id);

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

                // A free ticket is confirmed straight away. A priced one is held for the customer while they pay.
                $status = (float) $lockedTicketType->price > 0 ? 'pending' : 'confirmed';
            }

            $booking = Booking::create([
                'customer_id' => $customer->id,
                'ticket_type_id' => $lockedTicketType->id,
                'seat_id' => $seat?->id,
                'status' => $status,
                'booked_at' => now(),
                'hold_expires_at' => $status === 'pending' ? now()->addMinutes(config('sentrypass.hold_minutes')) : null,
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
     * Pay for a held booking. On success the booking is confirmed, gets its signed QR pass, and the customer is emailed.
     * A declined payment leaves the hold in place so they can try another method until it runs out.
     */
    public function pay(Booking $booking, string $method, string $outcome = 'approve'): Booking
    {
        $this->releaseExpired($booking->ticket_type_id);

        $notification = null;

        try {
            $paid = DB::transaction(function () use ($booking, $method, $outcome, &$notification) {
                $locked = Booking::where('id', $booking->id)->lockForUpdate()->firstOrFail();

                if ($locked->status === 'confirmed' || $locked->status === 'attended') {
                    throw new BookingConflictException('This booking is already paid.');
                }

                if ($locked->status !== 'pending' || ! $locked->hold_expires_at) {
                    throw new BookingConflictException('This hold has expired. Choose your seat again.');
                }

                $amount = (float) $locked->ticketType->price;
                $reference = $this->gateway->charge($amount, $method, $outcome);

                Payment::create([
                    'booking_id' => $locked->id,
                    'amount' => $amount,
                    'method' => $method,
                    'status' => 'paid',
                    'reference' => $reference,
                    'paid_at' => now(),
                ]);

                $locked->update(['status' => 'confirmed', 'hold_expires_at' => null]);
                $locked->update(['qr_token' => $this->qrTickets->generate($locked)]);
                $notification = $this->notifications->record($locked, 'confirmation');

                return $locked;
            });
        } catch (PaymentDeclinedException $e) {
            // Kept outside the transaction so the failed attempt is still on record.
            Payment::create([
                'booking_id' => $booking->id,
                'amount' => (float) $booking->ticketType->price,
                'method' => $method,
                'status' => 'failed',
                'failure_reason' => $e->getMessage(),
            ]);

            throw $e;
        }

        $this->notifications->dispatch($notification);

        return $paid;
    }

    /**
     * Cancel every pending booking whose payment hold has run out, returning the seat (or handing it to the waitlist).
     * Nobody is emailed: the customer simply did not finish paying.
     *
     * @return int how many holds were released
     */
    public function releaseExpired(?int $ticketTypeId = null): int
    {
        $ids = Booking::where('status', 'pending')
            ->whereNotNull('hold_expires_at')
            ->where('hold_expires_at', '<', now())
            ->when($ticketTypeId, fn ($query) => $query->where('ticket_type_id', $ticketTypeId))
            ->pluck('id');

        foreach ($ids as $id) {
            $booking = Booking::find($id);

            if ($booking && $booking->status === 'pending' && $booking->hold_expires_at?->isPast()) {
                $this->cancel($booking, notify: false);
            }
        }

        return $ids->count();
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
    public function cancel(Booking $booking, bool $notify = true): Booking
    {
        $notificationsToDispatch = [];
        $refund = null;

        $cancelled = DB::transaction(function () use ($booking, $notify, &$notificationsToDispatch, &$refund) {
            $originalStatus = $booking->status;
            $wasHeldForPayment = $originalStatus === 'pending' && $booking->hold_expires_at !== null;
            $wasHoldingASeat = in_array($originalStatus, ['confirmed', 'attended']) || $wasHeldForPayment;

            // The seat, if there was one, is handed on below or released.
            $seatId = $booking->seat_id;
            $booking->update(['status' => 'cancelled', 'seat_id' => null, 'hold_expires_at' => null]);

            // Money back when the cancellation is early enough; otherwise the payment stands.
            $payment = $booking->payments()->where('status', 'paid')->latest('id')->first();
            if ($payment) {
                $early = $booking->ticketType->event->start_at->gt(now()->addHours(config('sentrypass.refund_hours_before')));
                if ($early) {
                    $payment->update(['status' => 'refunded', 'refunded_at' => now(), 'refunded_amount' => $payment->amount]);
                }
                $refund = ['refunded' => $early, 'amount' => $early ? $payment->amount : '0.00'];
            }

            // Walking away from checkout is not worth an email.
            if ($notify && ! $wasHeldForPayment) {
                $notificationsToDispatch[] = $this->notifications->record($booking, 'cancelled');
            }

            if ($wasHoldingASeat) {
                $ticketType = TicketType::where('id', $booking->ticket_type_id)->lockForUpdate()->first();

                $promoted = in_array($originalStatus, ['confirmed', 'pending'])
                    ? Booking::where('ticket_type_id', $ticketType->id)
                        ->where('status', 'waitlisted')
                        ->orderBy('booked_at')
                        ->orderBy('id')
                        ->lockForUpdate()
                        ->first()
                    : null;

                if ($promoted) {
                    if ((float) $ticketType->price > 0) {
                        // Their seat is kept for a while so they can pay for it.
                        $promoted->update([
                            'status' => 'pending',
                            'seat_id' => $seatId,
                            'hold_expires_at' => now()->addMinutes(config('sentrypass.promotion_hold_minutes')),
                        ]);
                    } else {
                        $promoted->update(['status' => 'confirmed', 'seat_id' => $seatId]);
                        $promoted->update(['qr_token' => $this->qrTickets->generate($promoted)]);
                    }
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

        $cancelled->setAttribute('refund', $refund);

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
                // The organiser called the event off, so everyone who paid gets their money back.
                $booking->payments()->where('status', 'paid')->update([
                    'status' => 'refunded',
                    'refunded_at' => now(),
                    'refunded_amount' => DB::raw('amount'),
                ]);
                $booking->update(['status' => 'cancelled', 'seat_id' => null, 'hold_expires_at' => null]);
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
