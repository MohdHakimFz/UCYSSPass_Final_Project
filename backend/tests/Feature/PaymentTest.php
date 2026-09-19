<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Payment;
use App\Models\TicketType;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Concerns\BuildsScenarios;
use Tests\TestCase;

class PaymentTest extends TestCase
{
    use BuildsScenarios;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpScenarios();
    }

    private function pricedTier(int $seats = 2, float $price = 50, ?User $organiser = null, ?\DateTimeInterface $starts = null): TicketType
    {
        $event = $this->publishedEvent($organiser);
        if ($starts) {
            $event->update(['start_at' => $starts, 'end_at' => (clone \Carbon\Carbon::instance($starts))->addHours(6)]);
        }

        return $this->tier($seats, $event, $price);
    }

    private function hold(User $who, TicketType $tier)
    {
        return $this->actingAs($who, 'sanctum')->postJson('/api/bookings', ['ticket_type_id' => $tier->id]);
    }

    private function pay(User $who, int $bookingId, array $body = ['method' => 'card'])
    {
        return $this->actingAs($who, 'sanctum')->postJson("/api/bookings/{$bookingId}/pay", $body);
    }

    public function test_a_priced_ticket_is_held_for_the_customer_not_confirmed(): void
    {
        $tier = $this->pricedTier(seats: 3);

        $response = $this->hold($this->customer(), $tier)->assertCreated();

        $response->assertJsonPath('status', 'pending');
        $this->assertNull($response->json('qr_token'));
        $this->assertNotNull($response->json('hold_expires_at'));
        $this->assertSame(2, $tier->fresh()->seats_remaining, 'the seat is taken off sale while it is held');
        $this->assertDatabaseMissing('notifications', ['booking_id' => $response->json('id')]);
    }

    public function test_a_free_ticket_is_still_confirmed_straight_away(): void
    {
        $tier = $this->tier(seats: 2);

        $this->hold($this->customer(), $tier)->assertCreated()->assertJsonPath('status', 'confirmed');
    }

    public function test_paying_confirms_the_booking_issues_the_pass_and_records_the_payment(): void
    {
        $tier = $this->pricedTier();
        $customer = $this->customer();
        $id = $this->hold($customer, $tier)->json('id');

        $this->pay($customer, $id, ['method' => 'fpx'])
            ->assertOk()
            ->assertJsonPath('status', 'confirmed')
            ->assertJsonPath('payment.status', 'paid')
            ->assertJsonPath('payment.method', 'fpx');

        $booking = Booking::find($id);
        $this->assertNotEmpty($booking->qr_token);
        $this->assertNull($booking->hold_expires_at);
        $this->assertDatabaseHas('payments', ['booking_id' => $id, 'status' => 'paid', 'amount' => 50]);
        $this->assertDatabaseHas('notifications', ['booking_id' => $id, 'type' => 'confirmation']);
    }

    public function test_a_declined_payment_keeps_the_hold_so_they_can_try_again(): void
    {
        $tier = $this->pricedTier();
        $customer = $this->customer();
        $id = $this->hold($customer, $tier)->json('id');

        $this->pay($customer, $id, ['method' => 'card', 'outcome' => 'decline'])
            ->assertStatus(402)
            ->assertJsonPath('message', 'The payment was declined. Try another payment method.');

        $this->assertSame('pending', Booking::find($id)->status);
        $this->assertDatabaseHas('payments', ['booking_id' => $id, 'status' => 'failed']);

        $this->pay($customer, $id, ['method' => 'ewallet'])->assertOk()->assertJsonPath('status', 'confirmed');
    }

    public function test_an_unpaid_hold_runs_out_and_the_seat_goes_back_on_sale(): void
    {
        $tier = $this->pricedTier(seats: 1);
        $slow = $this->customer();
        $id = $this->hold($slow, $tier)->json('id');
        $this->assertSame(0, $tier->fresh()->seats_remaining);

        $this->travel(4)->minutes();

        // The next person to book finds the seat free again.
        $this->hold($this->customer(), $tier)->assertCreated()->assertJsonPath('status', 'pending');
        $this->assertSame('cancelled', Booking::find($id)->status);
        $this->assertDatabaseMissing('notifications', ['booking_id' => $id, 'type' => 'cancelled']);
    }

    public function test_paying_after_the_hold_ran_out_is_refused(): void
    {
        $tier = $this->pricedTier();
        $customer = $this->customer();
        $id = $this->hold($customer, $tier)->json('id');

        $this->travel(4)->minutes();

        $this->pay($customer, $id)->assertStatus(409);
        $this->assertDatabaseMissing('payments', ['booking_id' => $id, 'status' => 'paid']);
        $this->assertSame('cancelled', Booking::find($id)->status);
    }

    public function test_the_release_command_gives_back_expired_holds(): void
    {
        $tier = $this->pricedTier(seats: 2);
        $this->hold($this->customer(), $tier)->assertCreated();
        $this->assertSame(1, $tier->fresh()->seats_remaining);

        $this->travel(5)->minutes();
        $this->artisan('bookings:release-expired')->assertSuccessful();

        $this->assertSame(2, $tier->fresh()->seats_remaining);
    }

    public function test_an_expired_hold_hands_its_seat_to_the_waitlist_with_time_to_pay(): void
    {
        $tier = $this->pricedTier(seats: 1);
        $slow = $this->customer();
        $waiting = $this->customer();
        $this->hold($slow, $tier)->assertCreated();
        $queued = $this->hold($waiting, $tier)->assertCreated()->assertJsonPath('status', 'waitlisted')->json('id');

        $this->travel(4)->minutes();
        $this->artisan('bookings:release-expired')->assertSuccessful();

        $promoted = Booking::find($queued);
        $this->assertSame('pending', $promoted->status, 'promoted people still have to pay');
        $this->assertNotNull($promoted->hold_expires_at);
        $this->assertTrue($promoted->hold_expires_at->gt(now()->addMinutes(25)), 'a longer hold than a fresh booking gets');
        $this->assertDatabaseHas('notifications', ['booking_id' => $queued, 'type' => 'waitlist_promoted']);
        $this->pay($waiting, $queued)->assertOk()->assertJsonPath('status', 'confirmed');
    }

    public function test_only_the_customer_who_holds_a_booking_can_pay_and_a_paid_one_cannot_be_paid_twice(): void
    {
        $tier = $this->pricedTier();
        $customer = $this->customer();
        $id = $this->hold($customer, $tier)->json('id');

        $this->pay($this->customer(), $id)->assertForbidden();
        $this->pay($this->organiser(), $id)->assertForbidden();
        $this->app['auth']->forgetGuards(); // the calls above were signed in; this one is not
        $this->postJson("/api/bookings/{$id}/pay", ['method' => 'card'])->assertUnauthorized();

        $this->pay($customer, $id)->assertOk();
        $this->pay($customer, $id)->assertStatus(409);
        $this->assertSame(1, Payment::where('booking_id', $id)->where('status', 'paid')->count());
    }

    public function test_the_payment_method_is_validated(): void
    {
        $tier = $this->pricedTier();
        $customer = $this->customer();
        $id = $this->hold($customer, $tier)->json('id');

        $this->pay($customer, $id, ['method' => 'cheque'])->assertUnprocessable()->assertJsonValidationErrors('method');
    }

    public function test_a_held_booking_cannot_be_checked_in(): void
    {
        $organiser = $this->organiser();
        $tier = $this->pricedTier(organiser: $organiser);
        $id = $this->hold($this->customer(), $tier)->json('id');

        $this->actingAs($organiser, 'sanctum')
            ->postJson("/api/bookings/{$id}/checkin", ['qr_token' => 'anything'])
            ->assertStatus(409);
    }

    public function test_cancelling_early_refunds_the_payment(): void
    {
        $tier = $this->pricedTier(starts: now()->addDays(10));
        $customer = $this->customer();
        $id = $this->hold($customer, $tier)->json('id');
        $this->pay($customer, $id)->assertOk();

        $this->actingAs($customer, 'sanctum')->putJson("/api/bookings/{$id}/cancel")
            ->assertOk()
            ->assertJsonPath('refund.refunded', true)
            ->assertJsonPath('refund.amount', '50.00');

        $this->assertDatabaseHas('payments', ['booking_id' => $id, 'status' => 'refunded', 'refunded_amount' => 50]);
    }

    public function test_cancelling_inside_the_cut_off_is_allowed_but_not_refunded(): void
    {
        $tier = $this->pricedTier(starts: now()->addHours(5));
        $customer = $this->customer();
        $id = $this->hold($customer, $tier)->json('id');
        $this->pay($customer, $id)->assertOk();

        $this->actingAs($customer, 'sanctum')->putJson("/api/bookings/{$id}/cancel")
            ->assertOk()
            ->assertJsonPath('refund.refunded', false);

        $this->assertDatabaseHas('payments', ['booking_id' => $id, 'status' => 'paid']);
        $this->assertSame('cancelled', Booking::find($id)->status);
    }

    public function test_walking_away_from_checkout_releases_the_seat_without_an_email(): void
    {
        $tier = $this->pricedTier(seats: 1);
        $customer = $this->customer();
        $id = $this->hold($customer, $tier)->json('id');

        $this->actingAs($customer, 'sanctum')->putJson("/api/bookings/{$id}/cancel")->assertOk();

        $this->assertSame(1, $tier->fresh()->seats_remaining);
        $this->assertDatabaseMissing('notifications', ['booking_id' => $id, 'type' => 'cancelled']);
    }

    public function test_cancelling_the_whole_event_refunds_everyone_who_paid(): void
    {
        $organiser = $this->organiser();
        $tier = $this->pricedTier(seats: 3, organiser: $organiser, starts: now()->addHours(3));
        $one = $this->customer();
        $two = $this->customer();
        $a = $this->hold($one, $tier)->json('id');
        $b = $this->hold($two, $tier)->json('id');
        $this->pay($one, $a)->assertOk();

        $this->actingAs($organiser, 'sanctum')->putJson("/api/events/{$tier->event_id}", ['status' => 'cancelled'])->assertOk();

        $this->assertDatabaseHas('payments', ['booking_id' => $a, 'status' => 'refunded', 'refunded_amount' => 50]);
        $this->assertSame('cancelled', Booking::find($b)->status);
        $this->assertSame('cancelled', Booking::find($a)->status);
    }

    public function test_a_held_seat_on_a_seated_event_shows_as_taken_until_it_expires(): void
    {
        $organiser = $this->organiser();
        $event = $this->publishedEvent($organiser);
        $event->update(['seated' => true]);
        $tier = TicketType::create(['event_id' => $event->id, 'name' => 'Floor', 'price' => 30, 'capacity' => 4, 'seats_per_row' => 2, 'seats_remaining' => 4]);
        app(\App\Services\SeatingService::class)->sync($tier);
        $seat = $tier->seats()->first();

        $this->actingAs($this->customer(), 'sanctum')
            ->postJson('/api/bookings', ['ticket_type_id' => $tier->id, 'seat_id' => $seat->id])
            ->assertCreated()->assertJsonPath('status', 'pending');

        $taken = fn () => collect($this->getJson("/api/ticket-types/{$tier->id}/seats")->json())->firstWhere('id', $seat->id)['taken'];

        $this->assertTrue($taken());

        $this->travel(4)->minutes();

        $this->assertFalse($taken(), 'the seat is offered again once the hold has run out');
    }

    public function test_a_customer_cannot_hold_the_same_ticket_twice(): void
    {
        $tier = $this->pricedTier(seats: 3);
        $customer = $this->customer();
        $this->hold($customer, $tier)->assertCreated();

        $this->hold($customer, $tier)->assertStatus(409);
        $this->assertSame(2, $tier->fresh()->seats_remaining);
    }
}
