<?php

namespace App\Console\Commands;

use App\Services\EmailService;
use Illuminate\Console\Command;

class SendTestEmail extends Command
{
    protected $signature = 'emails:test {to : Where to send it}';

    protected $description = 'Send one test email through Resend and show exactly what Resend answered';

    public function handle(EmailService $emails): int
    {
        if (! config('services.resend.key')) {
            $this->error('RESEND_API_KEY is not set in backend/.env.');

            return self::FAILURE;
        }

        $brand = config('sentrypass.brand');
        $this->line('From: '.config('services.resend.from'));
        $this->line('To:   '.$this->argument('to'));

        $response = $emails->deliver($this->argument('to'), "{$brand} test email", "<p>This is a test email from {$brand}. If you can read it, Resend works.</p>");

        $this->line('Resend answered '.$response->status().': '.json_encode($response->json()));

        if ($response->successful()) {
            $this->info('Sent. Check the inbox (and the spam folder).');

            return self::SUCCESS;
        }

        $this->error('Not sent. See the message above.');

        return self::FAILURE;
    }
}
