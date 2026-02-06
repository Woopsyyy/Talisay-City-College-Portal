<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\UserAssignment;
use App\Models\StudyLoad;
use App\Models\Grade;
use App\Models\Announcement;
use App\Models\Project;
use App\Models\TeacherEvaluation;
use App\Models\EvaluationSetting;
use App\Models\Section;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;

class StudentController extends Controller
{
    private const CACHE_TTL_SECONDS = 120;

    public function getAssignment()
    {
        $userId = Auth::id();
        $cacheKey = 'student:assignment:' . $userId;
        return Cache::remember($cacheKey, self::CACHE_TTL_SECONDS, function () use ($userId) {
            $user = User::find($userId);
            $assignment = UserAssignment::with('section_ref')
                ->where('user_id', $userId)
                ->where('status', 'active')
                ->first();
    
            if (!$assignment) return null;
    
            $sectionId = $assignment->section_id ?? $assignment->section_ref?->id;
            $sectionName = $assignment->section_ref?->section_name ?? $assignment->section;
            if (!$sectionId && $sectionName) {
                $sectionId = Section::where('section_name', $sectionName)->value('id');
            }
            if (!$sectionName && $sectionId) {
                $sectionName = Section::where('id', $sectionId)->value('section_name');
            }
    
            $roomInfo = $this->resolveSectionRoom($sectionId);
            $sectionMeta = $assignment->section_ref ?? ($sectionId ? Section::find($sectionId) : null);
            $schoolYear = $assignment->section_ref?->school_year ?? ($sectionMeta?->school_year);
            $yearLevel = $assignment->year_level ?? ($sectionMeta?->grade_level);
            $department = $assignment->department ?? ($sectionMeta?->course);
            $major = $assignment->major ?? ($sectionMeta?->major);
    
            return [
                'id' => $assignment->id,
                'year' => $yearLevel,
                'year_level' => $yearLevel,
                'grade_level' => $yearLevel,
                'section' => $sectionName,
                'section_name' => $sectionName,
                'section_id' => $sectionId,
                'department' => $department,
                'major' => $major,
                'payment' => $assignment->payment,
                'amount_lacking' => $assignment->amount_lacking,
                'sanctions' => $assignment->sanctions,
                'sanction_reason' => $assignment->sanction_reason,
                'student_status' => $assignment->student_status,
                'semester' => $assignment->semester,
                'school_year' => $schoolYear,
                'gender' => $user?->gender,
                'building' => $roomInfo['building'] ?? null,
                'floor' => $roomInfo['floor'] ?? null,
                'room' => $roomInfo['room'] ?? null,
            ];
        });
    }

    public function getStudyLoad(Request $request)
    {
        $userId = Auth::id();
        $assignment = UserAssignment::where('user_id', $userId)->where('status', 'active')->first();

        if (!$assignment) return response()->json([]);

        $semester = $request->query('semester', $assignment->semester ?? '1st Semester');
        $cacheKey = 'student:study_load:' . $userId . ':' . md5((string)$semester);

        $load = Cache::remember($cacheKey, self::CACHE_TTL_SECONDS, function () use ($assignment, $semester) {
            $sectionId = $assignment->section_id;
            $sectionName = $assignment->section;
            if (!$sectionId && $sectionName) {
                $sectionId = Section::where('section_name', $sectionName)->value('id');
            }
            if (!$sectionName && $sectionId) {
                $sectionName = Section::where('id', $sectionId)->value('section_name');
            }

            // Fetch from StudyLoad table (equivalent to section_subjects)
            $query = StudyLoad::query();
            if ($sectionId) {
                $query->where(function ($q) use ($sectionId, $sectionName) {
                    $q->where('section_id', $sectionId);
                    if ($sectionName) {
                        $q->orWhere('section', $sectionName);
                    }
                });
            } else {
                $query->where('section', $sectionName);
            }

            if ($semester !== 'all') {
                $variants = $this->semesterVariants($semester);
                $query->where(function($q) use ($variants) {
                    if (!empty($variants)) {
                        $q->whereIn('semester', $variants)
                            ->orWhereNull('semester')
                            ->orWhere('semester', '');
                        return;
                    }
                    $q->whereNull('semester')->orWhere('semester', '');
                });
            }

            return $query->orderBy('subject_code')->get()->map(function($sl) {
                return [
                    'subject_code' => $sl->subject_code,
                    'subject_title' => $sl->subject_title,
                    'units' => (float)$sl->units,
                    'semester' => $sl->semester,
                    'teacher' => $sl->teacher ?? 'TBA',
                ];
            });
        });

        return response()->json($load);
    }

