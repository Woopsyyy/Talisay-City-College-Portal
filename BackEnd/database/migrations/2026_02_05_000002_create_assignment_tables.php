<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->integer('section_id')->nullable(); # Handled as nullable for flexibility
            $table->enum('assignment_type', ['primary', 'secondary'])->default('primary');
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->string('year_level')->nullable();
            $table->string('section')->nullable(); # String-based section name
            $table->string('department')->nullable();
            $table->string('major')->nullable();
            $table->string('payment')->default('paid');
            $table->decimal('amount_lacking', 10, 2)->default(0);
            $table->boolean('sanctions')->default(false);
            $table->text('sanction_reason')->nullable();
            $table->string('semester')->default('1st Semester');
            $table->string('student_status')->default('Regular');
            $table->timestamps();
            
            $table->unique(['user_id', 'section_id'], 'unique_user_section_id'); 
            $table->index('user_id');
            $table->index('section_id');
        });

        Schema::create('teacher_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('teacher_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('subject_id')->constrained('subjects')->onDelete('cascade');
            $table->integer('section_id')->nullable();
            $table->string('section')->nullable();
            $table->string('school_year')->nullable();
            $table->enum('semester', ['1st', '2nd', 'summer'])->default('1st');
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->timestamps();
            
            $table->index('teacher_id');
            $table->index('subject_id');
            $table->index('section_id');
            $table->index('school_year');
        });

        Schema::create('section_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('section_id')->constrained('sections')->onDelete('cascade');
            $table->foreignId('building_id')->constrained('buildings')->onDelete('cascade');
            $table->integer('floor_number');
            $table->integer('room_number');
            $table->string('school_year');
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->timestamps();
            
            $table->unique(['building_id', 'floor_number', 'room_number', 'school_year'], 'unique_room_assignment');
            $table->index('section_id');
            $table->index('building_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('section_assignments');
        Schema::dropIfExists('teacher_assignments');
        Schema::dropIfExists('user_assignments');
    }
};
