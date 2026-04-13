<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('work_schedules', function (Blueprint $table) {
            $table->boolean('grace_period_enabled')->default(true)->after('grace_period_minutes');
            $table->integer('undertime_allowance_minutes')->default(5)->after('grace_period_enabled');
            $table->boolean('undertime_enabled')->default(true)->after('undertime_allowance_minutes');
        });
    }

    public function down(): void
    {
        Schema::table('work_schedules', function (Blueprint $table) {
            $cols = ['grace_period_enabled', 'undertime_allowance_minutes', 'undertime_enabled'];
            foreach ($cols as $col) {
                if (Schema::hasColumn('work_schedules', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
