<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\TeacherController;
use App\Http\Controllers\StudentController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group. Enjoy building your API!
|
*/

Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/signup', [AuthController::class, 'signup']);
    Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
    Route::get('/check', [AuthController::class, 'check']);
    Route::post('/update-profile', [AuthController::class, 'updateProfile'])->middleware('auth:sanctum');
    Route::get('/google', [AuthController::class, 'googleOAuth'])->middleware('auth:sanctum');
    Route::post('/reset-password', [AuthController::class, 'resetPassword']);
});

// Public Stats (no auth)
Route::get('/public/stats', [AdminController::class, 'getPublicStats']);

Route::middleware(['auth:sanctum'])->group(function () {
    Route::post('/upload-profile-picture', [AuthController::class, 'uploadProfilePicture']);
    Route::delete('/upload-profile-picture', [AuthController::class, 'deleteProfilePicture']);
});

// Admin Routes (shared with non-teaching for limited resources)
Route::middleware(['auth:sanctum', 'role:admin,nt'])->prefix('admin')->group(function () {
    Route::get('/dashboard-stats', [AdminController::class, 'getDashboardStats']);

    // Section management
    Route::get('/sections', [AdminController::class, 'getSections']);
    Route::post('/sections', [AdminController::class, 'createSection']);
    Route::put('/sections/{id}', [AdminController::class, 'updateSection']);
    Route::delete('/sections/{id}', [AdminController::class, 'deleteSection']);

    // Subject management
    Route::get('/subjects', [AdminController::class, 'getSubjects']);
    Route::post('/subjects', [AdminController::class, 'createSubject']);
    Route::put('/subjects/{id}', [AdminController::class, 'updateSubject']);
    Route::delete('/subjects/{id}', [AdminController::class, 'deleteSubject']);

    // Building management
    Route::get('/buildings', [AdminController::class, 'getBuildings']);
    Route::post('/buildings', [AdminController::class, 'createBuilding']);
    Route::put('/buildings/{id}', [AdminController::class, 'updateBuilding']);
    Route::delete('/buildings/{id}', [AdminController::class, 'deleteBuilding']);

    // Study Load (Admin)
    Route::get('/study-load', [AdminController::class, 'getStudyLoad']);
    Route::get('/sections-with-load', [AdminController::class, 'getSectionsWithLoad']);
    Route::get('/section-load-details', [AdminController::class, 'getSectionLoadDetails']);
    Route::post('/clear-section-load', [AdminController::class, 'clearSectionLoad']);
    Route::post('/study-load', [AdminController::class, 'createStudyLoad']);
    Route::put('/study-load/{id}', [AdminController::class, 'updateStudyLoad']);
    Route::delete('/study-load/{id}', [AdminController::class, 'deleteStudyLoad']);
});

