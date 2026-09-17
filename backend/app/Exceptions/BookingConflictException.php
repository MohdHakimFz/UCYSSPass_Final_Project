<?php

namespace App\Exceptions;

use Exception;
use Illuminate\Http\JsonResponse;

class BookingConflictException extends Exception
{
    /**
     * This is an expected business-rule conflict (409), not a bug —
     * don't spam the error log every time a customer double-books.
     */
    public function report(): bool
    {
        return false;
    }

    public function render(): JsonResponse
    {
        return response()->json(['message' => $this->getMessage()], 409);
    }
}
