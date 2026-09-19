<?php

namespace Tests\Feature;

use App\Models\Event;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Concerns\BuildsScenarios;
use Tests\TestCase;

class EventVisibilityTest extends TestCase
{
    use BuildsScenarios;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpScenarios();
    }

    private function draft(?\App\Models\User $organiser = null): Event
    {
        $event = $this->publishedEvent($organiser);
        $event->update(['status' => 'draft']);

        return $event;
    }

    public function test_a_draft_is_hidden_from_visitors_and_customers(): void
    {
        $draft = $this->draft();

        $this->getJson("/api/events/{$draft->id}")->assertNotFound();
        $this->actingAs($this->customer(), 'sanctum')->getJson("/api/events/{$draft->id}")->assertNotFound();
        $this->getJson('/api/events?per_page=50')->assertJsonMissing(['id' => $draft->id]);
    }

    public function test_a_draft_is_visible_to_its_organiser_and_to_an_admin_only(): void
    {
        $organiser = $this->organiser();
        $draft = $this->draft($organiser);

        $this->actingAs($organiser, 'sanctum')->getJson("/api/events/{$draft->id}")->assertOk();
        $this->actingAs($organiser, 'sanctum')->getJson("/api/events?organiser_id={$organiser->id}")->assertJsonFragment(['id' => $draft->id]);
        $this->actingAs($this->admin(), 'sanctum')->getJson("/api/events/{$draft->id}")->assertOk();
        $this->actingAs($this->organiser(), 'sanctum')->getJson("/api/events/{$draft->id}")->assertNotFound();
    }

    public function test_publishing_opens_the_event_and_unpublishing_closes_it_straight_away(): void
    {
        $organiser = $this->organiser();
        $event = $this->draft($organiser);
        $tier = $this->tier(seats: 3, event: $event);
        $customer = $this->customer();

        $this->actingAs($customer, 'sanctum')->postJson('/api/bookings', ['ticket_type_id' => $tier->id])->assertStatus(409);

        $this->actingAs($organiser, 'sanctum')->putJson("/api/events/{$event->id}", ['status' => 'published'])->assertOk();
        $this->getJson("/api/events/{$event->id}")->assertOk();
        $this->actingAs($customer, 'sanctum')->postJson('/api/bookings', ['ticket_type_id' => $tier->id])->assertCreated();

        $this->actingAs($organiser, 'sanctum')->putJson("/api/events/{$event->id}", ['status' => 'draft'])->assertOk();
        $this->actingAs($customer, 'sanctum')->getJson("/api/events/{$event->id}")->assertNotFound();
    }

    public function test_an_event_that_has_ended_cannot_be_booked(): void
    {
        $event = $this->publishedEvent();
        $event->update(['start_at' => now()->subDays(2), 'end_at' => now()->subDay()]);
        $tier = $this->tier(seats: 3, event: $event);

        $this->actingAs($this->customer(), 'sanctum')->postJson('/api/bookings', ['ticket_type_id' => $tier->id])->assertStatus(409);
    }

    public function test_the_public_list_can_ask_for_events_that_have_not_ended_including_ones_running_now(): void
    {
        $upcoming = $this->publishedEvent();
        $upcoming->update(['start_at' => now()->addDays(3), 'end_at' => now()->addDays(3)->addHours(2)]);
        $running = $this->publishedEvent();
        $running->update(['start_at' => now()->subHour(), 'end_at' => now()->addDay()]);
        $over = $this->publishedEvent();
        $over->update(['start_at' => now()->subDays(2), 'end_at' => now()->subDays(2)->addHours(2)]);

        $ids = fn (string $query) => collect($this->getJson("/api/events?per_page=50&{$query}")->assertOk()->json('data'))->pluck('id');
        $notEnded = $ids('ends_after='.urlencode(now()->toIso8601String()));

        $this->assertTrue($notEnded->contains($upcoming->id));
        $this->assertTrue($notEnded->contains($running->id), 'an event that has started but not finished still shows');
        $this->assertFalse($notEnded->contains($over->id));
        $this->assertFalse($ids('from='.urlencode(now()->toIso8601String()))->contains($running->id), 'from still means "starts on or after"');
    }
}
