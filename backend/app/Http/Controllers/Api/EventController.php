<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Event\StoreEventRequest;
use App\Http\Requests\Event\UpdateEventRequest;
use App\Models\Event;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EventController extends Controller
{
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
        $event->update($request->validated());

        return response()->json($event);
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
