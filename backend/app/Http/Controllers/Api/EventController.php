<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Event\StoreEventRequest;
use App\Http\Requests\Event\UpdateEventRequest;
use App\Models\Booking;
use App\Models\Event;
use App\Models\Payment;
use App\Services\BookingService;
use App\Services\SeatingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EventController extends Controller
{
    public function __construct(private readonly BookingService $bookings, private readonly SeatingService $seating) {}

    /**
     * List events: paginated, filterable, searchable, sortable.
     */
    public function index(Request $request): JsonResponse
    {
        $sortable = ['start_at', 'title'];
        $sort = in_array($request->string('sort'), $sortable) ? (string) $request->string('sort') : 'start_at';
        $direction = $request->string('direction', 'asc') === 'desc' ? 'desc' : 'asc';

        $events = Event::query()
            ->with('venue:id,name')
            ->withMin('ticketTypes as from_price', 'price')
            ->withSum('ticketTypes as seats_remaining', 'seats_remaining')
            ->withSum('ticketTypes as capacity', 'capacity')
            ->when($request->filled('organiser_id'), fn ($query) => $query->where('organiser_id', $request->integer('organiser_id')))
            ->when($request->filled('category'), fn ($query) => $query->where('category', $request->string('category')))
            ->when($request->filled('venue_id'), fn ($query) => $query->where('venue_id', $request->integer('venue_id')))
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->string('status')))
            ->when($request->filled('max_price'), fn ($query) => $query->whereHas(
                'ticketTypes',
                fn ($query) => $query->where('price', '<=', $request->input('max_price'))
            ))
            ->when($request->filled('from'), fn ($query) => $query->where('start_at', '>=', $request->string('from')))
            ->when($request->filled('to'), fn ($query) => $query->where('end_at', '<=', $request->string('to')))
            ->when($request->filled('search'), fn ($query) => $query->where('title', 'ilike', '%'.$request->string('search').'%'))
            ->orderBy($sort, $direction)
            ->paginate($request->integer('per_page', 15));

        return response()->json($events);
    }

    /**
     * Create a new event. organiser_id is forced to the authenticated
     * organiser unless the caller is an admin explicitly assigning one.
     */
    public function store(StoreEventRequest $request): JsonResponse
    {
        $data = $request->validated();

        $data['organiser_id'] = $request->user()->role === 'admin'
            ? ($data['organiser_id'] ?? $request->user()->id)
            : $request->user()->id;

        $event = Event::create($data);

        return response()->json($event, 201);
    }

    /**
     * Show a single event including its ticket types.
     */
    public function show(Event $event): JsonResponse
    {
        return response()->json($event->load('venue', 'ticketTypes'));
    }

    /**
     * Update an event.
     */
    public function update(UpdateEventRequest $request, Event $event): JsonResponse
    {
        $wasCancelled = $event->status === 'cancelled';
        $wasSeated = $event->seated;

        DB::transaction(function () use ($request, $event, $wasSeated) {
            $event->update($request->validated());

            if ($event->seated && ! $wasSeated) {
                $this->seating->enable($event);
            } elseif (! $event->seated && $wasSeated) {
                $this->seating->disable($event);
            }
        });

        // Cancelling an event cancels every active booking on it and emails those attendees.
        $cancelledBookings = (! $wasCancelled && $event->status === 'cancelled')
            ? $this->bookings->cancelForEvent($event)
            : 0;

        $event->setAttribute('cancelled_bookings', $cancelledBookings);

        return response()->json($event);
    }

    /**
     * Fill, check-in and waitlist numbers for one event. Owning organiser or admin.
     */
    public function stats(Event $event): JsonResponse
    {
        $this->authorize('update', $event);

        $tiers = $event->ticketTypes()->get();
        $tierIds = $tiers->pluck('id');

        $counts = Booking::whereIn('ticket_type_id', $tierIds)
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $waitlistByTier = Booking::whereIn('ticket_type_id', $tierIds)
            ->where('status', 'waitlisted')
            ->selectRaw('ticket_type_id, COUNT(*) as total')
            ->groupBy('ticket_type_id')
            ->pluck('total', 'ticket_type_id');

        $capacity = (int) $tiers->sum('capacity');
        $confirmed = (int) ($counts['confirmed'] ?? 0);
        $attended = (int) ($counts['attended'] ?? 0);
        $held = $confirmed + $attended;
        $ended = $event->end_at->isPast();

        $recent = Booking::with(['customer:id,name', 'ticketType:id,name'])
            ->whereIn('ticket_type_id', $tierIds)
            ->whereNotNull('checked_in_at')
            ->orderByDesc('checked_in_at')
            ->limit(10)
            ->get()
            ->map(fn (Booking $b) => [
                'booking_id' => $b->id,
                'name' => $b->customer?->name,
                'tier' => $b->ticketType?->name,
                'checked_in_at' => $b->checked_in_at,
            ]);

        $money = Payment::query()
            ->whereIn('booking_id', Booking::whereIn('ticket_type_id', $tierIds)->select('id'))
            ->whereIn('status', ['paid', 'refunded'])
            ->selectRaw('COALESCE(SUM(amount), 0) as gross, COALESCE(SUM(refunded_amount), 0) as refunded')
            ->first();

        return response()->json([
            'revenue' => [
                'gross' => (float) $money->gross,
                'refunded' => (float) $money->refunded,
                'net' => (float) $money->gross - (float) $money->refunded,
            ],
            'pending_holds' => (int) Booking::whereIn('ticket_type_id', $tierIds)->where('status', 'pending')->whereNotNull('hold_expires_at')->where('hold_expires_at', '>', now())->count(),
            'capacity' => $capacity,
            'seats_remaining' => (int) $tiers->sum('seats_remaining'),
            'held' => $held,
            'confirmed' => $confirmed,
            'attended' => $attended,
            'waitlisted' => (int) ($counts['waitlisted'] ?? 0),
            'cancelled' => (int) ($counts['cancelled'] ?? 0),
            'fill_rate' => $capacity ? round($held / $capacity * 100, 1) : 0,
            'check_in_rate' => $held ? round($attended / $held * 100, 1) : 0,
            'no_show' => $ended ? $confirmed : 0,
            'event_ended' => $ended,
            'tiers' => $tiers->map(fn ($t) => [
                'id' => $t->id,
                'name' => $t->name,
                'capacity' => $t->capacity,
                'seats_remaining' => $t->seats_remaining,
                'waitlisted' => (int) ($waitlistByTier[$t->id] ?? 0),
            ]),
            'recent_checkins' => $recent,
        ]);
    }

    /**
     * Copy an event and its ticket tiers as a fresh draft with all seats open.
     */
    public function duplicate(Event $event): JsonResponse
    {
        $this->authorize('update', $event);

        $copy = DB::transaction(function () use ($event) {
            $copy = $event->replicate();
            $copy->title = mb_substr('Copy of '.$event->title, 0, 255);
            $copy->status = 'draft';
            $copy->save();

            foreach ($event->ticketTypes as $tier) {
                $copy->ticketTypes()->create([
                    'name' => $tier->name,
                    'price' => $tier->price,
                    'capacity' => $tier->capacity,
                    'seats_per_row' => $tier->seats_per_row,
                    'seats_remaining' => $tier->capacity,
                ]);
            }

            if ($copy->seated) {
                $this->seating->enable($copy);
            }

            return $copy;
        });

        return response()->json($copy->load('venue', 'ticketTypes'), 201);
    }

    /**
     * Delete an event, unless it has active bookings.
     */
    public function destroy(Event $event): JsonResponse
    {
        $this->authorize('delete', $event);

        $hasActiveBookings = $event->ticketTypes()
            ->whereHas('bookings', fn ($query) => $query->whereIn('status', ['pending', 'confirmed', 'waitlisted']))
            ->exists();

        if ($hasActiveBookings) {
            return response()->json([
                'message' => 'Cannot delete an event that still has active bookings.',
            ], 409);
        }

        $event->delete();

        return response()->json(null, 204);
    }
}
