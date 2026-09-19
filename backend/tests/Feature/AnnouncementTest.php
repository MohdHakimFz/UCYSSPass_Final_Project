<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Event;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Factory;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\Feature\Concerns\BuildsScenarios;
use Tests\TestCase;

class AnnouncementTest extends TestCase
{
    use BuildsScenarios;
    use RefreshDatabase;

    private User $organiser;

    private Event $event;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpScenarios();
        config(['services.resend.key' => 're_test_key']);
        Http::swap(new Factory);
        Http::fake(['api.resend.com/*' => Http::response(['id' => 'email_1'], 200)]);

        $this->organiser = $this->organiser();
        $this->event = $this->publishedEvent($this->organiser);
    }

    private function send(array $body = [], ?User $as = null)
    {
        return $this->actingAs($as ?? $this->organiser, 'sanctum')->postJson("/api/events/{$this->event->id}/announcements", $body + [
            'subject' => 'Room change', 'message' => "We moved to Makmal 4.\nSee you there.",
        ]);
    }

    private function guest(string $status = 'confirmed'): Booking
    {
        static $tier = null;
        $tier = $this->event->ticketTypes()->first() ?? $this->tier(seats: 20, event: $this->event);
        $booking = $this->book($this->customer(), $tier);
        $booking->update(['status' => $status]);

        return $booking;
    }

    public function test_everyone_still_expecting_to_come_gets_the_message_once(): void
    {
        $confirmed = $this->guest('confirmed');
        $pending = $this->guest('pending');
        $waitlisted = $this->guest('waitlisted');
        $this->guest('cancelled');
        $this->guest('attended');

        $res = $this->send()->assertCreated()->assertJsonPath('recipients', 3);

        // Booking itself sends confirmations, so look only at the announcement.
        $sent = Http::recorded(fn (Request $request) => $request['subject'] === 'Room change')->map(fn ($pair) => $pair[0]['to'][0])->all();
        $this->assertEqualsCanonicalizing([$confirmed->customer->email, $pending->customer->email, $waitlisted->customer->email], $sent);
        $this->assertSame(3, $this->event->announcements()->first()->recipients);
        $this->assertSame(3, \App\Models\Notification::where('type', 'announcement')->where('announcement_id', $res->json('id'))->count());
    }

    public function test_the_email_carries_the_subject_and_the_message_with_line_breaks_and_no_html(): void
    {
        $this->guest();

        $this->send(['subject' => 'Change of room', 'message' => "Line one\n<script>alert(1)</script>"])->assertCreated();

        Http::assertSent(fn (Request $request) => $request['subject'] === 'Change of room'
            && str_contains($request['html'], 'Line one<br />')
            && str_contains($request['html'], '&lt;script&gt;')
            && ! str_contains($request['html'], '<script>'));
    }

    public function test_someone_booked_on_two_tiers_gets_one_email(): void
    {
        $first = $this->guest();
        $second = $this->tier(seats: 3, event: $this->event);
        $this->actingAs($first->customer, 'sanctum')->postJson('/api/bookings', ['ticket_type_id' => $second->id])->assertCreated();

        $this->send()->assertCreated()->assertJsonPath('recipients', 1);
    }

    public function test_each_send_is_recorded_in_the_event_history(): void
    {
        $this->guest();
        $this->send(['subject' => 'First'])->assertCreated();
        $this->send(['subject' => 'Second'])->assertCreated();

        $res = $this->actingAs($this->organiser, 'sanctum')->getJson("/api/events/{$this->event->id}/announcements")->assertOk();

        $res->assertJsonPath('audience', 1)->assertJsonCount(2, 'data')->assertJsonPath('data.0.subject', 'Second')->assertJsonPath('data.0.sender.id', $this->organiser->id);
    }

    public function test_only_the_owner_or_an_admin_can_send_or_read(): void
    {
        $this->guest();

        $this->send([], $this->organiser())->assertForbidden();
        $this->send([], $this->customer())->assertForbidden();
        $this->actingAs($this->organiser(), 'sanctum')->getJson("/api/events/{$this->event->id}/announcements")->assertForbidden();
        $this->send([], $this->admin())->assertCreated();
    }

    public function test_it_needs_a_subject_and_a_message_and_someone_to_send_to(): void
    {
        $this->send(['subject' => ''])->assertUnprocessable()->assertJsonValidationErrors('subject');
        $this->send(['message' => str_repeat('a', 2001)])->assertUnprocessable()->assertJsonValidationErrors('message');
        $this->send()->assertUnprocessable();
        $this->assertSame(0, $this->event->announcements()->count(), 'nothing is recorded when nobody would receive it');
    }

    public function test_a_draft_or_cancelled_event_cannot_send_announcements(): void
    {
        $this->guest();
        $this->event->update(['status' => 'draft']);
        $this->send()->assertUnprocessable();

        $this->event->update(['status' => 'cancelled']);
        $this->send()->assertUnprocessable();
    }

    public function test_the_send_is_limited_so_a_script_cannot_flood_guests(): void
    {
        $this->guest();

        foreach (range(1, 10) as $i) {
            $this->send()->assertCreated();
        }
        $this->send()->assertStatus(429);
    }

    public function test_the_admin_email_log_shows_announcements(): void
    {
        $this->guest();
        $this->send()->assertCreated();

        $this->actingAs($this->admin(), 'sanctum')->getJson('/api/admin/notifications?type=announcement')->assertOk()->assertJsonPath('total', 1);
    }

    public function test_a_provider_refusal_is_recorded_for_that_guest(): void
    {
        $booking = $this->guest();
        Http::swap(new Factory);
        Http::fake(['api.resend.com/*' => Http::response(['message' => 'testing address only'], 403)]);

        $this->send()->assertCreated();

        $this->assertSame(403, $booking->notifications()->where('type', 'announcement')->first()->provider_response['status']);
    }
}
