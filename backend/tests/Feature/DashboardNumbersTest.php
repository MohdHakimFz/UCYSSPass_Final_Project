<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Payment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Concerns\BuildsScenarios;
use Tests\TestCase;

class DashboardNumbersTest extends TestCase
{
    use BuildsScenarios;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpScenarios();
    }

    /** A paid booking of the given price on an event owned by $organiser. */
    private function sale(\App\Models\User $organiser, float $price, bool $refunded = false): Booking
    {
        $tier = $this->tier(seats: 5, event: $this->publishedEvent($organiser), price: $price);
        $booking = $this->book($this->customer(), $tier);
        $booking->update(['status' => 'confirmed']);
        Payment::create([
            'booking_id' => $booking->id, 'amount' => $price, 'method' => 'card', 'status' => $refunded ? 'refunded' : 'paid',
            'paid_at' => now(), 'refunded_amount' => $refunded ? $price : 0,
        ]);

        return $booking;
    }

    public function test_the_admin_overview_reports_money_holds_drafts_and_recent_activity(): void
    {
        $organiser = $this->organiser();
        $this->sale($organiser, 100);
        $this->sale($organiser, 40, refunded: true);
        \App\Models\Event::factory()->create(['status' => 'draft']);

        $response = $this->actingAs($this->admin(), 'sanctum')->getJson('/api/admin/stats')->assertOk();

        $response->assertJsonPath('revenue.gross', 140)
            ->assertJsonPath('revenue.refunded', 40)
            ->assertJsonPath('revenue.net', 100)
            ->assertJsonPath('revenue.payments', 2);
        $this->assertGreaterThanOrEqual(1, $response->json('draft_events'));
        $this->assertNotEmpty($response->json('recent_activity'));
        $this->assertCount(14, $response->json('revenue_per_day'));
    }

    public function test_an_organiser_sees_revenue_only_for_their_own_events(): void
    {
        $mine = $this->organiser();
        $theirs = $this->organiser();
        $this->sale($mine, 60);
        $this->sale($theirs, 500);

        $summary = $this->actingAs($mine, 'sanctum')->getJson('/api/organiser/summary')->assertOk();

        $summary->assertJsonPath('revenue.net', 60)->assertJsonPath('tickets_sold', 1)->assertJsonPath('events', 1);
    }

    public function test_event_stats_include_that_events_revenue(): void
    {
        $organiser = $this->organiser();
        $booking = $this->sale($organiser, 80);
        $eventId = $booking->ticketType->event_id;

        $this->actingAs($organiser, 'sanctum')->getJson("/api/events/{$eventId}/stats")
            ->assertOk()->assertJsonPath('revenue.net', 80);
    }

    public function test_customers_cannot_read_the_organiser_summary(): void
    {
        $this->actingAs($this->customer(), 'sanctum')->getJson('/api/organiser/summary')->assertForbidden();
        $this->app['auth']->forgetGuards();
        $this->getJson('/api/organiser/summary')->assertUnauthorized();
    }
}
