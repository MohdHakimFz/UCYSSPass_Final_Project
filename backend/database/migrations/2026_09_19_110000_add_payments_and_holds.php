<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            // While a booking is pending payment, the seat is kept for the customer until this moment.
            $table->timestamp('hold_expires_at')->nullable()->after('checked_in_at');
        });

        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('booking_id')->constrained('bookings')->cascadeOnDelete();
            $table->decimal('amount', 10, 2);
            $table->string('method', 20);
            $table->string('status', 12); // paid, failed, refunded
            $table->string('reference', 40)->nullable();
            $table->string('failure_reason')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('refunded_at')->nullable();
            $table->decimal('refunded_amount', 10, 2)->default(0);
            $table->timestamps();

            $table->index(['booking_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
        Schema::table('bookings', fn (Blueprint $table) => $table->dropColumn('hold_expires_at'));
    }
};
