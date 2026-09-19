<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Event extends Model
{
    /** @use HasFactory<\Database\Factories\EventFactory> */
    use HasFactory;

    protected $fillable = [
        'venue_id',
        'organiser_id',
        'title',
        'description',
        'category',
        'mode',
        'meeting_url',
        'meeting_platform',
        'start_at',
        'end_at',
        'status',
        'seated',
    ];

    /** The meeting link is a secret of the guest list: it is only put in a response on purpose. */
    protected $hidden = ['meeting_url'];

    public function isOnline(): bool
    {
        return $this->mode === 'online';
    }

    protected function casts(): array
    {
        return [
            'start_at' => 'datetime',
            'end_at' => 'datetime',
            'seated' => 'boolean',
        ];
    }

    public function venue(): BelongsTo
    {
        return $this->belongsTo(Venue::class);
    }

    public function organiser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'organiser_id');
    }

    public function ticketTypes(): HasMany
    {
        return $this->hasMany(TicketType::class);
    }
}