    public function getGrades()
    {
        $userId = Auth::id();
        $cacheKey = 'student:grades:' . $userId;
        $grades = Cache::remember($cacheKey, self::CACHE_TTL_SECONDS, function () use ($userId) {
            return Grade::with(['subject', 'section', 'teacher'])
                ->where('student_id', $userId)
                ->get()
                ->map(function($g) {
                    $section = $g->section;
                    return [
                        'id' => $g->id,
                        'subject_code' => $g->subject?->subject_code ?? '',
                        'subject_name' => $g->subject?->subject_name ?? '',
                        'subject' => $g->subject?->subject_name ?? '',
                        'prelim_grade' => $g->prelim_grade,
                        'midterm_grade' => $g->midterm_grade,
                        'finals_grade' => $g->finals_grade ?? $g->final_grade,
                        'final_grade' => $g->final_grade,
                        'remarks' => $g->remarks,
                        'semester' => $g->semester,
                        'school_year' => $g->school_year,
                        'year' => $section?->grade_level ?? null,
                        'instructor' => $g->teacher?->full_name ?? $g->teacher?->username ?? null,
                    ];
                });
        });

        return response()->json($grades);
    }

    public function getAnnouncements()
    {
        $user = Auth::user();
        $role = $user->role;

        $cacheKey = 'student:announcements:' . $user->id . ':' . $role;
        $announcements = Cache::remember($cacheKey, self::CACHE_TTL_SECONDS, function () use ($user, $role) {
            // Get student's department and year if they are a student
            $assignment = null;
            if ($role === 'student') {
                $assignment = UserAssignment::where('user_id', $user->id)->where('status', 'active')->first();
            }

            $query = Announcement::where(function($q) use ($role) {
                    $q->where('target_role', $role)->orWhere('target_role', 'all');
                })
                ->where('is_published', true)
                ->where(function($q) {
                    $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
                });

            // If it's a student, filter by their department and year if the announcement has them set
            if ($assignment) {
                $query->where(function($q) use ($assignment) {
                    // Show if no specific department/year is set (Global)
                    $q->where(function($sub) {
                        $sub->whereNull('department')->orWhere('department', '');
                    });
                    
                    // OR show if it matches student's department
                    if ($assignment->department) {
                        $q->orWhere('department', $assignment->department);
                    }
                });

                $query->where(function($q) use ($assignment) {
                    // Show if no specific year is set
                    $q->where(function($sub) {
                        $sub->whereNull('year')->orWhere('year', '');
                    });

                    // OR show if it matches student's year level
                    if ($assignment->year_level) {
                        $q->orWhere('year', $assignment->year_level);
                    }
                });
            }

            return $query->orderBy('priority', 'desc')
                ->orderBy('published_at', 'desc')
                ->get();
        });

        return response()->json($announcements);
    }
    public function getProjects()
    {
        $userId = Auth::id();
        $assignment = UserAssignment::where('user_id', $userId)->where('status', 'active')->first();
        if (!$assignment) return response()->json([]);

        $section = null;
        if ($assignment->section_id) {
            $section = Section::find($assignment->section_id);
        }
        if (!$section && $assignment->section) {
            $section = Section::where('section_name', $assignment->section)->first();
        }
        if (!$section) return response()->json([]);

        $cacheKey = 'student:projects:' . $userId . ':' . $section->id;
        $projects = Cache::remember($cacheKey, self::CACHE_TTL_SECONDS, function () use ($section) {
            return Project::with(['teacher', 'subject', 'section'])
                ->where('section_id', $section->id)
                ->where('status', 'active')
                ->orderBy('due_date', 'asc')
                ->get();
        });

        return response()->json($projects);
    }

    public function getCampusProjects()
    {
        $projects = Cache::remember('student:campus_projects', self::CACHE_TTL_SECONDS, function () {
            return \App\Models\CampusProject::orderBy('created_at', 'desc')->get();
        });
        return response()->json($projects);
    }

