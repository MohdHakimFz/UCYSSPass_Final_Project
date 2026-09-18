<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

/**
 * Password reset by a six-digit code sent to the account's email.
 *
 * The code is stored hashed, expires after 30 minutes, works once, and is thrown away after five wrong guesses.
 * Asking for a code never reveals whether an email has an account.
 */
class PasswordResetService
{
    private const LIFETIME_MINUTES = 30;

    private const MAX_WRONG_GUESSES = 5;

    public function __construct(private readonly EmailService $emails) {}

    public function request(string $email): void
    {
        $user = User::where('email', $email)->first();

        if (! $user) {
            return;
        }

        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $user->email],
            ['token' => Hash::make($code), 'created_at' => now()],
        );
        Cache::forget($this->guessKey($user->email));

        $sent = $this->emails->sendPlain(
            $user->email,
            'Your SentryPass password reset code',
            "<p>Your SentryPass password reset code is <strong style=\"font-size:20px;letter-spacing:2px\">{$code}</strong>.</p>"
            .'<p>It works for '.self::LIFETIME_MINUTES.' minutes. If you did not ask for it, you can ignore this email.</p>',
        );

        // No email key configured: in development, write the code to the log so the flow can still be tried.
        if (! $sent && app()->environment('local', 'testing')) {
            Log::info("Password reset code for {$user->email}: {$code}");
        }
    }

    /**
     * @return bool true when the password was changed
     */
    public function reset(string $email, string $code, string $password): bool
    {
        $row = DB::table('password_reset_tokens')->where('email', $email)->first();
        $user = User::where('email', $email)->first();

        if (! $row || ! $user || now()->diffInMinutes($row->created_at, true) > self::LIFETIME_MINUTES) {
            return false;
        }

        if (! Hash::check($code, $row->token)) {
            $wrong = Cache::increment($this->guessKey($email));
            Cache::put($this->guessKey($email), $wrong, now()->addMinutes(self::LIFETIME_MINUTES));

            if ($wrong >= self::MAX_WRONG_GUESSES) {
                DB::table('password_reset_tokens')->where('email', $email)->delete();
            }

            return false;
        }

        $user->update(['password' => $password]);
        $user->tokens()->delete();
        DB::table('password_reset_tokens')->where('email', $email)->delete();
        Cache::forget($this->guessKey($email));

        return true;
    }

    private function guessKey(string $email): string
    {
        return 'password-reset-guesses:'.strtolower($email);
    }
}
