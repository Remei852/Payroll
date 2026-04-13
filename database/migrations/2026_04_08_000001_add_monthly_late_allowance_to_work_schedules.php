<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('work_schedules', function (Blueprint $table) {
            // Total minutes an employee is allowed to be late per month before deductions apply.
            // 0 = no allowance (every late minute is deducted).
            $table->integer('monthly_late_allowance_minutes')->default(0)->after('undertime_enabled');
        });
    }

    public function down(): void
    {
        Schema::table('work_schedules', function (Blueprint $table) {
            if (Schema::hasColumn('work_schedules', 'monthly_late_allowance_minutes')) {
                $table->dropColumn('monthly_late_allowance_minutes');
            }
        });
    }
};
