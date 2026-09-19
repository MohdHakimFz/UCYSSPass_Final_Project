<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\TicketType\StoreTicketTypeRequest;
use App\Http\Requests\TicketType\UpdateTicketTypeRequest;
use App\Models\Event;
use App\Models\TicketType;
use App\Models\Seat;
use App\Services\BookingService;
use App\Services\SeatingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class TicketTypeController extends Controller
{
    public function __construct(private readonly SeatingService $seating, private readonly BookingService $bookings) {}

    /**
     * Every seat of a tier and whether it is taken. Public, and never says who holds a seat.
     */
    public function seats(TicketType $ticketType): JsonResponse
    {
        // Seats held by someone who never paid are shown as free again.
        $this->bookings->releaseExpired($ticketType->id);

        $seats = Seat::where('ticket_type_id', $ticketType->id)
            ->withExists(['booking as taken'])
            ->orderBy('id')
            ->get(['id', 'row_label', 'number'])
            ->map(fn (Seat $seat) => [
                'id' => $seat->id,
                'row' => $seat->row_label,
                'number' => $seat->number,
                'label' => $seat->label,
                'taken' => (bool) $seat->taken,
            ]);

        return response()->json($seats);
    }

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

        $ticketType = DB::transaction(function () use ($event, $data) {
            $ticketType = $event->ticketTypes()->create($data);

            if ($event->seated) {
                $this->seating->sync($ticketType);
            }

            return $ticketType->fresh();
        });

        return response()->json($ticketType, 201);
    }

    /**
     * Update a ticket type.
     */
    public function update(UpdateTicketTypeRequest $request, TicketType $ticketType): JsonResponse
    {
        DB::transaction(function () use ($request, $ticketType) {
            $data = $request->validated();

            // The database will not hold seats_remaining above capacity, even for a moment before the seats are recounted.
            if ($ticketType->event->seated && isset($data['capacity'])) {
                $data['seats_remaining'] = min($ticketType->seats_remaining, $data['capacity']);
            }

            $ticketType->update($data);

            if ($ticketType->event->seated) {
                $this->seating->sync($ticketType);
            }
        });

        return response()->json($ticketType->fresh());
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
