<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;
use App\Models\User;
use App\Models\UserAssignment;

class SystemHealthCheck extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:health-check';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Perform a comprehensive system health check (Database, Routes, Auth, Duplicates)';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->header("System Health Check Report");

        // 1. Database Connectivity
        $this->checkDatabase();

        // 2. Routing & API
        $this->checkRoutes();

        // 3. Authentication & Security
        $this->checkAuth();

        // 4. Data Integrity (Duplicates)
        $this->checkDuplicates();

        $this->info("\n✅ Health check process completed.");
    }

    private function header($text)
    {
        $this->newLine();
        $this->line("<options=bold;bg=blue;fg=white> " . str_pad($text, 50) . " </>\n");
    }

    private function checkDatabase()
    {
        $this->comment("--- [1] Database Status ---");
        try {
            DB::connection()->getPdo();
            $this->info("✔ Connection: SUCCESS");
            
            $tables = ['users', 'sections', 'subjects', 'user_assignments'];
            foreach ($tables as $table) {
                if (Schema::hasTable($table)) {
                    $this->info("✔ Table '$table': EXISTS (" . DB::table($table)->count() . " records)");
                } else {
                    $this->error("✘ Table '$table': MISSING");
                }
            }
        } catch (\Exception $e) {
            $this->error("✘ Connection: FAILED (" . $e->getMessage() . ")");
        }
    }

    private function checkRoutes()
    {
        $this->newLine();
        $this->comment("--- [2] API Routes Status ---");
        
        $apiRoutes = collect(Route::getRoutes())->filter(function ($route) {
            return str_starts_with($route->uri(), 'api/');
        });

        $this->info("✔ Total API Routes: " . $apiRoutes->count());
        
        $coreRoutes = ['api/auth/login', 'api/admin/users', 'api/teacher/grades', 'api/student/grades'];
        foreach ($coreRoutes as $uri) {
            $found = $apiRoutes->contains(function ($route) use ($uri) {
                return $route->uri() === $uri;
            });
            if ($found) {
                $this->info("✔ Core URI '$uri': REGISTERED");
            } else {
                $this->warn("⚠ Core URI '$uri': NOT FOUND");
            }
        }
    }

    private function checkAuth()
    {
        $this->newLine();
        $this->comment("--- [3] Auth & Security Status ---");
        
        if (config('app.key')) {
            $this->info("✔ APP_KEY: SET");
        } else {
            $this->error("✘ APP_KEY: NOT SET");
        }

        if (class_exists(\Laravel\Sanctum\Sanctum::class)) {
            $this->info("✔ Sanctum Package: INSTALLED");
        } else {
            $this->error("✘ Sanctum Package: MISSING");
        }

        $guard = config('auth.guards.sanctum');
        if ($guard) {
            $this->info("✔ Sanctum Guard: CONFIGURED");
        } else {
            $this->warn("⚠ Sanctum Guard: NOT CONFIGURED IN auth.php");
        }
    }

    private function checkDuplicates()
    {
        $this->newLine();
        $this->comment("--- [4] Data Integrity (Duplicates) ---");

        // Duplicate Users
        $duplicateUsers = DB::table('users')
            ->select('username', DB::raw('COUNT(*) as count'))
            ->groupBy('username')
            ->having('count', '>', 1)
            ->get();

        if ($duplicateUsers->isEmpty()) {
            $this->info("✔ Duplicate Usernames: NONE FOUND");
        } else {
            foreach ($duplicateUsers as $dup) {
                $this->error("✘ Duplicate Username found: '{$dup->username}' ({$dup->count} instances)");
            }
        }

        // Duplicate Assignments (Same Student, Same Section, Same Semester)
        $duplicateAssignments = DB::table('user_assignments')
            ->select('user_id', 'section', 'semester', DB::raw('COUNT(*) as count'))
            ->where('status', 'active')
            ->groupBy('user_id', 'section', 'semester')
            ->having('count', '>', 1)
            ->get();

        if ($duplicateAssignments->isEmpty()) {
            $this->info("✔ Duplicate Student Assignments: NONE FOUND");
        } else {
            foreach ($duplicateAssignments as $dup) {
                $user = User::find($dup->user_id);
                $name = $user ? $user->full_name : "ID:{$dup->user_id}";
                $this->error("✘ Duplicate Active Assignment for '$name' in section '{$dup->section}' for '{$dup->semester}'");
            }
        }
    }
}
