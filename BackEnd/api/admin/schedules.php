<?php

require_once __DIR__ . '/../../config/header.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/Validator.php';
require_once __DIR__ . '/../../helpers/Response.php';


if (!isset($_SESSION['role']) || $_SESSION['role'] !== 'admin') {
    Response::unauthorized();
}

try {
    $pdo = Database::connect();
    $method = $_SERVER['REQUEST_METHOD'];
    
    switch ($method) {
        case 'GET':
            $stmt = $pdo->query("
                SELECT 
                    sc.id,
                    sc.subject_code AS subject,
                    sc.section_id,
                    sc.day_of_week AS day,
                    sc.time_start,
                    sc.time_end,
                    sc.room_id,
                    sc.created_at,
                    s.subject_name AS subject_name,
                    sec.section_name AS section,
                    sec.grade_level AS year,
                    sec.course AS section_course,
                    sec.major AS section_major,
                    (
                        SELECT ss.teacher 
                        FROM section_subjects ss 
                        WHERE ss.subject_code = sc.subject_code 
                        AND ss.section = sec.section_name 
                        LIMIT 1
                    ) AS instructor_ss,
                    (
                        SELECT u.full_name 
                        FROM teacher_assignments ta 
                        JOIN users u ON ta.teacher_id = u.id 
                        WHERE ta.subject_id = s.id 
                        AND ta.status = 'active' 
                        LIMIT 1
                    ) AS instructor_global,
                    r.building_name AS building,
                    r.room_number AS room
                FROM schedules sc
                LEFT JOIN subjects s ON sc.subject_code = s.subject_code
                LEFT JOIN sections sec ON sc.section_id = sec.id
                LEFT JOIN rooms r ON sc.room_id = r.id
                ORDER BY 
                    FIELD(sc.day_of_week, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'),
                    sc.time_start
            ");
            
            $schedules = $stmt->fetchAll();
            
            
            
            foreach ($schedules as &$schedule) {
                
                $time_start = $schedule['time_start'];
                if ($time_start) {
                    $hour = (int)substr($time_start, 0, 2);
                    $schedule['class_type'] = ($hour >= 17) ? 'night' : 'day';
                } else {
                    $schedule['class_type'] = 'day';
                }

                
                $schedule['instructor'] = $schedule['instructor_ss'] 
                                        ?? $schedule['instructor_global'] 
                                        ?? 'TBA';
            }
            
            echo json_encode($schedules);
            break;
            
        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            $validator = new Validator($input);
            
            $rules = [
                'subject' => 'required|string',
                'day' => 'required|string',
                'time_start' => 'required',
                'time_end' => 'required'
            ];
            
            if (!$validator->validate($rules)) {
                Response::validationError($validator->errors());
            }
            
            
            $section_id = null;
            if (!empty($input['section'])) {
                $stmt = $pdo->prepare("SELECT id FROM sections WHERE section_name = ? LIMIT 1");
                $stmt->execute([$input['section']]);
                $section = $stmt->fetch();
                $section_id = $section['id'] ?? null;
            }
            
            
            $room_id = null;
            if (!empty($input['building']) && !empty($input['room'])) {
                $stmt = $pdo->prepare("SELECT id FROM rooms WHERE building_name = ? AND room_number = ? LIMIT 1");
                $stmt->execute([$input['building'], $input['room']]);
                $room = $stmt->fetch();
                
                if ($room) {
                    $room_id = $room['id'];
                } else {
                    
                    $stmt = $pdo->prepare("INSERT INTO rooms (building_name, room_number) VALUES (?, ?)");
                    $stmt->execute([$input['building'], $input['room']]);
                    $room_id = $pdo->lastInsertId();
                }
            }
            
            
            $scheduleId = null;
            if ($section_id) {
                $stmt = $pdo->prepare("SELECT id, time_start FROM schedules WHERE section_id = ? AND subject_code = ?");
                $stmt->execute([$section_id, $input['subject']]);
                $existing = $stmt->fetch();
                
                if ($existing) {
                    if (strpos($existing['time_start'], '00:00') === 0) {
                        $scheduleId = $existing['id'];
                        $stmt = $pdo->prepare("UPDATE schedules SET day_of_week=?, time_start=?, time_end=?, room_id=? WHERE id=?");
                        $stmt->execute([$input['day'], $input['time_start'], $input['time_end'], $room_id, $scheduleId]);
                    } else {
                        Response::error("Subject already assigned to this section", 409);
                    }
                }
            }
            
            if (!$scheduleId) {
                $stmt = $pdo->prepare("
                    INSERT INTO schedules (subject_code, section_id, day_of_week, time_start, time_end, room_id) 
                    VALUES (?, ?, ?, ?, ?, ?)
                ");
                $stmt->execute([$input['subject'], $section_id, $input['day'], $input['time_start'], $input['time_end'], $room_id]);
                $scheduleId = $pdo->lastInsertId();
            }

            
            if ($section_id && !empty($input['subject'])) {
                try {
                    
                    $stmt = $pdo->prepare("SELECT * FROM sections WHERE id = ?");
                    $stmt->execute([$section_id]);
                    $sectionData = $stmt->fetch();

                    
                    $stmt = $pdo->prepare("SELECT * FROM subjects WHERE subject_code = ?");
                    $stmt->execute([$input['subject']]);
                    $subjectData = $stmt->fetch();

                    
                    $teacherName = null;
                    if ($subjectData) {
                        $stmt = $pdo->prepare("
                            SELECT u.full_name 
                            FROM teacher_assignments ta 
                            JOIN users u ON ta.teacher_id = u.id 
                            WHERE ta.subject_id = ? AND ta.status = 'active'
                            LIMIT 1
                        ");
                        $stmt->execute([$subjectData['id']]);
                        $teacherName = $stmt->fetchColumn();
                    }

                    
                    if ($sectionData && $subjectData) {
                        
                        $stmt = $pdo->prepare("
                            SELECT id FROM section_subjects 
                            WHERE section = ? AND subject_code = ?
                        ");
                        $stmt->execute([$sectionData['section_name'], $input['subject']]);
                        $existing = $stmt->fetch();

                        if (!$existing) {
                            $stmt = $pdo->prepare("
                                INSERT INTO section_subjects 
                                (course, major, year_level, section, subject_code, subject_title, units, semester, teacher) 
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                            ");
                            $stmt->execute([
                                !empty($sectionData['course']) ? $sectionData['course'] : ($sectionData['department'] ?? 'General'),
                                !empty($sectionData['major']) ? $sectionData['major'] : 'General',
                                $sectionData['grade_level'],
                                $sectionData['section_name'],
                                $subjectData['subject_code'],
                                $subjectData['subject_name'] ?? $subjectData['title'], 
                                (float)$subjectData['units'],
                                $subjectData['semester'] ?? 'First Semester',
                                $teacherName 
                            ]);
                        } else if ($teacherName) {
                            
                            $stmt = $pdo->prepare("UPDATE section_subjects SET teacher = ? WHERE id = ?");
                            $stmt->execute([$teacherName, $existing['id']]);
                        }
                    }
                } catch (Exception $syncError) {
                    
                    error_log("Study Load Sync Error: " . $syncError->getMessage());
                }
            }
            
            
            Response::success(['id' => $pdo->lastInsertId()], 'Schedule created');
            break;
            
        case 'DELETE':
            $path = $_SERVER['PATH_INFO'] ?? '';
            if (preg_match('/\/(\d+)$/', $path, $matches)) {
                $id = $matches[1];
                $stmt = $pdo->prepare("DELETE FROM schedules WHERE id = ?");
                $stmt->execute([$id]);
                Response::success(null, 'Schedule deleted');
            } else {
                Response::error('Invalid request', 400);
            }
            break;
            
        default:
            Response::error('Method not allowed', 405);
            break;
    }
} catch (Exception $e) {
    Response::error($e->getMessage(), 500);
}
?>
