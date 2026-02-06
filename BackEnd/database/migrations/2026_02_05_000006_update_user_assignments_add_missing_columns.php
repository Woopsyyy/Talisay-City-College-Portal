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
        if (Schema::hasTable('user_assignments')) {
            Schema::table('user_assignments', function (Blueprint $table) {
                if (!Schema::hasColumn('user_assignments', 'year_level')) {
                    $table->string('year_level')->nullable();
                }
                if (!Schema::hasColumn('user_assignments', 'section')) {
                    $table->string('section')->nullable();
                }
                if (!Schema::hasColumn('user_assignments', 'department')) {
                    $table->string('department')->nullable();
                }
                if (!Schema::hasColumn('user_assignments', 'major')) {
                    $table->string('major')->nullable();
                }
                if (!Schema::hasColumn('user_assignments', 'payment')) {
                    $table->string('payment')->default('paid');
                }
                if (!Schema::hasColumn('user_assignments', 'amount_lacking')) {
                    $table->decimal('amount_lacking', 10, 2)->default(0);
                }
                if (!Schema::hasColumn('user_assignments', 'sanctions')) {
                    $table->boolean('sanctions')->default(false);
                }
                if (!Schema::hasColumn('user_assignments', 'sanction_reason')) {
                    $table->text('sanction_reason')->nullable();
                }
                if (!Schema::hasColumn('user_assignments', 'semester')) {
                    $table->string('semester')->default('1st Semester');
                }
                if (!Schema::hasColumn('user_assignments', 'student_status')) {
                    $table->string('student_status')->default('Regular');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No safe down operation for adding missing columns conditionally
    }
};
