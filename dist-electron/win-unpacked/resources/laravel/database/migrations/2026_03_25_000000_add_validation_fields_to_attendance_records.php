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
        Schema::table('attendance_records', function (Blueprint $table) {
            $table->json('validation_issues')->nullable()->after('notes');
            $table->boolean('requires_manual_review')->default(false)->after('validation_issues');
            $table->string('validation_status')->default('pending')->after('requires_manual_review');
            $table->timestamp('validated_at')->nullable()->after('validation_status');
            $table->foreignId('validated_by')->nullable()->constrained('users')->after('validated_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('attendance_records', function (Blueprint $table) {
            $table->dropForeign(['validated_by']);
            $table->dropColumn([
                'validation_issues',
                'requires_manual_review',
                'validation_status',
                'validated_at',
                'validated_by',
            ]);
        });
    }
};
