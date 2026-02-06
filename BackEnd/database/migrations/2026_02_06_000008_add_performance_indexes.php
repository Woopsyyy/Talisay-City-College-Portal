<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $this->tryAddIndex('user_assignments', 'ua_status_idx', 'status');
        $this->tryAddIndex('user_assignments', 'ua_section_idx', 'section');
        $this->tryAddIndex('user_assignments', 'ua_semester_idx', 'semester');

        $this->tryAddIndex('teacher_assignments', 'ta_status_idx', 'status');

        $this->tryAddIndex('grades', 'grades_student_idx', 'student_id');
        $this->tryAddIndex('grades', 'grades_section_idx', 'section_id');
        $this->tryAddIndex('grades', 'grades_subject_idx', 'subject_id');
        $this->tryAddIndex('grades', 'grades_semester_idx', 'semester');
        $this->tryAddIndex('grades', 'grades_school_year_idx', 'school_year');

        $this->tryAddIndex('study_load', 'study_section_idx', 'section_id');
        $this->tryAddIndex('study_load', 'study_subject_idx', 'subject_id');
        $this->tryAddIndex('study_load', 'study_semester_idx', 'semester');

        $this->tryAddIndex('announcements', 'ann_target_role_idx', 'target_role');
        $this->tryAddIndex('announcements', 'ann_published_idx', 'is_published');
        $this->tryAddIndex('announcements', 'ann_published_at_idx', 'published_at');
        $this->tryAddIndex('announcements', 'ann_expires_at_idx', 'expires_at');
    }

    public function down(): void
    {
        $this->tryDropIndex('user_assignments', 'ua_status_idx');
        $this->tryDropIndex('user_assignments', 'ua_section_idx');
        $this->tryDropIndex('user_assignments', 'ua_semester_idx');

        $this->tryDropIndex('teacher_assignments', 'ta_status_idx');

        $this->tryDropIndex('grades', 'grades_student_idx');
        $this->tryDropIndex('grades', 'grades_section_idx');
        $this->tryDropIndex('grades', 'grades_subject_idx');
        $this->tryDropIndex('grades', 'grades_semester_idx');
        $this->tryDropIndex('grades', 'grades_school_year_idx');

        $this->tryDropIndex('study_load', 'study_section_idx');
        $this->tryDropIndex('study_load', 'study_subject_idx');
        $this->tryDropIndex('study_load', 'study_semester_idx');

        $this->tryDropIndex('announcements', 'ann_target_role_idx');
        $this->tryDropIndex('announcements', 'ann_published_idx');
        $this->tryDropIndex('announcements', 'ann_published_at_idx');
        $this->tryDropIndex('announcements', 'ann_expires_at_idx');
    }

    private function tryAddIndex(string $table, string $indexName, string $column): void
    {
        try {
            DB::statement("CREATE INDEX {$indexName} ON {$table} ({$column})");
        } catch (\Throwable $e) {
            // Ignore if index or column does not exist
        }
    }

    private function tryDropIndex(string $table, string $indexName): void
    {
        try {
            DB::statement("DROP INDEX {$indexName} ON {$table}");
        } catch (\Throwable $e) {
            // Ignore if index does not exist
        }
    }
};
