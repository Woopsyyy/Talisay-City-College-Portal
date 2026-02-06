<?php

namespace App\Console\Commands;

use App\Http\Controllers\AdminController;
use Illuminate\Console\Command;

class PatchDatabaseSchema extends Command
{
    protected $signature = 'tcc:patch-schema {--force : Run in production environments}';

    protected $description = 'Patch database schema to ensure compatibility after imports';

    public function handle(AdminController $adminController): int
    {
        if (app()->environment('production') && !$this->option('force')) {
            $this->warn('Refusing to run in production without --force.');
            return self::FAILURE;
        }

        $this->info('Patching database schema...');
        $adminController->patchDatabaseSchema();
        $this->info('Schema patch complete.');

        return self::SUCCESS;
    }
}
