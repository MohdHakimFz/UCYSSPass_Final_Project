<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('events', function (Blueprint $table) {
            // physical: a room with a venue (and maybe numbered seats). online: a meeting link, no seats.
            $table->string('mode', 10)->default('physical')->after('category');
            // Only ever shown to confirmed guests, the organiser and admins.
            $table->string('meeting_url', 500)->nullable()->after('mode');
            $table->string('meeting_platform', 20)->nullable()->after('meeting_url');
        });

        DB::statement("ALTER TABLE events ADD CONSTRAINT events_mode_check CHECK (mode IN ('physical', 'online'))");
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE events DROP CONSTRAINT IF EXISTS events_mode_check');
        Schema::table('events', fn (Blueprint $table) => $table->dropColumn(['mode', 'meeting_url', 'meeting_platform']));
    }
};
