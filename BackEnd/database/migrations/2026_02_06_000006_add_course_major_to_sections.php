<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sections', function (Blueprint $table) {
            if (!Schema::hasColumn('sections', 'course')) {
                $table->string('course')->nullable()->after('school_year');
            }
            if (!Schema::hasColumn('sections', 'major')) {
                $table->string('major')->nullable()->after('course');
            }
        });
    }

    public function down(): void
    {
        Schema::table('sections', function (Blueprint $table) {
            if (Schema::hasColumn('sections', 'major')) {
                $table->dropColumn('major');
            }
            if (Schema::hasColumn('sections', 'course')) {
                $table->dropColumn('course');
            }
        });
    }
};
