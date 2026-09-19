<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** A message an organiser sent to everyone booked on an event. */
class Announcement extends Model
{
    protected $fillable = ['event_id', 'sender_id', 'subject', 'message', 'recipients'];

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }
}
