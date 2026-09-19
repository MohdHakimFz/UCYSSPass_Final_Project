<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check');
        DB::statement("ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN ('confirmation', 'waitlist_promoted', 'cancelled', 'reminder'))");
    }

    public function down(): void
    {
        DB::table('notifications')->where('type', 'reminder')->delete();
        DB::statement('ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check');
        DB::statement("ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN ('confirmation', 'waitlist_promoted', 'cancelled'))");
    }
};
