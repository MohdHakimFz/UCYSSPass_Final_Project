<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\Venue;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Concerns\BuildsScenarios;
use Tests\TestCase;

class OnlineEventTest extends TestCase
{
    use BuildsScenarios;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpScenarios();
    }

    /** @return array<string, mixed> */
    private function onlineBody(array $extra = []): array
    {
        return array_merge([
            'title' => 'Intro to Threat Hunting (Zoom)', 'description' => 'Online', 'category' => 'workshop', 'mode' => 'online',
            'meeting_url' => 'https://zoom.us/j/123456789', 'meeting_platform' => 'zoom',
            'start_at' => now()->addDays(5)->toIso8601String(), 'end_at' => now()->addDays(5)->addHours(2)->toIso8601String(),
        ], $extra);
    }

    public function test_an_organiser_creates_an_online_event_without_choosing_a_venue(): void
    {
        $organiser = $this->organiser();

        $res = $this->actingAs($organiser, 'sanctum')->postJson('/api/events', $this->onlineBody())->assertCreated();

        $res->assertJsonPath('mode', 'online')->assertJsonPath('meeting_url', 'https://zoom.us/j/123456789')->assertJsonPath('seated', false);
        $this->assertSame(Venue::ONLINE_NAME, Venue::findOrFail($res->json('venue_id'))->name);
    }

    public function test_online_events_share_one_online_venue(): void
    {
        $organiser = $this->organiser();
        $a = $this->actingAs($organiser, 'sanctum')->postJson('/api/events', $this->onlineBody())->json('venue_id');
        $b = $this->actingAs($organiser, 'sanctum')->postJson('/api/events', $this->onlineBody(['title' => 'Second']))->json('venue_id');

        $this->assertSame($a, $b);
        $this->assertSame(1, Venue::where('name', Venue::ONLINE_NAME)->count());
    }

    public function test_a_physical_event_still_needs_a_venue_and_drops_any_meeting_link(): void
    {
        $organiser = $this->organiser();
        $body = $this->onlineBody(['mode' => 'physical']);

        $this->actingAs($organiser, 'sanctum')->postJson('/api/events', $body)->assertUnprocessable()->assertJsonValidationErrors('venue_id');

        $res = $this->actingAs($organiser, 'sanctum')->postJson('/api/events', $body + ['venue_id' => $this->venue()->id])->assertCreated();
        $res->assertJsonPath('meeting_url', null);
    }

    public function test_an_online_event_cannot_have_numbered_seats(): void
    {
        $this->actingAs($this->organiser(), 'sanctum')->postJson('/api/events', $this->onlineBody(['seated' => true]))
            ->assertUnprocessable()->assertJsonValidationErrors('seated');
    }

    public function test_an_online_event_cannot_be_published_without_a_meeting_link(): void
    {
        $organiser = $this->organiser();
        $id = $this->actingAs($organiser, 'sanctum')->postJson('/api/events', $this->onlineBody(['meeting_url' => null, 'meeting_platform' => null]))->json('id');

        $this->actingAs($organiser, 'sanctum')->putJson("/api/events/{$id}", ['status' => 'published'])
            ->assertUnprocessable()->assertJsonValidationErrors('meeting_url');

        $this->actingAs($organiser, 'sanctum')->putJson("/api/events/{$id}", ['status' => 'published', 'meeting_url' => 'https://meet.google.com/abc-defg-hij'])->assertOk();
    }

    public function test_a_meeting_link_that_is_not_a_web_address_is_refused(): void
    {
        $this->actingAs($this->organiser(), 'sanctum')->postJson('/api/events', $this->onlineBody(['meeting_url' => 'javascript:alert(1)']))
            ->assertUnprocessable()->assertJsonValidationErrors('meeting_url');
    }

    public function test_the_link_is_hidden_from_the_public_and_customers_but_not_the_organiser_or_admin(): void
    {
        $organiser = $this->organiser();
        $id = Event::factory()->create([
            'organiser_id' => $organiser->id, 'venue_id' => Venue::online()->id, 'status' => 'published', 'mode' => 'online',
            'meeting_url' => 'https://zoom.us/j/123456789', 'meeting_platform' => 'zoom',
        ])->id;

        $this->getJson("/api/events/{$id}")->assertOk()->assertJsonMissingPath('meeting_url');
        $this->getJson('/api/events?per_page=50')->assertOk()->assertJsonMissingPath('data.0.meeting_url');
        $this->actingAs($this->customer(), 'sanctum')->getJson("/api/events/{$id}")->assertJsonMissingPath('meeting_url');
        $this->actingAs($this->organiser(), 'sanctum')->getJson("/api/events/{$id}")->assertJsonMissingPath('meeting_url');

        $this->actingAs($organiser, 'sanctum')->getJson("/api/events/{$id}")->assertJsonPath('meeting_url', 'https://zoom.us/j/123456789');
        $this->actingAs($this->admin(), 'sanctum')->getJson("/api/events/{$id}")->assertJsonPath('meeting_url', 'https://zoom.us/j/123456789');
    }

    public function test_switching_a_seated_event_to_online_turns_its_seats_off(): void
    {
        $organiser = $this->organiser();
        $event = $this->publishedEvent($organiser);
        $tier = $this->tier(seats: 4, event: $event);
        $this->actingAs($organiser, 'sanctum')->putJson("/api/events/{$event->id}", ['seated' => true])->assertOk();
        $this->assertGreaterThan(0, $tier->seats()->count());

        $this->actingAs($organiser, 'sanctum')->putJson("/api/events/{$event->id}", ['mode' => 'online', 'meeting_url' => 'https://zoom.us/j/1'])
            ->assertOk()->assertJsonPath('seated', false);

        $this->assertSame(0, $tier->seats()->count());
        $this->assertSame(Venue::ONLINE_NAME, Event::find($event->id)->venue->name);
    }

    public function test_an_online_event_takes_bookings_without_a_seat(): void
    {
        $organiser = $this->organiser();
        $id = $this->actingAs($organiser, 'sanctum')->postJson('/api/events', $this->onlineBody(['status' => 'published']))->json('id');
        $tier = $this->tier(seats: 2, event: Event::find($id));

        $this->actingAs($this->customer(), 'sanctum')->postJson('/api/bookings', ['ticket_type_id' => $tier->id])
            ->assertCreated()->assertJsonPath('status', 'confirmed')->assertJsonPath('seat', null);
    }

    /** A confirmed guest of an online event that starts in $startsInMinutes. */
    private function guest(int $startsInMinutes, string $status = 'confirmed'): array
    {
        $event = Event::factory()->create([
            'organiser_id' => $this->organiser()->id, 'venue_id' => Venue::online()->id, 'status' => 'published', 'mode' => 'online',
            'meeting_url' => 'https://zoom.us/j/999', 'meeting_platform' => 'zoom',
            'start_at' => now()->addMinutes($startsInMinutes), 'end_at' => now()->addMinutes($startsInMinutes + 90),
        ]);
        $customer = $this->customer();
        $booking = $this->book($customer, $this->tier(seats: 3, event: $event));
        $booking->update(['status' => $status]);

        return [$customer, $booking];
    }

    public function test_a_guest_sees_when_the_meeting_opens_but_never_the_link_in_their_booking(): void
    {
        [$customer, $booking] = $this->guest(120);

        $res = $this->actingAs($customer, 'sanctum')->getJson('/api/bookings')->assertOk();

        $res->assertJsonPath('data.0.meeting.platform', 'zoom')->assertJsonPath('data.0.meeting.open', false);
        $this->assertStringNotContainsString('zoom.us/j/999', $res->getContent());
        $this->assertStringNotContainsString('zoom.us/j/999', $this->actingAs($customer, 'sanctum')->getJson("/api/bookings/{$booking->id}")->getContent());
    }

    public function test_joining_before_the_meeting_opens_is_refused(): void
    {
        [$customer, $booking] = $this->guest(120);

        $this->actingAs($customer, 'sanctum')->postJson("/api/bookings/{$booking->id}/join")->assertUnprocessable();
        $this->assertSame('confirmed', $booking->fresh()->status);
    }

    public function test_joining_when_it_is_open_returns_the_link_and_counts_as_attending(): void
    {
        [$customer, $booking] = $this->guest(10);

        $this->actingAs($customer, 'sanctum')->getJson('/api/bookings')->assertJsonPath('data.0.meeting.open', true);
        $this->actingAs($customer, 'sanctum')->postJson("/api/bookings/{$booking->id}/join")
            ->assertOk()->assertJsonPath('meeting_url', 'https://zoom.us/j/999');

        $this->assertSame('attended', $booking->fresh()->status);
        $this->assertNotNull($booking->fresh()->checked_in_at);
        $this->actingAs($customer, 'sanctum')->postJson("/api/bookings/{$booking->id}/join")->assertOk();
    }

    public function test_nobody_else_can_join_with_someone_elses_booking(): void
    {
        [, $booking] = $this->guest(10);

        $this->actingAs($this->customer(), 'sanctum')->postJson("/api/bookings/{$booking->id}/join")->assertForbidden();
        $this->actingAs($this->admin(), 'sanctum')->postJson("/api/bookings/{$booking->id}/join")->assertForbidden();
    }

    public function test_a_waitlisted_or_cancelled_booking_has_no_meeting(): void
    {
        foreach (['waitlisted', 'cancelled', 'pending'] as $status) {
            [$customer, $booking] = $this->guest(10, $status);

            $this->actingAs($customer, 'sanctum')->getJson('/api/bookings')->assertJsonPath('data.0.meeting', null);
            $this->actingAs($customer, 'sanctum')->postJson("/api/bookings/{$booking->id}/join")->assertUnprocessable();
        }
    }

    public function test_a_physical_booking_has_no_meeting(): void
    {
        $tier = $this->tier(seats: 2, event: $this->publishedEvent());
        $customer = $this->customer();
        $this->book($customer, $tier);

        $this->actingAs($customer, 'sanctum')->getJson('/api/bookings')->assertJsonPath('data.0.meeting', null);
    }

    public function test_the_platform_comes_from_the_link_and_follows_it_when_the_link_changes(): void
    {
        $organiser = $this->organiser();
        $res = $this->actingAs($organiser, 'sanctum')->postJson('/api/events', $this->onlineBody(['meeting_url' => 'https://meet.google.com/abc-defg-hij', 'meeting_platform' => 'zoom']))->assertCreated();
        $res->assertJsonPath('meeting_platform', 'meet');

        $this->actingAs($organiser, 'sanctum')->putJson('/api/events/'.$res->json('id'), ['meeting_url' => 'https://uptm.zoom.us/j/55'])
            ->assertOk()->assertJsonPath('meeting_platform', 'zoom');

        // A change that leaves the link alone leaves the platform alone too.
        $this->actingAs($organiser, 'sanctum')->putJson('/api/events/'.$res->json('id'), ['title' => 'Renamed'])
            ->assertOk()->assertJsonPath('meeting_platform', 'zoom');
    }

    public function test_a_cancelled_booking_gets_no_qr_code(): void
    {
        $tier = $this->tier(seats: 2, event: $this->publishedEvent());
        $customer = $this->customer();
        $booking = $this->book($customer, $tier);
        $this->actingAs($customer, 'sanctum')->putJson("/api/bookings/{$booking->id}/cancel")->assertOk();

        $this->actingAs($customer, 'sanctum')->getJson("/api/bookings/{$booking->id}/qr-code")->assertNotFound();
    }
}
