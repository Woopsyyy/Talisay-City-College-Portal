<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Section;
use App\Models\Subject;
use App\Models\Building;
use App\Models\UserAssignment;
use App\Models\TeacherAssignment;
use App\Models\Announcement;
use App\Models\Grade;
use App\Models\Project;
use App\Models\StudyLoad;
use App\Models\EvaluationSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Cache;
use Illuminate\Database\Schema\Blueprint;

class AdminController extends Controller
{
    private const CACHE_TTL_SECONDS = 300;
    private const CACHE_KEY_SUBJECTS = 'admin:subjects';
    private const CACHE_KEY_BUILDINGS = 'admin:buildings';
    private const CACHE_KEY_SECTIONS = 'admin:sections';
    private const CACHE_KEY_SECTIONS_WITH_LOAD = 'admin:sections_with_load';
    private const CACHE_KEY_DASHBOARD_STATS = 'admin:dashboard_stats';
    private const CACHE_KEY_SCHEDULES = 'admin:schedules';
    private const CACHE_KEY_ANNOUNCEMENTS = 'admin:announcements';
    private const CACHE_KEY_PROJECTS = 'admin:projects';
    private const CACHE_KEY_STUDY_LOAD_ALL = 'admin:study_load_all';
    private const CACHE_KEY_EVALUATION_SETTINGS = 'admin:eval_settings';
    private const CACHE_KEY_LOWEST_RATED = 'admin:lowest_rated';
    private const CACHE_KEY_ALL_GRADES = 'admin:all_grades';

    // --- User Management ---

    public function getUsers()
    {
        $roleFilter = request()->query('role');
        $subRoleFilter = request()->query('sub_role');

        $users = User::withCount([
                'assignments as student_assignment_count' => function ($q) {
                    $q->where('status', 'active');
                },
                'teacher_assignments as teacher_assignment_count' => function ($q) {
                    $q->where('status', 'active');
                },
            ])
            ->when($roleFilter, function ($query) use ($roleFilter) {
                $query->where(function ($q) use ($roleFilter) {
                    $q->where('role', $roleFilter);
                    if (Schema::hasColumn('users', 'roles')) {
                        $q->orWhereJsonContains('roles', $roleFilter);
                    }
                });
            })
            ->when($subRoleFilter, function ($query) use ($subRoleFilter) {
                $query->where('sub_role', $subRoleFilter);
            })
            ->orderBy('role')
            ->orderBy('full_name')
            ->get();
        
        // Add assignment_count legacy compatibility
        $users->each(function ($user) {
            if ($user->role === 'student') {
                $user->assignment_count = (int)($user->student_assignment_count ?? 0);
            } elseif ($user->role === 'teacher') {
                $user->assignment_count = (int)($user->teacher_assignment_count ?? 0);
            } else {
                $user->assignment_count = 0;
            }
        });

        return response()->json($users);
    }

    public function createUser(Request $request)
    {
        $data = $request->validate([
            'username' => 'required|string|unique:users',
            'password' => 'required|string',
            'email' => 'required|email|unique:users',
            'full_name' => 'required|string',
            'role' => 'nullable|string|in:student,teacher,admin,nt',
            'roles' => 'nullable|array',
            'roles.*' => 'string|in:student,teacher,admin,nt',
            'sub_role' => 'nullable|string|in:faculty,dean,osas,treasury',
            'school_id' => 'nullable|string|unique:users',
            'gender' => 'nullable|string',
        ]);

        $normalizedRoles = $this->normalizeRoles($data['roles'] ?? null, $data['role'] ?? 'student');

        $user = User::create([
            'username' => $data['username'],
            'password' => Hash::make($data['password']),
            'email' => $data['email'],
            'full_name' => $data['full_name'],
            'role' => $normalizedRoles[0] ?? ($data['role'] ?? 'student'),
            'roles' => $normalizedRoles,
            'sub_role' => $data['sub_role'] ?? null,
            'school_id' => $data['school_id'],
            'gender' => $data['gender'] ?? null,
            'image_path' => '/images/sample.jpg',
        ]);

        return $this->success(['user_id' => $user->id], 'User created successfully', 201);
    }

    public function updateUserRole(Request $request, $id)
    {
        $user = User::findOrFail($id);
        $data = $request->validate(['role' => 'required|string|in:student,teacher,admin,nt']);
        
        $roles = $this->normalizeRoles([$data['role']]);
        $user->update([
            'role' => $roles[0],
            'roles' => $roles,
        ]);
        return $this->success([], 'User role updated successfully');
    }

    public function updateUserRoles(Request $request, $id)
    {
        $user = User::findOrFail($id);
        $data = $request->validate([
            'roles' => 'required|array|min:1',
            'roles.*' => 'string|in:student,teacher,admin,nt',
        ]);

        $roles = $this->normalizeRoles($data['roles']);
        $user->update([
            'role' => $roles[0],
            'roles' => $roles,
        ]);

        return $this->success(['roles' => $roles], 'User roles updated successfully');
    }

    public function updateUserSubRole(Request $request, $id)
    {
        $user = User::findOrFail($id);
        $data = $request->validate([
            'sub_role' => 'nullable|string|in:faculty,dean,osas,treasury',
        ]);

        $user->update(['sub_role' => $data['sub_role'] ?? null]);
        return $this->success([], 'User sub role updated successfully');
    }

    public function updateUserGender(Request $request, $id)
    {
        $user = User::findOrFail($id);
        $data = $request->validate(['gender' => 'required|string']);
        
        $user->update(['gender' => $data['gender']]);
        return $this->success([], 'User gender updated successfully');
    }

    public function deleteUser($id)
    {
        if ($id == auth()->id()) {
            return $this->error('Cannot delete your own account', 400);
        }

        $user = User::findOrFail($id);
        $user->delete();
        return $this->success([], 'User deleted successfully');
    }

    // --- Section Management ---

    public function getSections()
    {
        $sections = Cache::remember(self::CACHE_KEY_SECTIONS, self::CACHE_TTL_SECONDS, function () {
            return Section::withCount([
                    'assignments as student_count' => function ($q) {
                        $q->where('status', 'active');
                    },
                    'teacher_assignments as teacher_count' => function ($q) {
                        $q->where('status', 'active');
                    },
                ])
                ->get()
                ->map(function($section) {
                    return [
                        'id' => $section->id,
                        'section_name' => $section->section_name,
                        'grade_level' => $section->grade_level,
                        'school_year' => $section->school_year,
                        'course' => $section->course,
                        'major' => $section->major,
                        'created_at' => $section->created_at,
                        'student_count' => (int)($section->student_count ?? 0),
                        'teacher_count' => (int)($section->teacher_count ?? 0),
                    ];
                });
        });

        return response()->json($sections);
    }

    public function createSection(Request $request)
    {
        $data = $request->validate([
            'section_name' => 'required|string|unique:sections',
            'grade_level' => 'required|string',
            'school_year' => 'required|string',
            'course' => 'nullable|string',
            'major' => 'nullable|string',
        ]);

        $section = Section::create($data);
        $this->forgetCache([
            self::CACHE_KEY_SECTIONS,
            self::CACHE_KEY_SECTIONS_WITH_LOAD,
            self::CACHE_KEY_DASHBOARD_STATS,
        ]);
        return $this->success(['section_id' => $section->id], 'Section created successfully', 201);
    }

    public function updateSection(Request $request, $id)
    {
        $section = Section::findOrFail($id);
        $data = $request->validate([
            'section_name' => 'required|string|unique:sections,section_name,'.$id,
            'grade_level' => 'required|string',
            'school_year' => 'required|string',
            'course' => 'nullable|string',
            'major' => 'nullable|string',
        ]);

        $section->update($data);
        $this->forgetCache([
            self::CACHE_KEY_SECTIONS,
            self::CACHE_KEY_SECTIONS_WITH_LOAD,
            self::CACHE_KEY_DASHBOARD_STATS,
        ]);
        return $this->success([], 'Section updated successfully');
    }

    public function deleteSection($id)
    {
        $hasStudents = UserAssignment::where('section_id', $id)->where('status', 'active')->exists();
        if ($hasStudents) {
            return $this->error('Cannot delete section with active students', 400);
        }

        Section::findOrFail($id)->delete();
        $this->forgetCache([
            self::CACHE_KEY_SECTIONS,
            self::CACHE_KEY_SECTIONS_WITH_LOAD,
            self::CACHE_KEY_DASHBOARD_STATS,
        ]);
        return $this->success([], 'Section deleted successfully');
    }

    // --- Subject Management ---

    public function getSubjects()
    {
        $subjects = Cache::remember(self::CACHE_KEY_SUBJECTS, self::CACHE_TTL_SECONDS, function () {
            return Subject::orderBy('course')->orderBy('year_level')->orderBy('subject_code')->get();
        });
        return response()->json($subjects);
    }

    public function createSubject(Request $request)
    {
        $data = $request->validate([
            'subject_code' => 'required|string|unique:subjects',
            'subject_name' => 'required|string',
            'units' => 'required|numeric',
            'course' => 'required|string',
            'major' => 'nullable|string',
            'year_level' => 'required|integer',
            'semester' => 'required|string',
        ]);

        $subject = Subject::create($data);
        $this->forgetCache([
            self::CACHE_KEY_SUBJECTS,
            self::CACHE_KEY_DASHBOARD_STATS,
        ]);
        return $this->success(['id' => $subject->id], 'Subject created', 201);
    }

