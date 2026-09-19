<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Event;
use App\Models\Seat;
use App\Models\TicketType;
use App\Models\User;
use App\Services\SeatingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Concerns\BuildsScenarios;
use Tests\TestCase;

class SeatingTest extends TestCase
{
    use BuildsScenarios;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpScenarios();
    }

    /** A published, seated event with one tier of the given size, seats already built. */
    private function seatedTier(int $capacity = 6, int $perRow = 3, ?User $organiser = null): TicketType
    {
        $event = $this->publishedEvent($organiser);
        $event->update(['seated' => true]);

        $tier = TicketType::create([
            'event_id' => $event->id,
            'name' => 'Floor',
            'price' => 0,
            'capacity' => $capacity,
            'seats_per_row' => $perRow,
            'seats_remaining' => $capacity,
        ]);
        app(SeatingService::class)->sync($tier);

        return $tier->fresh();
    }

    private function pick(User $who, TicketType $tier, ?int $seatId)
    {
        return $this->actingAs($who, 'sanctum')->postJson('/api/bookings', ['ticket_type_id' => $tier->id, 'seat_id' => $seatId]);
    }

    public function test_row_labels_run_a_to_z_then_aa(): void
    {
        $this->assertSame('A', SeatingService::rowLabel(0));
        $this->assertSame('Z', SeatingService::rowLabel(25));
        $this->assertSame('AA', SeatingService::rowLabel(26));
        $this->assertSame('AB', SeatingService::rowLabel(27));
    }

    public function test_a_seated_tier_gets_one_numbered_seat_per_capacity_in_rows(): void
    {
        $tier = $this->seatedTier(capacity: 7, perRow: 3);

        $labels = $tier->seats()->orderBy('id')->get()->pluck('label')->all();

        $this->assertSame(['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1'], $labels);
    }

    public function test_the_seat_list_is_public_and_shows_only_taken_or_free(): void
    {
        $tier = $this->seatedTier();
        $seat = $tier->seats()->first();
        $this->pick($this->customer(), $tier, $seat->id)->assertCreated();

        $response = $this->getJson("/api/ticket-types/{$tier->id}/seats")->assertOk();

        $this->assertCount(6, $response->json());
        $this->assertTrue(collect($response->json())->firstWhere('id', $seat->id)['taken']);
        $this->assertSame(1, collect($response->json())->where('taken', true)->count());
        $this->assertArrayNotHasKey('customer', $response->json()[0]);
    }

    public function test_booking_a_free_seat_confirms_it_and_reports_the_seat(): void
    {
        $tier = $this->seatedTier();
        $seat = $tier->seats()->where('row_label', 'B')->where('number', 2)->first();

        $response = $this->pick($this->customer(), $tier, $seat->id)->assertCreated();

        $response->assertJsonPath('status', 'confirmed')->assertJsonPath('seat.label', 'B2');
        $this->assertSame(5, $tier->fresh()->seats_remaining);
    }

    public function test_a_seated_event_requires_a_seat_when_seats_are_available(): void
    {
        $tier = $this->seatedTier();

        $this->pick($this->customer(), $tier, null)->assertUnprocessable()->assertJsonValidationErrors('seat_id');
        $this->assertSame(6, $tier->fresh()->seats_remaining);
    }

    public function test_a_taken_seat_cannot_be_booked_twice(): void
    {
        $tier = $this->seatedTier();
        $seat = $tier->seats()->first();
        $this->pick($this->customer(), $tier, $seat->id)->assertCreated();

        $this->pick($this->customer(), $tier, $seat->id)->assertStatus(409);

        $this->assertSame(1, Booking::where('seat_id', $seat->id)->count());
        $this->assertSame(5, $tier->fresh()->seats_remaining);
    }

    public function test_a_seat_from_another_tier_is_refused(): void
    {
        $tier = $this->seatedTier();
        $other = $this->seatedTier();

        $this->pick($this->customer(), $tier, $other->seats()->first()->id)->assertUnprocessable()->assertJsonValidationErrors('seat_id');
    }

    public function test_when_every_seat_is_taken_the_next_customer_joins_the_waitlist_without_a_seat(): void
    {
        $tier = $this->seatedTier(capacity: 2, perRow: 2);
        foreach ($tier->seats as $seat) {
            $this->pick($this->customer(), $tier, $seat->id)->assertCreated();
        }

        $this->pick($this->customer(), $tier, $tier->seats->first()->id)
            ->assertCreated()
            ->assertJsonPath('status', 'waitlisted')
            ->assertJsonPath('seat', null);
    }

    public function test_cancelling_hands_the_same_seat_to_the_first_person_on_the_waitlist(): void
    {
        $tier = $this->seatedTier(capacity: 1, perRow: 1);
        $seat = $tier->seats()->first();
        $holder = $this->customer();
        $waiting = $this->customer();
        $held = $this->pick($holder, $tier, $seat->id)->assertCreated()->json('id');
        $queued = $this->pick($waiting, $tier, null)->assertCreated()->json('id');

        $this->actingAs($holder, 'sanctum')->putJson("/api/bookings/{$held}/cancel")->assertOk();

        $this->assertNull(Booking::find($held)->seat_id);
        $this->assertSame('confirmed', Booking::find($queued)->status);
        $this->assertSame($seat->id, Booking::find($queued)->seat_id);
        $this->assertSame(0, $tier->fresh()->seats_remaining);
    }

    public function test_cancelling_with_nobody_waiting_frees_the_seat_for_others(): void
    {
        $tier = $this->seatedTier();
        $seat = $tier->seats()->first();
        $customer = $this->customer();
        $id = $this->pick($customer, $tier, $seat->id)->assertCreated()->json('id');

        $this->actingAs($customer, 'sanctum')->putJson("/api/bookings/{$id}/cancel")->assertOk();

        $this->assertSame(6, $tier->fresh()->seats_remaining);
        $this->pick($this->customer(), $tier, $seat->id)->assertCreated();
    }

    public function test_growing_a_tier_adds_seats_and_shrinking_removes_only_free_ones(): void
    {
        $organiser = $this->organiser();
        $tier = $this->seatedTier(capacity: 4, perRow: 2, organiser: $organiser);
        $this->pick($this->customer(), $tier, $tier->seats()->orderBy('id')->first()->id)->assertCreated();

        $this->actingAs($organiser, 'sanctum')->putJson("/api/ticket-types/{$tier->id}", ['capacity' => 6])->assertOk();
        $this->assertSame(6, $tier->seats()->count());
        $this->assertSame(5, $tier->fresh()->seats_remaining);

        $this->actingAs($organiser, 'sanctum')->putJson("/api/ticket-types/{$tier->id}", ['capacity' => 1])->assertOk();
        $this->assertSame(1, $tier->seats()->count());
        $this->assertSame(0, $tier->fresh()->seats_remaining);

        $this->actingAs($organiser, 'sanctum')->putJson("/api/ticket-types/{$tier->id}", ['capacity' => 0])
            ->assertUnprocessable()->assertJsonValidationErrors('capacity');
        $this->assertSame(1, $tier->seats()->count(), 'a booked seat is never removed');
    }

    public function test_adding_a_tier_to_a_seated_event_builds_its_seats(): void
    {
        $organiser = $this->organiser();
        $event = $this->publishedEvent($organiser);
        $event->update(['seated' => true]);

        $this->actingAs($organiser, 'sanctum')
            ->postJson("/api/events/{$event->id}/ticket-types", ['name' => 'VIP', 'price' => 50, 'capacity' => 8, 'seats_per_row' => 4])
            ->assertCreated();

        $tier = $event->ticketTypes()->first();
        $this->assertSame(8, $tier->seats()->count());
        $this->assertSame(['A', 'B'], $tier->seats()->pluck('row_label')->unique()->values()->all());
    }

    public function test_turning_seating_on_gives_existing_guests_the_first_seats_in_booking_order(): void
    {
        $organiser = $this->organiser();
        $tier = $this->tier(seats: 5, event: $this->publishedEvent($organiser));
        $first = $this->book($this->customer(), $tier);
        $second = $this->book($this->customer(), $tier);

        $this->actingAs($organiser, 'sanctum')->putJson("/api/events/{$tier->event_id}", ['seated' => true])->assertOk();

        $this->assertSame('A1', $first->fresh()->seat->label);
        $this->assertSame('A2', $second->fresh()->seat->label);
        $this->assertSame(3, $tier->fresh()->seats_remaining);
    }

    public function test_turning_seating_off_keeps_the_bookings_and_removes_the_seats(): void
    {
        $organiser = $this->organiser();
        $tier = $this->seatedTier(organiser: $organiser);
        $booking = Booking::find($this->pick($this->customer(), $tier, $tier->seats()->first()->id)->json('id'));

        $this->actingAs($organiser, 'sanctum')->putJson("/api/events/{$tier->event_id}", ['seated' => false])->assertOk();

        $this->assertSame('confirmed', $booking->fresh()->status);
        $this->assertNull($booking->fresh()->seat_id);
        $this->assertSame(0, Seat::where('ticket_type_id', $tier->id)->count());
    }

    public function test_plain_events_are_unchanged_and_ignore_a_seat_id(): void
    {
        $tier = $this->tier(seats: 2);

        $this->actingAs($this->customer(), 'sanctum')
            ->postJson('/api/bookings', ['ticket_type_id' => $tier->id])
            ->assertCreated()->assertJsonPath('seat', null);
        $this->assertFalse(Event::find($tier->event_id)->seated);
    }

    public function test_check_in_and_the_booking_list_include_the_seat_and_the_export_has_a_seat_column(): void
    {
        $organiser = $this->organiser();
        $tier = $this->seatedTier(organiser: $organiser);
        $customer = $this->customer();
        $id = $this->pick($customer, $tier, $tier->seats()->where('row_label', 'B')->where('number', 1)->first()->id)->json('id');
        $token = Booking::find($id)->qr_token;

        $this->actingAs($organiser, 'sanctum')
            ->postJson("/api/bookings/{$id}/checkin", ['qr_token' => $token])
            ->assertOk()->assertJsonPath('seat.label', 'B1');
        $this->actingAs($customer, 'sanctum')->getJson('/api/bookings')->assertJsonPath('data.0.seat.label', 'B1');

        $csv = $this->actingAs($organiser, 'sanctum')->get("/api/events/{$tier->event_id}/export")->streamedContent();
        $this->assertStringContainsString('Seat', $csv);
        $this->assertStringContainsString('B1', $csv);
    }

    public function test_two_customers_racing_for_one_seat_never_both_get_it(): void
    {
        $tier = $this->seatedTier(capacity: 1, perRow: 1);
        $seat = $tier->seats()->first();
        $one = $this->customer();
        $two = $this->customer();

        $a = $this->pick($one, $tier, $seat->id)->getStatusCode();
        $b = $this->pick($two, $tier, $seat->id)->getStatusCode();

        $this->assertSame([201, 201], [$a, $b], 'the second one is waitlisted, not given the seat');
        $this->assertSame(1, Booking::where('seat_id', $seat->id)->count());
        $this->assertSame(1, Booking::where('ticket_type_id', $tier->id)->where('status', 'confirmed')->count());
        $this->assertSame(1, Booking::where('ticket_type_id', $tier->id)->where('status', 'waitlisted')->count());
    }
}
