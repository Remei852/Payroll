<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendance_adjustments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('attendance_record_id')->constrained('attendance_records')->onDelete('cascade');
            $table->foreignId('adjusted_by')->constrained('users')->onDelete('cascade');
            
            // What was adjusted
            $table->enum('adjustment_type', [
                'time_correction',      // Correcting clock in/out times
                'missed_log_fix',       // Adding missing logs
                'status_override',      // Changing status (e.g., Absent to Present)
                'late_excuse',          // Excusing late arrival
                'manual_entry',         // Completely manual entry
                'other'
            ]);
            
            // Original values (before adjustment)
            $table->time('original_time_in_am')->nullable();
            $table->time('original_time_out_lunch')->nullable();
            $table->time('original_time_in_pm')->nullable();
            $table->time('original_time_out_pm')->nullable();
            $table->string('original_status')->nullable();
            $table->integer('original_late_minutes')->default(0);
            $table->decimal('original_rendered', 4, 2)->default(0);
            
            // Adjusted values (after adjustment)
            $table->time('adjusted_time_in_am')->nullable();
            $table->time('adjusted_time_out_lunch')->nullable();
            $table->time('adjusted_time_in_pm')->nullable();
            $table->time('adjusted_time_out_pm')->nullable();
            $table->string('adjusted_status')->nullable();
            $table->integer('adjusted_late_minutes')->default(0);
            $table->decimal('adjusted_rendered', 4, 2)->default(0);
            
            // Justification
            $table->text('reason');
            $table->text('supporting_documents')->nullable(); // File paths or references
            
            // Approval workflow (optional)
            $table->enum('approval_status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->foreignId('approved_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('approved_at')->nullable();
            
            $table->timestamps();
            
            // Indexes
            $table->index('attendance_record_id');
            $table->index('adjusted_by');
            $table->index('approval_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_adjustments');
    }
};
