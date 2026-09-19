<?php

namespace App\Services;

use App\Models\Booking;
use Dompdf\Dompdf;
use Dompdf\Options;

/** A certificate of attendance: a PDF for someone who really came, with a code anyone can check. */
class CertificateService
{
    /** Why this booking cannot have a certificate (yet), or null when it can. */
    public function problem(Booking $booking): ?string
    {
        if ($booking->status !== 'attended') {
            return 'Only people who attended get a certificate.';
        }

        if (! $booking->ticketType->event->end_at->isPast()) {
            return 'The certificate is ready once the event has ended.';
        }

        return null;
    }

    /** Ten characters that only the server can produce for this booking. */
    public function code(Booking $booking): string
    {
        $hash = hash_hmac('sha256', "certificate|{$booking->id}|{$booking->customer_id}|{$booking->ticket_type_id}", (string) config('app.key'));

        return strtoupper(substr($hash, 0, 10));
    }

    public function verify(Booking $booking, string $code): bool
    {
        return $this->problem($booking) === null && hash_equals($this->code($booking), strtoupper($code));
    }

    /** Where anyone can check the certificate. */
    public function verifyUrl(Booking $booking): string
    {
        return rtrim((string) config('sentrypass.web_url'), '/')."/verify/{$booking->id}/{$this->code($booking)}";
    }

    public function pdf(Booking $booking): string
    {
        $booking->loadMissing('customer', 'ticketType.event.organiser', 'ticketType.event.venue');
        $event = $booking->ticketType->event;

        $html = view('certificate', [
            'brand' => config('sentrypass.brand'),
            'society' => config('sentrypass.society'),
            'name' => $booking->customer->name,
            'title' => $event->title,
            'when' => $event->start_at->copy()->timezone('Asia/Kuala_Lumpur')->format('j F Y'),
            'where' => $event->isOnline() ? 'Online' : ($event->venue?->name ?? ''),
            'organiser' => $event->organiser?->name,
            'number' => 'UCYSS-'.str_pad((string) $booking->id, 6, '0', STR_PAD_LEFT).'-'.$this->code($booking),
            'verifyUrl' => $this->verifyUrl($booking),
        ])->render();

        $options = new Options;
        $options->set('defaultFont', 'DejaVu Sans');
        $options->set('isRemoteEnabled', false);

        $dompdf = new Dompdf($options);
        $dompdf->loadHtml($html);
        $dompdf->setPaper('A4', 'landscape');
        $dompdf->render();

        return (string) $dompdf->output();
    }
}
