<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('departments')) {
            return;
        }

        Schema::table('departments', function (Blueprint $table) {
            if (! Schema::hasColumn('departments', 'payroll_frequency')) {
                $table->string('payroll_frequency')->nullable();
            }

            if (! Schema::hasColumn('departments', 'is_active')) {
                $table->boolean('is_active')->default(true);
            }

            if (! Schema::hasColumn('departments', 'deleted_at')) {
                $table->softDeletes();
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('departments')) {
            return;
        }

        Schema::table('departments', function (Blueprint $table) {
            if (Schema::hasColumn('departments', 'payroll_frequency')) {
                $table->dropColumn('payroll_frequency');
            }

            if (Schema::hasColumn('departments', 'is_active')) {
                $table->dropColumn('is_active');
            }

            if (Schema::hasColumn('departments', 'deleted_at')) {
                $table->dropSoftDeletes();
            }
        });
    }
};
