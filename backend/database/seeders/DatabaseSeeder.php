<?php

namespace Database\Seeders;

use App\Models\Booking;
use App\Models\Event;
use App\Models\Notification;
use App\Models\TicketType;
use App\Models\User;
use App\Models\Venue;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // --- Users: mix of all 3 roles ---
        $admin = User::factory()->admin()->create([
            'name' => 'Sentry Admin',
            'email' => 'admin@sentrypass.test',
        ]);

        $organisers = User::factory()->organiser()->count(4)->create();

        $customers = User::factory()->count(15)->create();
        $customers->push(User::factory()->create([
            'name' => 'Demo Customer',
            'email' => 'customer@sentrypass.test',
        ]));

        // --- Venues ---
        $venues = Venue::factory()->count(5)->create();

        // --- Events: mix of all 4 categories ---
        $categories = ['ctf', 'bootcamp', 'conference', 'workshop'];
        $events = collect();

        foreach ($categories as $category) {
            $events = $events->merge(
                Event::factory()
                    ->count(3)
                    ->create([
                        'category' => $category,
                        'venue_id' => fn () => $venues->random()->id,
                        'organiser_id' => fn () => $organisers->random()->id,
                    ])
            );
        }

        // --- Ticket types: 3 tiers per event ---
        $ticketTypes = collect();

        foreach ($events as $event) {
            $ticketTypes = $ticketTypes->merge(
                collect(['Early Bird', 'Standard', 'VIP'])->map(function (string $tier) use ($event) {
                    $capacity = match ($tier) {
                        'Early Bird' => 30,
                        'Standard' => 80,
                        'VIP' => 20,
                    };

                    return TicketType::factory()->create([
                        'event_id' => $event->id,
                        'name' => $tier,
                        'capacity' => $capacity,
                        'seats_remaining' => fake()->numberBetween(0, $capacity),
                    ]);
                })
            );
        }

        // --- Bookings: mix of all 5 statuses ---
        $statuses = ['pending', 'confirmed', 'cancelled', 'waitlisted', 'attended'];
        $bookings = collect();

        foreach ($statuses as $status) {
            $bookings = $bookings->merge(
                Booking::factory()
                    ->count(6)
                    ->create([
                        'status' => $status,
                        'customer_id' => fn () => $customers->random()->id,
                        'ticket_type_id' => fn () => $ticketTypes->random()->id,
                    ])
            );
        }

        // --- Notifications: reflect the booking lifecycle ---
        foreach ($bookings as $booking) {
            $type = match ($booking->status) {
                'confirmed', 'attended' => 'confirmation',
                'cancelled' => 'cancelled',
                'waitlisted' => null,
                'pending' => null,
            };

            if ($type !== null) {
                Notification::factory()->create([
                    'booking_id' => $booking->id,
                    'type' => $type,
                ]);
            }
        }

        // A few explicit waitlist-promotion notifications for demo purposes
        $bookings->where('status', 'confirmed')->take(2)->each(function (Booking $booking) {
            Notification::factory()->create([
                'booking_id' => $booking->id,
                'type' => 'waitlist_promoted',
            ]);
        });
    }
}
