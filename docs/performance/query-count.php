<?php
// Counts the SQL queries (and the time they take) behind each endpoint.
// Copy it to backend/storage/query_count.php, run it in the container (php storage/query_count.php), then delete the copy.
// Needs the bulk data from seed-bulk.sql, because it picks one of the organiser's PERF events.
require '/var/www/html/vendor/autoload.php';
$app = require '/var/www/html/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

$admin = App\Models\User::where('email', 'admin@sentrypass.test')->first();
$customer = App\Models\User::where('email', 'customer@sentrypass.test')->first();
$organiser = App\Models\User::where('email', 'carmen.paucek@example.com')->first();
$eventId = App\Models\Event::where('organiser_id', $organiser->id)->where('title', 'like', 'PERF %')->value('id');

$cases = [
    ['Public event list', '/api/events?status=published&per_page=8', null],
    ['Search + price', '/api/events?status=published&search=Bootcamp&max_price=30&per_page=8', null],
    ['Customer bookings (50)', '/api/bookings?per_page=50', $customer],
    ['Admin bookings (10)', '/api/bookings?per_page=10', $admin],
    ['Admin waitlisted (10)', '/api/bookings?status=waitlisted&per_page=10', $admin],
    ['Admin stats', '/api/admin/stats', $admin],
    ['Organiser summary', '/api/organiser/summary', $organiser],
    ['Event stats', "/api/events/{$eventId}/stats", $organiser],
    ['Email log', '/api/admin/notifications?per_page=12', $admin],
    ['Venues (baseline)', '/api/venues?per_page=1', null],
];

foreach ($cases as [$name, $uri, $user]) {
    $kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
    DB::flushQueryLog();
    DB::enableQueryLog();
    $request = Request::create($uri, 'GET', [], [], [], ['HTTP_ACCEPT' => 'application/json']);
    if ($user) {
        $request->setUserResolver(fn () => $user);
        Laravel\Sanctum\Sanctum::actingAs($user);
    }
    $start = microtime(true);
    $response = $kernel->handle($request);
    $total = (microtime(true) - $start) * 1000;
    $log = DB::getQueryLog();
    $queries = count($log);
    $ms = array_sum(array_column($log, 'time'));
    printf("%-26s %3d queries  sql %6.1f ms  total %6.1f ms  status %d\n", $name, $queries, $ms, $total, $response->getStatusCode());
}
