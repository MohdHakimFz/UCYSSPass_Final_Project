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

        $response = Http::get('https://api.qrserver.com/v1/create-qr-code/', [
            'size' => '300x300',
            'data' => $payload,
        ]);

        Log::info('QR code API call', [
            'booking_id' => $booking->id,
            'status' => $response->status(),
            'content_type' => $response->header('Content-Type'),
            'bytes' => strlen($response->body()),
        ]);

        $response->throw();

        return $response;
    }
}
