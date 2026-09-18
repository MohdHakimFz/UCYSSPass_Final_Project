<?php

namespace Tests\Feature;

use App\Models\Booking;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Feature\Concerns\BuildsScenarios;
use Tests\TestCase;

/**
 * One table for who may call what. Each row is an endpoint and the HTTP status each kind of caller must get.
 * Guest = no token, cust = any customer, owner = the organiser who owns the event, other = a different organiser.
 * A status of 200 means "allowed" (any 2xx); everything else must match exactly.
 */
class AccessMatrixTest extends TestCase
{
    use BuildsScenarios;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpScenarios();
    }

    public static function matrix(): array
    {
        //                          method   uri                              guest cust  owner other admin
        return [
            'list users'        => ['GET',    '/api/users',                    401,  403,  403,  403,  200],
            'admin stats'       => ['GET',    '/api/admin/stats',              401,  403,  403,  403,  200],
            'admin emails'      => ['GET',    '/api/admin/notifications',      401,  403,  403,  403,  200],
            'export users'      => ['GET',    '/api/admin/export/users',       401,  403,  403,  403,  200],
            'export bookings'   => ['GET',    '/api/admin/export/bookings',    401,  403,  403,  403,  200],
            'create venue'      => ['POST',   '/api/venues',                   401,  403,  403,  403,  201],
            'delete venue'      => ['DELETE', '/api/venues/{venue}',           401,  403,  403,  403,  204],
            'event stats'       => ['GET',    '/api/events/{event}/stats',     401,  403,  200,  403,  200],
            'event export'      => ['GET',    '/api/events/{event}/export',    401,  403,  200,  403,  200],
            'duplicate event'   => ['POST',   '/api/events/{event}/duplicate', 401,  403,  201,  403,  201],
            'update event'      => ['PUT',    '/api/events/{event}',           401,  403,  200,  403,  200],
            'delete event'      => ['DELETE', '/api/events/{event}',           401,  403,  204,  403,  204],
            'add ticket tier'   => ['POST',   '/api/events/{event}/ticket-types', 401, 403, 201,  403,  201],
            'update tier'       => ['PUT',    '/api/ticket-types/{tier}',      401,  403,  200,  403,  200],
            'delete tier'       => ['DELETE', '/api/ticket-types/{tier}',      401,  403,  204,  403,  204],
            'delete booking'    => ['DELETE', '/api/bookings/{booking}',       401,  403,  403,  403,  204],
            'public events'     => ['GET',    '/api/events',                   200,  200,  200,  200,  200],
            'public venues'     => ['GET',    '/api/venues',                   200,  200,  200,  200,  200],
        ];
    }

    private function bodyFor(string $uri): array
    {
        return match (true) {
            $uri === '/api/venues' => ['name' => 'Matrix Hall', 'address' => '1 Jalan Test', 'capacity' => 100],
            str_ends_with($uri, '/ticket-types') => ['name' => 'VIP', 'price' => 10, 'capacity' => 5],
            str_contains($uri, '/ticket-types/') => ['name' => 'Renamed'],
            str_contains($uri, '/api/events/') && ! str_contains($uri, '/duplicate') => ['title' => 'Renamed event'],
            default => [],
        };
    }

    #[DataProvider('matrix')]
    public function test_every_endpoint_answers_each_role_correctly(string $method, string $uri, int $guest, int $cust, int $owner, int $other, int $admin): void
    {
        foreach (['guest' => $guest, 'cust' => $cust, 'other' => $other, 'owner' => $owner, 'admin' => $admin] as $who => $expected) {
            // A fresh world per caller, because several rows delete what they touch.
            $ownerUser = $this->organiser();
            $event = $this->publishedEvent($ownerUser);
            $tier = $this->tier(5, $event);
            $booking = Booking::factory()->create(['ticket_type_id' => $tier->id, 'status' => 'cancelled', 'qr_token' => null, 'checked_in_at' => null]);
            $venue = $this->venue();

            $caller = match ($who) {
                'guest' => null,
                'cust' => $this->customer(),
                'other' => $this->organiser(),
                'owner' => $ownerUser,
                'admin' => $this->admin(),
            };

            $path = str_replace(['{venue}', '{event}', '{tier}', '{booking}'], [$venue->id, $event->id, $tier->id, $booking->id], $uri);
            $request = $caller ? $this->actingAs($caller, 'sanctum') : $this;
            $response = $request->json($method, $path, $this->bodyFor($path));

            $actual = $response->getStatusCode();
            $ok = $expected === 200 ? ($actual >= 200 && $actual < 300) : $actual === $expected;
            $this->assertTrue($ok, "{$method} {$uri} as {$who}: expected {$expected}, got {$actual}");
        }
    }

    public function test_roles_cannot_be_escalated_through_the_users_endpoint(): void
    {
        $customer = $this->customer();

        $this->actingAs($customer, 'sanctum')->putJson("/api/users/{$customer->id}", ['role' => 'admin']);

        $this->assertSame('customer', $customer->fresh()->role);
    }

    public function test_a_customer_cannot_read_another_customers_profile(): void
    {
        $this->actingAs($this->customer(), 'sanctum')->getJson('/api/users/'.$this->customer()->id)->assertForbidden();
    }
}
