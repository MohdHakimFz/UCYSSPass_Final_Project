<?php

namespace App\Policies;

use App\Models\Event;
use App\Models\TicketType;
use App\Models\User;

class TicketTypePolicy
{
    /**
     * Admins can do anything; every other check below only runs for non-admins.
     */
    public function before(User $user, string $ability): ?bool
    {
        return $user->role === 'admin' ? true : null;
    }

    /**
     * Determine whether the user can create ticket types under the given event.
     */
    public function create(User $user, Event $event): bool
    {
        return $user->id === $event->organiser_id;
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, TicketType $ticketType): bool
    {
        return $user->id === $ticketType->event->organiser_id;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, TicketType $ticketType): bool
    {
        return $user->id === $ticketType->event->organiser_id;
    }
}
