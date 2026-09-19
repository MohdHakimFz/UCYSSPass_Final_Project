<?php

namespace App\Exceptions;

use Illuminate\Http\JsonResponse;
use RuntimeException;

class PaymentDeclinedException extends RuntimeException
{
    /** A declined payment is an expected outcome, not a bug: keep it out of the error log. */
    public function report(): bool
    {
        return false;
    }

    public function render(): JsonResponse
    {
        return response()->json(['message' => $this->getMessage()], 402);
    }
}
