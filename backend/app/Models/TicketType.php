<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TicketType extends Model
{
    /** @use HasFactory<\Database\Factories\TicketTypeFactory> */
    use HasFactory;

    protected $fillable = [
        'event_id',
        'name',
        'price',
        'capacity',
        'seats_per_row',
        'seats_remaining',
        'members_only',
    ];

    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'capacity' => 'integer',
            'seats_remaining' => 'integer',
            'seats_per_row' => 'integer',
            'members_only' => 'boolean',
        ];
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function seats(): HasMany
    {
        return $this->hasMany(Seat::class);
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class);
    }
}
