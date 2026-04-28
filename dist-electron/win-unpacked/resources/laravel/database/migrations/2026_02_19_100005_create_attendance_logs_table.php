<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('attendance_logs')) {
            return;
        }

        Schema::create('attendance_logs', function (Blueprint $table) {
            $table->id();
            $table->string('employee_code');
            $table->dateTime('log_datetime');
            $table->string('log_type'); // IN / OUT
            $table->string('location')->nullable();
            $table->string('source_file')->nullable();
            $table->timestamps();

            // Performance indexes
            $table->index(['log_datetime', 'employee_code']); // For date-based queries and grouping by employee
            $table->index('source_file'); // For filtering by uploaded CSV file
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_logs');
    }
};

