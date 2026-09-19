<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Services\CertificateService;
use Illuminate\Http\JsonResponse;

class CertificateVerifyController extends Controller
{
    /**
     * Anyone holding a certificate can check it. The code cannot be guessed, so a right code proves the certificate is ours;
     * a wrong one, a missing booking and a booking that never attended all get the same answer.
     */
    public function __invoke(int $booking, string $code, CertificateService $certificates): JsonResponse
    {
        $found = Booking::with('customer:id,name', 'ticketType.event:id,title,start_at,end_at,mode')->find($booking);

        if (! $found || ! $certificates->verify($found, $code)) {
            return response()->json(['message' => 'No certificate matches this code.'], 404);
        }

        $event = $found->ticketType->event;

        return response()->json([
            'valid' => true,
            'name' => $found->customer->name,
            'event' => $event->title,
            'date' => $event->start_at,
        ]);
    }
}
