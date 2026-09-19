<?php

namespace Tests\Feature;

use App\Models\Booking;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Concerns\BuildsScenarios;
use Tests\TestCase;

class SeatMapTest extends TestCase
{
    use BuildsScenarios;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpScenarios();
    }

    /** A seated event with one tier of four seats. */
    private function seatedEvent($organiser): array
    {
        $event = $this->publishedEvent($organiser);
        $tier = $this->tier(seats: 4, event: $event);
        $this->actingAs($organiser, 'sanctum')->putJson("/api/events/{$event->id}", ['seated' => true])->assertOk();

        return [$event, $tier];
    }

    public function test_the_organiser_sees_every_seat_and_who_holds_it(): void
    {
        $organiser = $this->organiser();
        [$event, $tier] = $this->seatedEvent($organiser);
        $guest = $this->customer();
        $seat = $tier->seats()->orderBy('id')->first();
        $this->actingAs($guest, 'sanctum')->postJson('/api/bookings', ['ticket_type_id' => $tier->id, 'seat_id' => $seat->id])->assertCreated();

        $res = $this->actingAs($organiser, 'sanctum')->getJson("/api/events/{$event->id}/seat-map")->assertOk();

        $res->assertJsonPath('seated', true)->assertJsonCount(4, 'tiers.0.seats');
        $res->assertJsonPath('tiers.0.seats.0.state', 'booked')->assertJsonPath('tiers.0.seats.0.guest.email', $guest->email);
        $res->assertJsonPath('tiers.0.seats.1.state', 'free')->assertJsonPath('tiers.0.seats.1.guest', null);
    }

    public function test_a_checked_in_guest_and_an_unpaid_hold_show_their_own_states(): void
    {
        $organiser = $this->organiser();
        [$event, $tier] = $this->seatedEvent($organiser);
        $seats = $tier->seats()->orderBy('id')->get();
        $a = $this->customer();
        $b = $this->customer();
        $this->actingAs($a, 'sanctum')->postJson('/api/bookings', ['ticket_type_id' => $tier->id, 'seat_id' => $seats[0]->id])->assertCreated();
        $this->actingAs($b, 'sanctum')->postJson('/api/bookings', ['ticket_type_id' => $tier->id, 'seat_id' => $seats[1]->id])->assertCreated();
        Booking::where('seat_id', $seats[0]->id)->update(['status' => 'attended', 'checked_in_at' => now()]);
        Booking::where('seat_id', $seats[1]->id)->update(['status' => 'pending', 'hold_expires_at' => now()->addMinutes(3)]);

        $res = $this->actingAs($organiser, 'sanctum')->getJson("/api/events/{$event->id}/seat-map")->assertOk();

        $res->assertJsonPath('tiers.0.seats.0.state', 'attended')->assertJsonPath('tiers.0.seats.1.state', 'held');
    }

    public function test_only_the_owner_and_an_admin_can_open_the_seat_map(): void
    {
        $organiser = $this->organiser();
        [$event] = $this->seatedEvent($organiser);

        $this->actingAs($this->organiser(), 'sanctum')->getJson("/api/events/{$event->id}/seat-map")->assertForbidden();
        $this->actingAs($this->customer(), 'sanctum')->getJson("/api/events/{$event->id}/seat-map")->assertForbidden();
        $this->actingAs($this->admin(), 'sanctum')->getJson("/api/events/{$event->id}/seat-map")->assertOk();
    }

    public function test_an_event_without_numbered_seats_has_an_empty_map(): void
    {
        $organiser = $this->organiser();
        $event = $this->publishedEvent($organiser);
        $this->tier(seats: 3, event: $event);

        $this->actingAs($organiser, 'sanctum')->getJson("/api/events/{$event->id}/seat-map")
            ->assertOk()->assertJsonPath('seated', false)->assertJsonCount(0, 'tiers.0.seats');
    }
}
