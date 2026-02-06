<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('grades', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('subject_id')->constrained('subjects')->onDelete('cascade');
            $table->foreignId('teacher_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('section_id')->constrained('sections')->onDelete('cascade');
            $table->string('school_year');
            $table->enum('semester', ['1st', '2nd', 'summer'])->default('1st');
            $table->decimal('prelim_grade', 5, 2)->nullable();
            $table->decimal('midterm_grade', 5, 2)->nullable();
            $table->decimal('finals_grade', 5, 2)->nullable();
            $table->decimal('final_grade', 5, 2)->nullable();
            $table->string('remarks')->nullable();
            $table->timestamps();
            
            $table->unique(['student_id', 'subject_id', 'school_year', 'semester'], 'unique_grade_record');
            $table->index('student_id');
            $table->index('subject_id');
            $table->index('teacher_id');
        });

        Schema::create('study_load', function (Blueprint $table) {
            $table->id();
            $table->string('course')->nullable();
            $table->string('major')->nullable();
            $table->integer('year_level')->nullable();
            $table->string('section')->nullable();
            $table->string('subject_code')->nullable();
            $table->string('subject_title')->nullable();
            $table->decimal('units', 3, 1)->nullable();
            $table->string('semester')->nullable();
            $table->string('teacher')->nullable();
            
            // Legacy mapping for IDs if available
            $table->integer('student_id')->nullable();
            $table->integer('subject_id')->nullable();
            $table->integer('section_id')->nullable();
            $table->string('school_year')->nullable();
            $table->enum('enrollment_status', ['enrolled', 'dropped', 'completed'])->default('enrolled');
            
            $table->timestamps();
            
            $table->index(['course', 'major']);
            $table->index(['year_level', 'section']);
            $table->index('semester');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('study_load');
        Schema::dropIfExists('grades');
    }
};
