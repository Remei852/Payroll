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
        Schema::create('department_grace_period_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('department_id')
                ->unique()
                ->constrained('departments')
                ->onDelete('cascade');
            $table->boolean('cumulative_tracking_enabled')->default(false);
            $table->integer('grace_period_limit_minutes')->default(60);
            $table->enum('tracking_period', ['monthly', 'pay_period', 'rolling_30'])
                ->default('monthly');
            $table->integer('pay_period_start_day')->nullable();
            $table->enum('pay_period_frequency', ['weekly', 'bi-weekly', 'semi-monthly', 'monthly'])
                ->nullable();
            $table->timestamps();

            // Add index for department_id for faster lookups
            $table->index('department_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('department_grace_period_settings');
    }
};
