<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('announcements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained('events')->cascadeOnDelete();
            $table->foreignId('sender_id')->constrained('users')->cascadeOnDelete();
            $table->string('subject', 150);
            $table->text('message');
            $table->unsignedInteger('recipients')->default(0);
            $table->timestamps();

            $table->index(['event_id', 'created_at'], 'announcements_event_created_idx');
        });

        Schema::table('notifications', function (Blueprint $table) {
            $table->foreignId('announcement_id')->nullable()->after('booking_id')->constrained('announcements')->cascadeOnDelete();
        });

        DB::statement('ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check');
        DB::statement("ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN ('confirmation', 'waitlist_promoted', 'cancelled', 'reminder', 'announcement'))");
    }

    public function down(): void
    {
        DB::table('notifications')->where('type', 'announcement')->delete();
        DB::statement('ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check');
        DB::statement("ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN ('confirmation', 'waitlist_promoted', 'cancelled', 'reminder'))");
        Schema::table('notifications', fn (Blueprint $table) => $table->dropConstrainedForeignId('announcement_id'));
        Schema::dropIfExists('announcements');
    }
};
