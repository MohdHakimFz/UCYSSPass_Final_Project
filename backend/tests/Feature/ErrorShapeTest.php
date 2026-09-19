<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Concerns\BuildsScenarios;
use Tests\TestCase;

class ErrorShapeTest extends TestCase
{
    use BuildsScenarios;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpScenarios();
        // The default in development: errors would normally carry a trace and file paths.
        config(['app.debug' => true]);
    }

    public function test_an_error_raised_on_purpose_says_what_it_is_and_nothing_more_even_in_debug_mode(): void
    {
        $tier = $this->tier(seats: 2);
        $booking = $this->book($this->customer(), $tier);

        $res = $this->actingAs($this->customer(), 'sanctum')->postJson("/api/bookings/{$booking->id}/join")->assertForbidden();

        $res->assertExactJson(['message' => 'This is not your booking.']);
    }

    public function test_a_missing_page_and_a_refused_action_share_the_same_plain_shape(): void
    {
        $this->getJson('/api/events/999999')->assertNotFound()->assertExactJson(['message' => 'Resource not found.']);
        $this->actingAs($this->customer(), 'sanctum')->getJson('/api/admin/stats')->assertForbidden()->assertJsonMissingPath('trace');
    }
}
