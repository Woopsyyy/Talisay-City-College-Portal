<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'roles')) {
                $table->json('roles')->nullable();
            }
            if (!Schema::hasColumn('users', 'sub_role')) {
                $table->enum('sub_role', ['faculty', 'dean', 'osas', 'treasury'])->nullable();
            }
        });

        if (Schema::hasColumn('users', 'roles')) {
            try {
                DB::statement("UPDATE users SET roles = JSON_ARRAY(role) WHERE roles IS NULL OR roles = ''");
            } catch (\Throwable $e) {
                // Ignore JSON errors for unsupported DB engines
            }
        }
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'roles')) {
                $table->dropColumn('roles');
            }
            if (Schema::hasColumn('users', 'sub_role')) {
                $table->dropColumn('sub_role');
            }
        });
    }
};
