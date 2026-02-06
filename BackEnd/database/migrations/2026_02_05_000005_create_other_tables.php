<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description')->nullable();
            $table->foreignId('teacher_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('subject_id')->constrained('subjects')->onDelete('cascade');
            $table->foreignId('section_id')->constrained('sections')->onDelete('cascade');
            $table->dateTime('due_date')->nullable();
            $table->integer('max_score')->default(100);
            $table->enum('status', ['draft', 'published', 'closed'])->default('draft');
            $table->timestamps();
            
            $table->index('teacher_id');
            $table->index('subject_id');
            $table->index('section_id');
            $table->index('due_date');
        });

        Schema::create('announcements', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('content');
            $table->foreignId('author_id')->constrained('users')->onDelete('cascade');
            $table->enum('target_role', ['all', 'student', 'teacher', 'admin', 'nt'])->default('all');
            $table->enum('priority', ['low', 'medium', 'high'])->default('medium');
            $table->boolean('is_published')->default(true);
            $table->dateTime('published_at')->useCurrent();
            $table->dateTime('expires_at')->nullable();
            $table->timestamps();
            
            $table->index('author_id');
            $table->index('target_role');
            $table->index('published_at');
        });

        Schema::create('evaluation_settings', function (Blueprint $table) {
            $table->id();
            $table->string('setting_key')->unique();
            $table->text('setting_value')->nullable();
            $table->text('description')->nullable();
            $table->timestamps();
            
            $table->index('setting_key');
        });

        Schema::create('teacher_evaluations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('teacher_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('student_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('subject_id')->constrained('subjects')->onDelete('cascade');
            $table->string('school_year');
            $table->enum('semester', ['1st', '2nd', 'summer'])->default('1st');
            $table->integer('rating_teaching_quality')->nullable();
            $table->integer('rating_communication')->nullable();
            $table->integer('rating_preparation')->nullable();
            $table->integer('rating_responsiveness')->nullable();
            $table->integer('rating_overall')->nullable();
            $table->text('comments')->nullable();
            $table->boolean('is_anonymous')->default(true);
            $table->timestamps();
            
            $table->unique(['teacher_id', 'student_id', 'subject_id', 'school_year', 'semester'], 'unique_evaluation_record');
            $table->index('teacher_id');
            $table->index('student_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('teacher_evaluations');
        Schema::dropIfExists('evaluation_settings');
        Schema::dropIfExists('announcements');
        Schema::dropIfExists('projects');
    }
};
