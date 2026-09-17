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
            'provider_response' => [
                'id' => fake()->uuid(),
                'status' => 'delivered',
                'to' => fake()->safeEmail(),
                'subject' => match ($type) {
                    'confirmation' => 'Your SentryPass ticket is confirmed',
                    'waitlist_promoted' => 'You have been promoted from the waitlist',
                    'cancelled' => 'Your SentryPass booking was cancelled',
                },
            ],
        ];
    }
}
