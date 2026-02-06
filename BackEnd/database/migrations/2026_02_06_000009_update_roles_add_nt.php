<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('users')) {
            DB::statement("UPDATE users SET role = 'nt' WHERE role = 'go'");
            try {
                DB::statement("ALTER TABLE users MODIFY role ENUM('student','teacher','admin','nt') NOT NULL DEFAULT 'student'");
            } catch (\Throwable $e) {
                // Ignore if database doesn't support enum alteration in this context.
            }
        }

        if (Schema::hasTable('announcements')) {
            try {
                DB::statement("ALTER TABLE announcements MODIFY target_role ENUM('all','student','teacher','admin','nt') NOT NULL DEFAULT 'all'");
            } catch (\Throwable $e) {
                // Ignore if database doesn't support enum alteration in this context.
            }
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('users')) {
            DB::statement("UPDATE users SET role = 'go' WHERE role = 'nt'");
            try {
                DB::statement("ALTER TABLE users MODIFY role ENUM('student','teacher','admin','go') NOT NULL DEFAULT 'student'");
            } catch (\Throwable $e) {
                // Ignore if database doesn't support enum alteration in this context.
            }
        }

        if (Schema::hasTable('announcements')) {
            try {
                DB::statement("ALTER TABLE announcements MODIFY target_role ENUM('all','student','teacher','admin') NOT NULL DEFAULT 'all'");
            } catch (\Throwable $e) {
                // Ignore if database doesn't support enum alteration in this context.
            }
        }
    }
};
