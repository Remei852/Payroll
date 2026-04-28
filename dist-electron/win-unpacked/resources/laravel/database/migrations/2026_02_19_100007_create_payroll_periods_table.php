<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('payroll_periods')) {
            return;
        }

        Schema::create('payroll_periods', function (Blueprint $table) {
            $table->id();
            $table->foreignId('department_id')->constrained('departments');
            $table->date('start_date');
            $table->date('end_date');
            $table->date('payroll_date');
            $table->string('status')->default('OPEN'); // OPEN / PROCESSING / CLOSED
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payroll_periods');
    }
};

