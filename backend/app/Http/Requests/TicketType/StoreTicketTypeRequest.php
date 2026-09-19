<?php

namespace App\Http\Requests\TicketType;

use App\Models\TicketType;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

class StoreTicketTypeRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->can('create', [TicketType::class, $this->route('event')]);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:100'],
            'price' => ['required', 'numeric', 'min:0'],
            'capacity' => ['required', 'integer', 'min:0'],
            'seats_per_row' => ['sometimes', 'integer', 'min:1', 'max:40'],
            'seats_remaining' => ['sometimes', 'integer', 'min:0'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $capacity = (int) $this->input('capacity');
            $seatsRemaining = $this->input('seats_remaining', $capacity);

            if ($seatsRemaining > $capacity) {
                $validator->errors()->add('seats_remaining', 'The seats_remaining may not exceed capacity.');
            }
        });
    }
}
