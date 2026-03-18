<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // For PostgreSQL, we need to use raw SQL to modify the enum type
        DB::statement("ALTER TABLE attendance_violations DROP CONSTRAINT IF EXISTS attendance_violations_severity_check");
        DB::statement("ALTER TABLE attendance_violations ADD CONSTRAINT attendance_violations_severity_check CHECK (severity IN ('Low', 'Medium', 'High', 'Critical'))");
        
        Schema::table('attendance_violations', function (Blueprint $table) {
            // Add notes field for admin comments
            $table->text('notes')->nullable()->after('metadata');
            
            // Add dismissal tracking fields
            $table->timestamp('dismissed_at')->nullable()->after('notes');
            $table->foreignId('dismissed_by')->nullable()->constrained('users')->onDelete('set null')->after('dismissed_at');
            
            // Add index on dismissed_at for filtering performance
            $table->index('dismissed_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('attendance_violations', function (Blueprint $table) {
            // Drop the index first
            $table->dropIndex(['dismissed_at']);
            
            // Drop the new columns
            $table->dropForeign(['dismissed_by']);
            $table->dropColumn(['notes', 'dismissed_at', 'dismissed_by']);
        });
        
        // Revert severity enum to original values
        DB::statement("ALTER TABLE attendance_violations DROP CONSTRAINT IF EXISTS attendance_violations_severity_check");
        DB::statement("ALTER TABLE attendance_violations ADD CONSTRAINT attendance_violations_severity_check CHECK (severity IN ('Low', 'Medium', 'High'))");
    }
};
