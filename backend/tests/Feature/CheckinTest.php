<?php

namespace Tests\Feature;

use App\Models\Booking;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Concerns\BuildsScenarios;
use Tests\TestCase;

class CheckinTest extends TestCase
{
    use BuildsScenarios;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpScenarios();
        config(['services.checkin.api_key' => 'door-key-123']);
    }

    private function confirmedBookingFor($organiser): Booking
    {
        return $this->book($this->customer(), $this->tier(seats: 5, event: $this->publishedEvent($organiser)));
    }

    public function test_the_event_organiser_can_check_in_a_valid_pass(): void
    {
        $organiser = $this->organiser();
        $booking = $this->confirmedBookingFor($organiser);

        $this->actingAs($organiser, 'sanctum')
            ->postJson("/api/bookings/{$booking->id}/checkin", ['qr_token' => $booking->qr_token])
            ->assertOk()
            ->assertJsonPath('status', 'attended');

        $this->assertNotNull($booking->fresh()->checked_in_at);
    }

    public function test_a_forged_or_edited_token_is_rejected_and_nobody_is_checked_in(): void
    {
        $organiser = $this->organiser();
        $booking = $this->confirmedBookingFor($organiser);

        $this->actingAs($organiser, 'sanctum')
            ->postJson("/api/bookings/{$booking->id}/checkin", ['qr_token' => str_repeat('a', 64)])
            ->assertStatus(422);

        $this->assertSame('confirmed', $booking->fresh()->status);
    }

    public function test_a_token_from_a_different_booking_does_not_work(): void
    {
        $organiser = $this->organiser();
        $one = $this->confirmedBookingFor($organiser);
        $two = $this->confirmedBookingFor($organiser);

        $this->actingAs($organiser, 'sanctum')
            ->postJson("/api/bookings/{$one->id}/checkin", ['qr_token' => $two->qr_token])
            ->assertStatus(422);
    }

    public function test_a_pass_cannot_be_used_twice(): void
    {
        $organiser = $this->organiser();
        $booking = $this->confirmedBookingFor($organiser);

        $this->actingAs($organiser, 'sanctum')->postJson("/api/bookings/{$booking->id}/checkin", ['qr_token' => $booking->qr_token])->assertOk();
        $this->actingAs($organiser, 'sanctum')->postJson("/api/bookings/{$booking->id}/checkin", ['qr_token' => $booking->qr_token])->assertStatus(409);
    }

    public function test_a_waitlisted_booking_cannot_be_checked_in(): void
    {
        $organiser = $this->organiser();
        $tier = $this->tier(seats: 1, event: $this->publishedEvent($organiser));
        $this->book($this->customer(), $tier);
        $waitlisted = $this->book($this->customer(), $tier);

        $this->actingAs($organiser, 'sanctum')
            ->postJson("/api/bookings/{$waitlisted->id}/checkin", ['qr_token' => 'anything'])
            ->assertStatus(409);
    }

    public function test_another_organiser_and_customers_cannot_check_people_in(): void
    {
        $booking = $this->confirmedBookingFor($this->organiser());

        $this->actingAs($this->organiser(), 'sanctum')
            ->postJson("/api/bookings/{$booking->id}/checkin", ['qr_token' => $booking->qr_token])
            ->assertForbidden();
        $this->actingAs($booking->customer, 'sanctum')
            ->postJson("/api/bookings/{$booking->id}/checkin", ['qr_token' => $booking->qr_token])
            ->assertForbidden();
    }

    public function test_a_scanning_device_can_check_in_with_the_api_key(): void
    {
        $booking = $this->confirmedBookingFor($this->organiser());

        $this->withHeader('X-Api-Key', 'door-key-123')
            ->postJson("/api/bookings/{$booking->id}/checkin", ['qr_token' => $booking->qr_token])
            ->assertOk()
            ->assertJsonPath('status', 'attended');
    }

    public function test_a_wrong_api_key_and_no_credentials_are_both_refused(): void
    {
        $booking = $this->confirmedBookingFor($this->organiser());

        $this->withHeader('X-Api-Key', 'guess')
            ->postJson("/api/bookings/{$booking->id}/checkin", ['qr_token' => $booking->qr_token])
            ->assertUnauthorized();
        $this->postJson("/api/bookings/{$booking->id}/checkin", ['qr_token' => $booking->qr_token])->assertUnauthorized();
    }
}
