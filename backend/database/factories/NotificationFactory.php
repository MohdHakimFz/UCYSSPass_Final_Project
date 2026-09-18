<?php

namespace Database\Factories;

use App\Models\Booking;
use App\Models\Notification;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Notification>
 */
class NotificationFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $type = fake()->randomElement(['confirmation', 'waitlist_promoted', 'cancelled']);

        return [
            'booking_id' => Booking::factory(),
            'type' => $type,
            'channel' => 'email',
            'sent_at' => fake()->dateTimeBetween('-2 months', 'now'),
            // Same shape EmailService stores for a real Resend call: HTTP status plus the provider's body.
            'provider_response' => [
                'status' => 200,
                'body' => ['id' => fake()->uuid()],
            ],
        ];
    }
}
