<?php

return [
    // How long a chosen seat is kept for someone while they pay.
    'hold_minutes' => (int) env('SEAT_HOLD_MINUTES', 3),

    // How long someone promoted from a waitlist has to pay before the seat moves on.
    'promotion_hold_minutes' => (int) env('PROMOTION_HOLD_MINUTES', 30),

    // Cancelling at least this many hours before the event starts is refunded in full; later is not.
    'refund_hours_before' => (int) env('REFUND_HOURS_BEFORE', 24),

    // "sandbox" takes no real money. The chosen test outcome (approve, decline, insufficient) is honoured.
    'payments_driver' => env('PAYMENTS_DRIVER', 'sandbox'),
];
