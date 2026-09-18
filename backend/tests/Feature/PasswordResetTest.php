<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Http::preventStrayRequests();
        Http::fake(['api.resend.com/*' => Http::response(['id' => 'x'], 200)]);
        config(['services.resend.key' => 'test-key']);
    }

    /** Asks for a code and reads it out of the email that would have been sent. */
    private function requestCode(string $email): string
    {
        $this->postJson('/api/auth/forgot-password', ['email' => $email])->assertOk();

        $code = null;
        Http::assertSent(function ($request) use (&$code) {
            preg_match('/<strong[^>]*>(\d{6})<\/strong>/', $request['html'] ?? '', $m);
            $code = $m[1] ?? $code;

            return true;
        });

        return $code;
    }

    private function reset(string $email, string $code, string $password = 'a-brand-new-password')
    {
        return $this->postJson('/api/auth/reset-password', [
            'email' => $email,
            'code' => $code,
            'password' => $password,
            'password_confirmation' => $password,
        ]);
    }

    public function test_a_reset_code_is_emailed_and_stored_only_as_a_hash(): void
    {
        $user = User::factory()->create();

        $code = $this->requestCode($user->email);

        $this->assertMatchesRegularExpression('/^\d{6}$/', $code);
        $stored = DB::table('password_reset_tokens')->where('email', $user->email)->value('token');
        $this->assertNotSame($code, $stored);
    }

    public function test_asking_for_a_code_never_reveals_whether_an_email_has_an_account(): void
    {
        $known = $this->postJson('/api/auth/forgot-password', ['email' => User::factory()->create()->email]);
        $unknown = $this->postJson('/api/auth/forgot-password', ['email' => 'nobody@example.com']);

        $this->assertSame($known->status(), $unknown->status());
        $this->assertSame($known->json('message'), $unknown->json('message'));
        $this->assertDatabaseMissing('password_reset_tokens', ['email' => 'nobody@example.com']);
    }

    public function test_the_right_code_changes_the_password_and_signs_out_every_session(): void
    {
        $user = User::factory()->create(['password' => 'the-old-password']);
        $user->createToken('phone');
        $code = $this->requestCode($user->email);

        $this->reset($user->email, $code)->assertOk();

        $this->postJson('/api/auth/login', ['email' => $user->email, 'password' => 'a-brand-new-password'])->assertOk();
        $this->postJson('/api/auth/login', ['email' => $user->email, 'password' => 'the-old-password'])->assertUnauthorized();
        $this->assertSame(1, $user->tokens()->count(), 'only the token from the new login remains');
    }

    public function test_a_code_works_only_once(): void
    {
        $user = User::factory()->create();
        $code = $this->requestCode($user->email);

        $this->reset($user->email, $code)->assertOk();
        $this->reset($user->email, $code, 'another-new-password')->assertStatus(422);
    }

    public function test_a_wrong_code_is_refused_and_the_password_is_unchanged(): void
    {
        $user = User::factory()->create(['password' => 'the-old-password']);
        $this->requestCode($user->email);

        $this->reset($user->email, '000000')->assertStatus(422);

        $this->postJson('/api/auth/login', ['email' => $user->email, 'password' => 'the-old-password'])->assertOk();
    }

    public function test_five_wrong_guesses_burn_the_code_even_if_the_right_one_follows(): void
    {
        $user = User::factory()->create();
        $code = $this->requestCode($user->email);
        $wrong = $code === '111111' ? '222222' : '111111';

        foreach (range(1, 5) as $ignored) {
            $this->reset($user->email, $wrong)->assertStatus(422);
        }

        $this->reset($user->email, $code)->assertStatus(422);
    }

    public function test_a_code_expires_after_thirty_minutes(): void
    {
        $user = User::factory()->create();
        $code = $this->requestCode($user->email);

        $this->travel(31)->minutes();

        $this->reset($user->email, $code)->assertStatus(422);
    }

    public function test_the_new_password_is_validated(): void
    {
        $user = User::factory()->create();
        $code = $this->requestCode($user->email);

        $this->postJson('/api/auth/reset-password', ['email' => $user->email, 'code' => $code, 'password' => 'short', 'password_confirmation' => 'short'])
            ->assertUnprocessable()->assertJsonValidationErrors('password');
        $this->postJson('/api/auth/reset-password', ['email' => $user->email, 'code' => 'abc', 'password' => 'a-brand-new-password', 'password_confirmation' => 'a-brand-new-password'])
            ->assertUnprocessable()->assertJsonValidationErrors('code');
    }

    public function test_asking_for_codes_is_throttled(): void
    {
        foreach (range(1, 3) as $ignored) {
            $this->postJson('/api/auth/forgot-password', ['email' => 'a@example.com'])->assertOk();
        }

        $this->postJson('/api/auth/forgot-password', ['email' => 'a@example.com'])->assertStatus(429);
    }
}
