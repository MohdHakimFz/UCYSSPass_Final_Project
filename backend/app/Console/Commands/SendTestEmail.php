<?php

namespace App\Console\Commands;

use App\Services\EmailService;
use Illuminate\Console\Command;

class SendTestEmail extends Command
{
    protected $signature = 'emails:test {to : Where to send it}';

    protected $description = 'Send one test email through the email service in use and show exactly what it answered';

    public function handle(EmailService $emails): int
    {
        if (! $emails->configured()) {
            $this->error($emails->driver() === 'brevo' ? 'BREVO_API_KEY and BREVO_FROM_EMAIL must both be set in backend/.env.' : 'RESEND_API_KEY is not set in backend/.env.');

            return self::FAILURE;
        }

        $brand = config('sentrypass.brand');
        $this->line('Service: '.$emails->driver());
        $this->line('From: '.$emails->sender());
        $this->line('To:   '.$this->argument('to'));

        $response = $emails->deliver($this->argument('to'), "{$brand} test email", "<p>This is a test email from {$brand}. If you can read it, sending works.</p>");

        $this->line(ucfirst($emails->driver()).' answered '.$response->status().': '.json_encode($response->json()));

        if ($response->successful()) {
            $this->info('Sent. Check the inbox (and the spam folder).');

            return self::SUCCESS;
        }

        $this->error('Not sent. See the message above.');

        return self::FAILURE;
    }
}
