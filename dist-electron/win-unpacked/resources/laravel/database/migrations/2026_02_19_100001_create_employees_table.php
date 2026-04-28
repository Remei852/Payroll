<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('employees')) {
            return;
        }

        Schema::create('employees', function (Blueprint $table) {
            $table->id();
            $table->string('employee_code')->unique();
            $table->string('first_name');
            $table->string('last_name');
            $table->foreignId('department_id')->constrained('departments');
            $table->string('position')->nullable();
            $table->decimal('daily_rate', 12, 2)->default(0);
            $table->date('hire_date')->nullable();
            $table->string('employment_status')->default('ACTIVE'); // ACTIVE / INACTIVE
            $table->softDeletes(); // Add soft deletes from the start
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employees');
    }
};

