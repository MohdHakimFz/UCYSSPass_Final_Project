<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Set by an admin from the society's own member list; nobody can grant it to themselves.
            $table->boolean('is_member')->default(false)->after('role');
        });

        Schema::table('ticket_types', function (Blueprint $table) {
            // A members-only tier (for example "Member price") can only be booked by a member.
            $table->boolean('members_only')->default(false)->after('seats_per_row');
        });
    }

    public function down(): void
    {
        Schema::table('ticket_types', fn (Blueprint $table) => $table->dropColumn('members_only'));
        Schema::table('users', fn (Blueprint $table) => $table->dropColumn('is_member'));
    }
};
