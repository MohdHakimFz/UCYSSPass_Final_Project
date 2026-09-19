<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Booking extends Model
{
    /** @use HasFactory<\Database\Factories\BookingFactory> */
    use HasFactory;

    protected $fillable = [
        'customer_id',
        'ticket_type_id',
        'seat_id',
        'status',
        'qr_token',
        'booked_at',
        'checked_in_at',
        'hold_expires_at',
    ];

    protected $appends = ['hold_seconds_left', 'meeting'];

    /**
     * Seconds left on the payment hold, worked out on the server so a phone with the wrong clock still counts down correctly.
     */
    protected function holdSecondsLeft(): \Illuminate\Database\Eloquent\Casts\Attribute
    {
        return \Illuminate\Database\Eloquent\Casts\Attribute::get(
            fn () => $this->hold_expires_at ? max(0, (int) now()->diffInSeconds($this->hold_expires_at, false)) : null
        );
    }

    /**
     * For a confirmed guest of an online event: which platform, and when the meeting can be joined.
     * The link itself is never here; it comes from the join endpoint, once the meeting is open.
     *
     * @return \Illuminate\Database\Eloquent\Casts\Attribute<array<string, mixed>|null, never>
     */
    protected function meeting(): \Illuminate\Database\Eloquent\Casts\Attribute
    {
        return \Illuminate\Database\Eloquent\Casts\Attribute::get(function () {
            $event = $this->ticketType?->event;
            if (! $event || ! $event->isOnline() || ! in_array($this->status, ['confirmed', 'attended'], true)) {
                return null;
            }

            $opensAt = $event->start_at->copy()->subMinutes((int) config('sentrypass.meeting_open_minutes'));

            return [
                'platform' => $event->meeting_platform,
                'opens_at' => $opensAt->toIso8601String(),
                'ends_at' => $event->end_at->toIso8601String(),
                'open' => $event->status === 'published' && now()->between($opensAt, $event->end_at),
            ];
        });
    }

    protected function casts(): array
    {
        return [
            'booked_at' => 'datetime',
            'checked_in_at' => 'datetime',
            'hold_expires_at' => 'datetime',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    public function ticketType(): BelongsTo
    {
        return $this->belongsTo(TicketType::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    /** The latest payment attempt, for showing status. */
    public function payment(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(Payment::class)->latestOfMany();
    }

    public function seat(): BelongsTo
    {
        return $this->belongsTo(Seat::class);
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class);
    }
}
