<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('cash_advances')) {
            return;
        }

        Schema::create('cash_advances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employees');
            $table->decimal('amount', 10, 2);
            $table->text('reason')->nullable();
            $table->enum('status', ['Active', 'Deducted', 'Completed'])->default('Active');
            $table->foreignId('created_by')->constrained('users');
            $table->foreignId('payroll_period_id')->nullable()->constrained('payroll_periods');
            $table->dateTime('deducted_at')->nullable();
            $table->timestamps();

            // Indexes for performance
            $table->index(['employee_id', 'status'], 'idx_employee_status');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cash_advances');
    }
};
