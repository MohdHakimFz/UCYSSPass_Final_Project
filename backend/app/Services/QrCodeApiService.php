<?php

namespace App\Services;

use App\Models\Booking;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class QrCodeApiService
{
    /**
     * Render a booking's signed ticket as a QR code PNG via the
     * goqr.me QR Code Generator API (spec §7) — a genuine external
     * API call, not a locally installed QR library.
     */
    public function fetch(Booking $booking): Response
    {
        $payload = json_encode([
            'booking_id' => $booking->id,
            'qr_token' => $booking->qr_token,
        ]);

        $response = $this->fetchForData($payload, 300);

        Log::info('QR code API call', [
            'booking_id' => $booking->id,
            'status' => $response->status(),
            'content_type' => $response->header('Content-Type'),
            'bytes' => strlen($response->body()),
        ]);

        $response->throw();

        return $response;
    }

    /** The same goqr.me API, for any bit of text (a verify link, not necessarily a booking's ticket). */
    public function fetchForData(string $data, int $size = 200): Response
    {
        return Http::timeout(5)->get('https://api.qrserver.com/v1/create-qr-code/', [
            'size' => "{$size}x{$size}",
            'data' => $data,
        ]);
    }
}
