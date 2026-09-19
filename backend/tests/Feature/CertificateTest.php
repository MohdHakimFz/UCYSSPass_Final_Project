<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\User;
use App\Services\CertificateService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Concerns\BuildsScenarios;
use Tests\TestCase;

class CertificateTest extends TestCase
{
    use BuildsScenarios;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpScenarios();
    }

    /** A booking for someone who attended, on an event that has already ended (unless told otherwise). */
    private function attended(bool $over = true, ?User $customer = null): Booking
    {
        $customer ??= $this->customer();
        $event = $this->publishedEvent();
        $booking = $this->book($customer, $this->tier(seats: 5, event: $event));
        $booking->update(['status' => 'attended', 'checked_in_at' => now()]);
        if ($over) {
            $event->update(['start_at' => now()->subDays(2), 'end_at' => now()->subDays(2)->addHours(2)]);
        }

        return $booking;
    }

    public function test_someone_who_attended_gets_a_pdf_once_the_event_is_over(): void
    {
        $booking = $this->attended();

        $res = $this->actingAs($booking->customer, 'sanctum')->get("/api/bookings/{$booking->id}/certificate")->assertOk();

        $res->assertHeader('Content-Type', 'application/pdf');
        $this->assertStringStartsWith('%PDF', $res->getContent());
        $this->assertStringContainsString("ucyss-certificate-{$booking->id}.pdf", $res->headers->get('Content-Disposition'));
    }

    public function test_it_is_refused_until_the_person_has_attended_and_the_event_is_over(): void
    {
        $customer = $this->customer();
        $notOver = $this->attended(over: false, customer: $customer);
        $this->actingAs($customer, 'sanctum')->getJson("/api/bookings/{$notOver->id}/certificate")->assertUnprocessable()->assertJsonPath('message', 'The certificate is ready once the event has ended.');

        $didNotCome = $this->attended();
        $didNotCome->update(['status' => 'confirmed']);
        $this->actingAs($didNotCome->customer, 'sanctum')->getJson("/api/bookings/{$didNotCome->id}/certificate")->assertUnprocessable()->assertJsonPath('message', 'Only people who attended get a certificate.');
    }

    public function test_only_the_guest_the_events_organiser_and_an_admin_can_download_it(): void
    {
        $booking = $this->attended();

        // Booking signed the customer in for the test; sign everyone out to be a visitor.
        $this->app['auth']->forgetGuards();
        $this->getJson("/api/bookings/{$booking->id}/certificate")->assertUnauthorized();
        $this->actingAs($this->customer(), 'sanctum')->getJson("/api/bookings/{$booking->id}/certificate")->assertForbidden();
        $this->actingAs($this->admin(), 'sanctum')->get("/api/bookings/{$booking->id}/certificate")->assertOk();
    }

    public function test_the_booking_says_when_its_certificate_is_ready(): void
    {
        $ready = $this->attended();
        $notYet = $this->attended(over: false);

        $code = app(CertificateService::class)->code($ready);
        $this->actingAs($ready->customer, 'sanctum')->getJson("/api/bookings/{$ready->id}")
            ->assertJsonPath('certificate_ready', true)->assertJsonPath('certificate_url', rtrim(config('sentrypass.web_url'), '/')."/verify/{$ready->id}/{$code}");
        $this->actingAs($notYet->customer, 'sanctum')->getJson("/api/bookings/{$notYet->id}")
            ->assertJsonPath('certificate_ready', false)->assertJsonPath('certificate_url', null);
    }

    public function test_anyone_can_check_a_certificate_with_its_code(): void
    {
        $booking = $this->attended();
        $code = app(CertificateService::class)->code($booking);

        $this->getJson("/api/certificates/{$booking->id}/{$code}")->assertOk()
            ->assertJsonPath('valid', true)->assertJsonPath('name', $booking->customer->name)
            ->assertJsonPath('event', $booking->ticketType->event->title);
        $this->getJson('/api/certificates/'.$booking->id.'/'.strtolower($code))->assertOk();
    }

    public function test_a_wrong_code_a_missing_booking_and_a_booking_that_never_attended_all_get_the_same_answer(): void
    {
        $booking = $this->attended();
        $code = app(CertificateService::class)->code($booking);
        $didNotCome = $this->attended();
        $didNotCome->update(['status' => 'confirmed']);
        $theirCode = app(CertificateService::class)->code($didNotCome);

        foreach ([
            "/api/certificates/{$booking->id}/AAAAAAAAAA",
            "/api/certificates/{$booking->id}/".strrev($code),
            '/api/certificates/99999999/'.$code,
            "/api/certificates/{$didNotCome->id}/{$theirCode}",
        ] as $url) {
            $this->getJson($url)->assertNotFound()->assertExactJson(['message' => 'No certificate matches this code.']);
        }
    }

    public function test_a_code_only_belongs_to_its_own_booking(): void
    {
        $a = $this->attended();
        $b = $this->attended();

        $this->getJson("/api/certificates/{$b->id}/".app(CertificateService::class)->code($a))->assertNotFound();
    }

    public function test_the_certificate_holds_the_name_and_survives_awkward_characters(): void
    {
        $booking = $this->attended(customer: User::factory()->create(['name' => "Nur Aisyah <b>&</b> Amirul 'Ali' Ünal"]));

        $pdf = app(CertificateService::class)->pdf($booking);

        $this->assertStringStartsWith('%PDF', $pdf);
        $this->assertGreaterThan(1000, strlen($pdf));
    }

    public function test_checking_is_rate_limited(): void
    {
        $booking = $this->attended();

        foreach (range(1, 30) as $i) {
            $this->getJson("/api/certificates/{$booking->id}/WRONGCODE1")->assertNotFound();
        }
        $this->getJson("/api/certificates/{$booking->id}/WRONGCODE1")->assertStatus(429);
    }
}
