<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Event\StoreAnnouncementRequest;
use App\Models\Announcement;
use App\Models\Booking;
use App\Models\Event;
use App\Models\Notification;
use App\Services\EmailService;
use Illuminate\Http\JsonResponse;

class AnnouncementController extends Controller
{
    /** Who hears about a change: everyone still expecting to come, or hoping to. Each person once. */
    private const AUDIENCE = ['confirmed', 'pending', 'waitlisted'];

    /** A safety cap, so one press of the button cannot send thousands of emails. */
    private const MAX_RECIPIENTS = 500;

    /**
     * What was sent before, newest first, and how many people a new announcement would reach now.
     */
    public function index(Event $event): JsonResponse
    {
        $this->authorize('update', $event);

        return response()->json([
            'audience' => $this->audience($event)->count(),
            'data' => $event->announcements()->with('sender:id,name')->latest('id')->get(['id', 'event_id', 'sender_id', 'subject', 'message', 'recipients', 'created_at']),
        ]);
    }

    /**
     * Send a message to everyone booked on the event. The emails go out after the response, so the organiser is not kept waiting.
     */
    public function store(StoreAnnouncementRequest $request, Event $event, EmailService $emails): JsonResponse
    {
        abort_unless($event->status === 'published', 422, 'Only a published event can send announcements.');

        $bookings = $this->audience($event);
        abort_if($bookings->isEmpty(), 422, 'Nobody has booked this event yet.');
        abort_if($bookings->count() > self::MAX_RECIPIENTS, 422, 'This event has more than '.self::MAX_RECIPIENTS.' guests, which is more than one announcement may reach.');

        $announcement = Announcement::create([
            'event_id' => $event->id, 'sender_id' => $request->user()->id,
            'subject' => $request->validated('subject'), 'message' => $request->validated('message'), 'recipients' => $bookings->count(),
        ]);

        $notifications = $bookings->map(fn (Booking $booking) => Notification::create([
            'booking_id' => $booking->id, 'announcement_id' => $announcement->id, 'type' => 'announcement',
        ]));

        // The rows above are the promise; the sending happens once the answer has gone back.
        app()->terminating(fn () => $notifications->each(fn (Notification $notification) => $emails->send($notification)));

        return response()->json($announcement->load('sender:id,name'), 201);
    }

    /** One booking per person: the first one they made. */
    private function audience(Event $event)
    {
        return Booking::query()
            ->whereIn('ticket_type_id', $event->ticketTypes()->select('id'))
            ->whereIn('status', self::AUDIENCE)
            ->orderBy('id')
            ->get(['id', 'customer_id'])
            ->unique('customer_id')
            ->values();
    }
}
