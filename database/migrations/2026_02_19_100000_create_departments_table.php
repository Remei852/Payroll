<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('departments')) {
            Schema::create('departments', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('payroll_frequency')->nullable(); // WEEKLY / SEMI_MONTHLY / MONTHLY
                $table->boolean('is_active')->default(true);
                $table->softDeletes();
                $table->timestamps();
            });
        } else {
            // Table exists, just add missing columns if they don't exist
            Schema::table('departments', function (Blueprint $table) {
                if (!Schema::hasColumn('departments', 'deleted_at')) {
                    $table->softDeletes();
                }
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('departments');
    }
};

