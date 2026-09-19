<?php

namespace App\Services;

use App\Exceptions\PaymentDeclinedException;
use Illuminate\Support\Str;

/**
 * A stand-in for a real payment provider. No money moves and no card details are involved: the caller chooses
 * the outcome, so both the success and the failure paths can be shown and tested.
 */
class SandboxPaymentGateway
{
    /** @return string a reference for the charge */
    public function charge(float $amount, string $method, string $outcome = 'approve'): string
    {
        if (config('sentrypass.payments_driver') === 'sandbox') {
            match ($outcome) {
                'decline' => throw new PaymentDeclinedException('The payment was declined. Try another payment method.'),
                'insufficient' => throw new PaymentDeclinedException('Insufficient funds. Try another payment method.'),
                default => null,
            };
        }

        return 'SBX-'.strtoupper(Str::random(10));
    }
}
