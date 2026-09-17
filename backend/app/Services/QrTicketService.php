<?php

namespace App\Services;

use App\Models\Booking;

class QrTicketService
{
    /**
     * Generate the anti-forgery signature for a booking (spec §5.2).
     *
     * The signature is deterministic from the booking's own DB row, so a
     * forger who edits the payload encoded in a QR image (e.g. swaps the
     * booking id) cannot produce a matching signature without knowing
     * the app key.
     */
    public function generate(Booking $booking): string
    {
        return hash_hmac(
            'sha256',
            "{$booking->id}|{$booking->ticket_type_id}|{$booking->customer_id}",
            config('app.key')
        );
    }

    /**
     * Verify a token scanned off a QR code against what this booking's
     * signature should actually be.
     */
    public function verify(Booking $booking, ?string $submittedToken): bool
    {
        if (! $submittedToken) {
            return false;
        }

        return hash_equals($this->generate($booking), $submittedToken);
    }
}
