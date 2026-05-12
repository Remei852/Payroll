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
        Schema::table('department_grace_period_settings', function (Blueprint $table) {
            if (!Schema::hasColumn('department_grace_period_settings', 'daily_grace_minutes')) {
                $table->integer('daily_grace_minutes')->default(15)->after('cumulative_tracking_enabled');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('department_grace_period_settings', function (Blueprint $table) {
            if (Schema::hasColumn('department_grace_period_settings', 'daily_grace_minutes')) {
                $table->dropColumn('daily_grace_minutes');
            }
        });
    }
};
