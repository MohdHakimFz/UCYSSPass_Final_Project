<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * PostgreSQL does not index a foreign key by itself, so every join and every "bookings of this customer"
 * lookup read the whole table. These indexes are the ones the queries in the API actually use.
 * See docs/performance for the measurements from before and after.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            // "My bookings", newest first
            $table->index(['customer_id', 'booked_at'], 'bookings_customer_booked_idx');
            // Counts per status for a tier or an event, and the waitlist queue order
            $table->index(['ticket_type_id', 'status', 'booked_at', 'id'], 'bookings_tier_status_idx');
            // The admin list (all bookings, or filtered by status), newest first
            $table->index(['status', 'booked_at'], 'bookings_status_booked_idx');
            $table->index('booked_at', 'bookings_booked_idx');
        });

        // The minute-by-minute sweep for holds that ran out only ever looks at unpaid ones, so index just those.
        DB::statement("CREATE INDEX bookings_pending_holds_idx ON bookings (hold_expires_at) WHERE status = 'pending'");

        Schema::table('events', function (Blueprint $table) {
            $table->index(['status', 'start_at'], 'events_status_start_idx');
            $table->index(['organiser_id', 'start_at'], 'events_organiser_start_idx');
            $table->index('venue_id', 'events_venue_idx');
        });

        Schema::table('ticket_types', fn (Blueprint $table) => $table->index('event_id', 'ticket_types_event_idx'));
        Schema::table('notifications', fn (Blueprint $table) => $table->index(['booking_id', 'type'], 'notifications_booking_type_idx'));
        Schema::table('users', fn (Blueprint $table) => $table->index('role', 'users_role_idx'));
    }

    public function down(): void
    {
        Schema::table('users', fn (Blueprint $table) => $table->dropIndex('users_role_idx'));
        Schema::table('notifications', fn (Blueprint $table) => $table->dropIndex('notifications_booking_type_idx'));
        Schema::table('ticket_types', fn (Blueprint $table) => $table->dropIndex('ticket_types_event_idx'));
        Schema::table('events', function (Blueprint $table) {
            $table->dropIndex('events_venue_idx');
            $table->dropIndex('events_organiser_start_idx');
            $table->dropIndex('events_status_start_idx');
        });
        DB::statement('DROP INDEX IF EXISTS bookings_pending_holds_idx');
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropIndex('bookings_booked_idx');
            $table->dropIndex('bookings_status_booked_idx');
            $table->dropIndex('bookings_tier_status_idx');
            $table->dropIndex('bookings_customer_booked_idx');
        });
    }
};
