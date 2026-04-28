<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('employee_contributions')) {
            return;
        }

        Schema::create('employee_contributions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employees');
            $table->foreignId('contribution_type_id')->constrained('contribution_types');
            $table->string('calculation_type'); // FIXED / PERCENTAGE
            $table->decimal('amount_or_rate', 14, 4);
            $table->decimal('employer_share_amount', 14, 2)->nullable();
            $table->date('effective_date');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employee_contributions');
    }
};

