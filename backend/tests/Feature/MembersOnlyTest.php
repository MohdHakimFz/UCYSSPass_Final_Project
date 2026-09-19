<?php

namespace Tests\Feature;

use App\Models\TicketType;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Concerns\BuildsScenarios;
use Tests\TestCase;

class MembersOnlyTest extends TestCase
{
    use BuildsScenarios;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpScenarios();
    }

    private function memberTier(?User $organiser = null): TicketType
    {
        $tier = $this->tier(seats: 5, event: $this->publishedEvent($organiser));
        $tier->update(['members_only' => true]);

        return $tier;
    }

    public function test_a_member_can_book_a_members_only_tier(): void
    {
        $member = User::factory()->create(['is_member' => true]);

        $this->actingAs($member, 'sanctum')->postJson('/api/bookings', ['ticket_type_id' => $this->memberTier()->id])
            ->assertCreated()->assertJsonPath('status', 'confirmed');
    }

    public function test_someone_who_is_not_a_member_is_refused_with_a_reason(): void
    {
        $tier = $this->memberTier();

        $res = $this->actingAs($this->customer(), 'sanctum')->postJson('/api/bookings', ['ticket_type_id' => $tier->id])->assertForbidden();

        $this->assertStringContainsString('members', $res->json('message'));
        $this->assertSame(5, $tier->fresh()->seats_remaining, 'a refused booking takes no seat');
    }

    public function test_everyone_can_still_book_a_tier_that_is_open_to_all(): void
    {
        $this->actingAs($this->customer(), 'sanctum')->postJson('/api/bookings', ['ticket_type_id' => $this->tier(seats: 2)->id])->assertCreated();
    }

    public function test_the_public_tier_list_says_which_tiers_are_for_members(): void
    {
        $tier = $this->memberTier();

        $this->getJson("/api/events/{$tier->event_id}/ticket-types")->assertOk()->assertJsonPath('0.members_only', true);
    }

    public function test_an_organiser_can_make_a_tier_members_only_and_a_copy_keeps_it(): void
    {
        $organiser = $this->organiser();
        $event = $this->publishedEvent($organiser);

        $id = $this->actingAs($organiser, 'sanctum')->postJson("/api/events/{$event->id}/ticket-types", ['name' => 'Member price', 'price' => 5, 'capacity' => 10, 'members_only' => true])
            ->assertCreated()->assertJsonPath('members_only', true)->json('id');

        $this->actingAs($organiser, 'sanctum')->putJson("/api/ticket-types/{$id}", ['members_only' => false])->assertOk()->assertJsonPath('members_only', false);
        $this->actingAs($organiser, 'sanctum')->putJson("/api/ticket-types/{$id}", ['members_only' => true])->assertOk();

        $copy = $this->actingAs($organiser, 'sanctum')->postJson("/api/events/{$event->id}/duplicate")->assertCreated()->json('id');
        $this->assertTrue(TicketType::where('event_id', $copy)->where('name', 'Member price')->firstOrFail()->members_only);
    }

    public function test_only_an_admin_can_grant_membership(): void
    {
        $customer = $this->customer();

        $this->actingAs($customer, 'sanctum')->putJson("/api/users/{$customer->id}", ['is_member' => true])->assertOk();
        $this->assertFalse($customer->fresh()->is_member, 'nobody can make themselves a member');

        $this->actingAs($this->admin(), 'sanctum')->putJson("/api/users/{$customer->id}", ['is_member' => true])->assertOk()->assertJsonPath('is_member', true);
        $this->assertTrue($customer->fresh()->is_member);

        $this->actingAs($this->admin(), 'sanctum')->putJson("/api/users/{$customer->id}", ['is_member' => false])->assertOk();
        $this->assertFalse($customer->fresh()->is_member);
    }

    public function test_registering_never_makes_someone_a_member(): void
    {
        $this->postJson('/api/auth/register', [
            'name' => 'Sneaky', 'email' => 'sneaky@example.com', 'password' => 'password123', 'password_confirmation' => 'password123', 'is_member' => true,
        ])->assertCreated();

        $this->assertFalse(User::where('email', 'sneaky@example.com')->firstOrFail()->is_member);
    }

    public function test_the_signed_in_person_can_see_whether_they_are_a_member(): void
    {
        $member = User::factory()->create(['is_member' => true]);

        $this->actingAs($member, 'sanctum')->getJson('/api/auth/me')->assertOk()->assertJsonPath('is_member', true);
    }

    public function test_an_admin_can_search_people_by_name_or_email_and_by_membership(): void
    {
        $admin = $this->admin();
        User::factory()->create(['name' => 'Aina Zulkifli', 'email' => 'aina@example.com', 'is_member' => true]);
        User::factory()->create(['name' => 'Bob Tan', 'email' => 'bob@example.com']);

        $names = fn (string $query) => collect($this->actingAs($admin, 'sanctum')->getJson("/api/users?per_page=50&{$query}")->assertOk()->json('data'))->pluck('name')->all();

        $this->assertSame(['Aina Zulkifli'], $names('search=zulk'));
        $this->assertSame(['Bob Tan'], $names('search=BOB@'));
        $this->assertContains('Aina Zulkifli', $names('member=1'));
        $this->assertNotContains('Aina Zulkifli', $names('member=0'));
    }
}
