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
        Schema::create('events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('venue_id')->constrained('venues')->restrictOnDelete();
            $table->foreignId('organiser_id')->constrained('users')->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->enum('category', ['ctf', 'bootcamp', 'conference', 'workshop']);
            $table->dateTime('start_at');
            $table->dateTime('end_at');
            $table->enum('status', ['draft', 'published', 'cancelled', 'completed'])->default('draft');
            $table->timestamps();
        });

        DB::statement('ALTER TABLE events ADD CONSTRAINT events_end_after_start_check CHECK (end_at > start_at)');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('events');
    }
};