// Admin Routes (admin-only)
Route::middleware(['auth:sanctum', 'role:admin'])->prefix('admin')->group(function () {
    // User management
    Route::get('/users', [AdminController::class, 'getUsers']);
    Route::post('/users', [AdminController::class, 'createUser']);
    Route::put('/users/{id}/role', [AdminController::class, 'updateUserRole']);
    Route::put('/users/{id}/roles', [AdminController::class, 'updateUserRoles']);
    Route::put('/users/{id}/sub-role', [AdminController::class, 'updateUserSubRole']);
    Route::put('/users/{id}/gender', [AdminController::class, 'updateUserGender']);
    Route::delete('/users/{id}', [AdminController::class, 'deleteUser']);
    Route::get('/user-suggestions', [AdminController::class, 'getUserSuggestions']);

    // User assignments
    Route::get('/user-assignments', [AdminController::class, 'getUserAssignments']);
    Route::post('/user-assignments', [AdminController::class, 'createUserAssignment']);
    Route::put('/user-assignments/{id}', [AdminController::class, 'updateUserAssignment']);
    Route::delete('/user-assignments/{id}', [AdminController::class, 'deleteUserAssignment']);

    // Teacher assignments
    Route::get('/teacher-assignments', [AdminController::class, 'getTeacherAssignments']);
    Route::post('/teacher-assignments', [AdminController::class, 'createTeacherAssignment']);
    Route::delete('/teacher-assignments/{id}', [AdminController::class, 'deleteTeacherAssignment']);

    // Section assignments
    Route::get('/section-assignments', [AdminController::class, 'getSectionAssignments']);
    Route::post('/section-assignments', [AdminController::class, 'createSectionAssignment']);
    Route::put('/section-assignments/{id}', [AdminController::class, 'updateSectionAssignment']);
    Route::delete('/section-assignments/{id}', [AdminController::class, 'deleteSectionAssignment']);

    // Schedules
    Route::get('/schedules', [AdminController::class, 'getSchedules']);
    Route::post('/schedules', [AdminController::class, 'createSchedule']);
    Route::delete('/schedules/{id}', [AdminController::class, 'deleteSchedule']);

    // Backup & Import
    Route::get('/backup', [AdminController::class, 'getBackups']);
    Route::post('/backup', [AdminController::class, 'createBackup']);
    Route::get('/backup/download/{filename}', [AdminController::class, 'downloadBackup']);
    Route::post('/backup/import', [AdminController::class, 'importBackup']);

    // Announcement management
    Route::get('/announcements', [AdminController::class, 'getAnnouncements']);
    Route::post('/announcements', [AdminController::class, 'createAnnouncement']);
    Route::put('/announcements/{id}', [AdminController::class, 'updateAnnouncement']);
    Route::delete('/announcements/{id}', [AdminController::class, 'deleteAnnouncement']);

    // Projects (Admin)
    Route::get('/projects', [AdminController::class, 'getProjects']);
    Route::post('/projects', [AdminController::class, 'createProject']);
    Route::put('/projects/{id}', [AdminController::class, 'updateProject']);
    Route::delete('/projects/{id}', [AdminController::class, 'deleteProject']);

    // Evaluations (Admin)
    Route::get('/evaluation-settings', [AdminController::class, 'getEvaluationSettings']);
    Route::post('/evaluation-settings', [AdminController::class, 'updateEvaluationSettings']);
    Route::get('/evaluation/lowest-rated', [AdminController::class, 'getLowestRatedTeachers']);

    // Grades (Admin)
    Route::get('/grades', [AdminController::class, 'getGrades']);
    Route::post('/grades', [AdminController::class, 'createGrade']);
    Route::put('/grades/{id}', [AdminController::class, 'updateGrade']);
    Route::delete('/grades/{id}', [AdminController::class, 'deleteGrade']);

    // Cleanup
    Route::post('/cleanup-pictures', [AdminController::class, 'cleanupPictures']);
    Route::post('/maintenance/schema-patch', [AdminController::class, 'patchDatabaseSchema']);
});

// Teacher Routes
Route::middleware(['auth:sanctum', 'role:teacher'])->prefix('teacher')->group(function () {
    Route::get('/assignments', [TeacherController::class, 'getAssignments']);
    Route::get('/subjects', [TeacherController::class, 'getTeacherSubjects']);
    Route::get('/sections', [TeacherController::class, 'getSections']);
    Route::get('/schedules', [TeacherController::class, 'getSchedule']);
    Route::get('/schedule', [TeacherController::class, 'getSchedule']); // Alias
    Route::get('/grades', [TeacherController::class, 'getGrades']);
    Route::post('/grades', [TeacherController::class, 'saveGrade']);
    Route::put('/grades/{id}', [TeacherController::class, 'saveGrade']); // Overload save
    Route::delete('/grades/{id}', [AdminController::class, 'deleteGrade']); // Share admin delete or implement in teacher
    Route::get('/students', [TeacherController::class, 'getStudents']);
    Route::get('/announcements', [TeacherController::class, 'getAnnouncements']);
    Route::get('/projects', [TeacherController::class, 'getProjects']);
    Route::get('/evaluation-statistics', [TeacherController::class, 'getEvaluationStatistics']);
});

// Student Routes
Route::middleware(['auth:sanctum', 'role:student'])->prefix('student')->group(function () {
    Route::get('/assignment', [StudentController::class, 'getAssignment']);
    Route::get('/study-load', [StudentController::class, 'getStudyLoad']);
    Route::get('/grades', [StudentController::class, 'getGrades']);
    Route::get('/announcements', [StudentController::class, 'getAnnouncements']);
    Route::get('/projects', [StudentController::class, 'getProjects']);
    Route::get('/campus-projects', [StudentController::class, 'getCampusProjects']);
    Route::get('/evaluation-settings', [StudentController::class, 'getEvaluationSettings']);
    Route::get('/evaluation/teachers', [StudentController::class, 'getEvaluationTeachers']);
    Route::get('/evaluation/get-evaluation', [StudentController::class, 'getEvaluation']);
    Route::post('/evaluation/submit', [StudentController::class, 'submitEvaluation']);
});

// Root API check
Route::get('/', function () {
    return response()->json([
        'message' => 'TCC Portal API (Laravel)',
        'version' => '1.0'
    ]);
});