    public function updateSubject(Request $request, $id)
    {
        $subject = Subject::findOrFail($id);
        $data = $request->validate([
            'subject_code' => 'required|string|unique:subjects,subject_code,'.$id,
            'subject_name' => 'required|string',
            'units' => 'required|numeric',
            'course' => 'required|string',
            'major' => 'nullable|string',
            'year_level' => 'required|integer',
            'semester' => 'required|string',
        ]);

        $subject->update($data);
        $this->forgetCache([
            self::CACHE_KEY_SUBJECTS,
            self::CACHE_KEY_DASHBOARD_STATS,
        ]);
        return $this->success([], 'Subject updated');
    }

    public function deleteSubject($id)
    {
        $subject = Subject::findOrFail($id);
        
        // Cascading delete is handled by DB in migrations, but we can do extra cleanup if needed
        $subject->delete();
        $this->forgetCache([
            self::CACHE_KEY_SUBJECTS,
            self::CACHE_KEY_DASHBOARD_STATS,
        ]);
        return $this->success([], 'Subject deleted');
    }

    // --- Building Management ---

    public function getBuildings(Request $request)
    {
        $forceRefresh = $request->boolean('refresh');
        $buildings = null;

        if (!$forceRefresh) {
            $buildings = Cache::get(self::CACHE_KEY_BUILDINGS);
            if ($buildings !== null && Schema::hasTable('buildings')) {
                $dbCount = Building::count();
                $cachedCount = is_countable($buildings) ? count($buildings) : 0;
                if ($dbCount !== $cachedCount) {
                    $buildings = null;
                }
            }
        }

        if ($buildings === null) {
            $buildings = Cache::remember(self::CACHE_KEY_BUILDINGS, self::CACHE_TTL_SECONDS, function () {
                return Building::orderBy('building_name')->get()->map(function($b) {
                    return [
                        'id' => $b->id,
                        'name' => $b->building_name,
                        'floors' => $b->num_floors,
                        'rooms_per_floor' => $b->rooms_per_floor,
                        'description' => $b->description,
                    ];
                });
            });
        }
        return response()->json($buildings);
    }

    public function createBuilding(Request $request)
    {
        $data = $request->validate([
            'building_name' => 'required|string|unique:buildings',
            'num_floors' => 'required|integer|min:1',
            'rooms_per_floor' => 'required|integer|min:1',
            'description' => 'nullable|string',
        ]);

        try {
            if (!Schema::hasTable('buildings')) {
                $this->ensureBuildingsTable();
            }
            $building = Building::create($data);
            $this->forgetCache([
                self::CACHE_KEY_BUILDINGS,
                self::CACHE_KEY_DASHBOARD_STATS,
            ]);
            return $this->success(['id' => $building->id], 'Building created', 201);
        } catch (\Exception $e) {
            return $this->error('Failed to create building. ' . $e->getMessage(), 500);
        }
    }

    public function updateBuilding(Request $request, $id)
    {
        $building = Building::findOrFail($id);
        $data = $request->validate([
            'building_name' => 'required|string|unique:buildings,building_name,'.$id,
            'num_floors' => 'required|integer|min:1',
            'rooms_per_floor' => 'required|integer|min:1',
            'description' => 'nullable|string',
        ]);

        $building->update($data);
        $this->forgetCache([
            self::CACHE_KEY_BUILDINGS,
            self::CACHE_KEY_DASHBOARD_STATS,
        ]);
        return $this->success([], 'Building updated');
    }

    public function deleteBuilding($id)
    {
        if (is_numeric($id)) {
            Building::findOrFail($id)->delete();
            $this->forgetCache([
                self::CACHE_KEY_BUILDINGS,
                self::CACHE_KEY_DASHBOARD_STATS,
            ]);
            return $this->success([], 'Building deleted');
        }

        $building = Building::where('building_name', $id)->first();
        if (!$building) {
            return $this->error('Building not found', 404);
        }

        $building->delete();
        $this->forgetCache([
            self::CACHE_KEY_BUILDINGS,
            self::CACHE_KEY_DASHBOARD_STATS,
        ]);
        return $this->success([], 'Building deleted');
    }

    public function getDashboardStats()
    {
        $stats = Cache::remember(self::CACHE_KEY_DASHBOARD_STATS, self::CACHE_TTL_SECONDS, function () {
            $usersCount = $this->safeUserCount();
            $studentsCount = $this->safeUserCount('student');
            $teachersCount = $this->safeUserCount('teacher');
            $adminsCount = $this->safeUserCount('admin');
            $nonTeachingCount = $this->safeUserCount('nt');
            $subjectsCount = $this->safeModelCount('subjects', Subject::class);
            $sectionsCount = $this->safeModelCount('sections', Section::class);
            $assignmentsCount = $this->safeModelCount('user_assignments', UserAssignment::class);
            $schedulesCount = $this->safeTableCount('schedules');
            $announcementsCount = $this->safeModelCount('announcements', Announcement::class);
            $projectsCount = $this->safeModelCount('projects', Project::class);
            $studyLoadCount = $this->safeModelCount('study_load', StudyLoad::class);
            $evaluationsCount = $this->safeTableCount('teacher_evaluations');

            $buildings = Schema::hasTable('buildings')
                ? Building::orderBy('building_name')
                    ->get(['id', 'building_name', 'num_floors', 'rooms_per_floor'])
                    ->map(function ($b) {
                        return [
                            'id' => $b->id,
                            'name' => $b->building_name,
                            'floors' => $b->num_floors,
                            'rooms_per_floor' => $b->rooms_per_floor,
                        ];
                    })
                    ->values()
                : collect();

            $recentAnnouncements = Schema::hasTable('announcements')
                ? Announcement::orderByDesc('published_at')
                    ->orderByDesc('created_at')
                    ->limit(5)
                    ->get(['id', 'title', 'priority', 'published_at', 'created_at'])
                    ->map(function ($a) {
                        return [
                            'id' => $a->id,
                            'title' => $a->title,
                            'priority' => $a->priority,
                            'published_at' => $a->published_at ?? $a->created_at,
                        ];
                    })
                    ->values()
                : collect();

            return [
                'users' => $usersCount,
                'students' => $studentsCount,
                'teachers' => $teachersCount,
                'admins' => $adminsCount,
                'non_teaching' => $nonTeachingCount,
                'subjects' => $subjectsCount,
                'sections' => $sectionsCount,
                'assignments' => $assignmentsCount,
                'schedules' => $schedulesCount,
                'announcements' => $announcementsCount,
                'projects' => $projectsCount,
                'study_load' => $studyLoadCount,
                'evaluations' => $evaluationsCount,
                'buildings' => $buildings,
                'recent_announcements' => $recentAnnouncements,
            ];
        });

        return response()->json($stats);
    }

    public function getPublicStats()
    {
        return response()->json([
            'buildings' => Schema::hasTable('buildings') ? Building::count() : 0,
            'subjects' => Schema::hasTable('subjects') ? Subject::count() : 0,
        ]);
    }

    private function safeTableCount(string $table): int
    {
        if (!Schema::hasTable($table)) {
            return 0;
        }
        try {
            return DB::table($table)->count();
        } catch (\Exception $e) {
            return 0;
        }
    }

    private function safeModelCount(string $table, string $modelClass): int
    {
        if (!Schema::hasTable($table)) {
            return 0;
        }
        try {
            return $modelClass::count();
        } catch (\Exception $e) {
            return 0;
        }
    }

    private function safeUserCount(?string $role = null): int
    {
        if (!Schema::hasTable('users')) {
            return 0;
        }
        try {
            return $role ? User::where('role', $role)->count() : User::count();
        } catch (\Exception $e) {
            return 0;
        }
    }

    // --- User Assignment Management ---

    public function getUserAssignments()
    {
        $assignments = UserAssignment::with(['user', 'section_ref'])->get()->map(function($ua) {
            $sectionName = $ua->section_ref?->section_name ?? $ua->section;
            return [
                'id' => $ua->id,
                'user_id' => $ua->user_id,
                'year' => $ua->year_level,
                'section' => $sectionName,
                'section_name' => $sectionName,
                'section_id' => $ua->section_id,
                'department' => $ua->department,
                'major' => $ua->major,
                'payment' => $ua->payment,
                'amount_lacking' => $ua->amount_lacking,
                'sanctions' => $ua->sanctions,
                'sanction_reason' => $ua->sanction_reason,
                'semester' => $ua->semester,
                'student_status' => $ua->student_status,
                'created_at' => $ua->created_at,
                'username' => $ua->user->username ?? '',
                'full_name' => $ua->user->full_name ?? '',
                'gender' => $ua->user->gender ?? '',
                'role' => $ua->user->role ?? 'student',
            ];
        });

        return response()->json($assignments);
    }

    public function createUserAssignment(Request $request)
    {
        $data = $request->validate([
            'user_id' => 'nullable|integer',
            'full_name' => 'nullable|string',
            'year' => 'required|string',
            'section' => 'required_without:section_id|string',
            'section_id' => 'nullable|integer',
            'semester' => 'nullable|string',
            'department' => 'nullable|string',
            'major' => 'nullable|string',
            'payment' => 'nullable|string',
            'amount_lacking' => 'nullable|numeric',
            'sanctions' => 'nullable|boolean',
            'sanction_reason' => 'nullable|string',
            'student_status' => 'nullable|string',
        ]);

        $userId = $data['user_id'] ?? null;
        if (!$userId && !empty($data['full_name'])) {
            $user = User::where('full_name', $data['full_name'])->first();
            if ($user) $userId = $user->id;
        }

        if (!$userId) return $this->error('User not found', 404);

        $sectionId = $data['section_id'] ?? null;
        $sectionName = $data['section'] ?? null;
        if (!$sectionId && !empty($sectionName)) {
            $sectionId = Section::where('section_name', $sectionName)->value('id');
        }
        if (!$sectionName && $sectionId) {
            $sectionName = Section::where('id', $sectionId)->value('section_name');
        }
        if ($sectionId && !$sectionName) {
            return $this->error('Section not found', 404);
        }
        if (!$sectionId && !empty($sectionName)) {
            return $this->error('Section not found', 404);
        }

        $assignment = UserAssignment::create([
            'user_id' => $userId,
            'section_id' => $sectionId,
            'year_level' => $data['year'],
            'section' => $sectionName,
            'semester' => $data['semester'] ?? '1st Semester',
            'department' => $data['department'] ?? null,
            'major' => $data['major'] ?? null,
            'payment' => $data['payment'] ?? 'paid',
            'amount_lacking' => $data['amount_lacking'] ?? 0,
            'sanctions' => $data['sanctions'] ?? false,
            'sanction_reason' => $data['sanction_reason'] ?? null,
            'student_status' => $data['student_status'] ?? 'Regular',
        ]);

        $this->forgetCache([self::CACHE_KEY_SECTIONS]);
        return $this->success(['id' => $assignment->id], 'User assignment created', 201);
    }

