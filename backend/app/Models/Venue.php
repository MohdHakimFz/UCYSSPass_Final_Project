<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Venue extends Model
{
    /** @use HasFactory<\Database\Factories\VenueFactory> */
    use HasFactory;

    /** Online events all point at this one venue, so every event still has a place. */
    public const ONLINE_NAME = 'Online';

    public static function online(): self
    {
        return self::firstOrCreate(
            ['name' => self::ONLINE_NAME],
            ['address' => 'Online meeting', 'capacity' => 100000],
        );
    }

    protected $fillable = [
        'name',
        'address',
        'capacity',
    ];

    protected function casts(): array
    {
        return [
            'capacity' => 'integer',
        ];
    }

    public function events(): HasMany
    {
        return $this->hasMany(Event::class);
    }
}
