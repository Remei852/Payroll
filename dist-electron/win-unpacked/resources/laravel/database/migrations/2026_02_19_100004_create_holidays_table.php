<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('holidays')) {
            return;
        }

        Schema::create('holidays', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->date('holiday_date');
            $table->enum('type', ['Regular', 'Special', 'Company'])->default('Regular');
            $table->decimal('rate_multiplier', 4, 2)->default(1.00); // 1.00 = no multiplier, 2.00 = double pay, 1.30 = 130%
            $table->boolean('is_paid')->default(false);
            $table->boolean('is_recurring')->default(false);
            $table->foreignId('department_id')->nullable()->constrained('departments')->onDelete('cascade');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('holidays');
    }
};
