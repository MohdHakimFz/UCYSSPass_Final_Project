<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminNotificationController extends Controller
{
    /**
     * Email delivery log with the raw provider response. Admin only.
     */
    public function __invoke(Request $request): JsonResponse
    {
        abort_unless($request->user()->role === 'admin', 403);

        $notifications = Notification::query()
            ->with(['booking.customer:id,name,email', 'booking.ticketType:id,event_id,name', 'booking.ticketType.event:id,title'])
            ->when($request->filled('type'), fn ($query) => $query->where('type', $request->string('type')))
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 15));

        return response()->json($notifications);
    }
}
