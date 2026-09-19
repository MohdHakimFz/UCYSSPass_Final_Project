<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Event;
use App\Models\TicketType;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Numbered seats for events that switch seating on. A tier of 30 seats with 10 per row becomes A1..A10, B1..B10, C1..C10.
 * For a seated tier, seats_remaining always equals the number of free seats.
 */
class SeatingService
{
    /** A, B, ... Z, AA, AB, ... */
    public static function rowLabel(int $index): string
    {
        $label = '';
        for ($n = $index; $n >= 0; $n = intdiv($n, 26) - 1) {
            $label = chr(65 + $n % 26).$label;
        }

        return $label;
    }

    /**
     * Make a tier's seats match its capacity and row length, and bring seats_remaining in line.
     * Growing adds seats at the end. Shrinking removes free seats from the end and refuses to remove a booked one.
     */
    public function sync(TicketType $tier): void
    {
        DB::transaction(function () use ($tier) {
            $tier = TicketType::whereKey($tier->id)->lockForUpdate()->firstOrFail();
            $perRow = max(1, (int) $tier->seats_per_row);

            $existing = $tier->seats()->orderBy('id')->get();
            $rowLengthChanged = $existing->isNotEmpty() && $existing->first(fn ($s) => $s->row_label === 'A')
                && $existing->where('row_label', 'A')->count() !== min($perRow, $existing->count());

            if ($rowLengthChanged) {
                if (Booking::whereIn('seat_id', $existing->pluck('id'))->exists()) {
                    throw ValidationException::withMessages(['seats_per_row' => ['Seats per row cannot change once seats have been booked.']]);
                }
                $tier->seats()->delete();
                $existing = collect();
            }

            $count = $existing->count();

            if ($count < $tier->capacity) {
                $rows = [];
                for ($i = $count; $i < $tier->capacity; $i++) {
                    $rows[] = [
                        'ticket_type_id' => $tier->id,
                        'row_label' => self::rowLabel(intdiv($i, $perRow)),
                        'number' => $i % $perRow + 1,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                }
                foreach (array_chunk($rows, 500) as $chunk) {
                    $tier->seats()->insert($chunk);
                }
            } elseif ($count > $tier->capacity) {
                $toRemove = $count - $tier->capacity;
                $free = $tier->seats()->whereDoesntHave('booking')->orderByDesc('id')->limit($toRemove)->pluck('id');

                if ($free->count() < $toRemove) {
                    throw ValidationException::withMessages(['capacity' => ['Capacity cannot go below the number of seats already booked.']]);
                }

                $tier->seats()->whereIn('id', $free)->delete();
            }

            $booked = Booking::whereIn('seat_id', $tier->seats()->select('id'))->count();
            $tier->forceFill(['seats_remaining' => $tier->capacity - $booked])->save();
        });
    }

    /**
     * Switch seating on for an event: build every tier's seats, then give the people who already hold a place
     * the first free seats in the order they booked. Fails cleanly if there are more of them than seats.
     */
    public function enable(Event $event): void
    {
        DB::transaction(function () use ($event) {
            foreach ($event->ticketTypes()->get() as $tier) {
                $this->sync($tier);

                $holders = Booking::where('ticket_type_id', $tier->id)
                    ->whereIn('status', ['confirmed', 'attended'])
                    ->whereNull('seat_id')
                    ->orderBy('booked_at')->orderBy('id')
                    ->get();

                $free = $tier->seats()->whereDoesntHave('booking')->orderBy('id')->limit($holders->count())->pluck('id');

                if ($free->count() < $holders->count()) {
                    throw ValidationException::withMessages(['seated' => ["The {$tier->name} tier has more booked guests than seats."]]);
                }

                foreach ($holders as $i => $booking) {
                    $booking->update(['seat_id' => $free[$i]]);
                }

                $this->sync($tier);
            }
        });
    }

    /** Switch seating off: guests keep their bookings, the seats and their assignments go away. */
    public function disable(Event $event): void
    {
        DB::transaction(function () use ($event) {
            $tierIds = $event->ticketTypes()->pluck('id');

            Booking::whereIn('ticket_type_id', $tierIds)->whereNotNull('seat_id')->update(['seat_id' => null]);
            \App\Models\Seat::whereIn('ticket_type_id', $tierIds)->delete();
        });
    }
}
