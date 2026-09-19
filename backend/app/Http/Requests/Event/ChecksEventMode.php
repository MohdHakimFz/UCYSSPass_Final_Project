<?php

namespace App\Http\Requests\Event;

use App\Models\Venue;
use Illuminate\Contracts\Validation\Validator;

/** The rules that tie an event's mode to its venue, seats and meeting link, shared by create and update. */
trait ChecksEventMode
{
    /** @return array<string, mixed> */
    protected function modeRules(): array
    {
        return [
            'mode' => ['sometimes', 'required', 'in:physical,online'],
            'meeting_url' => ['nullable', 'url:https,http', 'max:500'],
            'meeting_platform' => ['nullable', 'in:zoom,meet,teams,other'],
        ];
    }

    protected function checkMode(Validator $validator, string $mode, string $status, ?string $meetingUrl, ?int $venueId, bool $venueIsOnline): void
    {
        if ($mode === 'online') {
            if ($this->boolean('seated')) {
                $validator->errors()->add('seated', 'An online event has no numbered seats.');
            }
            if ($status === 'published' && blank($meetingUrl)) {
                $validator->errors()->add('meeting_url', 'An online event needs a meeting link before it can be published.');
            }

            return;
        }

        if ($venueId === null || $venueIsOnline) {
            $validator->errors()->add('venue_id', 'A physical event needs a venue.');
        }
    }

    protected function venueIsOnline(?int $venueId): bool
    {
        return $venueId !== null && Venue::whereKey($venueId)->where('name', Venue::ONLINE_NAME)->exists();
    }
}
