<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Event;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AttendanceController extends Controller
{
    /**
     * Who registered and who actually came, for the latest events that have already started: finished ones and ones running now.
     * An organiser sees their own events, an admin sees all; a customer has no use for it.
     */
    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless(in_array($user->role, ['organiser', 'admin'], true), 403);

        $events = Event::query()
            ->whereIn('status', ['published', 'completed'])
            ->where('start_at', '<=', now())
            ->when($user->role === 'organiser', fn ($query) => $query->where('organiser_id', $user->id))
            // Both numbers come from one query for all the events, not one query per event.
            ->withCount([
                'bookings as registered' => fn ($query) => $query->whereIn('bookings.status', ['confirmed', 'attended']),
                'bookings as attended' => fn ($query) => $query->where('bookings.status', 'attended'),
            ])
            ->orderByDesc('start_at')
            ->limit(8)
            ->get(['id', 'title', 'mode', 'category', 'start_at', 'end_at']);

        $rows = $events->map(fn (Event $event) => [
            'id' => $event->id,
            'title' => $event->title,
            'mode' => $event->mode,
            'category' => $event->category,
            'start_at' => $event->start_at,
            'registered' => (int) $event->registered,
            'attended' => (int) $event->attended,
            // Confirmed guests who never came. Only known once the event is over; while it runs, they may still arrive.
            'finished' => $event->end_at->isPast(),
            'no_show' => $event->end_at->isPast() ? (int) ($event->registered - $event->attended) : null,
            'rate' => $event->registered > 0 ? (int) round($event->attended / $event->registered * 100) : null,
        ])->values();

        $registered = $rows->sum('registered');
        $attended = $rows->sum('attended');

        return response()->json([
            'events' => $rows,
            'registered' => $registered,
            'attended' => $attended,
            'no_show' => $rows->where('finished', true)->sum('no_show'),
            'rate' => $registered > 0 ? (int) round($attended / $registered * 100) : null,
        ]);
    }
}
