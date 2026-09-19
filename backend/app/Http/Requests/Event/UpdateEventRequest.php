<?php

namespace App\Http\Requests\Event;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

class UpdateEventRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('event'));
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'venue_id' => ['sometimes', 'required', 'integer', 'exists:venues,id'],
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'category' => ['sometimes', 'required', 'in:ctf,bootcamp,conference,workshop'],
            'start_at' => ['sometimes', 'required', 'date'],
            'end_at' => ['sometimes', 'required', 'date', 'after:start_at'],
            'status' => ['sometimes', 'required', 'in:draft,published,cancelled,completed'],
            'seated' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * Guard against a partial update (e.g. only start_at) producing an
     * end_at <= start_at combination that would violate the DB check
     * constraint with a raw 500 instead of a clean 422.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $event = $this->route('event');

            $startAt = $this->input('start_at', $event->start_at);
            $endAt = $this->input('end_at', $event->end_at);

            if (strtotime((string) $endAt) <= strtotime((string) $startAt)) {
                $validator->errors()->add('end_at', 'The end_at must be a date after start_at.');
            }
        });
    }
}
