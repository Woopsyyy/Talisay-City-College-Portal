<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Section;
use App\Models\Subject;
use App\Models\TeacherAssignment;
use App\Models\Grade;
use App\Models\Announcement;
use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;

class TeacherController extends Controller
{
    private const CACHE_TTL_SECONDS = 120;

    public function getAssignments()
    {
        $teacherId = Auth::id();
        $cacheKey = 'teacher:assignments:' . $teacherId;
        $assignments = Cache::remember($cacheKey, self::CACHE_TTL_SECONDS, function () use ($teacherId) {
            return TeacherAssignment::with(['subject', 'section_ref'])
                ->where('teacher_id', $teacherId)
                ->where('status', 'active')
                ->get()
                ->map(function($ta) {
                    return [
                        'id' => $ta->id,
                        'subject_code' => $ta->subject->subject_code ?? '',
                        'subject_name' => $ta->subject->subject_name ?? '',
                        'section_name' => $ta->section_ref->section_name ?? $ta->section ?? '',
                        'grade_level' => $ta->section_ref->grade_level ?? '',
                    ];
                });
        });

        return response()->json($assignments);
    }

    public function getGrades(Request $request)
    {
        $sectionName = $request->query('section');
        $subjectCode = $request->query('subject');

        if (!$sectionName || !$subjectCode) return response()->json([]);

        $section = Section::where('section_name', $sectionName)->first();
        $subject = Subject::where('subject_code', $subjectCode)->first();

        if (!$section || !$subject) return response()->json([]);

        $grades = Grade::where('section_id', $section->id)
            ->where('subject_id', $subject->id)
            ->get()
            ->keyBy('student_id')
            ->map(function($g) {
                return [
                    'student_id' => $g->student_id,
                    'prelim_grade' => $g->prelim_grade,
                    'midterm_grade' => $g->midterm_grade,
                    'finals_grade' => $g->finals_grade ?? $g->final_grade,
                ];
            });

        return response()->json($grades);
    }

    public function saveGrade(Request $request)
    {
        $data = $request->validate([
            'student_id' => 'required|integer',
            'subject' => 'required|string', # subject_code
            'prelim' => 'nullable|numeric',
            'midterm' => 'nullable|numeric',
            'finals' => 'nullable|numeric',
        ]);

        $subject = Subject::where('subject_code', $data['subject'])->first();
        if (!$subject) return $this->error('Subject not found', 404);

        $student = User::find($data['student_id']);
        if (!$student) return $this->error('Student not found', 404);

        // Find section from student assignment
        $ua = $student->assignments()->where('status', 'active')->first();
        if (!$ua) return $this->error('Student has no active section assignment', 404);

        $sectionId = $ua->section_id;
        if (!$sectionId && $ua->section) {
            $section = Section::where('section_name', $ua->section)->first();
            if ($section) $sectionId = $section->id;
        }

        if (!$sectionId) return $this->error('Could not determine student section', 400);

        $grade = Grade::updateOrCreate(
            ['student_id' => $student->id, 'subject_id' => $subject->id],
            [
                'teacher_id' => Auth::id(),
                'section_id' => $sectionId,
                'prelim_grade' => $data['prelim'] ?? null,
                'midterm_grade' => $data['midterm'] ?? null,
                'finals_grade' => $data['finals'] ?? null,
                'school_year' => date('Y') . '-' . (date('Y') + 1),
                'semester' => '1st',
            ]
        );

        return $this->success([], 'Grade saved');
    }

    public function getStudents(Request $request)
    {
        $sectionName = $request->query('section');
        if (!$sectionName) return response()->json([]);

        $cacheKey = 'teacher:students:' . md5($sectionName);

        $students = Cache::remember($cacheKey, self::CACHE_TTL_SECONDS, function () use ($sectionName) {
            $section = Section::where('section_name', $sectionName)->first();
            if (!$section) return [];
    
            return User::whereHas('assignments', function($q) use ($section) {
                $q->where('section_id', $section->id)->orWhere('section', $section->section_name);
            })->get();
        });

        return response()->json($students);
    }
    public function getAnnouncements()
    {
        $role = Auth::user()->role;
        $cacheKey = 'teacher:announcements:' . Auth::id() . ':' . $role;
        $announcements = Cache::remember($cacheKey, self::CACHE_TTL_SECONDS, function () use ($role) {
            return Announcement::where(function($q) use ($role) {
                    $q->where('target_role', $role)->orWhere('target_role', 'all');
                })
                ->where('is_published', true)
                ->where(function($q) {
                    $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
                })
                ->orderBy('priority', 'desc')
                ->orderBy('published_at', 'desc')
                ->get();
        });

        return response()->json($announcements);
    }
    public function getSchedule()
    {
        $teacherId = Auth::id();
        $cacheKey = 'teacher:schedule:' . $teacherId;
        $schedules = Cache::remember($cacheKey, self::CACHE_TTL_SECONDS, function () use ($teacherId) {
            return \App\Models\Schedule::with(['teacher_assignment.subject', 'teacher_assignment.section_ref'])
                ->whereHas('teacher_assignment', function($q) use ($teacherId) {
                    $q->where('teacher_id', $teacherId);
                })
                ->get()
                ->map(function($sc) {
                    $ta = $sc->teacher_assignment;
                    $roomInfo = $this->resolveSectionRoom($ta->section_id ?? null, $sc->room_id);
                    $sectionName = $ta->section_ref?->section_name ?? ($ta->section ?? '');
                    return [
                        'id' => $sc->id,
                        'subject_code' => $ta->subject?->subject_code ?? '',
                        'subject_name' => $ta->subject?->subject_name ?? '',
                        'subject' => $ta->subject?->subject_name ?? '',
                        'section_name' => $sectionName,
                        'section' => $sectionName,
                        'year' => $ta->section_ref?->grade_level ?? '',
                        'day' => $sc->day_of_week,
                        'time_start' => $sc->start_time,
                        'time_end' => $sc->end_time,
                        'building' => $roomInfo['building'] ?? null,
                        'room' => $roomInfo['room'] ?? ($sc->room_id ?? 'TBA'),
                        'floor' => $roomInfo['floor'] ?? null,
                    ];
                });
        });

        return response()->json($schedules);
    }

