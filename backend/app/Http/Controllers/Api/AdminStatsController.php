<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Event;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminStatsController extends Controller
{
    /**
     * Platform-wide analytics for the admin dashboard. Admin only.
     */
    public function __invoke(Request $request): JsonResponse
    {
        abort_unless($request->user()->role === 'admin', 403);

        $days = collect(range(13, 0))->map(fn ($ago) => now()->subDays($ago)->toDateString());

        $perDay = Booking::query()
            ->where('booked_at', '>=', now()->subDays(13)->startOfDay())
            ->selectRaw('DATE(booked_at) as day, COUNT(*) as total')
            ->groupBy('day')
            ->pluck('total', 'day');

        $manifest = Event::query()
            ->with('venue:id,name')
            ->withSum('ticketTypes as capacity', 'capacity')
            ->withSum('ticketTypes as seats_remaining', 'seats_remaining')
            ->where('status', 'published')
            ->where('end_at', '>=', now())
            ->orderBy('start_at')
            ->limit(8)
            ->get()
            ->map(function (Event $event) {
                $counts = Booking::query()
                    ->whereHas('ticketType', fn ($q) => $q->where('event_id', $event->id))
                    ->selectRaw('status, COUNT(*) as total')
                    ->groupBy('status')
                    ->pluck('total', 'status');

                return [
                    'id' => $event->id,
                    'title' => $event->title,
                    'category' => $event->category,
                    'start_at' => $event->start_at,
                    'venue' => $event->venue?->name,
                    'capacity' => (int) $event->capacity,
                    'seats_remaining' => (int) $event->seats_remaining,
                    'confirmed' => (int) ($counts['confirmed'] ?? 0),
                    'attended' => (int) ($counts['attended'] ?? 0),
                    'waitlisted' => (int) ($counts['waitlisted'] ?? 0),
                ];
            });

        return response()->json([
            'users_by_role' => User::query()->select('role', DB::raw('COUNT(*) as total'))->groupBy('role')->pluck('total', 'role'),
            'events_by_status' => Event::query()->select('status', DB::raw('COUNT(*) as total'))->groupBy('status')->pluck('total', 'status'),
            'events_by_category' => Event::query()->select('category', DB::raw('COUNT(*) as total'))->groupBy('category')->pluck('total', 'category'),
            'bookings_by_status' => Booking::query()->select('status', DB::raw('COUNT(*) as total'))->groupBy('status')->pluck('total', 'status'),
            'bookings_per_day' => $days->map(fn ($day) => ['day' => $day, 'total' => (int) ($perDay[$day] ?? 0)])->values(),
            'seat_manifest' => $manifest,
        ]);
    }
}
