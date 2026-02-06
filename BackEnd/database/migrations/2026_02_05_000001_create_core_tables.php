<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sections', function (Blueprint $table) {
            $table->id();
            $table->string('section_name')->unique();
            $table->string('grade_level');
            $table->string('school_year');
            $table->timestamps();
            
            $table->index('section_name');
            $table->index('school_year');
        });

        Schema::create('subjects', function (Blueprint $table) {
            $table->id();
            $table->string('subject_code')->unique();
            $table->string('subject_name');
            $table->text('description')->nullable();
            $table->integer('units')->default(3);
            $table->string('title')->nullable();
            $table->string('course')->nullable();
            $table->string('major')->nullable();
            $table->integer('year_level')->nullable();
            $table->string('semester')->nullable();
            $table->timestamps();
            
            $table->index('subject_code');
            $table->index(['course', 'year_level', 'semester']);
        });

        Schema::create('buildings', function (Blueprint $table) {
            $table->id();
            $table->string('building_name')->unique();
            $table->integer('num_floors')->default(1);
            $table->integer('rooms_per_floor')->default(10);
            $table->text('description')->nullable();
            $table->timestamps();
            
            $table->index('building_name');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('buildings');
        Schema::dropIfExists('subjects');
        Schema::dropIfExists('sections');
    }
};
