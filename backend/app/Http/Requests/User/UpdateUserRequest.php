<?php

namespace App\Http\Requests\User;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('user'));
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * Only an admin may change role; a self-update is limited to
     * name/email/password regardless of what's in the payload.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $rules = [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => ['sometimes', 'required', 'string', 'email', 'max:255', Rule::unique('users', 'email')->ignore($this->route('user'))],
            'password' => ['sometimes', 'required', 'string', 'min:8'],
        ];

        // Changing your own password needs your current one, so a stolen token can't lock you out.
        if ($this->user()->id === $this->route('user')->id) {
            $rules['current_password'] = ['required_with:password', 'current_password:sanctum'];
        }

        if ($this->user()->role === 'admin') {
            $rules['role'] = ['sometimes', 'required', 'in:admin,organiser,customer'];
        }

        return $rules;
    }
}
