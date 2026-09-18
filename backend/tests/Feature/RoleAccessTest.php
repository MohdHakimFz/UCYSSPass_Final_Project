<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Event;
use App\Models\Venue;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Concerns\BuildsScenarios;
use Tests\TestCase;

class RoleAccessTest extends TestCase
{
    use BuildsScenarios;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpScenarios();
    }

    private function eventPayload(): array
    {
        return [
            'venue_id' => Venue::factory()->create()->id,
            'title' => 'Web Security CTF Night',
            'category' => 'ctf',
            'start_at' => now()->addWeek()->toIso8601String(),
            'end_at' => now()->addWeek()->addHours(6)->toIso8601String(),
        ];
    }

    public function test_events_and_venues_are_public_to_read(): void
    {
        $this->publishedEvent();
        Venue::factory()->create();

        $this->getJson('/api/events')->assertOk();
        $this->getJson('/api/venues')->assertOk();
    }

    public function test_a_customer_cannot_create_an_event(): void
    {
        $this->actingAs($this->customer(), 'sanctum')->postJson('/api/events', $this->eventPayload())->assertForbidden();
    }

    public function test_an_organiser_can_create_an_event_and_owns_it(): void
    {
        $organiser = $this->organiser();

        $this->actingAs($organiser, 'sanctum')
            ->postJson('/api/events', $this->eventPayload())
            ->assertCreated()
            ->assertJsonPath('organiser_id', $organiser->id);
    }

    public function test_an_organiser_cannot_edit_or_delete_another_organisers_event(): void
    {
        $event = $this->publishedEvent($this->organiser());
        $other = $this->organiser();

        $this->actingAs($other, 'sanctum')->putJson("/api/events/{$event->id}", ['title' => 'Hijacked'])->assertForbidden();
        $this->actingAs($other, 'sanctum')->deleteJson("/api/events/{$event->id}")->assertForbidden();
        $this->assertNotSame('Hijacked', $event->fresh()->title);
    }

    public function test_an_event_must_end_after_it_starts(): void
    {
        $payload = $this->eventPayload();
        $payload['end_at'] = now()->subDay()->toIso8601String();

        $this->actingAs($this->organiser(), 'sanctum')->postJson('/api/events', $payload)
            ->assertUnprocessable()->assertJsonValidationErrors('end_at');
    }

    public function test_cancelling_an_event_cancels_every_active_booking(): void
    {
        $organiser = $this->organiser();
        $event = $this->publishedEvent($organiser);
        $tier = $this->tier(seats: 1, event: $event);
        $confirmed = $this->book($this->customer(), $tier);
        $waitlisted = $this->book($this->customer(), $tier);

        $this->actingAs($organiser, 'sanctum')
            ->putJson("/api/events/{$event->id}", ['status' => 'cancelled'])
            ->assertOk()
            ->assertJsonPath('cancelled_bookings', 2);

        $this->assertSame('cancelled', $confirmed->fresh()->status);
        $this->assertSame('cancelled', $waitlisted->fresh()->status);
    }

    public function test_only_an_admin_can_write_venues(): void
    {
        $payload = ['name' => 'Packet Storm Arena', 'address' => '1 Jalan Ampang', 'capacity' => 300];

        $this->actingAs($this->organiser(), 'sanctum')->postJson('/api/venues', $payload)->assertForbidden();
        $this->actingAs($this->admin(), 'sanctum')->postJson('/api/venues', $payload)->assertCreated();
    }

    public function test_only_an_admin_can_read_platform_stats_and_manage_users(): void
    {
        $this->actingAs($this->organiser(), 'sanctum')->getJson('/api/admin/stats')->assertForbidden();
        $this->actingAs($this->customer(), 'sanctum')->getJson('/api/users')->assertForbidden();

        $this->actingAs($this->admin(), 'sanctum')->getJson('/api/admin/stats')->assertOk();
        $this->actingAs($this->admin(), 'sanctum')->getJson('/api/users')->assertOk();
    }

    public function test_the_attendee_export_is_a_csv_that_defuses_spreadsheet_formulas(): void
    {
        $organiser = $this->organiser();
        $tier = $this->tier(seats: 5, event: $this->publishedEvent($organiser));
        $evil = \App\Models\User::factory()->create(['name' => '=HYPERLINK("http://evil.test")']);
        $this->book($evil, $tier);

        $response = $this->actingAs($organiser, 'sanctum')->get("/api/events/{$tier->event_id}/export");

        $response->assertOk();
        $this->assertStringContainsString('text/csv', $response->headers->get('Content-Type'));
        $this->assertStringNotContainsString(',=HYPERLINK', $response->streamedContent());
        $this->assertStringContainsString("'=HYPERLINK", $response->streamedContent());
    }

    public function test_duplicating_an_event_copies_it_as_a_draft_with_no_bookings(): void
    {
        $organiser = $this->organiser();
        $event = $this->publishedEvent($organiser);
        $this->tier(seats: 10, event: $event);

        $copyId = $this->actingAs($organiser, 'sanctum')->postJson("/api/events/{$event->id}/duplicate")
            ->assertCreated()->json('id');

        $this->assertSame('draft', Event::find($copyId)->status);
        $this->assertSame(0, Booking::whereHas('ticketType', fn ($q) => $q->where('event_id', $copyId))->count());
    }
}
