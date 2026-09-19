<?php

namespace App\Http\Requests\Event;

use App\Models\Event;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreEventRequest extends FormRequest
{
    use ChecksEventMode;

    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->can('create', Event::class);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'venue_id' => [Rule::requiredIf(fn () => $this->input('mode') !== 'online'), 'nullable', 'integer', 'exists:venues,id'],
            'organiser_id' => ['sometimes', 'integer', 'exists:users,id'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'category' => ['required', 'in:ctf,bootcamp,conference,workshop'],
            'start_at' => ['required', 'date'],
            'end_at' => ['required', 'date', 'after:start_at'],
            'status' => ['sometimes', 'in:draft,published,cancelled,completed'],
            'seated' => ['sometimes', 'boolean'],
        ] + $this->modeRules();
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $venueId = $this->filled('venue_id') ? $this->integer('venue_id') : null;
            $this->checkMode($validator, $this->input('mode', 'physical'), $this->input('status', 'draft'), $this->input('meeting_url'), $venueId, $this->venueIsOnline($venueId));
        });
    }
}
