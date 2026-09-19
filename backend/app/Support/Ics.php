<?php

namespace App\Support;

use App\Models\Booking;

/** A calendar file (.ics) for one booking. It never carries the meeting link, which is kept in the email and on the pass. */
class Ics
{
    public static function forBooking(Booking $booking): string
    {
        $event = $booking->ticketType->event;
        $where = $event->isOnline() ? 'Online meeting' : ($event->venue?->name ?? 'Venue to be announced');
        $brand = (string) config('sentrypass.brand');

        $lines = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            "PRODID:-//{$brand}//Events//EN",
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            'BEGIN:VEVENT',
            "UID:booking-{$booking->id}@".strtolower($brand),
            'DTSTAMP:'.now()->utc()->format('Ymd\THis\Z'),
            'DTSTART:'.$event->start_at->copy()->utc()->format('Ymd\THis\Z'),
            'DTEND:'.$event->end_at->copy()->utc()->format('Ymd\THis\Z'),
            'SUMMARY:'.self::escape($event->title),
            'LOCATION:'.self::escape($where),
            'DESCRIPTION:'.self::escape($event->isOnline()
                ? 'Join from My passes. The meeting link opens shortly before the start.'
                : 'Bring your QR pass from My passes.'),
            'END:VEVENT',
            'END:VCALENDAR',
        ];

        return implode("\r\n", $lines)."\r\n";
    }

    /** Commas, semicolons, backslashes and line breaks must be escaped inside an ICS text value. */
    private static function escape(string $text): string
    {
        return str_replace(["\\", ';', ',', "\r\n", "\n", "\r"], ['\\', '\;', '\,', '\n', '\n', '\n'], $text);
    }
}