    public function deleteUserAssignment($id)
    {
        UserAssignment::findOrFail($id)->delete();
        $this->forgetCache([self::CACHE_KEY_SECTIONS]);
        return $this->success([], 'Assignment deleted');
    }

    // --- Teacher Assignment Management ---

    public function getTeacherAssignments()
    {
        $assignments = TeacherAssignment::with(['teacher', 'subject', 'section_ref'])->where('status', 'active')->get()->map(function($ta) {
            return [
                'id' => $ta->id,
                'teacher_id' => $ta->teacher_id,
                'subject_id' => $ta->subject_id,
                'section_id' => $ta->section_id,
                'status' => $ta->status,
                'created_at' => $ta->created_at,
                'full_name' => $ta->teacher->full_name ?? '',
                'username' => $ta->teacher->username ?? '',
                'subject_code' => $ta->subject->subject_code ?? '',
                'subject_title' => $ta->subject->subject_name ?? '',
                'section_name' => $ta->section_ref->section_name ?? $ta->section ?? '',
                'grade_level' => $ta->section_ref->grade_level ?? '',
            ];
        });

        return response()->json($assignments);
    }

    public function createTeacherAssignment(Request $request)
    {
        $data = $request->validate([
            'teacher_name' => 'nullable|string',
            'user_id' => 'nullable|integer',
            'subject_code' => 'required|string',
            'section_id' => 'nullable|integer',
        ]);

        $teacherId = $data['user_id'] ?? null;
        if (!$teacherId && !empty($data['teacher_name'])) {
            $user = User::where('full_name', $data['teacher_name'])->where('role', 'teacher')->first();
            if ($user) $teacherId = $user->id;
        }

        if (!$teacherId) return $this->error('Teacher not found', 404);

        $subject = Subject::where('subject_code', $data['subject_code'])->first();
        if (!$subject) return $this->error('Subject not found', 404);

        $existing = TeacherAssignment::where('teacher_id', $teacherId)
            ->where('subject_id', $subject->id)
            ->where('status', 'active')
            ->first();

        if ($existing) return $this->error('Assignment already exists', 409);

        $assignment = TeacherAssignment::create([
            'teacher_id' => $teacherId,
            'subject_id' => $subject->id,
            'section_id' => $data['section_id'] ?? null,
            'status' => 'active',
        ]);

        return $this->success(['id' => $assignment->id], 'Teacher assignment created', 201);
    }

    public function deleteTeacherAssignment($id)
    {
        TeacherAssignment::findOrFail($id)->delete();
        return $this->success([], 'Assignment deleted');
    }

    // --- Schedule Management ---

    public function getSchedules()
    {
        $schedules = Cache::remember(self::CACHE_KEY_SCHEDULES, self::CACHE_TTL_SECONDS, function () {
            return \App\Models\Schedule::with(['teacher_assignment.teacher', 'teacher_assignment.subject', 'teacher_assignment.section_ref'])->get()->map(function($sc) {
                $ta = $sc->teacher_assignment;
                $roomInfo = $this->resolveSectionRoom($ta->section_id ?? null, $sc->room_id);
                $sectionName = $ta->section_ref?->section_name ?? ($ta->section ?? '');
                return [
                    'id' => $sc->id,
                    'subject' => $ta->subject?->subject_code ?? '',
                    'section_id' => $ta->section_id ?? null,
                    'day' => $sc->day_of_week,
                    'time_start' => $sc->start_time,
                    'time_end' => $sc->end_time,
                    'room_id' => $sc->room_id,
                    'created_at' => $sc->created_at,
                    'subject_name' => $ta->subject?->subject_name ?? '',
                    'section' => $sectionName,
                    'year' => $ta->section_ref?->grade_level ?? '',
                    'instructor' => $ta->teacher->full_name ?? 'TBA',
                    'class_type' => ((int)substr($sc->start_time, 0, 2) >= 17) ? 'night' : 'day',
                    'building' => $roomInfo['building'] ?? null,
                    'room' => $roomInfo['room'] ?? $sc->room_id,
                    'floor' => $roomInfo['floor'] ?? null,
                ];
            });
        });

        return response()->json($schedules);
    }

    public function createSchedule(Request $request)
    {
        $data = $request->validate([
            'subject' => 'required|string', # subject_code
            'section' => 'nullable|string', # section_name
            'day' => 'required|string',
            'time_start' => 'required',
            'time_end' => 'required',
            'building' => 'nullable|string',
            'room' => 'nullable|string',
        ]);

        $subject = Subject::where('subject_code', $data['subject'])->first();
        if (!$subject) return $this->error('Subject not found', 404);

        $section = Section::where('section_name', $data['section'])->first();
        if (!$section) return $this->error('Section not found', 404);

        $schoolYear = $section->school_year ?? (date('Y') . '-' . (date('Y') + 1));

        $isPlaceholderTime = in_array($data['time_start'], ['00:00', '00:00:00'], true)
            && in_array($data['time_end'], ['00:00', '00:00:00'], true);

        if ($isPlaceholderTime) {
            $ta = TeacherAssignment::where('subject_id', $subject->id)
                ->where('section_id', $section->id)
                ->where('status', 'active')
                ->first();

            if (!$ta) {
                $ta = TeacherAssignment::where('subject_id', $subject->id)
                    ->where('status', 'active')
                    ->first();
            }

            if (!empty($data['building']) && !empty($data['room']) && is_numeric($data['room'])) {
                $roomResult = $this->upsertSectionRoomAssignment($section, $data['building'], $data['room'], $schoolYear);
                if (!empty($roomResult['error'])) {
                    return $this->error($roomResult['message'], $roomResult['status'] ?? 400);
                }
            }

            $this->ensureStudyLoad($section, $subject, $ta, $data['semester'] ?? null);
            $this->forgetCache([self::CACHE_KEY_SECTIONS_WITH_LOAD, self::CACHE_KEY_SCHEDULES]);
            return $this->success([], 'Subject added to study load', 201);
        }

        // Find teacher assignment (required for actual schedule entries)
        $ta = TeacherAssignment::where('subject_id', $subject->id)
            ->where('section_id', $section->id)
            ->where('status', 'active')
            ->first();

        if (!$ta) {
            // Try to find a global assignment for this subject
            $ta = TeacherAssignment::where('subject_id', $subject->id)
                ->where('status', 'active')
                ->first();
            
            if (!$ta) return $this->error('No teacher assigned to this subject', 400); 
        }

        // Conflict check
        $conflict = \App\Models\Schedule::where('day_of_week', $data['day'])
            ->whereHas('teacher_assignment', function($q) use ($ta) {
                $q->where('teacher_id', $ta->teacher_id);
            })
            ->where(function($q) use ($data) {
                $q->whereBetween('start_time', [$data['time_start'], $data['time_end']])
                  ->orWhereBetween('end_time', [$data['time_start'], $data['time_end']])
                  ->orWhere(function($sub) use ($data) {
                      $sub->where('start_time', '<=', $data['time_start'])
                          ->where('end_time', '>=', $data['time_end']);
                  });
            })
            ->first();

        if ($conflict) {
            return $this->error("Teacher conflict detected", 409);
        }

        $roomAssignmentId = null;
        if (!empty($data['building']) && !empty($data['room']) && is_numeric($data['room'])) {
            $roomResult = $this->upsertSectionRoomAssignment($section, $data['building'], $data['room'], $schoolYear);
            if (!empty($roomResult['error'])) {
                return $this->error($roomResult['message'], $roomResult['status'] ?? 400);
            }
            $roomAssignmentId = $roomResult['id'] ?? null;
        }

        $schedule = \App\Models\Schedule::create([
            'teacher_assignment_id' => $ta->id,
            'day_of_week' => $data['day'],
            'start_time' => $data['time_start'],
            'end_time' => $data['time_end'],
            'room_id' => $roomAssignmentId,
        ]);

        $this->ensureStudyLoad($section, $subject, $ta, $data['semester'] ?? null);
        $this->forgetCache([self::CACHE_KEY_SECTIONS_WITH_LOAD, self::CACHE_KEY_SCHEDULES]);
        return $this->success(['id' => $schedule->id], 'Schedule created', 201);
    }

    public function deleteSchedule($id)
    {
        \App\Models\Schedule::findOrFail($id)->delete();
        $this->forgetCache([self::CACHE_KEY_SECTIONS_WITH_LOAD, self::CACHE_KEY_SCHEDULES]);
        return $this->success([], 'Schedule deleted');
    }

    // --- Announcement Management ---

