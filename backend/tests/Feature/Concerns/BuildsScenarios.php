<?php

namespace Tests\Feature\Concerns;

use App\Models\Booking;
use App\Models\Event;
use App\Models\TicketType;
use App\Models\User;
use Illuminate\Support\Facades\Http;

/**
 * Small builders so each test reads as the scenario it checks, not as setup.
 */
trait BuildsScenarios
{
    protected function setUpScenarios(): void
    {
        // Emails and the QR image API are third parties: no test may reach them.
        Http::preventStrayRequests();
        Http::fake();
    }

    protected function customer(): User
    {
        return User::factory()->create();
    }

    protected function organiser(): User
    {
        return User::factory()->organiser()->create();
    }

    protected function admin(): User
    {
        return User::factory()->admin()->create();
    }

    protected function publishedEvent(?User $organiser = null): Event
    {
        return Event::factory()->create([
            'organiser_id' => ($organiser ?? $this->organiser())->id,
            'status' => 'published',
        ]);
    }

    protected function tier(int $seats, ?Event $event = null): TicketType
    {
        return TicketType::factory()->create([
            'event_id' => ($event ?? $this->publishedEvent())->id,
            'capacity' => $seats,
            'seats_remaining' => $seats,
        ]);
    }

    protected function book(User $customer, TicketType $tier): Booking
    {
        $this->actingAs($customer, 'sanctum')
            ->postJson('/api/bookings', ['ticket_type_id' => $tier->id])
            ->assertCreated();

        return Booking::where('customer_id', $customer->id)->where('ticket_type_id', $tier->id)->latest('id')->firstOrFail();
    }
}
