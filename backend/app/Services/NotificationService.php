<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Notification;

class NotificationService
{
    /**
     * Record that a booking-lifecycle notification is owed to the
     * customer. Dispatching it through the real email API (spec §7)
     * happens separately — this just creates the row with sent_at/
     * provider_response left null until that dispatch fills them in.
     */
    public function notify(Booking $booking, string $type): Notification
    {
        return Notification::create([
            'booking_id' => $booking->id,
            'type' => $type,
            'channel' => 'email',
        ]);
    }
}
