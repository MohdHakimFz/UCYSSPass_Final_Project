<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Concerns\BuildsScenarios;
use Tests\TestCase;

class RateLimitTest extends TestCase
{
    use BuildsScenarios;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpScenarios();
        config(['sentrypass.api_rate_limit' => 5]);
    }

    public function test_the_whole_api_has_a_ceiling_and_says_how_long_to_wait(): void
    {
        foreach (range(1, 5) as $i) {
            $this->getJson('/api/events')->assertOk();
        }

        $this->getJson('/api/events')
            ->assertStatus(429)
            ->assertHeader('Retry-After')
            ->assertJsonStructure(['message']);
    }

    public function test_every_answer_shows_the_limit_and_what_is_left(): void
    {
        $this->getJson('/api/venues')->assertOk()->assertHeader('X-RateLimit-Limit', '5')->assertHeader('X-RateLimit-Remaining', '4');
    }

    public function test_each_signed_in_person_has_their_own_allowance(): void
    {
        $a = $this->customer();
        $b = $this->customer();

        foreach (range(1, 5) as $i) {
            $this->actingAs($a, 'sanctum')->getJson('/api/events')->assertOk();
        }
        $this->actingAs($a, 'sanctum')->getJson('/api/events')->assertStatus(429);

        $this->actingAs($b, 'sanctum')->getJson('/api/events')->assertOk();
    }

    public function test_paying_and_joining_do_not_use_up_the_booking_allowance(): void
    {
        config(['sentrypass.api_rate_limit' => 500]);
        $customer = $this->customer();
        $held = $this->book($customer, $this->tier(seats: 3, price: 10));

        // Six payment attempts and six join attempts: each has its own, larger allowance.
        foreach (range(1, 6) as $i) {
            $this->actingAs($customer, 'sanctum')->postJson("/api/bookings/{$held->id}/pay", ['method' => 'card', 'outcome' => 'decline'])->assertStatus(402);
            $this->actingAs($customer, 'sanctum')->postJson("/api/bookings/{$held->id}/join")->assertStatus(422);
        }

        // ...and the person can still make their own bookings, five a minute.
        foreach (range(1, 4) as $i) {
            $this->actingAs($customer, 'sanctum')->postJson('/api/bookings', ['ticket_type_id' => $this->tier(seats: 2)->id])->assertCreated();
        }
    }
}
