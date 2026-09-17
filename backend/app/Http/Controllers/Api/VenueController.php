<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Venue\StoreVenueRequest;
use App\Http\Requests\Venue\UpdateVenueRequest;
use App\Models\Venue;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VenueController extends Controller
{
    /**
     * List venues, paginated and searchable by name.
     */
    public function index(Request $request): JsonResponse
    {
        $venues = Venue::query()
            ->when($request->filled('search'), fn ($query) => $query->where('name', 'ilike', '%'.$request->string('search').'%'))
            ->orderBy('name')
            ->paginate($request->integer('per_page', 15));

        return response()->json($venues);
    }

    /**
     * Create a new venue.
     */
    public function store(StoreVenueRequest $request): JsonResponse
    {
        $venue = Venue::create($request->validated());

        return response()->json($venue, 201);
    }

    /**
     * Show a single venue.
     */
    public function show(Venue $venue): JsonResponse
    {
        return response()->json($venue);
    }

    /**
     * Update a venue.
     */
    public function update(UpdateVenueRequest $request, Venue $venue): JsonResponse
    {
        $venue->update($request->validated());

        return response()->json($venue);
    }

    /**
     * Delete a venue, unless events still reference it.
     */
    public function destroy(Venue $venue): JsonResponse
    {
        $this->authorize('delete', $venue);

        if ($venue->events()->exists()) {
            return response()->json([
                'message' => 'Cannot delete a venue that still has events.',
            ], 409);
        }

        $venue->delete();

        return response()->json(null, 204);
    }
}
