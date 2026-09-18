<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Models\User;
use App\Services\PasswordResetService;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    /**
     * Email a six-digit reset code. The answer is always the same, so nobody can use this
     * to find out which emails have accounts.
     */
    public function forgotPassword(ForgotPasswordRequest $request, PasswordResetService $resets): JsonResponse
    {
        $resets->request($request->validated('email'));

        return response()->json(['message' => 'If that email has an account, a reset code is on its way.']);
    }

    /**
     * Set a new password with the emailed code. Every existing session is signed out.
     */
    public function resetPassword(ResetPasswordRequest $request, PasswordResetService $resets): JsonResponse
    {
        $changed = $resets->reset(
            $request->validated('email'),
            $request->validated('code'),
            $request->validated('password'),
        );

        if (! $changed) {
            return response()->json(['message' => 'That code is wrong or has expired. Ask for a new one.'], 422);
        }

        return response()->json(['message' => 'Your password has been changed. You can sign in now.']);
    }

    /**
     * Register a new customer account. Organiser/admin accounts are
     * created by an admin via POST /users instead.
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        $user = User::create([
            'name' => $request->validated('name'),
            'email' => $request->validated('email'),
            'password' => $request->validated('password'),
            'role' => 'customer',
        ]);

        $token = $user->createToken('api-token')->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token,
        ], 201);
    }

    /**
     * Log in and issue a new Sanctum token.
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::where('email', $request->validated('email'))->first();

        if (! $user || ! Hash::check($request->validated('password'), $user->password)) {
            throw new AuthenticationException('The provided credentials are incorrect.');
        }

        $token = $user->createToken('api-token')->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token,
        ]);
    }

    /**
     * Revoke the token used to authenticate the current request.
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out.']);
    }

    /**
     * Return the currently authenticated user.
     */
    public function me(Request $request): JsonResponse
    {
        return response()->json($request->user());
    }
}
