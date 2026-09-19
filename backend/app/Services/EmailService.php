<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Notification;
use App\Support\Ics;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class EmailService
{
    /** Emails show times in Malaysian time, because that is where every guest reads them. */
    private const DISPLAY_TIMEZONE = 'Asia/Kuala_Lumpur';

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
        $notification->loadMissing('booking.customer', 'booking.seat', 'booking.ticketType.event.venue');
        $booking = $notification->booking;
        $customer = $booking->customer;

        if (! config('services.resend.key')) {
            $notification->update([
                'sent_at' => now(),
                'provider_response' => ['status' => 'skipped', 'reason' => 'RESEND_API_KEY not configured'],
            ]);

            return $notification;
        }

        [$subject, $body, $attachments] = $this->content($notification);

        $response = $this->deliver($customer->email, $subject, $body, $attachments);

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
        if (! config('services.resend.key')) {
            return false;
        }

        $response = $this->deliver($to, $subject, $html);

        Log::info('Resend transactional email', ['status' => $response->status(), 'subject' => $subject]);

        return $response->successful();
    }

    /**
     * One call to the Resend API. Attachments are [{filename, content}] with the content already base64-encoded.
     *
     * @param  list<array{filename: string, content: string}>  $attachments
     */
    public function deliver(string $to, string $subject, string $html, array $attachments = []): Response
    {
        return Http::withToken((string) config('services.resend.key'))->post('https://api.resend.com/emails', array_filter([
            'from' => config('services.resend.from'),
            'to' => [$to],
            'subject' => $subject,
            'html' => $html,
            'attachments' => $attachments ?: null,
        ]));
    }

    private function refundLine(Booking $booking): string
    {
        $payment = $booking->payments()->latest('id')->first();

        return match ($payment?->status) {
            'refunded' => ' RM '.number_format((float) $payment->refunded_amount, 2).' has been refunded to you.',
            'paid' => ' The payment is not refundable because the event is less than '.config('sentrypass.refund_hours_before').' hours away.',
            default => '',
        };
    }

    /**
     * Subject, HTML body and attachments for a notification. Everything an organiser or guest typed is escaped.
     *
     * @return array{0: string, 1: string, 2: list<array{filename: string, content: string}>}
     */
    private function content(Notification $notification): array
    {
        $brand = config('sentrypass.brand');
        $booking = $notification->booking;
        $event = $booking->ticketType->event;
        $title = e($event->title);
        $seat = $booking->seat;
        $seatLine = $seat ? ' Your seat is <strong>'.e($seat->label).'</strong>.' : '';

        return match ($notification->type) {
            'confirmation' => [
                "Your {$brand} ticket for {$event->title} is confirmed",
                "<p>Your booking for <strong>{$title}</strong> is confirmed.{$seatLine} See you there!</p>",
                [],
            ],
            'waitlist_promoted' => [
                "You're off the waitlist for {$event->title}",
                $booking->status === 'pending'
                    ? "<p>A seat opened up for <strong>{$title}</strong>.{$seatLine} It is yours if you pay within ".config('sentrypass.promotion_hold_minutes').' minutes: open My passes and tap Pay now.</p>'
                    : "<p>A seat opened up and you've been promoted from the waitlist for <strong>{$title}</strong>. Your ticket is now confirmed.{$seatLine}</p>",
                [],
            ],
            'cancelled' => [
                "Your {$brand} booking for {$event->title} was cancelled",
                "<p>Your booking for <strong>{$title}</strong> has been cancelled.".$this->refundLine($booking).'</p>',
                [],
            ],
            'reminder' => $this->reminder($booking),
        };
    }

    /**
     * The day-before reminder: when and where, the meeting link for an online event, and a calendar file.
     *
     * @return array{0: string, 1: string, 2: list<array{filename: string, content: string}>}
     */
    private function reminder(Booking $booking): array
    {
        $brand = config('sentrypass.brand');
        $event = $booking->ticketType->event;
        $title = e($event->title);
        $when = $event->start_at->copy()->timezone(self::DISPLAY_TIMEZONE)->format('l, j F Y, g:i A');

        if ($event->isOnline()) {
            $opens = (int) config('sentrypass.meeting_open_minutes');
            $link = e((string) $event->meeting_url);
            $where = '<p>This is an <strong>online meeting</strong>.</p>'
                .($link !== '' ? "<p><a href=\"{$link}\">Join the meeting</a><br>The link works from {$opens} minutes before it starts. You can also join from My passes. Please do not share it.</p>" : '');
        } else {
            $venue = $event->venue;
            $seatLine = $booking->seat ? '<p>Your seat is <strong>'.e($booking->seat->label).'</strong>. Bring your QR pass from My passes.</p>' : '<p>Bring your QR pass from My passes.</p>';
            $where = '<p><strong>Where:</strong> '.e($venue?->name ?? 'Venue to be announced').($venue?->address ? ', '.e($venue->address) : '').'</p>'.$seatLine;
        }

        return [
            "Reminder: {$event->title} is coming up",
            "<p>Hi {$this->firstName($booking)}, a reminder from {$brand}.</p><p><strong>{$title}</strong><br>{$when} (Malaysia time)</p>{$where}<p>A calendar file is attached, so you can add it to your calendar.</p>",
            [['filename' => 'event.ics', 'content' => base64_encode(Ics::forBooking($booking))]],
        ];
    }

    private function firstName(Booking $booking): string
    {
        return e(strtok((string) $booking->customer?->name, ' ') ?: 'there');
    }
}
