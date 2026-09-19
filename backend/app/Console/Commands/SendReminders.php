<?php

namespace App\Console\Commands;

use App\Models\Booking;
use App\Models\Notification;
use App\Services\EmailService;
use Illuminate\Console\Command;

class SendReminders extends Command
{
    protected $signature = 'bookings:send-reminders {--booking= : Remind this one booking now, whatever the time window (for trying it out)}';

    protected $description = 'Email guests a reminder shortly before their event starts (once per booking)';

    public function handle(EmailService $emails): int
    {
        $hours = (int) config('sentrypass.reminder_hours_before');
        $sent = 0;
        $only = $this->option('booking');

        Booking::query()
            ->where('status', 'confirmed')
            ->when($only, fn ($query) => $query->whereKey((int) $only))
            // The normal rule: someone who booked in the last hour was only just told, and only events within the
            // next day are due. Asking for one booking by number skips both, so a reminder can be tried at any time.
            ->unless($only, fn ($query) => $query
                ->where('booked_at', '<=', now()->subHour())
                ->whereHas('ticketType.event', fn ($query) => $query
                    ->where('status', 'published')
                    ->where('start_at', '>', now())
                    ->where('start_at', '<=', now()->addHours($hours))))
            ->whereDoesntHave('notifications', fn ($query) => $query->where('type', 'reminder'))
            ->with('customer', 'seat', 'ticketType.event.venue')
            ->chunkById(50, function ($bookings) use ($emails, &$sent) {
                foreach ($bookings as $booking) {
                    // The row is written first, so a second run can never send the same reminder twice.
                    $emails->send(Notification::create(['booking_id' => $booking->id, 'type' => 'reminder']));
                    $sent++;
                }
            });

        $this->info("Sent {$sent} reminders.");

        if ($only && $sent === 0) {
            $this->warn('Nothing was sent: booking '.$only.' must exist, be confirmed, and not have had its reminder already.');
        }

        return self::SUCCESS;
    }
}
