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
        Schema::create('attendance_violations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->onDelete('cascade');
            $table->date('violation_date');
            $table->string('violation_type'); // Missing Log, Excessive Late, Multiple Logs, etc.
            $table->text('details')->nullable();
            $table->enum('severity', ['Low', 'Medium', 'High'])->default('Medium');
            $table->enum('status', ['Pending', 'Reviewed', 'Letter Sent'])->default('Pending');
            $table->json('metadata')->nullable(); // Store additional data like log times, counts, etc.
            $table->timestamps();
            
            $table->index(['employee_id', 'violation_date']);
            $table->index('status');
            $table->index('violation_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('attendance_violations');
    }
};
