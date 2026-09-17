<?php

namespace Database\Factories;

use App\Models\Event;
use App\Models\TicketType;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TicketType>
 */
class TicketTypeFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $tier = fake()->randomElement(['Early Bird', 'Standard', 'VIP']);
        $capacity = fake()->numberBetween(10, 200);

        $prices = ['Early Bird' => fake()->randomFloat(2, 20, 80), 'Standard' => fake()->randomFloat(2, 50, 150), 'VIP' => fake()->randomFloat(2, 150, 500)];

        return [
            'event_id' => Event::factory(),
            'name' => $tier,
            'price' => $prices[$tier],
            'capacity' => $capacity,
            'seats_remaining' => fake()->numberBetween(0, $capacity),
        ];
    }
}
