<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

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
            $table->integer('overtime_minutes')->default(0);
            $table->integer('undertime_minutes')->default(0); // Undertime in minutes
            $table->decimal('rendered', 5, 2)->default(0); // Workday credit: 1.0 = full day, 0.5 = half day, 0.0 = absent
            $table->integer('missed_logs_count')->default(0); // Count of missing time slots (0-4)
            $table->string('status')->nullable();
            $table->string('remarks')->nullable();
            
            // Review & Edit fields
            $table->text('notes')->nullable(); // Admin notes explaining corrections
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->onDelete('set null'); // Who reviewed/edited
            $table->timestamp('reviewed_at')->nullable(); // When reviewed/edited
            
            $table->timestamps();

            // Performance indexes
            $table->unique(['employee_id', 'attendance_date']); // Ensure one record per employee per date
            $table->index('attendance_date'); // For date range queries
            $table->index('status'); // For filtering by status
            $table->index('reviewed_at'); // For filtering reviewed records
        });

        // Add total_late_minutes as a STORED generated column
        // This ensures it's always accurate (late_minutes_am + late_minutes_pm)
        $driver = DB::getDriverName();
        
        if ($driver === 'mysql') {
            DB::statement('
                ALTER TABLE attendance_records 
                ADD COLUMN total_late_minutes INT 
                GENERATED ALWAYS AS (late_minutes_am + late_minutes_pm) STORED
                AFTER late_minutes_pm
            ');
        } elseif ($driver === 'pgsql') {
            DB::statement('
                ALTER TABLE attendance_records 
                ADD COLUMN total_late_minutes INT 
                GENERATED ALWAYS AS (late_minutes_am + late_minutes_pm) STORED
            ');
        } else {
            // Fallback for SQLite or other databases
            Schema::table('attendance_records', function (Blueprint $table) {
                $table->integer('total_late_minutes')->default(0)->after('late_minutes_pm');
            });
        }

        // Create attendance_record_changes table for audit trail
        Schema::create('attendance_record_changes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('attendance_record_id')->constrained('attendance_records')->onDelete('cascade');
            $table->foreignId('changed_by')->constrained('users')->onDelete('set null');
            $table->string('field_name'); // e.g., 'time_in_am', 'status', 'notes'
            $table->text('old_value')->nullable();
            $table->text('new_value')->nullable();
            $table->text('reason')->nullable(); // Admin's explanation for the change
            $table->timestamps();
            
            // Performance indexes
            $table->index(['attendance_record_id', 'created_at']);
            $table->index('changed_by');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_record_changes');
        Schema::dropIfExists('attendance_records');
    }
};

