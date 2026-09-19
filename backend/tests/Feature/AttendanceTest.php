<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Feature\Concerns\BuildsScenarios;
use Tests\TestCase;

class AttendanceTest extends TestCase
{
    use BuildsScenarios;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpScenarios();
    }

    /** A finished event with the given number of confirmed guests and guests who came. */
    private function finished(User $organiser, int $confirmed, int $attended, string $status = 'completed'): Event
    {
        $event = $this->publishedEvent($organiser);
        $tier = $this->tier(seats: 50, event: $event);
        foreach (range(1, $confirmed + $attended) as $i) {
            $booking = $this->book($this->customer(), $tier);
            $booking->update(['status' => $i <= $attended ? 'attended' : 'confirmed']);
        }

        // Only now does the event move into the past: a finished event takes no more bookings.
        $event->update(['status' => $status, 'start_at' => now()->subDays(3), 'end_at' => now()->subDays(3)->addHours(2)]);

        return $event;
    }

    public function test_it_counts_who_registered_and_who_came_for_finished_events(): void
    {
        $organiser = $this->organiser();
        $this->finished($organiser, confirmed: 3, attended: 7);

        $res = $this->actingAs($organiser, 'sanctum')->getJson('/api/organiser/attendance')->assertOk();

        $res->assertJsonPath('events.0.registered', 10)->assertJsonPath('events.0.attended', 7)->assertJsonPath('events.0.rate', 70);
        $res->assertJsonPath('registered', 10)->assertJsonPath('attended', 7)->assertJsonPath('rate', 70);
    }

    public function test_cancelled_waitlisted_and_pending_bookings_are_not_counted_as_registered(): void
    {
        $organiser = $this->organiser();
        $event = $this->finished($organiser, confirmed: 2, attended: 2);
        $tier = $event->ticketTypes()->first();
        foreach (['cancelled', 'waitlisted', 'pending'] as $status) {
            \App\Models\Booking::factory()->create(['ticket_type_id' => $tier->id, 'customer_id' => $this->customer()->id, 'status' => $status]);
        }

        $this->actingAs($organiser, 'sanctum')->getJson('/api/organiser/attendance')->assertOk()->assertJsonPath('events.0.registered', 4);
    }

    public function test_an_organiser_sees_only_their_own_events_and_an_admin_sees_all(): void
    {
        $mine = $this->organiser();
        $other = $this->organiser();
        $this->finished($mine, 1, 1);
        $this->finished($other, 1, 1);
        $this->finished($other, 2, 2);

        $this->actingAs($mine, 'sanctum')->getJson('/api/organiser/attendance')->assertOk()->assertJsonCount(1, 'events');
        $this->actingAs($this->admin(), 'sanctum')->getJson('/api/organiser/attendance')->assertOk()->assertJsonCount(3, 'events');
    }

    public function test_events_still_to_come_and_drafts_are_left_out(): void
    {
        $organiser = $this->organiser();
        $upcoming = $this->publishedEvent($organiser);
        $upcoming->update(['start_at' => now()->addDays(2), 'end_at' => now()->addDays(2)->addHours(2)]);
        $this->finished($organiser, 1, 1, status: 'draft');

        $this->actingAs($organiser, 'sanctum')->getJson('/api/organiser/attendance')->assertOk()->assertJsonCount(0, 'events')->assertJsonPath('rate', null);
    }

    public function test_a_customer_has_no_access(): void
    {
        $this->actingAs($this->customer(), 'sanctum')->getJson('/api/organiser/attendance')->assertForbidden();
    }

    public function test_the_number_of_queries_does_not_grow_with_the_number_of_events(): void
    {
        $organiser = $this->organiser();
        $this->finished($organiser, 1, 1);

        $count = function () use ($organiser) {
            DB::flushQueryLog();
            DB::enableQueryLog();
            $this->actingAs($organiser, 'sanctum')->getJson('/api/organiser/attendance')->assertOk();

            return count(DB::getQueryLog());
        };

        $few = $count();
        $this->finished($organiser, 2, 1);
        $this->finished($organiser, 1, 3);

        $this->assertSame($few, $count());
    }
}
