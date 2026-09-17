<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\TicketType\StoreTicketTypeRequest;
use App\Http\Requests\TicketType\UpdateTicketTypeRequest;
use App\Models\Event;
use App\Models\TicketType;
use Illuminate\Http\JsonResponse;

class TicketTypeController extends Controller
{
    /**
     * List ticket types for an event.
     */
    public function index(Event $event): JsonResponse
    {
        return response()->json($event->ticketTypes()->get());
    }

    /**
     * Create a ticket type under an event.
     */
    public function store(StoreTicketTypeRequest $request, Event $event): JsonResponse
    {
        $data = $request->validated();
        $data['seats_remaining'] = $data['seats_remaining'] ?? $data['capacity'];

        $ticketType = $event->ticketTypes()->create($data);

        return response()->json($ticketType, 201);
    }

    /**
     * Update a ticket type.
     */
    public function update(UpdateTicketTypeRequest $request, TicketType $ticketType): JsonResponse
    {
        $ticketType->update($request->validated());

        return response()->json($ticketType);
    }

    /**
     * Delete a ticket type.
     */
    public function destroy(TicketType $ticketType): JsonResponse
    {
        $this->authorize('delete', $ticketType);

        $ticketType->delete();

        return response()->json(null, 204);
    }
}
