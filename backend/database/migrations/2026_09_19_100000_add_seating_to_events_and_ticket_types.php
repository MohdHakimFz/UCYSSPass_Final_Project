<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('events', function (Blueprint $table) {
            // When true, customers pick a numbered seat instead of just a ticket tier.
            $table->boolean('seated')->default(false)->after('status');
        });

        Schema::table('ticket_types', function (Blueprint $table) {
            // How many seats sit in each row of this tier's block (only used when the event is seated).
            $table->unsignedSmallInteger('seats_per_row')->default(10)->after('capacity');
        });
    }

    public function down(): void
    {
        Schema::table('ticket_types', fn (Blueprint $table) => $table->dropColumn('seats_per_row'));
        Schema::table('events', fn (Blueprint $table) => $table->dropColumn('seated'));
    }
};
