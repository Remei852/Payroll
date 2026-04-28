<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('contribution_types')) {
            return;
        }

        Schema::create('contribution_types', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // SSS, PhilHealth, PagIBIG, Tax, Loan, etc.
            $table->string('category'); // Government / Loan / Company / Other
            $table->string('frequency'); // Monthly / PerPayroll / OneTime
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contribution_types');
    }
};

