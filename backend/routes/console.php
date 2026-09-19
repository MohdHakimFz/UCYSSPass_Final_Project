<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Holds are also released the moment anyone looks at the seats, so this is tidy-up rather than the only safeguard.
Schedule::command('bookings:release-expired')->everyMinute();
