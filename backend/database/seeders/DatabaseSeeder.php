<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database: the two demo accounts, then a UCYSS programme (organisers, students,
     * venues, events, bookings, payments). Every account has the password "password".
     */
    public function run(): void
    {
        User::create([
            'name' => 'UCYSS Admin', 'email' => 'admin@sentrypass.test', 'role' => 'admin',
            'password' => Hash::make('password'), 'email_verified_at' => now(),
        ]);
        User::create([
            'name' => 'Demo Customer', 'email' => 'customer@sentrypass.test', 'role' => 'customer',
            'password' => Hash::make('password'), 'email_verified_at' => now(),
        ]);

        $this->call(UcyssDemoSeeder::class);
    }
}
