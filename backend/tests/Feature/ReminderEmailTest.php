<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Event;
use App\Models\Venue;
use App\Support\Ics;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Factory;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Http;
use Tests\Feature\Concerns\BuildsScenarios;
use Tests\TestCase;

class ReminderEmailTest extends TestCase
{
    use BuildsScenarios;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpScenarios();
        config(['services.resend.key' => 're_test_key']);
        Http::fake(['api.resend.com/*' => Http::response(['id' => 'email_1'], 200)]);
    }

    /** A confirmed booking on an event that starts in $hours, made $bookedHoursAgo ago. */
    private function booking(float $hours = 20, float $bookedHoursAgo = 3, array $event = []): Booking
    {
        $event = Event::factory()->create($event + [
            'venue_id' => $this->venue()->id,
            'organiser_id' => $this->organiser()->id,
            'status' => 'published',
            'start_at' => now()->addMinutes((int) ($hours * 60)),
            'end_at' => now()->addMinutes((int) ($hours * 60) + 120),
        ]);
        $booking = $this->book($this->customer(), $this->tier(seats: 3, event: $event));
        $booking->update(['booked_at' => now()->subMinutes((int) ($bookedHoursAgo * 60))]);

        return $booking;
    }

    /** Replace the default answer from Resend (the first stub that matches always wins, so start afresh). */
    private function resendAnswers(int $status, array $body): void
    {
        Http::swap(new Factory);
        Http::fake(['api.resend.com/*' => Http::response($body, $status)]);
    }

    private function remind(): void
    {
        Artisan::call('bookings:send-reminders');
    }

    private function sentReminders(): int
    {
        return Http::recorded(fn (Request $request) => str_contains((string) json_encode($request->data()), 'Reminder:'))->count();
    }

    public function test_a_guest_is_reminded_once_when_the_event_is_within_a_day(): void
    {
        $booking = $this->booking(hours: 20);

        $this->remind();
        $this->remind();

        $this->assertSame(1, $this->sentReminders());
        $this->assertDatabaseHas('notifications', ['booking_id' => $booking->id, 'type' => 'reminder']);
        $this->assertSame(200, $booking->notifications()->where('type', 'reminder')->first()->provider_response['status']);
        Http::assertSent(fn (Request $request) => $request['to'] === [$booking->customer->email] && str_starts_with($request['subject'], 'Reminder:'));
    }

    public function test_the_reminder_carries_a_calendar_file_the_guest_can_open(): void
    {
        $this->booking(hours: 20);

        $this->remind();

        Http::assertSent(function (Request $request) {
            $file = $request['attachments'][0] ?? null;
            $ics = $file ? base64_decode($file['content']) : '';

            return ($file['filename'] ?? null) === 'event.ics'
                && str_contains($ics, 'BEGIN:VCALENDAR')
                && str_contains($ics, 'SUMMARY:')
                && str_contains($ics, 'DTSTART:');
        });
    }

    public function test_an_event_more_than_a_day_away_or_already_started_gets_no_reminder(): void
    {
        $this->booking(hours: 30);
        $this->booking(hours: -1, event: ['end_at' => now()->addHour()]);

        $this->remind();

        $this->assertSame(0, $this->sentReminders());
    }

    public function test_only_confirmed_guests_of_published_events_are_reminded(): void
    {
        $waitlisted = $this->booking(hours: 20);
        $waitlisted->update(['status' => 'waitlisted']);
        $cancelled = $this->booking(hours: 20);
        $cancelled->update(['status' => 'cancelled']);
        $attended = $this->booking(hours: 20);
        $attended->update(['status' => 'attended']);
        $draft = $this->booking(hours: 20);
        $draft->ticketType->event->update(['status' => 'draft']);
        $cancelledEvent = $this->booking(hours: 20);
        $cancelledEvent->ticketType->event->update(['status' => 'cancelled']);

        $this->remind();

        $this->assertSame(0, $this->sentReminders());
    }

    public function test_someone_who_only_just_booked_is_not_reminded_straight_away(): void
    {
        $this->booking(hours: 5, bookedHoursAgo: 0.2);

        $this->remind();

        $this->assertSame(0, $this->sentReminders());
    }

    public function test_the_reminder_for_an_online_event_has_the_meeting_link_and_no_seat_or_venue(): void
    {
        $this->booking(hours: 20, event: [
            'venue_id' => Venue::online()->id, 'mode' => 'online', 'meeting_url' => 'https://meet.google.com/abc-defg-hij', 'meeting_platform' => 'meet',
        ]);

        $this->remind();

        Http::assertSent(fn (Request $request) => str_contains($request['html'], 'https://meet.google.com/abc-defg-hij') && str_contains($request['html'], 'online meeting'));
    }

    public function test_the_reminder_for_a_physical_event_names_the_venue_and_never_a_meeting_link(): void
    {
        $booking = $this->booking(hours: 20);

        $this->remind();

        $venue = $booking->ticketType->event->venue;
        Http::assertSent(fn (Request $request) => str_contains($request['html'], e($venue->name)) && ! str_contains($request['html'], 'Join the meeting'));
    }

    public function test_what_an_organiser_typed_cannot_inject_html_into_the_email(): void
    {
        $this->booking(hours: 20, event: ['title' => '<script>alert(1)</script> Night']);

        $this->remind();

        Http::assertSent(fn (Request $request) => str_contains($request['html'], '&lt;script&gt;') && ! str_contains($request['html'], '<script>'));
    }

    public function test_with_no_resend_key_the_reminder_is_recorded_as_skipped(): void
    {
        config(['services.resend.key' => null]);
        $booking = $this->booking(hours: 20);

        $this->remind();

        $this->assertSame('skipped', $booking->notifications()->where('type', 'reminder')->first()->provider_response['status']);
        Http::assertNothingSent();
    }

    public function test_a_provider_refusal_is_recorded_and_not_retried_endlessly(): void
    {
        $this->resendAnswers(403, ['name' => 'validation_error', 'message' => 'testing address only']);
        $booking = $this->booking(hours: 20);

        $this->remind();
        $this->remind();

        $this->assertSame(403, $booking->notifications()->where('type', 'reminder')->first()->provider_response['status']);
        $this->assertSame(1, $booking->notifications()->where('type', 'reminder')->count());
    }

    public function test_the_calendar_file_never_contains_the_meeting_link(): void
    {
        $booking = $this->booking(hours: 20, event: [
            'venue_id' => Venue::online()->id, 'mode' => 'online', 'meeting_url' => 'https://zoom.us/j/999', 'meeting_platform' => 'zoom',
        ])->load('ticketType.event.venue');

        $ics = Ics::forBooking($booking);

        $this->assertStringNotContainsString('zoom.us', $ics);
        $this->assertStringContainsString('LOCATION:Online meeting', $ics);
        $this->assertStringContainsString("\r\n", $ics);
    }

    public function test_the_test_command_reports_what_resend_answered(): void
    {
        $this->artisan('emails:test', ['to' => 'me@example.com'])->expectsOutputToContain('Resend answered 200')->assertSuccessful();

        $this->resendAnswers(403, ['message' => 'Only your own address']);
        $this->artisan('emails:test', ['to' => 'other@example.com'])->expectsOutputToContain('Resend answered 403')->assertFailed();
    }

    public function test_one_booking_can_be_reminded_by_number_whatever_the_time_window(): void
    {
        $far = $this->booking(hours: 46, bookedHoursAgo: 0.1);
        $other = $this->booking(hours: 46, bookedHoursAgo: 0.1);

        $this->artisan('bookings:send-reminders', ['--booking' => $far->id])->expectsOutputToContain('Sent 1 reminders.')->assertSuccessful();

        $this->assertSame(1, $this->sentReminders());
        $this->assertSame(1, $far->notifications()->where('type', 'reminder')->count());
        $this->assertSame(0, $other->notifications()->where('type', 'reminder')->count(), 'only the one asked for');
        Http::assertSent(fn (Request $request) => $request['to'] === [$far->customer->email]);
    }

    public function test_asking_for_a_booking_twice_or_one_that_is_not_confirmed_sends_nothing_and_says_why(): void
    {
        $booking = $this->booking(hours: 46);
        Artisan::call('bookings:send-reminders', ['--booking' => $booking->id]);

        $this->artisan('bookings:send-reminders', ['--booking' => $booking->id])->expectsOutputToContain('Sent 0 reminders.')->expectsOutputToContain('must exist, be confirmed')->assertSuccessful();

        $cancelled = $this->booking(hours: 46);
        $cancelled->update(['status' => 'cancelled']);
        $this->artisan('bookings:send-reminders', ['--booking' => $cancelled->id])->expectsOutputToContain('Sent 0 reminders.')->assertSuccessful();
        $this->assertSame(1, $this->sentReminders());
    }
}