    public function getAnnouncements()
    {
        $announcements = Cache::remember(self::CACHE_KEY_ANNOUNCEMENTS, self::CACHE_TTL_SECONDS, function () {
            return DB::table('announcements')
                ->join('users', 'announcements.author_id', '=', 'users.id')
                ->select(
                    'announcements.*',
                    'users.full_name as author_name'
                )
                ->orderBy('announcements.created_at', 'desc')
                ->get();
        });
        
        return response()->json($announcements);
    }

    public function createAnnouncement(Request $request)
    {
        $data = $request->validate([
            'title' => 'required|string|max:200',
            'content' => 'required|string',
            'year' => 'nullable|string',
            'department' => 'nullable|string',
            'major' => 'nullable|string',
            'target_role' => 'nullable|string|in:all,student,teacher,admin,nt',
            'priority' => 'nullable|string|in:low,medium,high',
            'is_published' => 'nullable|boolean',
            'expires_at' => 'nullable|date',
        ]);

        $announcement = DB::table('announcements')->insertGetId([
            'title' => $data['title'],
            'content' => $data['content'],
            'year' => $data['year'] ?? null,
            'department' => $data['department'] ?? null,
            'major' => $data['major'] ?? null,
            'author_id' => auth()->id(),
            'target_role' => $data['target_role'] ?? 'all',
            'priority' => $data['priority'] ?? 'medium',
            'is_published' => $data['is_published'] ?? true,
            'expires_at' => $data['expires_at'] ?? null,
            'published_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->forgetCache([self::CACHE_KEY_ANNOUNCEMENTS, self::CACHE_KEY_DASHBOARD_STATS]);
        return $this->success(['id' => $announcement], 'Announcement created successfully', 201);
    }

    public function updateAnnouncement(Request $request, $id)
    {
        $data = $request->validate([
            'title' => 'required|string|max:200',
            'content' => 'required|string',
            'year' => 'nullable|string',
            'department' => 'nullable|string',
            'major' => 'nullable|string',
            'target_role' => 'nullable|string|in:all,student,teacher,admin,nt',
            'priority' => 'nullable|string|in:low,medium,high',
            'is_published' => 'nullable|boolean',
            'expires_at' => 'nullable|date',
        ]);

        $announcement = DB::table('announcements')->where('id', $id)->first();
        if (!$announcement) {
            return $this->error('Announcement not found', 404);
        }

        DB::table('announcements')->where('id', $id)->update([
            'title' => $data['title'],
            'content' => $data['content'],
            'year' => $data['year'] ?? null,
            'department' => $data['department'] ?? null,
            'major' => $data['major'] ?? null,
            'target_role' => $data['target_role'] ?? 'all',
            'priority' => $data['priority'] ?? 'medium',
            'is_published' => $data['is_published'] ?? true,
            'expires_at' => $data['expires_at'] ?? null,
            'updated_at' => now(),
        ]);

        $this->forgetCache([self::CACHE_KEY_ANNOUNCEMENTS]);
        return $this->success([], 'Announcement updated successfully');
    }

    public function deleteAnnouncement($id)
    {
        $deleted = DB::table('announcements')->where('id', $id)->delete();
        if (!$deleted) {
            return $this->error('Announcement not found', 404);
        }
        
        $this->forgetCache([self::CACHE_KEY_ANNOUNCEMENTS, self::CACHE_KEY_DASHBOARD_STATS]);
        return $this->success([], 'Announcement deleted successfully');
    }

    // --- Backup & Import ---


    public function createBackup()
    {
        $filename = 'backup_' . date('Y-m-d_H-i-s') . '.sql';
        $path = storage_path('app/backups/' . $filename);

        if (!file_exists(storage_path('app/backups'))) {
            mkdir(storage_path('app/backups'), 0755, true);
        }

        $host = config('database.connections.mysql.host');
        $user = config('database.connections.mysql.username');
        $pass = config('database.connections.mysql.password');
        $db   = config('database.connections.mysql.database');

        $command = "mysqldump --add-drop-table --skip-ssl -h {$host} -u {$user} -p'{$pass}' {$db} > {$path} 2>&1";
        
        exec($command, $output, $returnVar);

        if ($returnVar !== 0) {
            return $this->error('Failed to create backup: ' . implode("\n", $output), 500);
        }

        return $this->success([
            'filename' => $filename,
            'download_url' => url("/api/admin/backup/download/{$filename}")
        ], 'Backup created successfully');
    }

    public function getBackups()
    {
        $backupDir = storage_path('app/backups');
        if (!file_exists($backupDir)) {
            return response()->json([]);
        }

        $files = array_diff(scandir($backupDir), ['.', '..']);
        $backups = [];

        foreach ($files as $file) {
            $filePath = $backupDir . '/' . $file;
            if (!is_file($filePath)) continue;

            $backups[] = [
                'filename' => $file,
                'size' => round(filesize($filePath) / 1024, 2) . ' KB',
                'created_at' => date('Y-m-d H:i:s', filemtime($filePath)),
                'download_url' => url("/api/admin/backup/download/{$file}")
            ];
        }

        usort($backups, function($a, $b) {
            return strtotime($b['created_at']) - strtotime($a['created_at']);
        });

        return response()->json($backups);
    }

    public function downloadBackup($filename)
    {
        $path = storage_path('app/backups/' . $filename);
        if (!file_exists($path)) {
            return $this->error('Backup file not found', 404);
        }

        return response()->download($path);
    }

    public function importBackup(Request $request)
    {
        try {
            $request->validate([
                'database' => 'required|file'
            ]);

            $file = $request->file('database');
            $path = $file->getRealPath();

            $host = config('database.connections.mysql.host');
            $user = config('database.connections.mysql.username');
            $pass = config('database.connections.mysql.password');
            $db   = config('database.connections.mysql.database');

            // 1. Drop all tables to ensure clean restoration
            DB::statement('SET FOREIGN_KEY_CHECKS = 0');
            $tables = DB::select('SHOW TABLES');
            foreach ($tables as $table) {
                $tableArray = (array)$table;
                $tableName = reset($tableArray);
                Schema::dropIfExists($tableName);
            }
            DB::statement('SET FOREIGN_KEY_CHECKS = 1');

            // 2. Redirect stderr to stdout to capture error messages
            $command = "mysql --skip-ssl -h {$host} -u {$user} -p'{$pass}' {$db} < {$path} 2>&1";
            
            exec($command, $output, $returnVar);

            if ($returnVar !== 0) {
                $errorMsg = implode("\n", $output);
                return $this->error('Failed to import database: ' . ($errorMsg ?: 'Unknown error (Return code: ' . $returnVar . ')'), 500);
            }

            // 3. Auto-update schema to ensure compatibility with current code
            $this->patchDatabaseSchema();

            return $this->success([], 'Database imported successfully');
        } catch (\Exception $e) {
            return $this->error('Import Exception: ' . $e->getMessage(), 500);
        }
    }

    public function updateUserAssignment(Request $request, $id)
    {
        $assignment = UserAssignment::findOrFail($id);
        $data = $request->validate([
            'year' => 'nullable|string',
            'section' => 'nullable|string',
            'section_id' => 'nullable|integer',
            'department' => 'nullable|string',
            'major' => 'nullable|string',
            'payment' => 'nullable|string',
            'amount_lacking' => 'nullable|numeric',
            'sanctions' => 'nullable|boolean',
            'sanction_reason' => 'nullable|string',
            'semester' => 'nullable|string',
            'student_status' => 'nullable|string',
        ]);

        if (isset($data['year'])) $assignment->year_level = $data['year'];
        if (array_key_exists('section', $data)) {
            $assignment->section = $data['section'];
            if (!empty($data['section'])) {
                $sectionId = Section::where('section_name', $data['section'])->value('id');
                if ($sectionId) {
                    $assignment->section_id = $sectionId;
                }
            } else {
                $assignment->section_id = null;
            }
        }
        if (isset($data['section_id'])) {
            $assignment->section_id = $data['section_id'];
            if (!array_key_exists('section', $data)) {
                $sectionName = Section::where('id', $data['section_id'])->value('section_name');
                if ($sectionName) {
                    $assignment->section = $sectionName;
                }
            }
        }
        if (isset($data['department'])) $assignment->department = $data['department'];
        if (isset($data['major'])) $assignment->major = $data['major'];
        if (isset($data['payment'])) $assignment->payment = $data['payment'];
        if (isset($data['amount_lacking'])) $assignment->amount_lacking = $data['amount_lacking'];
        if (isset($data['sanctions'])) $assignment->sanctions = $data['sanctions'];
        if (isset($data['sanction_reason'])) $assignment->sanction_reason = $data['sanction_reason'];
        if (isset($data['semester'])) $assignment->semester = $data['semester'];
        if (isset($data['student_status'])) $assignment->student_status = $data['student_status'];

        $assignment->save();
        $this->forgetCache([self::CACHE_KEY_SECTIONS, 'student:assignment:' . $assignment->user_id]);
        return $this->success([], 'Assignment updated');
    }

    // --- Section Assignment Management ---

    public function getSectionAssignments()
    {
        $assignments = DB::table('section_assignments')
            ->leftJoin('sections', 'section_assignments.section_id', '=', 'sections.id')
            ->leftJoin('buildings', 'section_assignments.building_id', '=', 'buildings.id')
            ->leftJoin('subjects', 'section_assignments.subject_id', '=', 'subjects.id')
            ->select(
                'section_assignments.id',
                'section_assignments.section_id',
                'section_assignments.school_year',
                'section_assignments.floor_number as floor',
                'section_assignments.room_number as room',
                'section_assignments.status',
                'sections.section_name as section',
                'sections.grade_level as year',
                'sections.course',
                'sections.major',
                'buildings.building_name as building',
                'subjects.subject_code',
                'subjects.subject_name'
            )
            ->get();
        return response()->json($assignments);
    }

    public function createSectionAssignment(Request $request)
    {
        $data = $request->validate([
            'section_id' => 'nullable|integer',
            'section' => 'nullable|string',
            'building_id' => 'nullable|integer',
            'building' => 'nullable|string',
            'floor' => 'nullable|integer',
            'room' => 'nullable|string',
            'school_year' => 'nullable|string',
            'subject_id' => 'nullable|integer',
        ]);

        $section = null;
        if (!empty($data['section_id'])) {
            $section = Section::find($data['section_id']);
        } elseif (!empty($data['section'])) {
            $section = Section::where('section_name', $data['section'])->first();
        }
        if (!$section) return $this->error('Section not found', 404);

        $building = null;
        if (!empty($data['building_id'])) {
            $building = Building::find($data['building_id']);
        } elseif (!empty($data['building'])) {
            $building = Building::where('building_name', $data['building'])->first();
        }
        if (!$building) return $this->error('Building not found', 404);

        $room = $data['room'] ?? null;
        $floor = $data['floor'] ?? null;
        if ($room === null || $room === '') {
            return $this->error('Room is required', 422);
        }
        if (!is_numeric($room)) {
            return $this->error('Room must be numeric', 422);
        }
        $room = (int)$room;
        if ($floor === null && $room !== null && is_numeric($room)) {
            $floor = (int)floor(((int)$room) / 100);
        }
        if ($floor === null) $floor = 1;
        $floor = (int)$floor;

        $schoolYear = $data['school_year'] ?? $section->school_year ?? (date('Y') . '-' . (date('Y') + 1));

        $conflict = DB::table('section_assignments')
            ->where('building_id', $building->id)
            ->where('floor_number', $floor)
            ->where('room_number', $room)
            ->where('school_year', $schoolYear)
            ->exists();
        if ($conflict) {
            return $this->error('Room already assigned for this school year', 409);
        }

        $existing = DB::table('section_assignments')
            ->where('section_id', $section->id)
            ->orderByDesc('id')
            ->first();

        $payload = [
            'section_id' => $section->id,
            'building_id' => $building->id,
            'floor_number' => $floor,
            'room_number' => $room,
            'school_year' => $schoolYear,
            'status' => 'active',
        ];
        if (!empty($data['subject_id'])) {
            $payload['subject_id'] = $data['subject_id'];
        }

        if ($existing) {
            DB::table('section_assignments')->where('id', $existing->id)->update($payload);
            $this->forgetCache([self::CACHE_KEY_SECTIONS, self::CACHE_KEY_SECTIONS_WITH_LOAD]);
            return $this->success(['id' => $existing->id], 'Section assignment updated');
        }

        $id = DB::table('section_assignments')->insertGetId($payload);
        $this->forgetCache([self::CACHE_KEY_SECTIONS, self::CACHE_KEY_SECTIONS_WITH_LOAD]);
        return $this->success(['id' => $id], 'Section assignment created', 201);
    }

    public function updateSectionAssignment(Request $request, $id)
    {
        $data = $request->validate([
            'building_id' => 'nullable|integer',
            'building' => 'nullable|string',
            'floor' => 'nullable|integer',
            'room' => 'nullable|string',
            'school_year' => 'nullable|string',
            'subject_id' => 'nullable|integer',
        ]);

        $assignment = DB::table('section_assignments')->where('id', $id)->first();
        if (!$assignment) return $this->error('Assignment not found', 404);

        $building = null;
        if (!empty($data['building_id'])) {
            $building = Building::find($data['building_id']);
        } elseif (!empty($data['building'])) {
            $building = Building::where('building_name', $data['building'])->first();
        }
        if (!$building) {
            $building = Building::find($assignment->building_id);
        }
        if (!$building) return $this->error('Building not found', 404);

        $room = $data['room'] ?? $assignment->room_number;
        $floor = $data['floor'] ?? $assignment->floor_number;
        if ($room === null || $room === '') {
            return $this->error('Room is required', 422);
        }
        if (!is_numeric($room)) {
            return $this->error('Room must be numeric', 422);
        }
        $room = (int)$room;
        if ($floor === null && $room !== null && is_numeric($room)) {
            $floor = (int)floor(((int)$room) / 100);
        }
        if ($floor === null) $floor = 1;
        $floor = (int)$floor;

        $schoolYear = $data['school_year'] ?? $assignment->school_year;

        $conflict = DB::table('section_assignments')
            ->where('id', '!=', $id)
            ->where('building_id', $building->id)
            ->where('floor_number', $floor)
            ->where('room_number', $room)
            ->where('school_year', $schoolYear)
            ->exists();
        if ($conflict) {
            return $this->error('Room already assigned for this school year', 409);
        }

        $payload = [
            'building_id' => $building->id,
            'floor_number' => $floor,
            'room_number' => $room,
            'school_year' => $schoolYear,
        ];
        if (!empty($data['subject_id'])) {
            $payload['subject_id'] = $data['subject_id'];
        }

        DB::table('section_assignments')->where('id', $id)->update($payload);
        $this->forgetCache([self::CACHE_KEY_SECTIONS, self::CACHE_KEY_SECTIONS_WITH_LOAD]);
        return $this->success([], 'Section assignment updated');
    }

    public function deleteSectionAssignment($id)
    {
        DB::table('section_assignments')->where('id', $id)->delete();
        $this->forgetCache([self::CACHE_KEY_SECTIONS, self::CACHE_KEY_SECTIONS_WITH_LOAD]);
        return $this->success([], 'Assignment deleted');
    }

    // --- Project Management ---

    public function getProjects()
    {
        return Cache::remember(self::CACHE_KEY_PROJECTS, self::CACHE_TTL_SECONDS, function () {
            $campus = \App\Models\CampusProject::orderBy('created_at', 'desc')->get()->map(function ($p) {
                return [
                    'id' => $p->id,
                    'name' => $p->name,
                    'status' => $p->status,
                    'budget' => $p->budget,
                    'start_date' => $p->start_date,
                    'started' => $p->start_date,
                    'description' => $p->description,
                ];
            });

            if ($campus->count() > 0) {
                return $campus;
            }

            return Project::with(['teacher', 'subject', 'section'])->get();
        });
    }

    public function createProject(Request $request)
    {
        if ($request->has('name') || $request->has('budget') || $request->has('started')) {
            $data = $request->validate([
                'name' => 'required|string',
                'status' => 'nullable|string',
                'budget' => 'nullable|string',
                'started' => 'nullable|date',
                'start_date' => 'nullable|date',
                'description' => 'nullable|string',
            ]);

            $project = \App\Models\CampusProject::create([
                'name' => $data['name'],
                'status' => $data['status'] ?? 'Ongoing',
                'budget' => $data['budget'] ?? null,
                'start_date' => $data['started'] ?? $data['start_date'] ?? null,
                'description' => $data['description'] ?? null,
            ]);

            $this->forgetCache([self::CACHE_KEY_PROJECTS, self::CACHE_KEY_DASHBOARD_STATS, 'student:campus_projects']);
            return $this->success(['id' => $project->id], 'Project created', 201);
        }

        $data = $request->validate([
            'title' => 'required|string',
            'description' => 'required|string',
            'teacher_id' => 'required|integer',
            'subject_id' => 'required|integer',
            'section_id' => 'required|integer',
            'due_date' => 'required|date',
            'max_score' => 'required|integer',
        ]);

        $project = Project::create($data);
        $this->forgetCache([self::CACHE_KEY_PROJECTS, self::CACHE_KEY_DASHBOARD_STATS, 'student:campus_projects']);
        return $this->success($project, 'Project created', 201);
    }

    public function updateProject(Request $request, $id)
    {
        $campus = \App\Models\CampusProject::find($id);
        if ($campus) {
            $data = $request->validate([
                'name' => 'required|string',
                'status' => 'nullable|string',
                'budget' => 'nullable|string',
                'started' => 'nullable|date',
                'start_date' => 'nullable|date',
                'description' => 'nullable|string',
            ]);

            $campus->update([
                'name' => $data['name'],
                'status' => $data['status'] ?? $campus->status,
                'budget' => $data['budget'] ?? $campus->budget,
                'start_date' => $data['started'] ?? $data['start_date'] ?? $campus->start_date,
                'description' => $data['description'] ?? $campus->description,
            ]);

            $this->forgetCache([self::CACHE_KEY_PROJECTS, 'student:campus_projects']);
            return $this->success(['id' => $campus->id], 'Project updated');
        }

        $project = Project::findOrFail($id);
        $data = $request->validate([
            'title' => 'required|string',
            'description' => 'required|string',
            'due_date' => 'required|date',
            'max_score' => 'required|integer',
        ]);

        $project->update($data);
        $this->forgetCache([self::CACHE_KEY_PROJECTS, 'student:campus_projects']);
        return $this->success($project, 'Project updated');
    }

    public function deleteProject($id)
    {
        $campus = \App\Models\CampusProject::find($id);
        if ($campus) {
            $campus->delete();
            $this->forgetCache([self::CACHE_KEY_PROJECTS, self::CACHE_KEY_DASHBOARD_STATS, 'student:campus_projects']);
            return $this->success([], 'Project deleted');
        }

        Project::findOrFail($id)->delete();
        $this->forgetCache([self::CACHE_KEY_PROJECTS, self::CACHE_KEY_DASHBOARD_STATS, 'student:campus_projects']);
        return $this->success([], 'Project deleted');
    }

    public function deleteGrade($id)
    {
        $grade = Grade::findOrFail($id);
        $grade->delete();
        $this->forgetCache([self::CACHE_KEY_ALL_GRADES, 'student:grades:' . $grade->student_id]);
        return $this->success([], 'Grade deleted');
    }

    // --- Study Load Management ---

    public function getStudyLoad()
    {
        $load = StudyLoad::with(['student', 'subject_ref'])->get();
        return response()->json($load);
    }

    public function getSectionsWithLoad()
    {
        $sections = Cache::remember(self::CACHE_KEY_SECTIONS_WITH_LOAD, self::CACHE_TTL_SECONDS, function () {
            $counts = StudyLoad::select('section_id', DB::raw('COUNT(*) as load_count'))
                ->groupBy('section_id')
                ->pluck('load_count', 'section_id');

            return Section::all()->map(function($s) use ($counts) {
                $count = (int)($counts[$s->id] ?? 0);
                return [
                    'id' => $s->id,
                    'section_name' => $s->section_name,
                    'grade_level' => $s->grade_level,
                    'school_year' => $s->school_year,
                    'course' => $s->course,
                    'major' => $s->major,
                    'subject_count' => $count,
                    'load_count' => $count,
                    'status' => $count > 0 ? 'Assigned' : 'Not Assigned',
                ];
            });
        });
        return response()->json($sections);
    }

    public function getSectionLoadDetails(Request $request)
    {
        $id = $request->query('id');
        $load = StudyLoad::where('section_id', $id)
            ->with(['student', 'subject_ref'])
            ->get()
            ->map(function ($sl) {
                $sl->semester = $this->formatSemesterLabel($this->normalizeSemester($sl->semester));
                return $sl;
            });
        return response()->json($load);
    }

    public function clearSectionLoad(Request $request)
    {
        $sectionId = $request->section_id;
        StudyLoad::where('section_id', $sectionId)->delete();
        $this->forgetCache([self::CACHE_KEY_SECTIONS_WITH_LOAD, self::CACHE_KEY_STUDY_LOAD_ALL, self::CACHE_KEY_DASHBOARD_STATS]);
        return $this->success([], 'Section load cleared');
    }

    public function createStudyLoad(Request $request)
    {
        $data = $request->validate([
            'student_id' => 'required|integer',
            'subject_id' => 'required|integer',
            'section_id' => 'required|integer',
            'school_year' => 'required|string',
            'semester' => 'required|string',
        ]);

        $load = StudyLoad::create($data);
        $this->forgetCache([self::CACHE_KEY_SECTIONS_WITH_LOAD, self::CACHE_KEY_STUDY_LOAD_ALL, self::CACHE_KEY_DASHBOARD_STATS]);
        return $this->success($load, 'Study load created', 201);
    }

    public function updateStudyLoad(Request $request, $id)
    {
        $load = StudyLoad::findOrFail($id);
        $data = $request->validate([
            'enrollment_status' => 'required|string',
        ]);

        $load->update($data);
        $this->forgetCache([self::CACHE_KEY_SECTIONS_WITH_LOAD, self::CACHE_KEY_STUDY_LOAD_ALL]);
        return $this->success($load, 'Study load updated');
    }

    public function deleteStudyLoad($id)
    {
        StudyLoad::findOrFail($id)->delete();
        $this->forgetCache([self::CACHE_KEY_SECTIONS_WITH_LOAD, self::CACHE_KEY_STUDY_LOAD_ALL, self::CACHE_KEY_DASHBOARD_STATS]);
        return $this->success([], 'Study load deleted');
    }

    // --- User Suggestions ---

    public function getUserSuggestions(Request $request)
    {
        $query = $request->query('q');
        $role = $request->query('role');

        $users = User::where('full_name', 'LIKE', "%{$query}%")
            ->orWhere('username', 'LIKE', "%{$query}%");
        
        if ($role) {
            $users->where('role', $role);
        }

        return response()->json($users->limit(10)->get());
    }

    // --- Evaluations ---

    public function getEvaluationSettings()
    {
        $settings = Cache::remember(self::CACHE_KEY_EVALUATION_SETTINGS, self::CACHE_TTL_SECONDS, function () {
            $settings = \App\Models\EvaluationSetting::all();
            $formatted = [];
            foreach ($settings as $s) {
                $formatted[$s->setting_key] = $s->setting_value;
            }
            return $formatted ?: (object)[];
        });
        return response()->json($settings);
    }

    public function updateEvaluationSettings(Request $request)
    {
        $data = $request->all();
        foreach ($data as $key => $value) {
            \App\Models\EvaluationSetting::updateOrCreate(
                ['setting_key' => $key],
                ['setting_value' => $value]
            );
        }
        $this->forgetCache([self::CACHE_KEY_EVALUATION_SETTINGS, 'student:eval_settings']);
        return $this->success([], 'Settings updated');
    }

    public function getLowestRatedTeachers()
    {
        $ratings = Cache::remember(self::CACHE_KEY_LOWEST_RATED, self::CACHE_TTL_SECONDS, function () {
            return DB::table('teacher_evaluations')
                ->join('users', 'teacher_evaluations.teacher_id', '=', 'users.id')
                ->select(
                    'users.id',
                    'users.full_name',
                    'users.image_path',
                    DB::raw('AVG(rating) as average_rating'),
                    DB::raw('COUNT(*) as total_evaluations')
                )
                ->groupBy('users.id', 'users.full_name', 'users.image_path')
                ->orderBy('average_rating', 'asc')
                ->limit(5)
                ->get()
                ->map(function ($r) {
                    $avg = (float)($r->average_rating ?? 0);
                    $r->percentage = $avg > 0 ? round(($avg / 5) * 100, 1) : 0;
                    return $r;
                });
        });
        return response()->json(['teachers' => $ratings]);
    }

    // --- Grades (Admin) ---

    public function getGrades()
    {
        $grades = Cache::remember(self::CACHE_KEY_ALL_GRADES, self::CACHE_TTL_SECONDS, function () {
            return Grade::with(['student', 'subject', 'section'])
                ->get()
                ->map(function ($g) {
                    return [
                        'id' => $g->id,
                        'user_id' => $g->student_id,
                        'username' => $g->student->username ?? null,
                        'student_name' => $g->student->full_name ?? $g->student->username ?? null,
                        'subject_id' => $g->subject_id,
                        'subject_code' => $g->subject?->subject_code,
                        'subject_name' => $g->subject?->subject_name,
                        'teacher_id' => $g->teacher_id,
                        'section_id' => $g->section_id,
                        'section_name' => $g->section?->section_name,
                        'year' => $g->section?->grade_level,
                        'school_year' => $g->school_year,
                        'semester' => $this->formatSemesterLabel($g->semester),
                        'prelim_grade' => $g->prelim_grade,
                        'midterm_grade' => $g->midterm_grade,
                        'finals_grade' => $g->finals_grade ?? $g->final_grade,
                        'final_grade' => $g->final_grade,
                        'remarks' => $g->remarks,
                    ];
                });
        });

        return response()->json($grades);
    }

    public function createGrade(Request $request)
    {
        $data = $request->validate([
            'student_id' => 'required|integer|exists:users,id',
            'subject_id' => 'required_without:subject_code|integer|exists:subjects,id',
            'subject_code' => 'required_without:subject_id|string|exists:subjects,subject_code',
            'teacher_id' => 'nullable|integer|exists:users,id',
            'section_id' => 'nullable|integer|exists:sections,id',
            'school_year' => 'nullable|string',
            'semester' => 'nullable|string',
            'prelim_grade' => 'nullable|numeric',
            'midterm_grade' => 'nullable|numeric',
            'finals_grade' => 'nullable|numeric',
            'final_grade' => 'nullable|numeric',
            'remarks' => 'nullable|string',
        ]);

        $subjectId = $data['subject_id'] ?? Subject::where('subject_code', $data['subject_code'])->value('id');
        if (!$subjectId) {
            return $this->error('Subject not found', 404);
        }

        $student = User::find($data['student_id']);
        if (!$student) {
            return $this->error('Student not found', 404);
        }

        $sectionId = $data['section_id'] ?? null;
        if (!$sectionId) {
            $ua = $student->assignments()->where('status', 'active')->first();
            if ($ua) {
                $sectionId = $ua->section_id;
                if (!$sectionId && $ua->section) {
                    $sectionId = Section::where('section_name', $ua->section)->value('id');
                }
            }
        }

        if (!$sectionId) {
            return $this->error('Could not determine student section', 400);
        }

        $teacherId = $data['teacher_id'] ?? null;
        if (!$teacherId) {
            $ta = TeacherAssignment::where('subject_id', $subjectId)
                ->where('section_id', $sectionId)
                ->where('status', 'active')
                ->first();
            if ($ta) {
                $teacherId = $ta->teacher_id;
            }
        }

        if (!$teacherId) {
            return $this->error('Teacher is required for grade creation', 400);
        }

        $schoolYear = $data['school_year'] ?? (date('Y') . '-' . (date('Y') + 1));
        $semester = $this->normalizeSemester($data['semester'] ?? null);

        $grade = Grade::updateOrCreate(
            [
                'student_id' => $student->id,
                'subject_id' => $subjectId,
                'school_year' => $schoolYear,
                'semester' => $semester,
            ],
            [
                'teacher_id' => $teacherId,
                'section_id' => $sectionId,
                'prelim_grade' => $data['prelim_grade'] ?? null,
                'midterm_grade' => $data['midterm_grade'] ?? null,
                'finals_grade' => $data['finals_grade'] ?? null,
                'final_grade' => $data['final_grade'] ?? null,
                'remarks' => $data['remarks'] ?? null,
            ]
        );

        $this->forgetCache([self::CACHE_KEY_ALL_GRADES, 'student:grades:' . $student->id]);
        return $this->success(['id' => $grade->id], 'Grade saved', 201);
    }

    public function updateGrade(Request $request, $id)
    {
        $grade = Grade::findOrFail($id);

        $data = $request->validate([
            'student_id' => 'nullable|integer|exists:users,id',
            'subject_id' => 'nullable|integer|exists:subjects,id',
            'subject_code' => 'nullable|string|exists:subjects,subject_code',
            'teacher_id' => 'nullable|integer|exists:users,id',
            'section_id' => 'nullable|integer|exists:sections,id',
            'school_year' => 'nullable|string',
            'semester' => 'nullable|string',
            'prelim_grade' => 'nullable|numeric',
            'midterm_grade' => 'nullable|numeric',
            'finals_grade' => 'nullable|numeric',
            'final_grade' => 'nullable|numeric',
            'remarks' => 'nullable|string',
        ]);

        if (!empty($data['subject_code']) && empty($data['subject_id'])) {
            $data['subject_id'] = Subject::where('subject_code', $data['subject_code'])->value('id');
        }
        unset($data['subject_code']);

        if (!empty($data['semester'])) {
            $data['semester'] = $this->normalizeSemester($data['semester']);
        }

        $grade->update($data);
        $this->forgetCache([self::CACHE_KEY_ALL_GRADES, 'student:grades:' . $grade->student_id]);
        return $this->success([], 'Grade updated');
    }

    private function resolveSectionRoom($sectionId, $roomId = null)
    {
        $assignment = null;
        if (!empty($roomId)) {
            $assignment = DB::table('section_assignments')->where('id', $roomId)->first();
        }
        if (!$assignment && !empty($sectionId)) {
            $assignment = DB::table('section_assignments')
                ->where('section_id', $sectionId)
                ->orderByDesc('id')
                ->first();
        }
        if (!$assignment) {
            return ['building' => null, 'room' => null, 'floor' => null];
        }

        $buildingName = DB::table('buildings')->where('id', $assignment->building_id)->value('building_name');

        return [
            'building' => $buildingName,
            'room' => $assignment->room_number,
            'floor' => $assignment->floor_number,
        ];
    }

    private function ensureStudyLoad(Section $section, Subject $subject, ?TeacherAssignment $ta = null, $semesterValue = null)
    {
        $normalizedSemester = $this->normalizeSemester($semesterValue ?? ($ta->semester ?? ($subject->semester ?? '1st')));
        $semesterLabel = $this->formatSemesterLabel($normalizedSemester);

        $existing = StudyLoad::where('section_id', $section->id)
            ->where('subject_id', $subject->id)
            ->where('semester', $semesterLabel)
            ->first();
        if ($existing) return $existing;

        if ($ta) {
            $ta->loadMissing('teacher');
        }

        return StudyLoad::create([
            'course' => $section->course ?? null,
            'major' => $section->major ?? null,
            'year_level' => $section->grade_level ?? null,
            'section' => $section->section_name,
            'subject_code' => $subject->subject_code,
            'subject_title' => $subject->subject_name ?? $subject->title,
            'units' => $subject->units ?? null,
            'semester' => $semesterLabel,
            'teacher' => $ta?->teacher?->full_name ?? null,
            'subject_id' => $subject->id,
            'section_id' => $section->id,
            'school_year' => $section->school_year ?? (date('Y') . '-' . (date('Y') + 1)),
        ]);
    }

    private function upsertSectionRoomAssignment(Section $section, string $buildingName, $room, $schoolYear = null)
    {
        if ($room === null || $room === '') {
            return ['error' => true, 'status' => 422, 'message' => 'Room is required'];
        }
        if (!is_numeric($room)) {
            return ['error' => true, 'status' => 422, 'message' => 'Room must be numeric'];
        }
        $room = (int)$room;

        $building = Building::where('building_name', $buildingName)->first();
        if (!$building) {
            return ['error' => true, 'status' => 404, 'message' => 'Building not found'];
        }

        $floor = null;
        if (is_numeric($room)) {
            $floor = (int)floor(((int)$room) / 100);
        }
        if ($floor === null || $floor === 0) $floor = 1;
        $floor = (int)$floor;

        $schoolYear = $schoolYear ?? $section->school_year ?? (date('Y') . '-' . (date('Y') + 1));

        $conflict = DB::table('section_assignments')
            ->where('building_id', $building->id)
            ->where('floor_number', $floor)
            ->where('room_number', $room)
            ->where('school_year', $schoolYear)
            ->where('section_id', '!=', $section->id)
            ->exists();
        if ($conflict) {
            return ['error' => true, 'status' => 409, 'message' => 'Room already assigned for this school year'];
        }

        $existing = DB::table('section_assignments')
            ->where('section_id', $section->id)
            ->orderByDesc('id')
            ->first();

        $payload = [
            'section_id' => $section->id,
            'building_id' => $building->id,
            'floor_number' => $floor,
            'room_number' => $room,
            'school_year' => $schoolYear,
            'status' => 'active',
        ];

        if ($existing) {
            DB::table('section_assignments')->where('id', $existing->id)->update($payload);
            return ['error' => false, 'id' => $existing->id];
        }

        $id = DB::table('section_assignments')->insertGetId($payload);
        return ['error' => false, 'id' => $id];
    }

    private function normalizeSemester($semester)
    {
        if (!$semester) {
            return '1st';
        }

        $value = strtolower(trim($semester));
        if (in_array($value, ['2nd', 'second', 'second semester', '2nd semester', 'second-semester', '2nd_semester'], true)) {
            return '2nd';
        }
        if (in_array($value, ['summer', 'summer semester'], true)) {
            return 'summer';
        }
        if (in_array($value, ['1st', 'first', 'first semester', '1st semester', 'first-semester', '1st_semester'], true)) {
            return '1st';
        }

        return $semester;
    }

    private function formatSemesterLabel($semester)
    {
        if ($semester === '2nd') {
            return 'Second Semester';
        }
        if ($semester === 'summer') {
            return 'Summer';
        }
        return 'First Semester';
    }

    private function forgetCache(array $keys)
    {
        foreach ($keys as $key) {
            Cache::forget($key);
        }
    }

    private function normalizeRoles($rolesInput, ?string $fallbackRole = null): array
    {
        $allowed = ['admin', 'teacher', 'nt', 'student'];
        $roles = [];

        if (is_string($rolesInput)) {
            $roles = [$rolesInput];
        } elseif (is_array($rolesInput)) {
            $roles = $rolesInput;
        } elseif ($fallbackRole) {
            $roles = [$fallbackRole];
        }

        $roles = array_values(array_unique(array_filter(array_map(function ($role) {
            return strtolower(trim((string)$role));
        }, $roles))));

        $roles = array_values(array_intersect($allowed, $roles));

        if (empty($roles) && $fallbackRole) {
            $fallback = strtolower(trim($fallbackRole));
            if (in_array($fallback, $allowed, true)) {
                $roles = [$fallback];
            }
        }

        if (empty($roles)) {
            $roles = ['student'];
        }

        $priority = array_flip($allowed);
        usort($roles, function ($a, $b) use ($priority) {
            return $priority[$a] <=> $priority[$b];
        });

        return $roles;
    }

    // --- Cleanup Tool ---

    public function cleanupPictures()
    {
        $files = glob(public_path('uploads/profiles/*'));
        $users = User::select('id', 'image_path')->get();
        $validIds = $users->pluck('id')->map(fn ($id) => (string)$id)->toArray();
        $usedFiles = $users->pluck('image_path')->filter()->toArray();
        $deletedFiles = [];

        foreach ($files as $file) {
            $basename = basename($file);
            $relative = '/uploads/profiles/' . $basename;
            $idPart = pathinfo($basename, PATHINFO_FILENAME);

            if (in_array($relative, $usedFiles, true)) {
                continue;
            }

            if (!ctype_digit($idPart) || !in_array($idPart, $validIds, true)) {
                @unlink($file);
                $deletedFiles[] = $basename;
            }
        }

        return $this->success([
            'deleted' => count($deletedFiles),
            'total_users' => $users->count(),
            'files' => $deletedFiles,
        ], 'Cleanup completed');
    }

    /**
     * Patch the database schema to ensure all required columns exist.
     * This handles cases where an old backup is imported.
     */
    public function patchDatabaseSchema()
    {
        $this->ensureCacheTable();

        if (!Schema::hasTable('buildings')) {
            $this->ensureBuildingsTable();
        }

        $tables = [
            'users', 'sections', 'subjects', 'buildings', 'rooms', 
            'user_assignments', 'teacher_assignments', 'schedules', 
            'grades', 'campus_projects', 'teacher_evaluations', 
            'attendance_logs', 'announcements', 'study_load', 'evaluation_settings',
            'projects', 'section_assignments'
        ];

        foreach ($tables as $table) {
            if (Schema::hasTable($table)) {
                try {
                    // Check if ID is primary key
                    $primaryKey = DB::select("SHOW KEYS FROM {$table} WHERE Key_name = 'PRIMARY'");
                    if (empty($primaryKey)) {
                        // Check if id column exists first
                        if (Schema::hasColumn($table, 'id')) {
                            DB::statement("ALTER TABLE {$table} MODIFY COLUMN id INT AUTO_INCREMENT PRIMARY KEY");
                        } else {
                            DB::statement("ALTER TABLE {$table} ADD COLUMN id INT AUTO_INCREMENT PRIMARY KEY FIRST");
                        }
                    }
                } catch (\Exception $e) {
                    // Ignore errors if already primary or something else went wrong
                }
            }
        }

        // Specific fixes for user_assignments
        if (Schema::hasTable('user_assignments')) {
            Schema::table('user_assignments', function (\Illuminate\Database\Schema\Blueprint $table) {
                if (!Schema::hasColumn('user_assignments', 'section_id')) $table->integer('section_id')->nullable();
                if (!Schema::hasColumn('user_assignments', 'year_level')) $table->string('year_level')->nullable();
                if (!Schema::hasColumn('user_assignments', 'section')) $table->string('section')->nullable();
                if (!Schema::hasColumn('user_assignments', 'department')) $table->string('department')->nullable();
                if (!Schema::hasColumn('user_assignments', 'major')) $table->string('major')->nullable();
                if (!Schema::hasColumn('user_assignments', 'payment')) $table->string('payment')->default('paid');
                if (!Schema::hasColumn('user_assignments', 'amount_lacking')) $table->decimal('amount_lacking', 10, 2)->default(0);
                if (!Schema::hasColumn('user_assignments', 'sanctions')) $table->boolean('sanctions')->default(false);
                if (!Schema::hasColumn('user_assignments', 'sanction_reason')) $table->text('sanction_reason')->nullable();
                if (!Schema::hasColumn('user_assignments', 'semester')) $table->string('semester')->default('1st Semester');
                if (!Schema::hasColumn('user_assignments', 'student_status')) $table->string('student_status')->default('Regular');
            });

            if (Schema::hasTable('sections')) {
                $needsSectionId = DB::table('user_assignments')
                    ->whereNull('section_id')
                    ->whereNotNull('section')
                    ->where('section', '!=', '')
                    ->limit(1)
                    ->exists();

                if ($needsSectionId) {
                    $sections = Section::select('id', 'section_name')->get()->keyBy('section_name');
                    $rows = DB::table('user_assignments')
                        ->whereNull('section_id')
                        ->whereNotNull('section')
                        ->where('section', '!=', '')
                        ->get(['id', 'section']);

                    foreach ($rows as $row) {
                        $section = $sections[$row->section] ?? null;
                        if ($section) {
                            DB::table('user_assignments')
                                ->where('id', $row->id)
                                ->update(['section_id' => $section->id]);
                        }
                    }
                }

                $needsSectionName = DB::table('user_assignments')
                    ->whereNotNull('section_id')
                    ->where(function ($q) {
                        $q->whereNull('section')->orWhere('section', '');
                    })
                    ->limit(1)
                    ->exists();

                if ($needsSectionName) {
                    $sectionMap = Section::select('id', 'section_name', 'grade_level', 'course', 'major')
                        ->get()
                        ->keyBy('id');

                    $rows = DB::table('user_assignments')
                        ->whereNotNull('section_id')
                        ->where(function ($q) {
                            $q->whereNull('section')->orWhere('section', '')
                                ->orWhereNull('year_level')->orWhere('year_level', '')
                                ->orWhereNull('department')->orWhere('department', '')
                                ->orWhereNull('major')->orWhere('major', '');
                        })
                        ->get(['id', 'section_id', 'section', 'year_level', 'department', 'major']);

                    foreach ($rows as $row) {
                        $section = $sectionMap[$row->section_id] ?? null;
                        if (!$section) {
                            continue;
                        }

                        $updates = [];
                        if (empty($row->section)) {
                            $updates['section'] = $section->section_name;
                        }
                        if (empty($row->year_level) && !empty($section->grade_level)) {
                            $updates['year_level'] = $section->grade_level;
                        }
                        if (empty($row->department) && !empty($section->course)) {
                            $updates['department'] = $section->course;
                        }
                        if (empty($row->major) && !empty($section->major)) {
                            $updates['major'] = $section->major;
                        }

                        if (!empty($updates)) {
                            DB::table('user_assignments')->where('id', $row->id)->update($updates);
                        }
                    }
                }
            }
        }

        // Specific fixes for users (gender)
        if (Schema::hasTable('users')) {
            Schema::table('users', function (\Illuminate\Database\Schema\Blueprint $table) {
                if (!Schema::hasColumn('users', 'gender')) $table->string('gender')->nullable();
            });
        }

        // Specific fixes for sections (course/major metadata)
        if (Schema::hasTable('sections')) {
            Schema::table('sections', function (\Illuminate\Database\Schema\Blueprint $table) {
                if (!Schema::hasColumn('sections', 'course')) $table->string('course')->nullable();
                if (!Schema::hasColumn('sections', 'major')) $table->string('major')->nullable();
            });
        }

        // Specific fixes for section_assignments (to support subject linking)
        if (Schema::hasTable('section_assignments')) {
            Schema::table('section_assignments', function (\Illuminate\Database\Schema\Blueprint $table) {
                if (!Schema::hasColumn('section_assignments', 'subject_id')) $table->integer('subject_id')->nullable();
            });
        }

        if (Schema::hasTable('study_load')) {
            Schema::table('study_load', function (\Illuminate\Database\Schema\Blueprint $table) {
                if (!Schema::hasColumn('study_load', 'course')) $table->string('course')->nullable();
                if (!Schema::hasColumn('study_load', 'major')) $table->string('major')->nullable();
                if (!Schema::hasColumn('study_load', 'year_level')) $table->integer('year_level')->nullable();
                if (!Schema::hasColumn('study_load', 'section')) $table->string('section')->nullable();
                if (!Schema::hasColumn('study_load', 'subject_code')) $table->string('subject_code')->nullable();
                if (!Schema::hasColumn('study_load', 'subject_title')) $table->string('subject_title')->nullable();
                if (!Schema::hasColumn('study_load', 'units')) $table->decimal('units', 3, 1)->nullable();
                if (!Schema::hasColumn('study_load', 'teacher')) $table->string('teacher')->nullable();
            });

            try {
                $columns = collect(DB::select(
                    "SELECT COLUMN_NAME, IS_NULLABLE, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'study_load'"
                ))->keyBy('COLUMN_NAME');

                $alterParts = [];
                foreach (['student_id', 'subject_id', 'section_id'] as $col) {
                    if (isset($columns[$col]) && $columns[$col]->IS_NULLABLE === 'NO') {
                        $alterParts[] = "MODIFY {$col} INT NULL";
                    }
                }
                if (isset($columns['semester']) && $columns['semester']->DATA_TYPE !== 'varchar') {
                    $alterParts[] = "MODIFY semester VARCHAR(50) NULL";
                }
                if (!empty($alterParts)) {
                    DB::statement("ALTER TABLE study_load " . implode(', ', $alterParts));
                }
            } catch (\Exception $e) {
                // Ignore if database doesn't support information_schema in this context
            }
        }

        if (Schema::hasTable('study_load') && Schema::hasTable('sections')) {
            $needsStudySectionId = DB::table('study_load')
                ->whereNull('section_id')
                ->whereNotNull('section')
                ->where('section', '!=', '')
                ->limit(1)
                ->exists();

            if ($needsStudySectionId) {
                $sections = Section::select('id', 'section_name')->get()->keyBy('section_name');
                $rows = DB::table('study_load')
                    ->whereNull('section_id')
                    ->whereNotNull('section')
                    ->where('section', '!=', '')
                    ->get(['id', 'section']);

                foreach ($rows as $row) {
                    $section = $sections[$row->section] ?? null;
                    if ($section) {
                        DB::table('study_load')
                            ->where('id', $row->id)
                            ->update(['section_id' => $section->id]);
                    }
                }
            }

            $needsStudySectionName = DB::table('study_load')
                ->whereNotNull('section_id')
                ->where(function ($q) {
                    $q->whereNull('section')->orWhere('section', '')
                        ->orWhereNull('year_level')->orWhere('year_level', '')
                        ->orWhereNull('course')->orWhere('course', '')
                        ->orWhereNull('major')->orWhere('major', '');
                })
                ->limit(1)
                ->exists();

            if ($needsStudySectionName) {
                $sectionMap = Section::select('id', 'section_name', 'grade_level', 'course', 'major')
                    ->get()
                    ->keyBy('id');

                $rows = DB::table('study_load')
                    ->whereNotNull('section_id')
                    ->where(function ($q) {
                        $q->whereNull('section')->orWhere('section', '')
                            ->orWhereNull('year_level')->orWhere('year_level', '')
                            ->orWhereNull('course')->orWhere('course', '')
                            ->orWhereNull('major')->orWhere('major', '');
                    })
                    ->get(['id', 'section_id', 'section', 'year_level', 'course', 'major']);

                foreach ($rows as $row) {
                    $section = $sectionMap[$row->section_id] ?? null;
                    if (!$section) {
                        continue;
                    }

                    $updates = [];
                    if (empty($row->section)) {
                        $updates['section'] = $section->section_name;
                    }
                    if (empty($row->year_level) && !empty($section->grade_level)) {
                        $updates['year_level'] = $section->grade_level;
                    }
                    if (empty($row->course) && !empty($section->course)) {
                        $updates['course'] = $section->course;
                    }
                    if (empty($row->major) && !empty($section->major)) {
                        $updates['major'] = $section->major;
                    }

                    if (!empty($updates)) {
                        DB::table('study_load')->where('id', $row->id)->update($updates);
                    }
                }
            }
        }

        // Fix projects table if missing timestamps or other columns
        if (Schema::hasTable('projects')) {
            Schema::table('projects', function (\Illuminate\Database\Schema\Blueprint $table) {
                if (!Schema::hasColumn('projects', 'status')) $table->string('status')->default('active');
                if (!Schema::hasColumn('projects', 'created_at')) $table->timestamps();
            });
        }
    }

    private function ensureCacheTable(): void
    {
        if (Schema::hasTable('cache')) {
            return;
        }

        Schema::create('cache', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->mediumText('value');
            $table->integer('expiration');
            $table->index('expiration');
        });
    }

    private function ensureBuildingsTable(): void
    {
        if (Schema::hasTable('buildings')) {
            return;
        }
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
}
