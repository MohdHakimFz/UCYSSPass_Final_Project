<?php

namespace App\Exceptions;

use Exception;
use Illuminate\Http\JsonResponse;

/** This person may not book this ticket (for example a members-only tier). An expected answer, not a bug. */
class BookingNotAllowedException extends Exception
{
    public function report(): bool
    {
        return false;
    }

    public function render(): JsonResponse
    {
        return response()->json(['message' => $this->getMessage()], 403);
    }
}
