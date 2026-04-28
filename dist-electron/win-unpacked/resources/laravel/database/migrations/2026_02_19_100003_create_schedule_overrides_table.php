<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('schedule_overrides')) {
            return;
        }

        // Schedule overrides for one-time or specific changes
        Schema::create('schedule_overrides', function (Blueprint $table) {
            $table->id();
            $table->date('override_date');
            $table->foreignId('department_id')->nullable()->constrained('departments')->onDelete('cascade');
            $table->foreignId('employee_id')->nullable()->constrained('employees')->onDelete('cascade');
            $table->foreignId('schedule_id')->nullable()->constrained('work_schedules')->onDelete('set null');
            $table->enum('override_type', [
                'regular_holiday',
                'special_holiday',
                'company_holiday',
                'no_work',
                'special_schedule',
                'sunday_work',
                'half_day'
            ])->default('no_work');
            $table->string('reason', 500);
            $table->time('opening_time')->nullable();
            $table->time('closing_time')->nullable();
            $table->boolean('is_paid')->default(false);
            $table->boolean('is_recurring')->default(false);
            $table->timestamps();
        });

        // Pivot table for multiple employees per override
        Schema::create('schedule_override_employees', function (Blueprint $table) {
            $table->id();
            $table->foreignId('schedule_override_id')->constrained()->onDelete('cascade');
            $table->foreignId('employee_id')->constrained()->onDelete('cascade');
            $table->timestamps();

            $table->unique(['schedule_override_id', 'employee_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('schedule_override_employees');
        Schema::dropIfExists('schedule_overrides');
    }
};

