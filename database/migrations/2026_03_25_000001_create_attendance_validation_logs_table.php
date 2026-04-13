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
        Schema::create('attendance_validation_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('attendance_record_id')->constrained('attendance_records')->onDelete('cascade');
            $table->json('validation_result');
            $table->json('issues');
            $table->boolean('passed');
            $table->timestamp('validated_at');
            $table->foreignId('validated_by')->nullable()->constrained('users');
            $table->timestamps();

            $table->index(['attendance_record_id', 'validated_at']);
            $table->index('passed');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('attendance_validation_logs');
    }
};
