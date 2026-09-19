<?php

namespace App\Console\Commands;

use App\Services\BookingService;
use Illuminate\Console\Command;

class ReleaseExpiredHolds extends Command
{
    protected $signature = 'bookings:release-expired';

    protected $description = 'Give back seats whose payment hold has run out';

    public function handle(BookingService $bookings): int
    {
        $count = $bookings->releaseExpired();
        $this->info("Released {$count} expired holds.");

        return self::SUCCESS;
    }
}
