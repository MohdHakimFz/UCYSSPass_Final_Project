<?php

namespace App\Policies;

use App\Models\Booking;
use App\Models\User;

class BookingPolicy
{
    /**
     * Admins can do anything; every other check below only runs for non-admins.
     */
    public function before(User $user, string $ability): ?bool
    {
        return $user->role === 'admin' ? true : null;
    }

    /**
     * Determine whether the user can view any bookings.
     *
     * Controllers still scope the query: customers see only their own,
     * organisers see only bookings for events they own.
     */
    public function viewAny(User $user): bool
    {
        return in_array($user->role, ['organiser', 'customer']);
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Booking $booking): bool
    {
        if ($user->id === $booking->customer_id) {
            return true;
        }

        return $user->role === 'organiser'
            && $user->id === $booking->ticketType->event->organiser_id;
    }

    /**
     * Determine whether the user can create bookings.
     */
    public function create(User $user): bool
    {
        return $user->role === 'customer';
    }

    /**
     * Determine whether the user can cancel the booking.
     */
    public function cancel(User $user, Booking $booking): bool
    {
        return $user->id === $booking->customer_id;
    }

    /**
     * Only the customer who holds the booking can pay for it.
     */
    public function pay(User $user, Booking $booking): bool
    {
        return $user->id === $booking->customer_id;
    }

    /**
     * Determine whether the user can check the booking in at the venue.
     */
    public function checkin(User $user, Booking $booking): bool
    {
        return $user->role === 'organiser'
            && $user->id === $booking->ticketType->event->organiser_id;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Booking $booking): bool
    {
        return false;
    }
}
