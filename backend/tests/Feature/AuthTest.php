<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_visitor_can_register_as_a_customer_and_gets_a_token(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Aina Sofea',
            'email' => 'aina@example.com',
            'password' => 'a-good-password',
            'password_confirmation' => 'a-good-password',
        ]);

        $response->assertCreated()->assertJsonStructure(['user' => ['id', 'email', 'role'], 'token']);
        $this->assertSame('customer', $response->json('user.role'));
        $this->assertDatabaseHas('users', ['email' => 'aina@example.com', 'role' => 'customer']);
    }

    public function test_registering_cannot_grant_an_admin_role(): void
    {
        $this->postJson('/api/auth/register', [
            'name' => 'Sneaky',
            'email' => 'sneaky@example.com',
            'password' => 'a-good-password',
            'password_confirmation' => 'a-good-password',
            'role' => 'admin',
        ]);

        $this->assertDatabaseMissing('users', ['email' => 'sneaky@example.com', 'role' => 'admin']);
    }

    public function test_registration_rejects_a_duplicate_email_and_a_short_password(): void
    {
        User::factory()->create(['email' => 'taken@example.com']);

        $this->postJson('/api/auth/register', [
            'name' => 'X',
            'email' => 'taken@example.com',
            'password' => 'short',
            'password_confirmation' => 'short',
        ])->assertUnprocessable()->assertJsonValidationErrors(['email', 'password']);
    }

    public function test_login_returns_a_token_that_unlocks_me(): void
    {
        $user = User::factory()->create(['email' => 'login@example.com']);

        $token = $this->postJson('/api/auth/login', ['email' => 'login@example.com', 'password' => 'password'])
            ->assertOk()
            ->json('token');

        $this->withToken($token)->getJson('/api/auth/me')->assertOk()->assertJsonPath('id', $user->id);
    }

    public function test_a_wrong_password_gets_a_401_with_a_clear_message(): void
    {
        User::factory()->create(['email' => 'login@example.com']);

        $this->postJson('/api/auth/login', ['email' => 'login@example.com', 'password' => 'nope'])
            ->assertUnauthorized()
            ->assertJsonPath('message', 'The provided credentials are incorrect.');
    }

    public function test_me_requires_a_token(): void
    {
        $this->getJson('/api/auth/me')->assertUnauthorized()->assertJsonPath('message', 'Unauthenticated.');
    }

    public function test_logout_revokes_the_token(): void
    {
        User::factory()->create(['email' => 'out@example.com']);
        $token = $this->postJson('/api/auth/login', ['email' => 'out@example.com', 'password' => 'password'])->json('token');

        $this->withToken($token)->postJson('/api/auth/logout')->assertOk();

        $this->assertDatabaseCount('personal_access_tokens', 0);
    }
}
