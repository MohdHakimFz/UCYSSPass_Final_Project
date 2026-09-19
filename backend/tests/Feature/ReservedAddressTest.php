<?php

namespace Tests\Feature;

use App\Models\Notification;
use App\Services\EmailService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Factory;
use Illuminate\Support\Facades\Http;
use Tests\Feature\Concerns\BuildsScenarios;
use Tests\TestCase;

/** Addresses on domains kept for tests never get a real email: it would only use up the allowance and bounce. */
class ReservedAddressTest extends TestCase
{
    use BuildsScenarios;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpScenarios();
        config(['sentrypass.mail_skip_reserved' => true, 'services.resend.key' => 're_test_key']);
        Http::swap(new Factory);
        Http::fake(['api.resend.com/*' => Http::response(['id' => 'x'], 200)]);
    }

    public function test_which_addresses_count_as_reserved(): void
    {
        $emails = app(EmailService::class);

        foreach (['a@e2e.test', 'a@postman.test', 'a@ucyss.test', 'a@example.com', 'a@mail.example.org', 'a@x.example', 'a@bad.invalid', 'a@localhost', 'A@E2E.TEST'] as $address) {
            $this->assertTrue($emails->isReserved($address), $address);
        }
        foreach (['mh29209501@gmail.com', 'kl2307014329@student.uptm.edu.my', 'someone@notexample.com', 'a@contest.my', 'a@testing.io'] as $address) {
            $this->assertFalse($emails->isReserved($address), $address);
        }
    }

    public function test_a_notification_for_a_reserved_address_is_recorded_as_skipped_and_nothing_is_sent(): void
    {
        $customer = \App\Models\User::factory()->create(['email' => 'guest@e2e.test']);
        $booking = $this->book($customer, $this->tier(seats: 3));

        $log = $booking->notifications()->where('type', 'confirmation')->firstOrFail()->provider_response;

        $this->assertSame('skipped', $log['status']);
        $this->assertStringContainsString('Reserved', $log['reason']);
        Http::assertNothingSent();
    }

    public function test_a_real_address_still_gets_its_email(): void
    {
        $customer = \App\Models\User::factory()->create(['email' => 'real.person@gmail.com']);
        $booking = $this->book($customer, $this->tier(seats: 3));

        $this->assertSame(200, $booking->notifications()->where('type', 'confirmation')->firstOrFail()->provider_response['status']);
        Http::assertSentCount(1);
    }

    public function test_plain_emails_to_a_reserved_address_are_not_sent_either(): void
    {
        $this->assertFalse(app(EmailService::class)->sendPlain('x@postman.test', 'Subject', '<p>Hi</p>'));
        Http::assertNothingSent();
    }

    public function test_the_rule_can_be_switched_off(): void
    {
        config(['sentrypass.mail_skip_reserved' => false]);

        $this->assertFalse(app(EmailService::class)->isReserved('a@e2e.test'));
    }
}
