<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('attendance_records')) {
            return;
        }

        Schema::create('attendance_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employees');
            $table->date('attendance_date');
            $table->foreignId('schedule_id')->constrained('work_schedules');
            $table->time('time_in_am')->nullable();
            $table->time('time_out_lunch')->nullable();
            $table->time('time_in_pm')->nullable();
            $table->time('time_out_pm')->nullable();
            $table->integer('late_minutes_am')->default(0);
            $table->integer('late_minutes_pm')->default(0);
            $table->integer('total_late_minutes')->default(0);
            $table->integer('overtime_minutes')->default(0);
            $table->decimal('workday_rendered', 5, 2)->default(0);
            $table->integer('missed_logs_count')->default(0); // Count of missing time slots (0-4)
            $table->string('status')->nullable();
            $table->string('remarks')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_records');
    }
};