    public function getProjects()
    {
        $teacherId = Auth::id();
        $cacheKey = 'teacher:projects:' . $teacherId;
        $projects = Cache::remember($cacheKey, self::CACHE_TTL_SECONDS, function () use ($teacherId) {
            return Project::with(['subject', 'section'])
                ->where('teacher_id', $teacherId)
                ->get();
        });
        return response()->json($projects);
    }

    public function getTeacherSubjects()
    {
        return $this->getAssignments();
    }

    public function getSections()
    {
        $teacherId = Auth::id();
        $cacheKey = 'teacher:sections:' . $teacherId;
        $assignments = Cache::remember($cacheKey, self::CACHE_TTL_SECONDS, function () use ($teacherId) {
            return TeacherAssignment::with(['section_ref', 'subject'])
                ->where('teacher_id', $teacherId)
                ->where('status', 'active')
                ->get();
        });

        $sections = $assignments
            ->groupBy(function ($ta) {
                return $ta->section_id ?? $ta->section ?? 'unknown';
            })
            ->map(function ($group) {
                $first = $group->first();
                $section = $first->section_ref;
                $sectionName = $section?->section_name ?? ($first->section ?? '');

                return [
                    'id' => $section?->id,
                    'name' => $sectionName,
                    'section_name' => $sectionName,
                    'year_level' => $section?->grade_level,
                    'grade_level' => $section?->grade_level,
                    'course' => $section?->course,
                    'major' => $section?->major,
                    'school_year' => $section?->school_year,
                    'subjects' => $group->map(function ($ta) {
                        return [
                            'id' => $ta->subject?->id,
                            'code' => $ta->subject?->subject_code,
                            'name' => $ta->subject?->subject_name,
                        ];
                    })->values(),
                ];
            })
            ->values();
        
        return response()->json($sections);
    }

    public function getEvaluationStatistics(Request $request)
    {
        $teacherId = Auth::id();
        $semester = $request->query('semester');

        $baseQuery = \Illuminate\Support\Facades\DB::table('teacher_evaluations')
            ->where('teacher_id', $teacherId);

        if (!empty($semester) && strtolower($semester) !== 'all') {
            $variants = $this->semesterVariants($semester);
            $baseQuery->where(function ($q) use ($variants) {
                if (!empty($variants)) {
                    $q->whereIn('semester', $variants)
                        ->orWhereNull('semester')
                        ->orWhere('semester', '');
                    return;
                }
                $q->whereNull('semester')->orWhere('semester', '');
            });
        }

        $cacheKey = 'teacher:eval_stats:' . $teacherId . ':' . ($semester ?? 'all');
        $result = Cache::remember($cacheKey, self::CACHE_TTL_SECONDS, function () use ($baseQuery) {
            $stats = (clone $baseQuery)
                ->select(
                    \Illuminate\Support\Facades\DB::raw('AVG(rating) as average_rating'),
                    \Illuminate\Support\Facades\DB::raw('COUNT(*) as total_evaluations')
                )
                ->first();
    
            $comments = (clone $baseQuery)
                ->whereNotNull('comment')
                ->where('comment', '!=', '')
                ->orderByDesc('created_at')
                ->limit(20)
                ->get(['comment', 'rating', 'created_at'])
                ->map(function ($c) {
                    return [
                        'text' => $c->comment,
                        'rating' => (float)($c->rating ?? 0),
                        'date' => $c->created_at ? date('Y-m-d', strtotime($c->created_at)) : null,
                    ];
                })
                ->values();
            
            return [
                'average_rating' => (float)($stats->average_rating ?? 0),
                'total_evaluations' => (int)($stats->total_evaluations ?? 0),
                'comments' => $comments,
            ];
        });

        return response()->json($result);
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

    private function resolveSectionRoom($sectionId, $roomId = null)
    {
        $assignment = null;
        if (!empty($roomId)) {
            $assignment = \Illuminate\Support\Facades\DB::table('section_assignments')->where('id', $roomId)->first();
        }
        if (!$assignment && !empty($sectionId)) {
            $assignment = \Illuminate\Support\Facades\DB::table('section_assignments')
                ->where('section_id', $sectionId)
                ->orderByDesc('id')
                ->first();
        }
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
}
