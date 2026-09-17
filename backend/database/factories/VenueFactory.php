<?php

namespace Database\Factories;

use App\Models\Venue;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Venue>
 */
class VenueFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $names = [
            'Cyber Range Hall',
            'Blackout Convention Center',
            'Zero Day Auditorium',
            'Firewall Tower Conference Suite',
            'Packet Storm Arena',
            'Root Access Campus',
        ];

        return [
            'name' => fake()->unique()->randomElement($names),
            'address' => fake()->address(),
            'capacity' => fake()->numberBetween(50, 1000),
        ];
    }
}
