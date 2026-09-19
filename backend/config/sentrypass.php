<?php

return [
    // The name on emails and exports.
    'brand' => env('APP_BRAND', 'UCYSS'),

    // How long a chosen seat is kept for someone while they pay.
    'hold_minutes' => (int) env('SEAT_HOLD_MINUTES', 3),

    // How long someone promoted from a waitlist has to pay before the seat moves on.
    'promotion_hold_minutes' => (int) env('PROMOTION_HOLD_MINUTES', 30),

    // Cancelling at least this many hours before the event starts is refunded in full; later is not.
    'refund_hours_before' => (int) env('REFUND_HOURS_BEFORE', 24),

    // Requests one person (or one address) may make to the API each minute.
    'api_rate_limit' => (int) env('API_RATE_LIMIT', 240),

    // Guests are reminded by email when their event is this many hours away.
    'reminder_hours_before' => (int) env('REMINDER_HOURS_BEFORE', 24),

    // An online meeting can be joined this many minutes before it starts.
    'meeting_open_minutes' => (int) env('MEETING_OPEN_MINUTES', 15),

    // "sandbox" takes no real money. The chosen test outcome (approve, decline, insufficient) is honoured.
    'payments_driver' => env('PAYMENTS_DRIVER', 'sandbox'),
];
