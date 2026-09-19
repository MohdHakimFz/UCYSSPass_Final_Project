<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Event;
use App\Models\Seat;
use App\Models\TicketType;
use App\Models\User;
use App\Services\QrTicketService;
use App\Support\MeetingPlatform;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DemoSeederTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_the_demo_accounts_and_organisers_exist_with_fixed_emails(): void
    {
        foreach (['admin@sentrypass.test' => 'admin', 'customer@sentrypass.test' => 'customer', 'aisyah@ucyss.test' => 'organiser', 'farid@ucyss.test' => 'organiser'] as $email => $role) {
            $this->assertSame($role, User::where('email', $email)->value('role'), $email);
        }

        $this->postJson('/api/auth/login', ['email' => 'admin@sentrypass.test', 'password' => 'password'])->assertOk();
    }

    public function test_the_programme_has_every_kind_of_event(): void
    {
        $events = Event::all();

        $this->assertSame(8, $events->count());
        $this->assertEqualsCanonicalizing(['published', 'draft', 'cancelled', 'completed'], $events->pluck('status')->unique()->values()->all());
        $this->assertSame(3, $events->where('mode', 'online')->count());
        $this->assertSame(1, $events->where('seated', true)->count());
        $this->assertTrue($events->where('status', 'published')->every(fn (Event $e) => $e->start_at->isFuture()), 'published events are all still to come');
    }

    public function test_online_events_have_a_link_and_the_platform_matches_it(): void
    {
        foreach (Event::where('mode', 'online')->get() as $event) {
            $this->assertNotEmpty($event->meeting_url);
            $this->assertSame(MeetingPlatform::fromUrl($event->meeting_url), $event->meeting_platform, $event->title);
            $this->assertSame('Online', $event->venue->name);
        }
    }

    public function test_seat_counts_agree_with_the_bookings(): void
    {
        foreach (TicketType::with('event')->get() as $tier) {
            $held = $tier->bookings()->whereIn('status', ['pending', 'confirmed', 'attended'])->count();

            $this->assertSame($tier->capacity - $held, $tier->seats_remaining, "{$tier->event->title} / {$tier->name}");
        }
    }

    public function test_the_seated_event_has_a_seat_for_every_place_and_each_booking_holds_one(): void
    {
        $ctf = Event::where('seated', true)->firstOrFail();

        foreach ($ctf->ticketTypes as $tier) {
            $this->assertSame($tier->capacity, Seat::where('ticket_type_id', $tier->id)->count());
            $this->assertSame($tier->bookings()->count(), $tier->bookings()->whereNotNull('seat_id')->count());
        }
    }

    public function test_every_confirmed_ticket_is_genuine_and_paid_tiers_have_payments(): void
    {
        $qr = app(QrTicketService::class);

        foreach (Booking::whereIn('status', ['confirmed', 'attended'])->with('ticketType')->get() as $booking) {
            $this->assertTrue($qr->verify($booking, $booking->qr_token), "booking {$booking->id}");
            $this->assertSame((float) $booking->ticketType->price > 0, $booking->payments()->where('status', 'paid')->exists(), "booking {$booking->id}");
        }
    }

    public function test_the_bootcamp_is_sold_out_with_a_waitlist(): void
    {
        $early = TicketType::where('name', 'Early Bird')->firstOrFail();

        $this->assertSame(0, $early->seats_remaining);
        $this->assertSame(3, $early->bookings()->where('status', 'waitlisted')->count());
    }

    public function test_the_public_sees_the_programme_but_not_the_draft_or_the_meeting_links(): void
    {
        $titles = collect($this->getJson('/api/events?per_page=50')->assertOk()->json('data'))->pluck('title');

        $this->assertTrue($titles->contains('UCYSS Capture the Flag 2026'));
        $this->assertFalse($titles->contains('OSINT Workshop'));
        $this->assertStringNotContainsString('meet.google.com', $this->getJson('/api/events?per_page=50')->getContent());
    }

    public function test_seeded_emails_say_honestly_that_nothing_was_sent(): void
    {
        $statuses = \App\Models\Notification::all()->map(fn ($n) => $n->provider_response['status'])->unique()->values()->all();

        $this->assertSame(['skipped'], $statuses);
    }
}
