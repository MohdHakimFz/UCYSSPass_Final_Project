<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Seat extends Model
{
    protected $fillable = ['ticket_type_id', 'row_label', 'number'];

    protected $appends = ['label'];

    /** For example "B12": the row letter and the seat number. */
    protected function label(): \Illuminate\Database\Eloquent\Casts\Attribute
    {
        return \Illuminate\Database\Eloquent\Casts\Attribute::get(fn () => $this->row_label.$this->number);
    }

    public function ticketType(): BelongsTo
    {
        return $this->belongsTo(TicketType::class);
    }

    public function booking(): HasOne
    {
        return $this->hasOne(Booking::class);
    }
}
