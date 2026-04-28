<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Unique constraint: one payroll per employee per period
        Schema::table('payrolls', function (Blueprint $table) {
            $table->unique(['payroll_period_id', 'employee_id'], 'payrolls_period_employee_unique');
            $table->index('employee_id', 'payrolls_employee_id_index');
            $table->index('status', 'payrolls_status_index');
        });

        // Cascade delete payroll items when payroll is deleted
        Schema::table('payroll_items', function (Blueprint $table) {
            $table->dropForeign(['payroll_id']);
            $table->foreign('payroll_id')->references('id')->on('payrolls')->onDelete('cascade');
            $table->index('payroll_id', 'payroll_items_payroll_id_index');
        });

        // Index on attendance_records employee_id alone (composite unique already exists)
        Schema::table('attendance_records', function (Blueprint $table) {
            $table->index('employee_id', 'attendance_records_employee_id_index');
        });
    }

    public function down(): void
    {
        Schema::table('payrolls', function (Blueprint $table) {
            $table->dropUnique('payrolls_period_employee_unique');
            $table->dropIndex('payrolls_employee_id_index');
            $table->dropIndex('payrolls_status_index');
        });

        Schema::table('payroll_items', function (Blueprint $table) {
            $table->dropForeign(['payroll_id']);
            $table->foreign('payroll_id')->references('id')->on('payrolls');
            $table->dropIndex('payroll_items_payroll_id_index');
        });

        Schema::table('attendance_records', function (Blueprint $table) {
            $table->dropIndex('attendance_records_employee_id_index');
        });
    }
};