    public function getEvaluationSettings()
    {
        $settings = Cache::remember('student:eval_settings', self::CACHE_TTL_SECONDS, function () {
            $settings = EvaluationSetting::all();
            $formatted = [];
            foreach ($settings as $s) {
                $formatted[$s->setting_key] = $s->setting_value;
            }
            return $formatted ?: (object)[];
        });
        return response()->json($settings);
    }

    public function getEvaluationTeachers()
    {
        $userId = Auth::id();
        $cacheKey = 'student:eval_teachers:' . $userId;
        $teachers = Cache::remember($cacheKey, self::CACHE_TTL_SECONDS, function () use ($userId) {
            $assignment = UserAssignment::where('user_id', $userId)->where('status', 'active')->first();
            if (!$assignment) return [];
    
            $section = null;
            if ($assignment->section_id) {
                $section = Section::find($assignment->section_id);
            }
            if (!$section && $assignment->section) {
                $section = Section::where('section_name', $assignment->section)->first();
            }
            if (!$section) return [];
    
            // Get teachers assigned to this student's section
            $teachers = \App\Models\TeacherAssignment::with('teacher')
                ->where('section_id', $section->id)
                ->where('status', 'active')
                ->get()
                ->pluck('teacher')
                ->unique('id')
                ->values();
    
            // Check which ones have been evaluated - Optimized
            $evaluatedTeacherIds = TeacherEvaluation::where('student_id', $userId)
                ->whereIn('teacher_id', $teachers->pluck('id'))
                ->pluck('teacher_id')
                ->toArray();
    
            foreach ($teachers as $t) {
                $t->is_evaluated = in_array($t->id, $evaluatedTeacherIds);
            }
    
            return $teachers;
        });

        return response()->json($teachers);
    }

    public function getEvaluation(Request $request)
    {
        $teacherId = $request->query('teacher_id');
        $studentId = Auth::id();

        $eval = TeacherEvaluation::where('student_id', $studentId)
            ->where('teacher_id', $teacherId)
            ->first();

        return response()->json($eval);
    }

    public function submitEvaluation(Request $request)
    {
        $data = $request->validate([
            'teacher_id' => 'required|integer',
            'rating' => 'required|numeric|min:1|max:5',
            'comment' => 'nullable|string',
            'semester' => 'nullable|string',
        ]);

        $studentId = Auth::id();

        // Prevent double evaluation
        if (TeacherEvaluation::where('student_id', $studentId)->where('teacher_id', $data['teacher_id'])->exists()) {
            return $this->error('You have already evaluated this teacher', 409);
        }

        $eval = TeacherEvaluation::create([
            'student_id' => $studentId,
            'teacher_id' => $data['teacher_id'],
            'rating' => $data['rating'],
            'comment' => $data['comment'] ?? '',
            'semester' => $data['semester'] ?? '1st Semester',
        ]);

        return $this->success($eval, 'Evaluation submitted successfully');
    }

    private function resolveSectionRoom($sectionId)
    {
        if (empty($sectionId)) {
            return ['building' => null, 'room' => null, 'floor' => null];
        }

        $assignment = \Illuminate\Support\Facades\DB::table('section_assignments')
            ->where('section_id', $sectionId)
            ->orderByDesc('id')
            ->first();

        if (!$assignment) {
            return ['building' => null, 'room' => null, 'floor' => null];
        }

        $buildingName = \Illuminate\Support\Facades\DB::table('buildings')
            ->where('id', $assignment->building_id)
            ->value('building_name');

        return [
            'building' => $buildingName,
            'room' => $assignment->room_number,
            'floor' => $assignment->floor_number,
        ];
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

    private function semesterVariants($semester)
    {
        if ($semester === null) {
            return [];
        }

        $normalized = $this->normalizeSemester($semester);
        if ($normalized === '2nd') {
            $variants = [
                '2nd', '2nd Semester', 'Second Semester', 'second semester',
                'second', 'Second', '2nd_semester', '2nd-semester', 'second_semester', 'second-semester',
            ];
        } elseif ($normalized === 'summer') {
            $variants = ['summer', 'Summer', 'Summer Semester', 'summer semester'];
        } else {
            $variants = [
                '1st', '1st Semester', 'First Semester', 'first semester',
                'first', 'First', '1st_semester', '1st-semester', 'first_semester', 'first-semester',
            ];
        }

        return array_values(array_unique(array_filter($variants, function ($value) {
            return $value !== null && $value !== '';
        })));
    }
}
