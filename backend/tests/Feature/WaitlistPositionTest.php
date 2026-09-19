<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Feature\Concerns\BuildsScenarios;
use Tests\TestCase;

class WaitlistPositionTest extends TestCase
{
    use BuildsScenarios;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpScenarios();
    }

    /** A one-seat tier with a confirmed guest and $waiting people queued behind them. Returns the queue, first in line first. */
    private function queue(int $waiting): array
    {
        $tier = $this->tier(seats: 1);
        $this->book($this->customer(), $tier);

        return array_map(fn () => $this->book($this->customer(), $tier), range(1, $waiting));
    }

    public function test_every_waitlisted_booking_in_a_list_shows_its_place_in_the_queue(): void
    {
        $first = $this->queue(3);
        $other = $this->queue(2);

        $rows = collect($this->actingAs($this->admin(), 'sanctum')->getJson('/api/bookings?per_page=50&status=waitlisted')->assertOk()->json('data'))->keyBy('id');

        foreach ([$first, $other] as $queue) {
            foreach ($queue as $index => $booking) {
                $this->assertSame($index + 1, $rows[$booking->id]['waitlist_position'], "booking {$booking->id}");
            }
        }
    }

    public function test_a_booking_that_is_not_waitlisted_has_no_position(): void
    {
        $this->queue(1);

        $rows = $this->actingAs($this->admin(), 'sanctum')->getJson('/api/bookings?per_page=50')->assertOk()->json('data');

        foreach ($rows as $row) {
            $this->assertSame($row['status'] === 'waitlisted', array_key_exists('waitlist_position', $row));
        }
    }

    public function test_the_number_of_queries_does_not_grow_with_the_number_of_waitlisted_rows(): void
    {
        $admin = $this->admin();
        $this->queue(2);

        $count = function () use ($admin) {
            DB::flushQueryLog();
            DB::enableQueryLog();
            $this->actingAs($admin, 'sanctum')->getJson('/api/bookings?per_page=50&status=waitlisted')->assertOk();

            return count(DB::getQueryLog());
        };

        $few = $count();
        $this->queue(8);
        $many = $count();

        $this->assertSame($few, $many, 'listing more waitlisted bookings must not cost more queries');
    }

    public function test_the_place_in_the_queue_moves_up_when_someone_ahead_leaves(): void
    {
        [$first, $second] = $this->queue(2);
        $this->actingAs($first->customer, 'sanctum')->putJson("/api/bookings/{$first->id}/cancel")->assertOk();

        $this->actingAs($second->customer, 'sanctum')->getJson("/api/bookings/{$second->id}")->assertOk();
        $rows = collect($this->actingAs($this->admin(), 'sanctum')->getJson('/api/bookings?per_page=50&status=waitlisted')->json('data'))->keyBy('id');

        $this->assertArrayNotHasKey($first->id, $rows->all());
        $this->assertSame(1, $rows[$second->id]['waitlist_position']);
    }
}
