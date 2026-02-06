<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ImportDataSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');

        // 1. Users
        DB::table('users')->truncate();
        DB::table('users')->insert([
            ['id' => 1, 'username' => 'admin', 'password' => '$2y$12$vD6jU8MQMTbWiDhw0H9eh.0zvpgQ0uLdE3UrTBIMGP1cJOCqVCX4G', 'email' => 'admin@tcc.edu.ph', 'full_name' => 'System Administrator', 'role' => 'admin', 'school_id' => 'ADMIN001', 'image_path' => '/Database/upload/1.jpg?t=1769770029', 'created_at' => '2026-01-29 20:53:10', 'updated_at' => '2026-01-30 10:47:09'],
            ['id' => 4, 'username' => 'Josh', 'password' => '$2y$12$sfykZgx5ymR/ZYJfLTNpbuWiiXL3ppsT5wasIokB6Eq1GFMSEatjO', 'email' => 'joshuapaculaba97@gmail.com', 'full_name' => 'Josh Paculaba', 'role' => 'student', 'school_id' => '2026-7419', 'image_path' => '/images/sample.jpg', 'created_at' => '2026-01-30 11:01:23', 'updated_at' => '2026-01-30 11:01:23'],
            ['id' => 5, 'username' => 'Josh1', 'password' => '$2y$12$.ZaxKOcmy8ExrNWNsD4Kk.XO6vB.aWjIBP3lSh.0wKeyH8eUdWZLe', 'email' => 'joshuapaculaba98@gmail.com', 'full_name' => 'Josh1', 'role' => 'teacher', 'school_id' => '2026-4532', 'image_path' => '/images/sample.jpg', 'created_at' => '2026-01-30 13:46:07', 'updated_at' => '2026-01-30 13:46:28'],
            ['id' => 7, 'username' => 'andre', 'password' => '$2y$12$QasKz//aAvIZeYRrw2VV7OEzho9jOFMl6EbYm/4aA/emr/OYS.1wC', 'email' => 'andre@student.tcc.edu.ph', 'full_name' => 'Andre Roblon', 'role' => 'student', 'school_id' => '2026-3155', 'image_path' => '/images/sample.jpg', 'created_at' => '2026-01-31 04:09:02', 'updated_at' => '2026-01-31 04:09:02'],
            ['id' => 8, 'username' => 'bon', 'password' => '$2y$12$4VLMr.ZCxFZmplWNAIiY/uzEuY3eCyyQl8cZ0T4BYhvaS83bGHlU.', 'email' => 'bon@student.tcc.edu.ph', 'full_name' => 'Bon Joey', 'role' => 'student', 'school_id' => '2026-9528', 'image_path' => '/images/sample.jpg', 'created_at' => '2026-01-31 04:09:02', 'updated_at' => '2026-01-31 04:09:02'],
            ['id' => 9, 'username' => 'earl', 'password' => '$2y$12$Nex44TpTptqfiXVeT0eiLOrZIJBt7ahaec2fXzwFT86pWlkKlBOPW', 'email' => 'earl@student.tcc.edu.ph', 'full_name' => 'Earl Kenneth Canete', 'role' => 'student', 'school_id' => '2026-7618', 'image_path' => '/images/sample.jpg', 'created_at' => '2026-01-31 04:09:02', 'updated_at' => '2026-01-31 04:09:02'],
            ['id' => 10, 'username' => 'erichelle', 'password' => '$2y$12$sNVtT4d1Oe6Wx4sNBd7J5uv03MsJ2Pyc5jXUNuXxvpqXDGoPRizHG', 'email' => 'erichelle@student.tcc.edu.ph', 'full_name' => 'Erichelle Rabago Aumentado', 'role' => 'student', 'school_id' => '2026-1234', 'image_path' => '/images/sample.jpg', 'created_at' => '2026-01-31 04:09:02', 'updated_at' => '2026-01-31 04:09:02'],
            ['id' => 11, 'username' => 'jeros', 'password' => '$2y$12$7cnWNQ/TirlxpM92dBivyuUd1OVO6FXqBWAzueghgFEV/x4UcSV2W', 'email' => 'jeros@student.tcc.edu.ph', 'full_name' => 'Jeros Lechedo', 'role' => 'student', 'school_id' => '2026-2238', 'image_path' => '/images/sample.jpg', 'created_at' => '2026-01-31 04:09:03', 'updated_at' => '2026-01-31 04:09:03'],
            ['id' => 12, 'username' => 'jorge', 'password' => '$2y$12$RLKZpUjbICAEE0Pvgjy/VO4p9qlfjz6xK62C.qNcmmdSLJRZqXp3e', 'email' => 'jorge@student.tcc.edu.ph', 'full_name' => 'Jorge Klent D. Gemparo', 'role' => 'student', 'school_id' => '2026-2501', 'image_path' => '/images/sample.jpg', 'created_at' => '2026-01-31 04:09:03', 'updated_at' => '2026-01-31 04:09:03'],
            ['id' => 13, 'username' => 'joshua', 'password' => '$2y$12$.ADxSM4n0.4WdH9/qZdECerubGDnJuC41tMIJ8LoPPh674vIAlk3G', 'email' => 'joshua@student.tcc.edu.ph', 'full_name' => 'Joshua Rey Basubas', 'role' => 'student', 'school_id' => '2026-4831', 'image_path' => '/images/sample.jpg', 'created_at' => '2026-01-31 04:09:03', 'updated_at' => '2026-01-31 04:09:03'],
            ['id' => 14, 'username' => 'joyce', 'password' => '$2y$12$pkGG64WOppmtmOBZ2jlPrOjytVteWIkgpwklm8L3FZqM/RmK5dWxa', 'email' => 'joyce@student.tcc.edu.ph', 'full_name' => 'Joyce Mae Apostol', 'role' => 'student', 'school_id' => '2026-5297', 'image_path' => '/images/sample.jpg', 'created_at' => '2026-01-31 04:09:03', 'updated_at' => '2026-01-31 04:09:03'],
            ['id' => 15, 'username' => 'renz', 'password' => '$2y$12$1ZL7XTfk0G4ToW.ISTk2fONvPa3J3284d6YgtK/JOk3dIptUxTpza', 'email' => 'renz@student.tcc.edu.ph', 'full_name' => 'Renz Abalos', 'role' => 'student', 'school_id' => '2026-7144', 'image_path' => '/images/sample.jpg', 'created_at' => '2026-01-31 04:09:03', 'updated_at' => '2026-01-31 04:09:03'],
            ['id' => 16, 'username' => 'sam', 'password' => '$2y$12$dsUNSs3AynjEXxCWMPOS.O6SZO8rHiXw3OfZh3OrGxMvelPHi9kum', 'email' => 'sam@tcc.edu.ph', 'full_name' => 'Sam Nopal', 'role' => 'teacher', 'school_id' => '2026-3325', 'image_path' => '/images/sample.jpg', 'created_at' => '2026-01-31 05:53:00', 'updated_at' => '2026-01-31 05:54:58'],
            ['id' => 17, 'username' => 'michael', 'password' => '$2y$12$43eQRtokP6JojLn6WCPglezZ5OvOEyL8CqgAk4Jl/fwN79zU.wk1i', 'email' => 'michael@tcc.edu.ph', 'full_name' => 'Michael Abe', 'role' => 'teacher', 'school_id' => '2026-3326', 'image_path' => '/images/sample.jpg', 'created_at' => '2026-01-31 05:53:00', 'updated_at' => '2026-01-31 05:55:05'],
            ['id' => 18, 'username' => 'mimi', 'password' => '$2y$12$2YfydbxN1OOLI8.BMSPneecyib8jR7HNVHE0iuTlYBm5WmGRpWPEa', 'email' => 'mimi@tcc.edu.ph', 'full_name' => 'Mimi San', 'role' => 'teacher', 'school_id' => '2026-3327', 'image_path' => '/images/sample.jpg', 'created_at' => '2026-01-31 05:53:00', 'updated_at' => '2026-01-31 05:55:15'],
            ['id' => 19, 'username' => 'rio', 'password' => '$2y$12$x0F1VsTojmzrxbc7/0NhiuI8Ov/x1sVo73CkglT4CpLPmIw4eJtgK', 'email' => 'rio@tcc.edu.ph', 'full_name' => 'Rio Jake T. Mamac', 'role' => 'teacher', 'school_id' => '2026-3328', 'image_path' => '/images/sample.jpg', 'created_at' => '2026-01-31 05:53:00', 'updated_at' => '2026-01-31 05:55:23'],
            ['id' => 20, 'username' => 'john', 'password' => '$2y$12$IVM8SIDmizTFaflVCrkmau05mrqJ.T/rNk/F1EjjbkAkOiTeEjJDK', 'email' => 'john@tcc.edu.ph', 'full_name' => 'John Dapat', 'role' => 'teacher', 'school_id' => '2026-3329', 'image_path' => '/images/sample.jpg', 'created_at' => '2026-01-31 05:53:00', 'updated_at' => '2026-01-31 05:55:31'],
            ['id' => 21, 'username' => 'rj', 'password' => '$2y$12$Lzgts/bMizZwK9eV..D..eRt1SRqVysu1D5QSHQXdEDCxLkvbDzVu', 'email' => 'rj@tcc.edu.ph', 'full_name' => 'RJ Abucejo', 'role' => 'teacher', 'school_id' => '2026-3330', 'image_path' => '/images/sample.jpg', 'created_at' => '2026-01-31 05:53:01', 'updated_at' => '2026-01-31 05:55:38'],
        ]);

        // 2. Buildings
        DB::table('buildings')->truncate();
        DB::table('buildings')->insert([
            ['id' => 5, 'building_name' => 'B', 'num_floors' => 2, 'rooms_per_floor' => 4, 'description' => NULL, 'created_at' => '2026-01-30 11:33:50', 'updated_at' => '2026-01-30 11:33:50'],
            ['id' => 6, 'building_name' => 'A', 'num_floors' => 2, 'rooms_per_floor' => 3, 'description' => NULL, 'created_at' => '2026-01-30 11:34:09', 'updated_at' => '2026-01-30 11:34:09'],
            ['id' => 7, 'building_name' => 'C', 'num_floors' => 4, 'rooms_per_floor' => 4, 'description' => NULL, 'created_at' => '2026-01-30 11:34:24', 'updated_at' => '2026-01-30 11:34:24'],
            ['id' => 8, 'building_name' => 'D', 'num_floors' => 3, 'rooms_per_floor' => 4, 'description' => NULL, 'created_at' => '2026-01-30 11:34:31', 'updated_at' => '2026-01-30 11:34:31'],
        ]);

        // 3. Rooms
        DB::table('rooms')->truncate();
        DB::table('rooms')->insert([
            ['id' => 1, 'building_name' => 'A', 'room_number' => '101', 'created_at' => '2026-01-30 14:20:45'],
            ['id' => 2, 'building_name' => 'Main', 'room_number' => 'TBA', 'created_at' => '2026-01-31 05:32:34'],
            ['id' => 3, 'building_name' => 'D', 'room_number' => '103', 'created_at' => '2026-01-31 06:09:15'],
        ]);

        // 4. Sections
        DB::table('sections')->truncate();
        DB::table('sections')->insert([
            ['id' => 5, 'section_name' => 'Altruism', 'grade_level' => '3', 'school_year' => '2025-2026', 'created_at' => '2026-01-30 11:17:46', 'updated_at' => '2026-01-31 03:30:16', 'course' => 'IT', 'major' => 'Computer Technology'],
            ['id' => 6, 'section_name' => 'Benevolence', 'grade_level' => '3', 'school_year' => '2025-2026', 'created_at' => '2026-01-30 11:17:55', 'updated_at' => '2026-01-31 03:35:13', 'course' => 'IT', 'major' => 'Computer Technology'],
            ['id' => 7, 'section_name' => 'Charity', 'grade_level' => '3', 'school_year' => '2025-2026', 'created_at' => '2026-01-30 11:18:05', 'updated_at' => '2026-01-31 03:35:21', 'course' => 'IT', 'major' => 'Computer Technology'],
            ['id' => 8, 'section_name' => 'Devotion', 'grade_level' => '3', 'school_year' => '2025-2026', 'created_at' => '2026-01-30 11:18:13', 'updated_at' => '2026-01-31 03:35:33', 'course' => 'IT', 'major' => 'Computer Technology'],
        ]);

        // 5. Section Assignments
        DB::table('section_assignments')->truncate();
        DB::table('section_assignments')->insert([
            ['id' => 2, 'section_id' => 5, 'building_id' => 8, 'floor_number' => 2, 'room_number' => 203, 'school_year' => '2026-2027', 'status' => 'active', 'created_at' => '2026-01-30 11:34:46', 'updated_at' => '2026-01-30 11:34:46'],
            ['id' => 3, 'section_id' => 6, 'building_id' => 8, 'floor_number' => 3, 'room_number' => 301, 'school_year' => '2026-2027', 'status' => 'active', 'created_at' => '2026-01-30 11:34:58', 'updated_at' => '2026-01-30 11:34:58'],
            ['id' => 4, 'section_id' => 7, 'building_id' => 8, 'floor_number' => 2, 'room_number' => 201, 'school_year' => '2026-2027', 'status' => 'active', 'created_at' => '2026-01-30 11:35:23', 'updated_at' => '2026-01-30 11:35:23'],
            ['id' => 5, 'section_id' => 8, 'building_id' => 8, 'floor_number' => 2, 'room_number' => 202, 'school_year' => '2026-2027', 'status' => 'active', 'created_at' => '2026-01-30 11:35:31', 'updated_at' => '2026-01-30 11:35:31'],
        ]);

        // 6. Subjects
        DB::table('subjects')->truncate();
        DB::table('subjects')->insert([
            ['id' => 6, 'subject_code' => 'TEM ELEC', 'subject_name' => 'The Entrepreneurial Mind', 'description' => NULL, 'units' => 3, 'created_at' => '2026-01-31 05:04:36', 'updated_at' => '2026-01-31 05:04:36', 'title' => NULL, 'course' => 'IT', 'major' => 'Computer Technology', 'year_level' => 3, 'semester' => 'First Semester'],
            ['id' => 7, 'subject_code' => 'GE CW', 'subject_name' => 'The Contemporary World', 'description' => NULL, 'units' => 3, 'created_at' => '2026-01-31 05:05:09', 'updated_at' => '2026-01-31 05:05:09', 'title' => NULL, 'course' => 'All Courses', 'major' => '', 'year_level' => 3, 'semester' => 'First Semester'],
            ['id' => 8, 'subject_code' => 'COMP 317', 'subject_name' => 'Networking I (Fundamentals of Networking)', 'description' => NULL, 'units' => 5, 'created_at' => '2026-01-31 05:06:02', 'updated_at' => '2026-01-31 05:06:02', 'title' => NULL, 'course' => 'IT', 'major' => 'Computer Technology', 'year_level' => 3, 'semester' => 'First Semester'],
            ['id' => 9, 'subject_code' => 'COMP 318', 'subject_name' => 'Web Development ( Front - End Dev and UX Design )', 'description' => NULL, 'units' => 5, 'created_at' => '2026-01-31 05:06:44', 'updated_at' => '2026-01-31 05:06:44', 'title' => NULL, 'course' => 'IT', 'major' => 'Computer Technology', 'year_level' => 3, 'semester' => 'First Semester'],
            ['id' => 10, 'subject_code' => 'COMP 319', 'subject_name' => 'Database Management System', 'description' => NULL, 'units' => 5, 'created_at' => '2026-01-31 05:07:06', 'updated_at' => '2026-01-31 05:07:06', 'title' => NULL, 'course' => 'IT', 'major' => 'Computer Technology', 'year_level' => 3, 'semester' => 'First Semester'],
            ['id' => 11, 'subject_code' => 'FL 1', 'subject_name' => 'Foreign Language 1', 'description' => NULL, 'units' => 3, 'created_at' => '2026-01-31 05:07:30', 'updated_at' => '2026-01-31 05:07:30', 'title' => NULL, 'course' => 'IT', 'major' => 'Computer Technology', 'year_level' => 3, 'semester' => 'First Semester'],
            ['id' => 12, 'subject_code' => 'RIZAL', 'subject_name' => 'The Life and Works of Rizal', 'description' => NULL, 'units' => 3, 'created_at' => '2026-01-31 05:08:51', 'updated_at' => '2026-01-31 05:08:51', 'title' => NULL, 'course' => 'IT', 'major' => 'Computer Technology', 'year_level' => 3, 'semester' => 'Second Semester'],
            ['id' => 13, 'subject_code' => 'GE ETH', 'subject_name' => 'Ethics', 'description' => NULL, 'units' => 3, 'created_at' => '2026-01-31 05:09:24', 'updated_at' => '2026-01-31 05:09:24', 'title' => NULL, 'course' => 'All Courses', 'major' => '', 'year_level' => 3, 'semester' => 'Second Semester'],
            ['id' => 14, 'subject_code' => 'IM 322', 'subject_name' => 'Production and Operations Management ', 'description' => NULL, 'units' => 3, 'created_at' => '2026-01-31 05:09:49', 'updated_at' => '2026-01-31 05:09:49', 'title' => NULL, 'course' => 'IT', 'major' => 'Computer Technology', 'year_level' => 3, 'semester' => 'Second Semester'],
            ['id' => 15, 'subject_code' => 'COMP 420', 'subject_name' => 'Networking II (Server OS Mgt. Security, Client Monitoring) ', 'description' => NULL, 'units' => 5, 'created_at' => '2026-01-31 05:11:11', 'updated_at' => '2026-01-31 05:11:11', 'title' => NULL, 'course' => 'IT', 'major' => 'Computer Technology', 'year_level' => 3, 'semester' => 'Second Semester'],
            ['id' => 16, 'subject_code' => 'COMP 421', 'subject_name' => 'Web Development (Back - End Dev with PHP and SQL ) ', 'description' => NULL, 'units' => 5, 'created_at' => '2026-01-31 05:13:02', 'updated_at' => '2026-01-31 05:13:02', 'title' => NULL, 'course' => 'IT', 'major' => 'Computer Technology', 'year_level' => 3, 'semester' => 'Second Semester'],
            ['id' => 17, 'subject_code' => 'IM  323A', 'subject_name' => 'Technology Research 1', 'description' => NULL, 'units' => 2, 'created_at' => '2026-01-31 05:13:46', 'updated_at' => '2026-01-31 05:13:46', 'title' => NULL, 'course' => 'IT', 'major' => 'Computer Technology', 'year_level' => 3, 'semester' => 'Second Semester'],
            ['id' => 18, 'subject_code' => 'FL 2', 'subject_name' => 'Foreign Language 2', 'description' => NULL, 'units' => 3, 'created_at' => '2026-01-31 05:14:05', 'updated_at' => '2026-01-31 05:14:05', 'title' => NULL, 'course' => 'IT', 'major' => 'Computer Technology', 'year_level' => 3, 'semester' => 'Second Semester'],
            ['id' => 19, 'subject_code' => 'HPC 48', 'subject_name' => 'Research in Hospitality 2', 'description' => NULL, 'units' => 3, 'created_at' => '2026-01-31 05:34:33', 'updated_at' => '2026-01-31 05:34:33', 'title' => NULL, 'course' => 'HM', 'major' => '', 'year_level' => 3, 'semester' => 'Second Semester'],
            ['id' => 20, 'subject_code' => 'HPC 6', 'subject_name' => 'Foreign Language 2', 'description' => NULL, 'units' => 3, 'created_at' => '2026-01-31 05:34:58', 'updated_at' => '2026-01-31 05:34:58', 'title' => NULL, 'course' => 'HM', 'major' => '', 'year_level' => 3, 'semester' => 'Second Semester'],
            ['id' => 21, 'subject_code' => 'HPC 7', 'subject_name' => 'Introduction to Meetings, Incentives, Conferences & Events Management', 'description' => NULL, 'units' => 5, 'created_at' => '2026-01-31 05:35:47', 'updated_at' => '2026-01-31 05:35:47', 'title' => NULL, 'course' => 'HM', 'major' => '', 'year_level' => 3, 'semester' => 'Second Semester'],
            ['id' => 22, 'subject_code' => 'HPC 8', 'subject_name' => 'Applied Business Tools & Technologies', 'description' => NULL, 'units' => 5, 'created_at' => '2026-01-31 05:36:38', 'updated_at' => '2026-01-31 05:36:38', 'title' => NULL, 'course' => 'HM', 'major' => '', 'year_level' => 3, 'semester' => 'Second Semester'],
            ['id' => 23, 'subject_code' => 'HPC 9', 'subject_name' => 'Ergonomics and Facilities Planning for the Hospitality Industry', 'description' => NULL, 'units' => 5, 'created_at' => '2026-01-31 05:37:11', 'updated_at' => '2026-01-31 05:37:11', 'title' => NULL, 'course' => 'HM', 'major' => '', 'year_level' => 3, 'semester' => 'Second Semester'],
            ['id' => 24, 'subject_code' => 'FIL 2', 'subject_name' => 'Pagbasa at Pagsulat Tungo sa Pananaliksik', 'description' => NULL, 'units' => 3, 'created_at' => '2026-01-31 05:38:09', 'updated_at' => '2026-01-31 05:38:09', 'title' => NULL, 'course' => 'BEED', 'major' => 'General', 'year_level' => 3, 'semester' => 'Second Semester'],
            ['id' => 25, 'subject_code' => 'PROFED 9', 'subject_name' => 'Assessment in Learning 2', 'description' => NULL, 'units' => 3, 'created_at' => '2026-01-31 05:38:32', 'updated_at' => '2026-01-31 05:38:32', 'title' => NULL, 'course' => 'BEED', 'major' => 'General', 'year_level' => 3, 'semester' => 'Second Semester'],
        ]);

        // 7. Section Subjects
        DB::table('section_subjects')->truncate();
        DB::table('section_subjects')->insert([
            ['id' => 1, 'course' => 'IT', 'major' => 'Computer Technology', 'year_level' => 3, 'section' => 'Altruism', 'subject_code' => 'TEM ELEC', 'subject_title' => 'The Entrepreneurial Mind', 'units' => 3.0, 'semester' => 'First Semester', 'teacher' => '', 'created_at' => '2026-01-31 05:32:51'],
            ['id' => 2, 'course' => 'IT', 'major' => 'Computer Technology', 'year_level' => 3, 'section' => 'Altruism', 'subject_code' => 'COMP 317', 'subject_title' => 'Networking I (Fundamentals of Networking)', 'units' => 5.0, 'semester' => 'First Semester', 'teacher' => '', 'created_at' => '2026-01-31 05:41:49'],
            ['id' => 3, 'course' => 'IT', 'major' => 'Computer Technology', 'year_level' => 3, 'section' => 'Altruism', 'subject_code' => 'COMP 318', 'subject_title' => 'Web Development ( Front - End Dev and UX Design )', 'units' => 5.0, 'semester' => 'First Semester', 'teacher' => '', 'created_at' => '2026-01-31 05:43:04'],
            ['id' => 4, 'course' => 'IT', 'major' => 'Computer Technology', 'year_level' => 3, 'section' => 'Altruism', 'subject_code' => 'COMP 319', 'subject_title' => 'Database Management System', 'units' => 5.0, 'semester' => 'First Semester', 'teacher' => '', 'created_at' => '2026-01-31 05:43:10'],
            ['id' => 5, 'course' => 'IT', 'major' => 'Computer Technology', 'year_level' => 3, 'section' => 'Altruism', 'subject_code' => 'RIZAL', 'subject_title' => 'The Life and Works of Rizal', 'units' => 3.0, 'semester' => 'Second Semester', 'teacher' => '', 'created_at' => '2026-01-31 05:43:16'],
            ['id' => 6, 'course' => 'IT', 'major' => 'Computer Technology', 'year_level' => 3, 'section' => 'Altruism', 'subject_code' => 'GE CW', 'subject_title' => 'The Contemporary World', 'units' => 3.0, 'semester' => 'First Semester', 'teacher' => '', 'created_at' => '2026-01-31 05:45:19'],
            ['id' => 7, 'course' => 'IT', 'major' => 'Computer Technology', 'year_level' => 3, 'section' => 'Altruism', 'subject_code' => 'FL 1', 'subject_title' => 'Foreign Language 1', 'units' => 3.0, 'semester' => 'First Semester', 'teacher' => '', 'created_at' => '2026-01-31 05:45:45'],
            ['id' => 8, 'course' => 'IT', 'major' => 'Computer Technology', 'year_level' => 3, 'section' => 'Altruism', 'subject_code' => 'GE ETH', 'subject_title' => 'Ethics', 'units' => 3.0, 'semester' => 'Second Semester', 'teacher' => '', 'created_at' => '2026-01-31 05:46:31'],
            ['id' => 9, 'course' => 'IT', 'major' => 'Computer Technology', 'year_level' => 3, 'section' => 'Altruism', 'subject_code' => 'IM 322', 'subject_title' => 'Production and Operations Management ', 'units' => 3.0, 'semester' => 'Second Semester', 'teacher' => '', 'created_at' => '2026-01-31 05:46:37'],
            ['id' => 10, 'course' => 'IT', 'major' => 'Computer Technology', 'year_level' => 3, 'section' => 'Altruism', 'subject_code' => 'COMP 420', 'subject_title' => 'Networking II (Server OS Mgt. Security, Client Monitoring) ', 'units' => 5.0, 'semester' => 'Second Semester', 'teacher' => '', 'created_at' => '2026-01-31 05:46:46'],
            ['id' => 11, 'course' => 'IT', 'major' => 'Computer Technology', 'year_level' => 3, 'section' => 'Altruism', 'subject_code' => 'COMP 421', 'subject_title' => 'Web Development (Back - End Dev with PHP and SQL ) ', 'units' => 5.0, 'semester' => 'Second Semester', 'teacher' => '', 'created_at' => '2026-01-31 05:47:01'],
            ['id' => 12, 'course' => 'IT', 'major' => 'Computer Technology', 'year_level' => 3, 'section' => 'Altruism', 'subject_code' => 'IM  323A', 'subject_title' => 'Technology Research 1', 'units' => 2.0, 'semester' => 'Second Semester', 'teacher' => '', 'created_at' => '2026-01-31 05:47:07'],
            ['id' => 13, 'course' => 'IT', 'major' => 'Computer Technology', 'year_level' => 3, 'section' => 'Altruism', 'subject_code' => 'FL 2', 'subject_title' => 'Foreign Language 2', 'units' => 3.0, 'semester' => 'Second Semester', 'teacher' => '', 'created_at' => '2026-01-31 05:47:12'],
        ]);

        // 8. Announcements
        DB::table('announcements')->truncate();
        DB::table('announcements')->insert([
            ['id' => 1, 'title' => '32', 'content' => '32', 'author_id' => 1, 'target_role' => 'all', 'priority' => 'medium', 'is_published' => 1, 'published_at' => '2026-01-30 05:06:37', 'expires_at' => NULL, 'created_at' => '2026-01-29 21:06:37', 'updated_at' => '2026-01-29 21:06:37'],
        ]);

        // 9. Campus Projects
        DB::table('campus_projects')->truncate();
        DB::table('campus_projects')->insert([
            ['id' => 1, 'name' => 'test', 'status' => 'Ongoing', 'budget' => '500', 'start_date' => '1212-12-12', 'description' => NULL, 'created_at' => '2026-01-30 13:37:03'],
            ['id' => 2, 'name' => 'test', 'status' => 'Completed', 'budget' => '5', 'start_date' => '1212-12-12', 'description' => NULL, 'created_at' => '2026-01-30 13:37:42'],
        ]);

        // 10. Evaluation Settings
        DB::table('evaluation_settings')->truncate();
        DB::table('evaluation_settings')->insert([
            ['id' => 1, 'setting_key' => 'evaluation_enabled', 'setting_value' => 'true', 'description' => 'Enable/disable teacher evaluation system', 'updated_at' => '2026-01-29 20:53:10'],
            ['id' => 2, 'setting_key' => 'evaluation_period_start', 'setting_value' => '2024-11-01', 'description' => 'Start date for evaluation period', 'updated_at' => '2026-01-29 20:53:10'],
            ['id' => 3, 'setting_key' => 'evaluation_period_end', 'setting_value' => '2024-11-30', 'description' => 'End date for evaluation period', 'updated_at' => '2026-01-29 20:53:10'],
            ['id' => 4, 'setting_key' => 'min_evaluations_required', 'setting_value' => '10', 'description' => 'Minimum number of evaluations per teacher', 'updated_at' => '2026-01-29 20:53:10'],
        ]);

        // 11. Settings
        DB::table('settings')->truncate();
        DB::table('settings')->insert([
            ['setting_key' => 'evaluation_enabled', 'setting_value' => '1'],
        ]);

        // 12. Teacher Assignments
        DB::table('teacher_assignments')->truncate();
        DB::table('teacher_assignments')->insert([
            ['id' => 2, 'teacher_id' => 16, 'subject_id' => 12, 'section_id' => NULL, 'school_year' => NULL, 'semester' => '1st', 'status' => 'active', 'created_at' => '2026-01-31 05:58:32', 'updated_at' => '2026-01-31 05:58:32', 'section' => NULL],
        ]);

        // 13. Schedules
        DB::table('schedules')->truncate();
        DB::table('schedules')->insert([
            ['id' => 8, 'teacher_assignment_id' => NULL, 'day_of_week' => 'Monday', 'time_start' => '00:00:00', 'time_end' => '00:00:00', 'room_id' => 2, 'created_at' => '2026-01-31 05:43:16', 'updated_at' => '2026-01-31 05:43:16', 'subject_code' => 'RIZAL', 'section_id' => 5],
            ['id' => 9, 'teacher_assignment_id' => NULL, 'day_of_week' => 'Monday', 'time_start' => '00:00:00', 'time_end' => '00:00:00', 'room_id' => 2, 'created_at' => '2026-01-31 05:45:14', 'updated_at' => '2026-01-31 05:45:14', 'subject_code' => 'TEM ELEC', 'section_id' => 5],
            ['id' => 10, 'teacher_assignment_id' => NULL, 'day_of_week' => 'Monday', 'time_start' => '00:00:00', 'time_end' => '00:00:00', 'room_id' => 2, 'created_at' => '2026-01-31 05:45:19', 'updated_at' => '2026-01-31 05:45:19', 'subject_code' => 'GE CW', 'section_id' => 5],
            ['id' => 11, 'teacher_assignment_id' => NULL, 'day_of_week' => 'Monday', 'time_start' => '00:00:00', 'time_end' => '00:00:00', 'room_id' => 2, 'created_at' => '2026-01-31 05:45:27', 'updated_at' => '2026-01-31 05:45:27', 'subject_code' => 'COMP 317', 'section_id' => 5],
            ['id' => 12, 'teacher_assignment_id' => NULL, 'day_of_week' => 'Monday', 'time_start' => '00:00:00', 'time_end' => '00:00:00', 'room_id' => 2, 'created_at' => '2026-01-31 05:45:31', 'updated_at' => '2026-01-31 05:45:31', 'subject_code' => 'COMP 318', 'section_id' => 5],
            ['id' => 13, 'teacher_assignment_id' => NULL, 'day_of_week' => 'Monday', 'time_start' => '00:00:00', 'time_end' => '00:00:00', 'room_id' => 2, 'created_at' => '2026-01-31 05:45:37', 'updated_at' => '2026-01-31 05:45:37', 'subject_code' => 'COMP 319', 'section_id' => 5],
            ['id' => 14, 'teacher_assignment_id' => NULL, 'day_of_week' => 'Monday', 'time_start' => '00:00:00', 'time_end' => '00:00:00', 'room_id' => 2, 'created_at' => '2026-01-31 05:45:45', 'updated_at' => '2026-01-31 05:45:45', 'subject_code' => 'FL 1', 'section_id' => 5],
            ['id' => 16, 'teacher_assignment_id' => NULL, 'day_of_week' => 'Monday', 'time_start' => '00:00:00', 'time_end' => '00:00:00', 'room_id' => 2, 'created_at' => '2026-01-31 05:46:31', 'updated_at' => '2026-01-31 05:46:31', 'subject_code' => 'GE ETH', 'section_id' => 5],
            ['id' => 17, 'teacher_assignment_id' => NULL, 'day_of_week' => 'Monday', 'time_start' => '00:00:00', 'time_end' => '00:00:00', 'room_id' => 2, 'created_at' => '2026-01-31 05:46:37', 'updated_at' => '2026-01-31 05:46:37', 'subject_code' => 'IM 322', 'section_id' => 5],
            ['id' => 18, 'teacher_assignment_id' => NULL, 'day_of_week' => 'Monday', 'time_start' => '00:00:00', 'time_end' => '00:00:00', 'room_id' => 2, 'created_at' => '2026-01-31 05:46:46', 'updated_at' => '2026-01-31 05:46:46', 'subject_code' => 'COMP 420', 'section_id' => 5],
            ['id' => 19, 'teacher_assignment_id' => NULL, 'day_of_week' => 'Monday', 'time_start' => '00:00:00', 'time_end' => '00:00:00', 'room_id' => 2, 'created_at' => '2026-01-31 05:47:01', 'updated_at' => '2026-01-31 05:47:01', 'subject_code' => 'COMP 421', 'section_id' => 5],
            ['id' => 20, 'teacher_assignment_id' => NULL, 'day_of_week' => 'Monday', 'time_start' => '00:00:00', 'time_end' => '00:00:00', 'room_id' => 2, 'created_at' => '2026-01-31 05:47:07', 'updated_at' => '2026-01-31 05:47:07', 'subject_code' => 'IM  323A', 'section_id' => 5],
            ['id' => 21, 'teacher_assignment_id' => NULL, 'day_of_week' => 'Monday', 'time_start' => '00:00:00', 'time_end' => '00:00:00', 'room_id' => 2, 'created_at' => '2026-01-31 05:47:12', 'updated_at' => '2026-01-31 05:47:12', 'subject_code' => 'FL 2', 'section_id' => 5],
        ]);

        // 14. User Assignments
        DB::table('user_assignments')->truncate();
        DB::table('user_assignments')->insert([
            ['id' => 1, 'user_id' => 4, 'section_id' => NULL, 'assignment_type' => 'primary', 'status' => 'active', 'created_at' => '2026-01-30 11:31:56', 'updated_at' => '2026-01-31 04:56:52', 'year_level' => '3', 'section' => 'Altruism', 'department' => 'IT', 'major' => 'Computer Technology', 'payment' => 'owing', 'amount_lacking' => 500.00, 'sanctions' => 1, 'sanction_reason' => '3 days: No haircut'],
            ['id' => 2, 'user_id' => 7, 'section_id' => NULL, 'assignment_type' => 'primary', 'status' => 'active', 'created_at' => '2026-01-31 04:09:02', 'updated_at' => '2026-01-31 04:10:21', 'year_level' => '3', 'section' => 'Altruism', 'department' => 'IT', 'major' => 'Computer Technology', 'payment' => 'paid', 'amount_lacking' => NULL, 'sanctions' => 0, 'sanction_reason' => NULL],
            ['id' => 3, 'user_id' => 8, 'section_id' => NULL, 'assignment_type' => 'primary', 'status' => 'active', 'created_at' => '2026-01-31 04:09:02', 'updated_at' => '2026-01-31 04:10:32', 'year_level' => '3', 'section' => 'Altruism', 'department' => 'IT', 'major' => 'Computer Technology', 'payment' => 'paid', 'amount_lacking' => NULL, 'sanctions' => 0, 'sanction_reason' => NULL],
            ['id' => 4, 'user_id' => 9, 'section_id' => NULL, 'assignment_type' => 'primary', 'status' => 'active', 'created_at' => '2026-01-31 04:09:02', 'updated_at' => '2026-01-31 04:10:37', 'year_level' => '3', 'section' => 'Altruism', 'department' => 'IT', 'major' => 'Computer Technology', 'payment' => 'paid', 'amount_lacking' => NULL, 'sanctions' => 0, 'sanction_reason' => NULL],
            ['id' => 5, 'user_id' => 10, 'section_id' => NULL, 'assignment_type' => 'primary', 'status' => 'active', 'created_at' => '2026-01-31 04:09:02', 'updated_at' => '2026-01-31 04:10:42', 'year_level' => '3', 'section' => 'Altruism', 'department' => 'IT', 'major' => 'Computer Technology', 'payment' => 'paid', 'amount_lacking' => NULL, 'sanctions' => 0, 'sanction_reason' => NULL],
            ['id' => 6, 'user_id' => 11, 'section_id' => NULL, 'assignment_type' => 'primary', 'status' => 'active', 'created_at' => '2026-01-31 04:09:03', 'updated_at' => '2026-01-31 04:10:47', 'year_level' => '3', 'section' => 'Altruism', 'department' => 'IT', 'major' => 'Computer Technology', 'payment' => 'paid', 'amount_lacking' => NULL, 'sanctions' => 0, 'sanction_reason' => NULL],
            ['id' => 7, 'user_id' => 12, 'section_id' => NULL, 'assignment_type' => 'primary', 'status' => 'active', 'created_at' => '2026-01-31 04:09:03', 'updated_at' => '2026-01-31 04:10:52', 'year_level' => '3', 'section' => 'Altruism', 'department' => 'IT', 'major' => 'Computer Technology', 'payment' => 'paid', 'amount_lacking' => NULL, 'sanctions' => 0, 'sanction_reason' => NULL],
            ['id' => 8, 'user_id' => 13, 'section_id' => NULL, 'assignment_type' => 'primary', 'status' => 'active', 'created_at' => '2026-01-31 04:09:03', 'updated_at' => '2026-01-31 04:10:58', 'year_level' => '3', 'section' => 'Altruism', 'department' => 'IT', 'major' => 'Computer Technology', 'payment' => 'paid', 'amount_lacking' => NULL, 'sanctions' => 0, 'sanction_reason' => NULL],
            ['id' => 9, 'user_id' => 14, 'section_id' => NULL, 'assignment_type' => 'primary', 'status' => 'active', 'created_at' => '2026-01-31 04:09:03', 'updated_at' => '2026-01-31 04:11:03', 'year_level' => '3', 'section' => 'Altruism', 'department' => 'IT', 'major' => 'Computer Technology', 'payment' => 'paid', 'amount_lacking' => NULL, 'sanctions' => 0, 'sanction_reason' => NULL],
            ['id' => 10, 'user_id' => 15, 'section_id' => NULL, 'assignment_type' => 'primary', 'status' => 'active', 'created_at' => '2026-01-31 04:09:03', 'updated_at' => '2026-01-31 04:11:07', 'year_level' => '3', 'section' => 'Altruism', 'department' => 'IT', 'major' => 'Computer Technology', 'payment' => 'paid', 'amount_lacking' => NULL, 'sanctions' => 0, 'sanction_reason' => NULL],
        ]);

        DB::statement('SET FOREIGN_KEY_CHECKS=1;');
    }
}
