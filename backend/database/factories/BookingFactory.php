<?php

namespace Database\Factories;

use App\Models\Booking;
use App\Models\TicketType;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Booking>
 */
class BookingFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $status = fake()->randomElement(['pending', 'confirmed', 'cancelled', 'waitlisted', 'attended']);
        $bookedAt = fake()->dateTimeBetween('-2 months', 'now');

        return [
            'customer_id' => User::factory(),
            'ticket_type_id' => TicketType::factory(),
            'status' => $status,
            'qr_token' => in_array($status, ['confirmed', 'attended']) ? fake()->sha256() : null,
            'booked_at' => $bookedAt,
            'checked_in_at' => $status === 'attended' ? fake()->dateTimeBetween($bookedAt, 'now') : null,
        ];
    }
}
