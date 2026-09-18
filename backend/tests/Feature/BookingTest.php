<?php

namespace Tests\Feature;

use App\Models\Booking;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Concerns\BuildsScenarios;
use Tests\TestCase;

class BookingTest extends TestCase
{
    use BuildsScenarios;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpScenarios();
    }

    public function test_booking_a_free_seat_confirms_it_takes_a_seat_and_signs_a_qr_token(): void
    {
        $tier = $this->tier(seats: 3);

        $booking = $this->book($this->customer(), $tier);

        $this->assertSame('confirmed', $booking->status);
        $this->assertNotEmpty($booking->qr_token);
        $this->assertSame(2, $tier->fresh()->seats_remaining);
    }

    public function test_a_sold_out_tier_puts_the_next_customer_on_the_waitlist(): void
    {
        $tier = $this->tier(seats: 1);
        $this->book($this->customer(), $tier);

        $second = $this->book($this->customer(), $tier);

        $this->assertSame('waitlisted', $second->status);
        $this->assertNull($second->qr_token);
        $this->assertSame(0, $tier->fresh()->seats_remaining);
    }

    public function test_the_last_seat_is_never_sold_twice(): void
    {
        $tier = $this->tier(seats: 1);

        foreach (range(1, 4) as $ignored) {
            $this->book($this->customer(), $tier);
        }

        $this->assertSame(1, Booking::where('ticket_type_id', $tier->id)->where('status', 'confirmed')->count());
        $this->assertSame(3, Booking::where('ticket_type_id', $tier->id)->where('status', 'waitlisted')->count());
        $this->assertSame(0, $tier->fresh()->seats_remaining);
    }

    public function test_a_customer_cannot_hold_two_active_bookings_on_one_tier(): void
    {
        $tier = $this->tier(seats: 5);
        $customer = $this->customer();
        $this->book($customer, $tier);

        $this->actingAs($customer, 'sanctum')
            ->postJson('/api/bookings', ['ticket_type_id' => $tier->id])
            ->assertStatus(409);

        $this->assertSame(4, $tier->fresh()->seats_remaining);
    }

    public function test_booking_needs_a_login_and_a_real_ticket_type(): void
    {
        $tier = $this->tier(seats: 2);

        $this->postJson('/api/bookings', ['ticket_type_id' => $tier->id])->assertUnauthorized();
        $this->actingAs($this->customer(), 'sanctum')->postJson('/api/bookings', ['ticket_type_id' => 999999])->assertUnprocessable();
    }

    public function test_booking_is_throttled_to_five_attempts_a_minute(): void
    {
        $customer = $this->customer();
        $tiers = collect(range(1, 6))->map(fn () => $this->tier(seats: 5));

        foreach ($tiers->take(5) as $tier) {
            $this->actingAs($customer, 'sanctum')->postJson('/api/bookings', ['ticket_type_id' => $tier->id])->assertCreated();
        }

        $this->actingAs($customer, 'sanctum')
            ->postJson('/api/bookings', ['ticket_type_id' => $tiers->last()->id])
            ->assertStatus(429);
    }

    public function test_cancelling_a_confirmed_booking_promotes_the_oldest_waitlisted_customer(): void
    {
        $tier = $this->tier(seats: 1);
        $holder = $this->customer();
        $first = $this->customer();
        $second = $this->customer();

        $held = $this->book($holder, $tier);
        $waitFirst = $this->book($first, $tier);
        $waitSecond = $this->book($second, $tier);

        $this->actingAs($holder, 'sanctum')->putJson("/api/bookings/{$held->id}/cancel")->assertOk();

        $this->assertSame('cancelled', $held->fresh()->status);
        $this->assertSame('confirmed', $waitFirst->fresh()->status);
        $this->assertNotEmpty($waitFirst->fresh()->qr_token);
        $this->assertSame('waitlisted', $waitSecond->fresh()->status);
        $this->assertSame(0, $tier->fresh()->seats_remaining, 'the seat moves to the promoted customer instead of reopening');
        $this->assertDatabaseHas('notifications', ['booking_id' => $waitFirst->id, 'type' => 'waitlist_promoted']);
    }

    public function test_cancelling_with_nobody_waiting_releases_the_seat(): void
    {
        $tier = $this->tier(seats: 2);
        $customer = $this->customer();
        $booking = $this->book($customer, $tier);

        $this->actingAs($customer, 'sanctum')->putJson("/api/bookings/{$booking->id}/cancel")->assertOk();

        $this->assertSame(2, $tier->fresh()->seats_remaining);
    }

    public function test_a_customer_cannot_cancel_or_view_someone_elses_booking(): void
    {
        $booking = $this->book($this->customer(), $this->tier(seats: 2));
        $stranger = $this->customer();

        $this->actingAs($stranger, 'sanctum')->putJson("/api/bookings/{$booking->id}/cancel")->assertForbidden();
        $this->actingAs($stranger, 'sanctum')->getJson("/api/bookings/{$booking->id}")->assertForbidden();
    }

    public function test_the_booking_list_is_scoped_to_the_role(): void
    {
        $organiserA = $this->organiser();
        $tierA = $this->tier(seats: 5, event: $this->publishedEvent($organiserA));
        $tierB = $this->tier(seats: 5);
        $alice = $this->customer();
        $this->book($alice, $tierA);
        $this->book($this->customer(), $tierB);

        $this->actingAs($alice, 'sanctum')->getJson('/api/bookings')->assertOk()->assertJsonCount(1, 'data');
        $this->actingAs($organiserA, 'sanctum')->getJson('/api/bookings')->assertOk()->assertJsonCount(1, 'data');
        $this->actingAs($this->admin(), 'sanctum')->getJson('/api/bookings')->assertOk()->assertJsonCount(2, 'data');
    }

    public function test_a_waitlisted_booking_reports_its_place_in_line(): void
    {
        $tier = $this->tier(seats: 1);
        $this->book($this->customer(), $tier);
        $this->book($this->customer(), $tier);
        $third = $this->customer();
        $this->book($third, $tier);

        $this->actingAs($third, 'sanctum')
            ->getJson('/api/bookings')
            ->assertOk()
            ->assertJsonPath('data.0.waitlist_position', 2);
    }
}
