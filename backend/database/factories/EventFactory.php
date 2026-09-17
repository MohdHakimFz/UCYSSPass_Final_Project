<?php

namespace Database\Factories;

use App\Models\Event;
use App\Models\User;
use App\Models\Venue;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Event>
 */
class EventFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $category = fake()->randomElement(['ctf', 'bootcamp', 'conference', 'workshop']);

        $titles = [
            'ctf' => ['Pwn2Own Local Qualifiers', 'Capture the Flag: Binary Exploitation', 'Web Security CTF Night', 'Crypto & Forensics Challenge'],
            'bootcamp' => ['OSCP Prep Bootcamp', 'Red Team Fundamentals Bootcamp', 'Cloud Security Bootcamp', 'Malware Analysis Bootcamp'],
            'conference' => ['SentryCon: Offensive Security Summit', 'AppSec Malaysia Conference', 'Threat Intel Symposium', 'DevSecOps Days'],
            'workshop' => ['Intro to Reverse Engineering Workshop', 'Burp Suite Hands-On Workshop', 'Active Directory Attack Workshop', 'API Security Workshop'],
        ];

        $startAt = fake()->dateTimeBetween('+1 week', '+3 months');
        $endAt = (clone $startAt)->modify('+'.fake()->numberBetween(4, 48).' hours');

        return [
            'venue_id' => Venue::factory(),
            'organiser_id' => User::factory()->organiser(),
            'title' => fake()->randomElement($titles[$category]),
            'description' => fake()->paragraph(),
            'category' => $category,
            'start_at' => $startAt,
            'end_at' => $endAt,
            'status' => fake()->randomElement(['draft', 'published', 'cancelled', 'completed']),
        ];
    }
}
