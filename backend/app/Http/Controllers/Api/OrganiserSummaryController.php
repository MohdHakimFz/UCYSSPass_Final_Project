<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Event;
use App\Models\Payment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrganiserSummaryController extends Controller
{
    /**
     * The numbers at the top of an organiser's event list: their events, tickets sold and money taken.
     * An admin sees the same figures for the whole platform.
     */
    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless(in_array($user->role, ['organiser', 'admin']), 403);

        $events = Event::query()->when($user->role === 'organiser', fn ($q) => $q->where('organiser_id', $user->id));
        $bookings = Booking::query()->whereHas('ticketType.event', fn ($q) => $q->when($user->role === 'organiser', fn ($q) => $q->where('organiser_id', $user->id)));

        $money = Payment::query()
            ->whereIn('booking_id', (clone $bookings)->select('id'))
            ->whereIn('status', ['paid', 'refunded'])
            ->selectRaw('COALESCE(SUM(amount), 0) as gross, COALESCE(SUM(refunded_amount), 0) as refunded')
            ->first();

        return response()->json([
            'events' => (clone $events)->count(),
            'published' => (clone $events)->where('status', 'published')->count(),
            'drafts' => (clone $events)->where('status', 'draft')->count(),
            'upcoming' => (clone $events)->where('status', 'published')->where('end_at', '>=', now())->count(),
            'tickets_sold' => (clone $bookings)->whereIn('status', ['confirmed', 'attended'])->count(),
            'checked_in' => (clone $bookings)->where('status', 'attended')->count(),
            'waitlisted' => (clone $bookings)->where('status', 'waitlisted')->count(),
            'awaiting_payment' => (clone $bookings)->where('status', 'pending')->whereNotNull('hold_expires_at')->where('hold_expires_at', '>', now())->count(),
            'revenue' => [
                'gross' => (float) $money->gross,
                'refunded' => (float) $money->refunded,
                'net' => (float) $money->gross - (float) $money->refunded,
            ],
        ]);
    }
}
