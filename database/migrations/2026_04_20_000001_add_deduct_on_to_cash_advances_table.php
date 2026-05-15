<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cash_advances', function (Blueprint $table) {
            $table->date('release_date')->nullable()->after('amount');
            // Null = deduct on the next available payroll period (current behavior)
            // Set to a date = only deduct when the payroll period covers that date
            $table->date('deduct_on')->nullable()->after('reason');
        });
    }

    public function down(): void
    {
        Schema::table('cash_advances', function (Blueprint $table) {
            $table->dropColumn(['release_date', 'deduct_on']);
        });
    }
};
