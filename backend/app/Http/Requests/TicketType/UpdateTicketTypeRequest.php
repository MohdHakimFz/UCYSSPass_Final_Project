<?php

namespace App\Http\Requests\TicketType;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

class UpdateTicketTypeRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('ticketType'));
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:100'],
            'price' => ['sometimes', 'required', 'numeric', 'min:0'],
            'capacity' => ['sometimes', 'required', 'integer', 'min:0'],
            'seats_per_row' => ['sometimes', 'integer', 'min:1', 'max:40'],
            'seats_remaining' => ['sometimes', 'required', 'integer', 'min:0'],
        ];
    }

    /**
     * Guard against a partial update producing seats_remaining > capacity,
     * which would otherwise fail as a raw 500 from the DB check constraint.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $ticketType = $this->route('ticketType');

            // On a seated event the seat count decides seats_remaining, so there is nothing to compare.
            if ($ticketType->event->seated) {
                return;
            }

            $capacity = $this->input('capacity', $ticketType->capacity);
            $seatsRemaining = $this->input('seats_remaining', $ticketType->seats_remaining);

            if ($seatsRemaining > $capacity) {
                $validator->errors()->add('seats_remaining', 'The seats_remaining may not exceed capacity.');
            }
        });
    }
}
