<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            // One seat can belong to at most one booking at a time; cancelling clears it.
            $table->foreignId('seat_id')->nullable()->unique()->after('ticket_type_id')->constrained('seats')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropConstrainedForeignId('seat_id');
        });
    }
};
