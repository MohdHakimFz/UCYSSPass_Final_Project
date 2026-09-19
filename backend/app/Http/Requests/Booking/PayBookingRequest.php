<?php

namespace App\Http\Requests\Booking;

use Illuminate\Foundation\Http\FormRequest;

class PayBookingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('pay', $this->route('booking'));
    }

    public function rules(): array
    {
        return [
            'method' => ['required', 'in:card,fpx,ewallet'],
            // Only used by the sandbox, to show a declined payment.
            'outcome' => ['sometimes', 'in:approve,decline,insufficient'],
        ];
    }
}
