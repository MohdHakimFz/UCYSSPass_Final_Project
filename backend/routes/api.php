<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BookingController;
use App\Http\Controllers\Api\EventController;
use App\Http\Controllers\Api\TicketTypeController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\VenueController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
    });
});

// Users — all admin-or-self, gated by policies inside the controller/requests.
Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('users', UserController::class);
});

// Venues — public reads, admin-only writes.
Route::apiResource('venues', VenueController::class)->only(['index', 'show']);
Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('venues', VenueController::class)->only(['store', 'update', 'destroy']);
});

// Events — public reads, organiser/admin writes (ownership enforced via policy).
Route::apiResource('events', EventController::class)->only(['index', 'show']);
Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('events', EventController::class)->only(['store', 'update', 'destroy']);
});

// Ticket types — nested under events for listing/creation, flat for update/delete.
Route::get('/events/{event}/ticket-types', [TicketTypeController::class, 'index']);
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/events/{event}/ticket-types', [TicketTypeController::class, 'store']);
    Route::put('/ticket-types/{ticketType}', [TicketTypeController::class, 'update']);
    Route::delete('/ticket-types/{ticketType}', [TicketTypeController::class, 'destroy']);
});

// Bookings — customer-scoped, organiser-scoped-to-own-events, or admin.
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/bookings', [BookingController::class, 'index']);
    Route::get('/bookings/{booking}', [BookingController::class, 'show']);
    Route::put('/bookings/{booking}/cancel', [BookingController::class, 'cancel']);
    Route::post('/bookings/{booking}/checkin', [BookingController::class, 'checkin']);
    Route::delete('/bookings/{booking}', [BookingController::class, 'destroy']);

    // Anti-scalping: throttle booking creation to 5 attempts/minute per user (spec §5.3).
    Route::post('/bookings', [BookingController::class, 'store'])->middleware('throttle:5,1');
});
