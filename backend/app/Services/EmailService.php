<?php

namespace App\Services;

use App\Models\Notification;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class EmailService
{
    /**
     * Dispatch a booking-lifecycle notification through the Resend API
     * (spec §7) and record the raw provider response as evidence.
     *
     * If no API key is configured, the send is skipped but the
     * notification row is still marked so the pipeline stays visible
     * without a live key.
     */
    public function send(Notification $notification): Notification
    {
        $notification->loadMissing('booking.customer', 'booking.ticketType.event');
        $booking = $notification->booking;
        $customer = $booking->customer;

        $apiKey = config('services.resend.key');

        if (! $apiKey) {
            $notification->update([
                'sent_at' => now(),
                'provider_response' => ['status' => 'skipped', 'reason' => 'RESEND_API_KEY not configured'],
            ]);

            return $notification;
        }

        [$subject, $body] = $this->content($notification);

        $response = Http::withToken($apiKey)
            ->post('https://api.resend.com/emails', [
                'from' => config('services.resend.from'),
                'to' => [$customer->email],
                'subject' => $subject,
                'html' => $body,
            ]);

        Log::info('Resend email API call', [
            'notification_id' => $notification->id,
            'booking_id' => $booking->id,
            'status' => $response->status(),
            'body' => $response->json(),
        ]);

        $notification->update([
            'sent_at' => now(),
            'provider_response' => [
                'status' => $response->status(),
                'body' => $response->json(),
            ],
        ]);

        return $notification;
    }

    /**
     * Send a one-off transactional email (for example a password reset code).
     * With no Resend key nothing is sent and false is returned, so the caller can log it for local development.
     */
    public function sendPlain(string $to, string $subject, string $html): bool
    {
        $apiKey = config('services.resend.key');

        if (! $apiKey) {
            return false;
        }

        $response = Http::withToken($apiKey)->post('https://api.resend.com/emails', [
            'from' => config('services.resend.from'),
            'to' => [$to],
            'subject' => $subject,
            'html' => $html,
        ]);

        Log::info('Resend transactional email', ['status' => $response->status(), 'subject' => $subject]);

        return $response->successful();
    }

    /**
     * @return array{0: string, 1: string}
     */
    private function content(Notification $notification): array
    {
        $event = $notification->booking->ticketType->event;
        $seat = $notification->booking->seat;
        $seatLine = $seat ? " Your seat is <strong>{$seat->label}</strong>." : '';

        return match ($notification->type) {
            'confirmation' => [
                "Your SentryPass ticket for {$event->title} is confirmed",
                "<p>Your booking for <strong>{$event->title}</strong> is confirmed.{$seatLine} See you there!</p>",
            ],
            'waitlist_promoted' => [
                "You're off the waitlist for {$event->title}",
                "<p>A seat opened up and you've been promoted from the waitlist for <strong>{$event->title}</strong>. Your ticket is now confirmed.{$seatLine}</p>",
            ],
            'cancelled' => [
                "Your SentryPass booking for {$event->title} was cancelled",
                "<p>Your booking for <strong>{$event->title}</strong> has been cancelled.</p>",
            ],
        };
    }
}
