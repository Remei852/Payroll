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
        Schema::table('attendance_violations', function (Blueprint $table) {
            // Add index on violation_date for date range filtering
            $table->index('violation_date');
            
            // Add index on severity for severity filtering
            $table->index('severity');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('attendance_violations', function (Blueprint $table) {
            // Drop the indexes
            $table->dropIndex(['violation_date']);
            $table->dropIndex(['severity']);
        });
    }
};
