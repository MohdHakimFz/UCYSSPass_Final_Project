<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Event;
use App\Services\EmailService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Factory;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Http;
use Tests\Feature\Concerns\BuildsScenarios;
use Tests\TestCase;

/** The same emails, sent through Brevo instead of Resend. Only the service in the middle changes. */
class BrevoDriverTest extends TestCase
{
    use BuildsScenarios;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpScenarios();
        config([
            'services.mail_api.driver' => 'brevo',
            'services.brevo.key' => 'xkeysib-test',
            'services.brevo.from_email' => 'sender@example.com',
            'services.brevo.from_name' => 'UCYSS',
            'services.resend.key' => 're_should_not_be_used',
        ]);
        Http::swap(new Factory);
        Http::fake(['api.brevo.com/*' => Http::response(['messageId' => '<abc@brevo>'], 201)]);
    }

    private function reminderBooking(): Booking
    {
        $event = Event::factory()->create([
            'venue_id' => $this->venue()->id, 'organiser_id' => $this->organiser()->id, 'status' => 'published',
            'start_at' => now()->addHours(20), 'end_at' => now()->addHours(22),
        ]);
        $booking = $this->book($this->customer(), $this->tier(seats: 3, event: $event));
        $booking->update(['booked_at' => now()->subHours(3)]);

        return $booking;
    }

    public function test_a_reminder_goes_to_brevo_in_brevos_own_format_with_the_calendar_file(): void
    {
        $booking = $this->reminderBooking();

        Artisan::call('bookings:send-reminders');

        Http::assertSent(fn (Request $request) => $request->url() === 'https://api.brevo.com/v3/smtp/email'
            && $request->hasHeader('api-key', 'xkeysib-test')
            && $request['sender'] === ['name' => 'UCYSS', 'email' => 'sender@example.com']
            && $request['to'] === [['email' => $booking->customer->email]]
            && str_starts_with($request['subject'], 'Reminder:')
            && str_contains($request['htmlContent'], $booking->ticketType->event->venue->name)
            && ($request['attachment'][0]['name'] ?? null) === 'event.ics'
            && str_contains(base64_decode($request['attachment'][0]['content']), 'BEGIN:VCALENDAR'));
    }

    public function test_nothing_is_sent_to_resend_while_brevo_is_chosen(): void
    {
        $this->reminderBooking();

        Artisan::call('bookings:send-reminders');

        Http::assertNotSent(fn (Request $request) => str_contains($request->url(), 'resend.com'));
    }

    public function test_the_answer_from_brevo_is_kept_in_the_email_log(): void
    {
        $booking = $this->reminderBooking();

        Artisan::call('bookings:send-reminders');

        $log = $booking->notifications()->where('type', 'reminder')->firstOrFail()->provider_response;
        $this->assertSame(201, $log['status']);
        $this->assertSame('<abc@brevo>', $log['body']['messageId']);
    }

    public function test_a_refusal_from_brevo_is_recorded_for_that_guest(): void
    {
        $booking = $this->reminderBooking();
        Http::swap(new Factory);
        Http::fake(['api.brevo.com/*' => Http::response(['code' => 'invalid_parameter', 'message' => 'Sender is not valid'], 400)]);

        Artisan::call('bookings:send-reminders');

        $this->assertSame(400, $booking->notifications()->where('type', 'reminder')->first()->provider_response['status']);
    }

    public function test_without_a_verified_sender_nothing_is_sent_and_the_row_says_why(): void
    {
        config(['services.brevo.from_email' => null]);
        $booking = $this->reminderBooking();

        Artisan::call('bookings:send-reminders');

        $log = $booking->notifications()->where('type', 'reminder')->first()->provider_response;
        $this->assertSame('skipped', $log['status']);
        $this->assertStringContainsString('BREVO', $log['reason']);
        Http::assertNothingSent();
    }

    public function test_password_reset_codes_use_brevo_too(): void
    {
        $this->assertTrue(app(EmailService::class)->sendPlain('someone@example.com', 'Subject', '<p>Hi</p>'));

        Http::assertSent(fn (Request $request) => $request->url() === 'https://api.brevo.com/v3/smtp/email' && $request['htmlContent'] === '<p>Hi</p>' && ! isset($request['attachment']));
    }

    public function test_the_test_command_reports_which_service_answered(): void
    {
        $this->artisan('emails:test', ['to' => 'me@example.com'])
            ->expectsOutputToContain('Service: brevo')
            ->expectsOutputToContain('From: UCYSS <sender@example.com>')
            ->expectsOutputToContain('Brevo answered 201')
            ->assertSuccessful();
    }

    public function test_the_test_command_says_what_is_missing(): void
    {
        config(['services.brevo.key' => null]);

        $this->artisan('emails:test', ['to' => 'me@example.com'])->expectsOutputToContain('BREVO_API_KEY and BREVO_FROM_EMAIL')->assertFailed();
    }

    public function test_an_unknown_driver_name_falls_back_to_resend(): void
    {
        config(['services.mail_api.driver' => 'carrier-pigeon']);

        $this->assertSame('resend', app(EmailService::class)->driver());
    }
}
