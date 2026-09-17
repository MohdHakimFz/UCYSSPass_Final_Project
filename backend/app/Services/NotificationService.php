<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Notification;

class NotificationService
{
    public function __construct(private readonly EmailService $email) {}

    /**
     * Record that a notification is owed, without dispatching it yet.
     *
     * Callers running inside a DB transaction (e.g. BookingService's
     * lockForUpdate() blocks) should use this and call dispatch()
     * afterwards, once the transaction has committed — an external
     * HTTP call has no business holding a row lock open.
     */
    public function record(Booking $booking, string $type): Notification
    {
        return Notification::create([
            'booking_id' => $booking->id,
            'type' => $type,
            'channel' => 'email',
        ]);
    }

    /**
     * Actually send a previously recorded notification through the
     * email API (spec §7).
     */
    public function dispatch(Notification $notification): Notification
    {
        return $this->email->send($notification);
    }
}
