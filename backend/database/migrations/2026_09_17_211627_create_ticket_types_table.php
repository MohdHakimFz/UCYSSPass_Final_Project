<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('ticket_types', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained('events')->cascadeOnDelete();
            $table->string('name', 100);
            $table->decimal('price', 10, 2)->default(0);
            $table->integer('capacity');
            $table->integer('seats_remaining');
            $table->timestamps();
        });

        DB::statement('ALTER TABLE ticket_types ADD CONSTRAINT ticket_types_capacity_check CHECK (capacity >= 0)');
        DB::statement('ALTER TABLE ticket_types ADD CONSTRAINT ticket_types_seats_remaining_check CHECK (seats_remaining >= 0 AND seats_remaining <= capacity)');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ticket_types');
    }
};
