<?php
session_start();
// Ensure user is logged in and is a teacher
if (!isset($_SESSION['username'])) {
  header('Location: /TCC/public/index.html');
  exit();
}

// Check if user is a teacher
$userRole = $_SESSION['role'] ?? 'student';
if ($userRole !== 'teacher') {
  header('Location: /TCC/public/home.php');
  exit();
}

// Prefer values saved in session to avoid extra DB queries
$image = $_SESSION['image_path'] ?? '/TCC/public/images/sample.jpg';
$schoolId = $_SESSION['school_id'] ?? '';
$full_name = $_SESSION['full_name'] ?? $_SESSION['username'];

// default view: schedule for teachers
$view = isset($_GET['view']) ? $_GET['view'] : 'schedule';
require_once __DIR__ . '/../BackEnd/database/db.php';
$conn = Database::getInstance()->getConnection();
$username = $_SESSION['username'];
$stmt = $conn->prepare("SELECT id, image_path, school_id, role, created_at FROM users WHERE username = ?");
$stmt->bind_param("s", $username);
$stmt->execute();
$result = $stmt->get_result();
$row = $result->fetch_assoc();
$image = $row['image_path'] ?? '/TCC/public/images/sample.jpg';
$userRole = $row['role'] ?? $_SESSION['role'] ?? 'teacher';
if (empty($schoolId) && isset($row['school_id']) && $row['school_id'] !== '') {
  $schoolId = $row['school_id'];
  $_SESSION['school_id'] = $schoolId;
} elseif (empty($schoolId) && $row) {
  require_once __DIR__ . '/../BackEnd/helpers/school_id.php';
  try {
    $schoolId = ensure_school_id_for_user($conn, $row);
    $_SESSION['school_id'] = $schoolId;
  } catch (Throwable $th) {
    $schoolId = '';
  }
}

function formatOrdinal($number) {
  $number = intval($number);
  if ($number <= 0) { return ''; }
  $suffixes = ['th','st','nd','rd','th','th','th','th','th','th'];
  $value = $number % 100;
  if ($value >= 11 && $value <= 13) {
    return $number . 'th';
  }
  return $number . ($suffixes[$number % 10] ?? 'th');
}

// Days of the week for schedule ordering
$dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
?>

<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="stylesheet" href="css/bootstrap.min.css" />
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" />
    <link rel="stylesheet" href="css/home.css" />
    <link rel="stylesheet" href="css/home_sidebar.css" />
    <title>Teacher Dashboard</title>
  </head>
  <body>
    <div class="page-container">
      <aside class="sidebar">
        <div class="sidebar-glass"></div>
        <div class="sidebar-top">
          <!-- user image as logo -->
          <div class="sidebar-profile-tile">
            <img src="<?php echo htmlspecialchars($image); ?>" alt="User" class="sidebar-logo" />
            <?php if (!empty($schoolId)): ?>
              <span class="sidebar-school-id" title="School ID"><?php echo htmlspecialchars($schoolId); ?></span>
            <?php endif; ?>
            <?php if (!empty($userRole)): ?>
              <span class="sidebar-role" title="Role"><?php echo htmlspecialchars(ucfirst($userRole)); ?></span>
            <?php endif; ?>
          </div>
        </div>

        <nav class="sidebar-nav" aria-label="Main navigation">
          <ul>
            <li>
              <a href="/TCC/public/teachers.php?view=announcements" class="nav-link <?php echo ($view === 'announcements') ? 'active' : '' ?>" data-bs-toggle="tooltip" data-bs-placement="right" title="Announcements">
                <i class="bi bi-megaphone-fill"></i>
                <span class="nav-label">Announcements</span>
              </a>
            </li>
            <li>
              <a href="/TCC/public/teachers.php?view=schedule" class="nav-link <?php echo ($view === 'schedule') ? 'active' : '' ?>" data-bs-toggle="tooltip" data-bs-placement="right" title="Schedule">
                <i class="bi bi-calendar-week"></i>
                <span class="nav-label">Schedule</span>
              </a>
            </li>
            <li>
              <a href="/TCC/public/teachers.php?view=transparency" class="nav-link <?php echo ($view === 'transparency') ? 'active' : '' ?>" data-bs-toggle="tooltip" data-bs-placement="right" title="Transparency">
                <i class="bi bi-graph-up"></i>
                <span class="nav-label">Transparency</span>
              </a>
            </li>
            <li>
              <a href="/TCC/public/teachers.php?view=evaluation" class="nav-link <?php echo ($view === 'evaluation') ? 'active' : '' ?>" data-bs-toggle="tooltip" data-bs-placement="right" title="Evaluation">
                <i class="bi bi-clipboard-check"></i>
                <span class="nav-label">Evaluation</span>
              </a>
            </li>
            <li>
              <a href="/TCC/public/teachers.php?view=settings" class="nav-link <?php echo ($view === 'settings') ? 'active' : '' ?>" data-bs-toggle="tooltip" data-bs-placement="right" title="Settings">
                <i class="bi bi-gear-fill"></i>
                <span class="nav-label">Settings</span>
              </a>
            </li>
          </ul>
        </nav>

        <div class="sidebar-bottom">
          <a href="/TCC/BackEnd/auth/logout.php" class="btn logout-icon" title="Logout"><i class="bi bi-box-arrow-right"></i></a>
        </div>
      </aside>

      <main class="home-main">
        <?php
        $view = isset($_GET['view']) ? $_GET['view'] : 'schedule';
        $heroSpotlights = [
          'schedule' => [
            'hero_copy' => 'View your teaching schedule, class times, and room assignments in one organized view.',
            'spotlight_eyebrow' => 'Teaching schedule',
            'spotlight_title' => 'My Schedule',
            'spotlight_copy' => 'Check your weekly schedule, see which classes you teach, and manage your time effectively.'
          ],
          'announcements' => [
            'hero_copy' => 'Catch up on campus headlines, filter by year or department, and keep every announcement at your fingertips.',
            'spotlight_eyebrow' => 'Latest broadcasts',
            'spotlight_title' => 'Announcements',
            'spotlight_copy' => 'Browse targeted updates, stay informed on school activities, and never miss important campus news.'
          ],
          'transparency' => [
            'hero_copy' => 'See where resources go, review project milestones, and keep the community informed with transparent reporting.',
            'spotlight_eyebrow' => 'Project insights',
            'spotlight_title' => 'Transparency',
            'spotlight_copy' => 'Explore school project budgets, completion status, and milestones through an accessible transparency log.'
          ],
          'settings' => [
            'hero_copy' => 'Personalize your profile, update your login details, and keep your account aligned with your current information.',
            'spotlight_eyebrow' => 'Account controls',
            'spotlight_title' => 'Settings',
            'spotlight_copy' => 'Update your username, display name, password, and profile picture to keep your account up to date.'
          ],
        ];
        $activeSpotlight = $heroSpotlights[$view] ?? $heroSpotlights['schedule'];
$departmentMajors = [
  'IT' => ['Computer Technology', 'Electronics'],
  'BSED' => ['English', 'Physical Education', 'Math', 'Filipino', 'Social Science'],
  'HM' => ['General'],
  'BEED' => ['General'],
  'TOURISM' => ['General']
];
        ?>
        <section class="dashboard-hero">
          <div class="hero-content">
            <span class="hero-eyebrow">Teacher Dashboard</span>
            <h1 class="hero-title">Hi, <?php echo htmlspecialchars($full_name); ?>!</h1>
            <p class="hero-copy">
              <?php echo htmlspecialchars($activeSpotlight['hero_copy']); ?>
            </p>
            <div class="hero-action-group">
              <a class="hero-action <?php echo ($view === 'schedule') ? 'active' : ''; ?>" href="/TCC/public/teachers.php?view=schedule">
                <i class="bi bi-calendar-week"></i>
                <span>Schedule</span>
              </a>
              <a class="hero-action <?php echo ($view === 'announcements') ? 'active' : ''; ?>" href="/TCC/public/teachers.php?view=announcements">
                <i class="bi bi-megaphone-fill"></i>
                <span>Announcements</span>
              </a>
              <a class="hero-action <?php echo ($view === 'transparency') ? 'active' : ''; ?>" href="/TCC/public/teachers.php?view=transparency">
                <i class="bi bi-graph-up-arrow"></i>
                <span>Transparency</span>
              </a>
              <a class="hero-action <?php echo ($view === 'evaluation') ? 'active' : ''; ?>" href="/TCC/public/teachers.php?view=evaluation">
                <i class="bi bi-clipboard-check"></i>
                <span>Evaluation</span>
              </a>
              <a class="hero-action <?php echo ($view === 'settings') ? 'active' : ''; ?>" href="/TCC/public/teachers.php?view=settings">
                <i class="bi bi-gear-fill"></i>
                <span>Settings</span>
              </a>
            </div>
          </div>
          <div class="hero-spotlight">
            <div class="spotlight-card">
              <span class="spotlight-eyebrow"><?php echo htmlspecialchars($activeSpotlight['spotlight_eyebrow']); ?></span>
              <h2 class="spotlight-title"><?php echo htmlspecialchars($activeSpotlight['spotlight_title']); ?></h2>
              <p class="spotlight-copy"><?php echo htmlspecialchars($activeSpotlight['spotlight_copy']); ?></p>
            </div>
            <div class="spotlight-card alt">
              <span class="spotlight-eyebrow">Stay updated</span>
              <h2 class="spotlight-title">Announcements Feed</h2>
              <p class="spotlight-copy">Filter updates by year or department so you never miss the details that matter most.</p>
            </div>
          </div>
        </section>
        <?php
        if ($view === 'schedule') {
          $currentFullName = $_SESSION['full_name'] ?? '';
          $currentUsername = $_SESSION['username'] ?? '';
          $currentUserId = $_SESSION['user_id'] ?? null;
          
          // Handle toast notifications
          $scheduleToastMessage = '';
          $scheduleToastType = 'success';
          if (isset($_GET['success'])) {
            $scheduleToastMessage = match ($_GET['success']) {
              'created' => 'Schedule created successfully!',
              'updated' => 'Schedule updated successfully!',
              'deleted' => 'Schedule deleted successfully!',
              default => 'Schedule saved successfully!'
            };
          } elseif (isset($_GET['error'])) {
            $scheduleToastType = 'error';
            $scheduleToastMessage = match ($_GET['error']) {
              'missing' => 'Please fill in all required fields.',
              'invalid_id' => 'Invalid schedule ID.',
              'db_error' => 'Database error occurred. Please try again.',
              default => 'Unable to save schedule right now.'
            };
          }
          
          // Teachers can only view their schedule, not edit
          $editScheduleRow = null;
          
          // Ensure schedules table has class_type column
          try {
            $colCheck = $conn->query("SHOW COLUMNS FROM schedules LIKE 'class_type'");
            if ($colCheck && $colCheck->num_rows === 0) {
              $conn->query("ALTER TABLE schedules ADD COLUMN class_type ENUM('day', 'night') DEFAULT 'day' AFTER building");
            }
            if ($colCheck) { $colCheck->close(); }
          } catch (Throwable $th) {
            // ignore
          }
          
          // Get available sections
          $availableSections = [];
          $sectionsQuery = $conn->query("SELECT DISTINCT name FROM sections ORDER BY name");
          if ($sectionsQuery) {
            while ($row = $sectionsQuery->fetch_assoc()) {
              $availableSections[] = $row['name'];
            }
          }
          
          // Get available buildings
          $availableBuildings = [];
          $buildingsQuery = $conn->query("SELECT name FROM buildings ORDER BY name");
          if ($buildingsQuery) {
            while ($row = $buildingsQuery->fetch_assoc()) {
              $availableBuildings[] = $row['name'];
            }
          }
          // Fallback to JSON
          if (empty($availableBuildings)) {
            $buildingsPath = __DIR__ . '/../database/buildings.json';
            if (file_exists($buildingsPath)) {
              $buildingsData = json_decode(file_get_contents($buildingsPath), true) ?: [];
              $availableBuildings = array_keys($buildingsData);
            }
          }
          
          // Query schedules where instructor matches the teacher OR subject codes match teacher assignments
          $schedules = [];
          
          // First, get all subject codes assigned to this teacher
          $teacherSubjects = [];
          $subjectQuery = $conn->prepare("SELECT subject_code FROM teacher_assignments WHERE teacher_name = ? OR teacher_name = ?");
          if ($subjectQuery) {
            $subjectQuery->bind_param('ss', $currentFullName, $currentUsername);
            $subjectQuery->execute();
            $subjectResult = $subjectQuery->get_result();
            while ($subjectRow = $subjectResult->fetch_assoc()) {
              $teacherSubjects[] = $subjectRow['subject_code'];
            }
            $subjectQuery->close();
          }
          
          // Build query: schedules where instructor matches OR subject matches teacher's assigned subjects
          // Use DISTINCT to avoid duplicates when a schedule matches multiple conditions
          if (!empty($teacherSubjects)) {
            $placeholders = str_repeat('?,', count($teacherSubjects) - 1) . '?';
            $scheduleQuery = $conn->prepare("SELECT DISTINCT id, year, subject, day, time_start, time_end, room, section, building, class_type FROM schedules WHERE instructor = ? OR instructor = ? OR subject IN ($placeholders) ORDER BY FIELD(day, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'), time_start");
            if ($scheduleQuery) {
              $params = array_merge([$currentFullName, $currentUsername], $teacherSubjects);
              $types = str_repeat('s', count($params));
              $scheduleQuery->bind_param($types, ...$params);
              $scheduleQuery->execute();
              $scheduleResult = $scheduleQuery->get_result();
              while ($scheduleRow = $scheduleResult->fetch_assoc()) {
                $schedules[] = $scheduleRow;
              }
              $scheduleQuery->close();
            }
          } else {
            // Fallback: query by instructor name only
            $scheduleQuery = $conn->prepare("SELECT DISTINCT id, year, subject, day, time_start, time_end, room, section, building, class_type FROM schedules WHERE instructor = ? OR instructor = ? ORDER BY FIELD(day, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'), time_start");
            if ($scheduleQuery) {
              $scheduleQuery->bind_param('ss', $currentFullName, $currentUsername);
              $scheduleQuery->execute();
              $scheduleResult = $scheduleQuery->get_result();
              while ($scheduleRow = $scheduleResult->fetch_assoc()) {
                $schedules[] = $scheduleRow;
              }
              $scheduleQuery->close();
            }
          }
          
          // Additional deduplication by ID to ensure no duplicates (in case DISTINCT doesn't work as expected)
          $uniqueSchedules = [];
          $seenIds = [];
          foreach ($schedules as $schedule) {
            $scheduleId = $schedule['id'] ?? null;
            if ($scheduleId && !in_array($scheduleId, $seenIds)) {
              $seenIds[] = $scheduleId;
              $uniqueSchedules[] = $schedule;
            }
          }
          $schedules = $uniqueSchedules;
          ?>
          <div class="records-container">
            <div class="records-header">
              <h2 class="records-title">
                <i class="bi bi-calendar-week"></i> My Schedule
              </h2>
              <p class="records-subtitle">Manage your teaching schedule and class assignments</p>
            </div>
            
            <div class="records-main">
              <?php if (!empty($scheduleToastMessage)): ?>
                <div class="alert alert-<?php echo $scheduleToastType === 'error' ? 'danger' : 'success'; ?> alert-dismissible fade show" role="alert">
                  <?php echo htmlspecialchars($scheduleToastMessage); ?>
                  <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                </div>
              <?php endif; ?>
              
              <?php if (empty($schedules)): ?>
                <div class="info-card mt-3">
                  <div class="card-header-modern">
                    <i class="bi bi-calendar-x"></i>
                    <h3>No Schedule Found</h3>
                  </div>
                  <p class="text-muted mb-0">You don't have any scheduled classes yet. Add one using the form above.</p>
                </div>
              <?php else: ?>
                <?php
                // Group schedules by day
                $schedulesByDay = [];
                foreach ($schedules as $schedule) {
                  $day = $schedule['day'] ?? 'Unknown';
                  if (!isset($schedulesByDay[$day])) {
                    $schedulesByDay[$day] = [];
                  }
                  $schedulesByDay[$day][] = $schedule;
                }
                
                // Sort days (Monday-Saturday only)
                $teacherDayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                uksort($schedulesByDay, function($a, $b) use ($teacherDayOrder) {
                  $posA = array_search($a, $teacherDayOrder);
                  $posB = array_search($b, $teacherDayOrder);
                  if ($posA === false) $posA = 999;
                  if ($posB === false) $posB = 999;
                  return $posA - $posB;
                });
                
                foreach ($schedulesByDay as $day => $daySchedules) {
                  ?>
                  <div class="info-card mt-3">
                    <div class="card-header-modern">
                      <i class="bi bi-calendar-day"></i>
                      <h3><?php echo htmlspecialchars($day); ?></h3>
                    </div>
                    <div class="table-responsive">
                      <table class="table table-hover align-middle">
                        <thead>
                          <tr>
                            <th>Subject</th>
                            <th>Year</th>
                            <th>Section</th>
                            <th>Time</th>
                            <th>Class Type</th>
                            <th>Room</th>
                            <th>Building</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          <?php foreach ($daySchedules as $schedule): 
                            $timeStart = date('g:i A', strtotime($schedule['time_start']));
                            $timeEnd = date('g:i A', strtotime($schedule['time_end']));
                            $timeRange = $timeStart . ' - ' . $timeEnd;
                            $classType = $schedule['class_type'] ?? 'day';
                          ?>
                            <tr>
                              <td><strong><?php echo htmlspecialchars($schedule['subject']); ?></strong></td>
                              <td><?php echo htmlspecialchars($schedule['year'] ?? 'N/A'); ?></td>
                              <td><?php echo htmlspecialchars($schedule['section'] ?? '—'); ?></td>
                              <td><?php echo htmlspecialchars($timeRange); ?></td>
                              <td>
                                <span class="badge bg-<?php echo $classType === 'night' ? 'dark' : 'warning'; ?>">
                                  <?php echo htmlspecialchars(ucfirst($classType)); ?>
                                </span>
                              </td>
                              <td><?php echo htmlspecialchars($schedule['room'] ?? '—'); ?></td>
                              <td><?php echo htmlspecialchars($schedule['building'] ?? '—'); ?></td>
                              <td>
                                <span class="text-muted">View Only</span>
                              </td>
                            </tr>
                          <?php endforeach; ?>
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <?php
                }
                ?>
              <?php endif; ?>
            </div>
          </div>
          <?php
        } elseif ($view === 'announcements') {
          ?>
          <div class="records-container">
            <div class="records-header">
              <h2 class="records-title">Announcements</h2>
              <p class="records-subtitle">Stay updated with the latest news and information</p>
            </div>
            <div class="records-main">
              <?php
              // Prefer announcements from DB; fallback to JSON when table missing
              $annList = [];
              $filterYear = isset($_GET['year_filter']) ? trim($_GET['year_filter']) : '';
              $filterDept = isset($_GET['dept_filter']) ? trim($_GET['dept_filter']) : '';
              $filterMajor = isset($_GET['major_filter']) ? trim($_GET['major_filter']) : '';
              if ($filterDept === '' || !isset($departmentMajors[$filterDept])) {
                $filterMajor = '';
              }

              $announcementHasMajor = false;
              try {
                $colCheck = $conn->query("SHOW COLUMNS FROM announcements LIKE 'major'");
                if ($colCheck && $colCheck->num_rows > 0) {
                  $announcementHasMajor = true;
                } else {
                  $conn->query("ALTER TABLE announcements ADD COLUMN major VARCHAR(50) DEFAULT NULL AFTER department");
                  $announcementHasMajor = true;
                }
                if ($colCheck) { $colCheck->close(); }
              } catch (Throwable $colErr) {
                $announcementHasMajor = false;
              }
              $announcementSelectColumns = $announcementHasMajor
                ? "id, title, content, year, department, major, date"
                : "id, title, content, year, department, date";

              try {
                require_once __DIR__ . '/../BackEnd/database/db.php';
                $conn = Database::getInstance()->getConnection();
                $annQ = $conn->query("SELECT $announcementSelectColumns FROM announcements ORDER BY date DESC");
              } catch (Throwable $ex) {
                $annQ = false;
              }
              if ($annQ === false) {
                // fallback to JSON
                $annPath = __DIR__ . '/../database/announcements.json';
                if (file_exists($annPath)) { $annList = json_decode(file_get_contents($annPath), true) ?: []; }
              }
              
              // Collect announcements
              $announcements = [];
              if (isset($annQ) && $annQ !== false) {
                while ($a = $annQ->fetch_assoc()) {
                  if ($filterYear !== '' && isset($a['year']) && (string)$a['year'] !== $filterYear) continue;
                  $deptValue = $a['department'] ?? '';
                  if ($deptValue === 'BSEED') { $deptValue = 'BSED'; }
                  if ($filterDept !== '' && $deptValue !== $filterDept) continue;
                  if ($filterMajor !== '' && isset($a['major']) && $a['major'] !== $filterMajor) continue;
                  $a['department'] = $deptValue;
                  $announcements[] = $a;
                }
              } else {
                foreach (array_reverse($annList) as $a) {
                  if ($filterYear !== '' && isset($a['year']) && (string)$a['year'] !== $filterYear) continue;
                  $deptValue = $a['department'] ?? '';
                  if ($deptValue === 'BSEED') { $deptValue = 'BSED'; }
                  if ($filterDept !== '' && $deptValue !== $filterDept) continue;
                  if ($filterMajor !== '' && isset($a['major']) && $a['major'] !== $filterMajor) continue;
                  $a['department'] = $deptValue;
                  $announcements[] = $a;
                }
              }
              ?>
              
              <div class="info-card">
                <div class="card-header-modern">
                  <i class="bi bi-funnel"></i>
                  <h3>Filter Announcements</h3>
                </div>
                <form method="get" class="announcements-filter-form">
                  <input type="hidden" name="view" value="announcements" />
                  <div class="filter-group">
                    <label for="year_filter" class="filter-label">
                      <i class="bi bi-calendar-year"></i>
                      Year Level
                    </label>
                    <select id="year_filter" name="year_filter" class="filter-select">
                      <option value="">All Years</option>
                      <option value="1" <?php echo $filterYear==='1'?'selected':'';?>>1st Year</option>
                      <option value="2" <?php echo $filterYear==='2'?'selected':'';?>>2nd Year</option>
                      <option value="3" <?php echo $filterYear==='3'?'selected':'';?>>3rd Year</option>
                      <option value="4" <?php echo $filterYear==='4'?'selected':'';?>>4th Year</option>
                    </select>
                  </div>
                  <div class="filter-group">
                    <label for="dept_filter" class="filter-label">
                      <i class="bi bi-building"></i>
                      Department
                    </label>
                    <select id="dept_filter" name="dept_filter" class="filter-select">
                      <option value="">All Departments</option>
                      <option value="IT" <?php echo $filterDept==='IT'?'selected':'';?>>IT</option>
                      <option value="HM" <?php echo $filterDept==='HM'?'selected':'';?>>HM</option>
                      <option value="BSED" <?php echo $filterDept==='BSED'?'selected':'';?>>BSED</option>
                      <option value="BEED" <?php echo $filterDept==='BEED'?'selected':'';?>>BEED</option>
                      <option value="TOURISM" <?php echo $filterDept==='TOURISM'?'selected':'';?>>TOURISM</option>
                    </select>
                  </div>
                  <div class="filter-group">
                    <label for="major_filter" class="filter-label">
                      <i class="bi bi-diagram-3"></i>
                      Major
                    </label>
                    <?php $majorsForDept = ($filterDept !== '' && isset($departmentMajors[$filterDept])) ? $departmentMajors[$filterDept] : []; ?>
                    <select id="major_filter" name="major_filter" class="filter-select" <?php echo empty($majorsForDept) ? 'disabled' : ''; ?>>
                      <option value="">All Majors</option>
                      <?php foreach ($majorsForDept as $majorOption): ?>
                        <option value="<?php echo htmlspecialchars($majorOption); ?>" <?php echo $filterMajor === $majorOption ? 'selected' : ''; ?>>
                          <?php echo htmlspecialchars($majorOption); ?>
                        </option>
                      <?php endforeach; ?>
                    </select>
                  </div>
                  <button type="submit" class="filter-btn">
                    <i class="bi bi-search"></i>
                    Apply Filters
                  </button>
                </form>
              </div>

              <?php if (empty($announcements)): ?>
                <div class="info-card">
                  <div class="card-header-modern">
                    <i class="bi bi-megaphone"></i>
                    <h3>No Announcements</h3>
                  </div>
                  <p class="text-muted mb-0">No announcements match your current filters. Check back later for updates.</p>
                </div>
              <?php else: ?>
                <div class="announcements-grid">
                  <?php foreach ($announcements as $a): ?>
                    <div class="announcement-card-modern">
                      <div class="announcement-card-header">
                        <div class="announcement-title-section">
                          <h4 class="announcement-title"><?php echo htmlspecialchars($a['title']); ?></h4>
                          <div class="announcement-meta">
                            <span class="announcement-date">
                              <i class="bi bi-calendar3"></i>
                              <?php echo htmlspecialchars($a['date'] ?? 'Date not specified'); ?>
                            </span>
                          </div>
                        </div>
                      </div>
                      <div class="announcement-content">
                        <p><?php echo nl2br(htmlspecialchars($a['content'])); ?></p>
                      </div>
                      <div class="announcement-footer">
                        <?php if (!empty($a['year'])): ?>
                          <span class="announcement-badge">
                            <i class="bi bi-mortarboard"></i>
                            <?php 
                              $yearNum = (int)$a['year'];
                              echo $yearNum > 0 ? formatOrdinal($yearNum) . ' Year' : htmlspecialchars($a['year']);
                            ?>
                          </span>
                        <?php endif; ?>
                        <?php
                          $deptLabel = $a['department'] ?? '';
                          if ($deptLabel === 'BSEED') { $deptLabel = 'BSED'; }
                        ?>
                        <?php if (!empty($deptLabel)): ?>
                          <span class="announcement-badge">
                            <i class="bi bi-building"></i>
                            <?php echo htmlspecialchars($deptLabel); ?>
                          </span>
                        <?php endif; ?>
                        <?php if (!empty($a['major'])): ?>
                          <span class="announcement-badge">
                            <i class="bi bi-diagram-3"></i>
                            <?php echo htmlspecialchars($a['major']); ?>
                          </span>
                        <?php endif; ?>
                      </div>
                    </div>
                  <?php endforeach; ?>
                </div>
              <?php endif; ?>
            </div>
          </div>
          <?php
        } elseif ($view === 'evaluation') {
          $_SESSION['user_id'] = $row['id'] ?? null;
          ?>
            <div class="records-container">
              <div class="records-header">
                <h2 class="records-title">
                  <i class="bi bi-clipboard-check"></i> Evaluation Statistics
                </h2>
                <p class="records-subtitle">View your evaluation statistics from students</p>
              </div>
              
              <div class="records-main">
                <div id="evaluationStatsContainer" class="info-card">
                  <div class="card-header-modern">
                    <i class="bi bi-bar-chart"></i>
                    <h3>Loading Statistics...</h3>
                  </div>
                  <p class="text-muted">Please wait while we load your evaluation data.</p>
                </div>
              </div>
            </div>
            
            <script>
            document.addEventListener('DOMContentLoaded', function() {
              fetch('/TCC/BackEnd/admin/get_evaluation_statistics.php')
                .then(response => response.json())
                .then(data => {
                  const container = document.getElementById('evaluationStatsContainer');
                  
                  if (!data.success || data.total === 0) {
                    container.innerHTML = `
                      <div class="card-header-modern">
                        <i class="bi bi-info-circle"></i>
                        <h3>No Evaluations Yet</h3>
                      </div>
                      <p class="text-muted">You haven't received any evaluations from students yet.</p>
                    `;
                    return;
                  }
                  
                  const part1Questions = [
                    'Knows his/her subject matter well and organizes presentation of subject matter with clarity and coherence',
                    'Is proficient in English/Filipino/Japanese',
                    'Employs appropriate teaching methods/strategies whether in-person or online',
                    'Makes good use of visual aids/instructional materials to facilitate learning whether in-person or online and share them without difficulty (audio, video, etc.)',
                    'Manages the class well and commands respect from students while on discussion both in-person and online',
                    'Utilizes class period productively and sustains students\' interest in lesson and class discussion',
                    'Engages us with questions to deepen our understanding',
                    'Gives subject requirements that are relevant to the program outcomes of my degree',
                    'Gives learning tasks that are well-paced to give us adequate time to work on them',
                    'Behaves professionally through words and actions'
                  ];
                  
                  const part2Questions = [
                    'With my teacher\'s guidance, I can demonstrate the intended knowledge and skills with competence.',
                    'With my teacher\'s guidance, I can connect theory and practical knowledge of this subject.',
                    'With my teacher\'s guidance, I have improved my problem-solving, critical thinking, and decision-making skills through this subject.',
                    'I am happy that he/she is my teacher.',
                    'I can feel the teacher\'s concern for us, his/her students.',
                    'I look up to my teacher as a role model.',
                    'I like to be in his/her class again.',
                    'I notice that my teacher extends help to his/her students who are struggling academically.'
                  ];
                  
                  let html = `
                    <div class="card-header-modern">
                      <i class="bi bi-bar-chart"></i>
                      <h3>Evaluation Statistics</h3>
                    </div>
                    <div class="evaluation-overview">
                      <div class="overview-stat">
                        <div class="stat-label">Total Evaluations</div>
                        <div class="stat-value">${data.total}</div>
                      </div>
                      <div class="overview-stat">
                        <div class="stat-label">Overall Average</div>
                        <div class="stat-value">${data.overall.average.toFixed(2)}</div>
                      </div>
                      <div class="overview-stat">
                        <div class="stat-label">Overall Percentage</div>
                        <div class="stat-value">${data.overall.percentage.toFixed(1)}%</div>
                      </div>
                    </div>
                    
                    <div class="evaluation-section">
                      <h4 class="section-title">PART I: My Teacher</h4>
                      <div class="statistics-list">
                  `;
                  
                  part1Questions.forEach((question, index) => {
                    const qKey = `part1_q${index + 1}`;
                    const stat = data.statistics[qKey] || { average: 0, percentage: 0, responses: 0 };
                    html += `
                      <div class="stat-item">
                        <div class="stat-question">
                          <span class="question-num">${index + 1}.</span>
                          <span class="question-text">${question}</span>
                        </div>
                        <div class="stat-metrics">
                          <div class="metric">
                            <span class="metric-label">Average:</span>
                            <span class="metric-value">${stat.average.toFixed(2)}</span>
                          </div>
                          <div class="metric">
                            <span class="metric-label">Percentage:</span>
                            <span class="metric-value">${stat.percentage.toFixed(1)}%</span>
                          </div>
                          <div class="metric">
                            <span class="metric-label">Responses:</span>
                            <span class="metric-value">${stat.responses}</span>
                          </div>
                        </div>
                        <div class="stat-bar">
                          <div class="stat-bar-fill" style="width: ${stat.percentage}%"></div>
                        </div>
                      </div>
                    `;
                  });
                  
                  html += `
                      </div>
                    </div>
                    
                    <div class="evaluation-section">
                      <h4 class="section-title">PART II: As a Student</h4>
                      <div class="statistics-list">
                  `;
                  
                  part2Questions.forEach((question, index) => {
                    const qKey = `part2_q${index + 1}`;
                    const stat = data.statistics[qKey] || { average: 0, percentage: 0, responses: 0 };
                    html += `
                      <div class="stat-item">
                        <div class="stat-question">
                          <span class="question-num">${index + 1}.</span>
                          <span class="question-text">${question}</span>
                        </div>
                        <div class="stat-metrics">
                          <div class="metric">
                            <span class="metric-label">Average:</span>
                            <span class="metric-value">${stat.average.toFixed(2)}</span>
                          </div>
                          <div class="metric">
                            <span class="metric-label">Percentage:</span>
                            <span class="metric-value">${stat.percentage.toFixed(1)}%</span>
                          </div>
                          <div class="metric">
                            <span class="metric-label">Responses:</span>
                            <span class="metric-value">${stat.responses}</span>
                          </div>
                        </div>
                        <div class="stat-bar">
                          <div class="stat-bar-fill" style="width: ${stat.percentage}%"></div>
                        </div>
                      </div>
                    `;
                  });
                  
                  const satisfaction = data.statistics.satisfaction || { average: 0, percentage: 0, responses: 0 };
                  const recommendation = data.statistics.recommendation || { yes: 0, no: 0, percentage: 0, total: 0 };
                  
                  html += `
                      </div>
                    </div>
                    
                    <div class="evaluation-section">
                      <h4 class="section-title">Additional Metrics</h4>
                      <div class="stat-item">
                        <div class="stat-question">
                          <span class="question-text">Satisfaction Rating (1-10 scale)</span>
                        </div>
                        <div class="stat-metrics">
                          <div class="metric">
                            <span class="metric-label">Average:</span>
                            <span class="metric-value">${satisfaction.average.toFixed(2)}</span>
                          </div>
                          <div class="metric">
                            <span class="metric-label">Percentage:</span>
                            <span class="metric-value">${satisfaction.percentage.toFixed(1)}%</span>
                          </div>
                        </div>
                        <div class="stat-bar">
                          <div class="stat-bar-fill" style="width: ${satisfaction.percentage}%"></div>
                        </div>
                      </div>
                      
                      <div class="stat-item">
                        <div class="stat-question">
                          <span class="question-text">Recommendation Rate</span>
                        </div>
                        <div class="stat-metrics">
                          <div class="metric">
                            <span class="metric-label">Yes:</span>
                            <span class="metric-value">${recommendation.yes}</span>
                          </div>
                          <div class="metric">
                            <span class="metric-label">No:</span>
                            <span class="metric-value">${recommendation.no}</span>
                          </div>
                          <div class="metric">
                            <span class="metric-label">Recommendation Rate:</span>
                            <span class="metric-value">${recommendation.percentage.toFixed(1)}%</span>
                          </div>
                        </div>
                        <div class="stat-bar">
                          <div class="stat-bar-fill" style="width: ${recommendation.percentage}%"></div>
                        </div>
                      </div>
                    </div>
                  `;
                  
                  container.innerHTML = html;
                })
                .catch(error => {
                  console.error('Error loading statistics:', error);
                  document.getElementById('evaluationStatsContainer').innerHTML = `
                    <div class="card-header-modern">
                      <i class="bi bi-exclamation-triangle"></i>
                      <h3>Error Loading Statistics</h3>
                    </div>
                    <p class="text-danger">An error occurred while loading your evaluation statistics. Please try again later.</p>
                  `;
                });
            });
            </script>
          <?php
        } elseif ($view === 'settings') {
          ?>
          <div class="records-container">
            <div class="records-header">
              <h2 class="records-title">
                <i class="bi bi-gear-fill"></i> Settings
              </h2>
              <p class="records-subtitle">Manage your account preferences and profile information</p>
            </div>

            <?php if (isset($_GET['success'])): ?>
              <div class="alert alert-success alert-dismissible fade show" role="alert">
                <i class="bi bi-check-circle me-2"></i>Profile updated successfully.
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
              </div>
            <?php elseif (isset($_GET['error'])): ?>
              <div class="alert alert-danger alert-dismissible fade show" role="alert">
                <i class="bi bi-exclamation-triangle me-2"></i>An error occurred: <?php echo htmlspecialchars($_GET['error']); ?>
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
              </div>
            <?php endif; ?>

            <div class="info-card">
              <div class="card-header-modern">
                <i class="bi bi-person-circle"></i>
                <h3>Profile Information</h3>
              </div>

              <form id="settingsForm" action="/TCC/BackEnd/auth/update_profile.php" method="post" enctype="multipart/form-data">
                <div class="settings-profile-section">
                  <div class="profile-image-container">
                    <div class="profile-image-wrapper">
                      <img id="preview" src="<?php echo htmlspecialchars($image); ?>" class="profile-preview-large" alt="Profile" />
                      <label for="profile_image" class="profile-upload-label">
                        <i class="bi bi-camera-fill"></i>
                        <span>Change Photo</span>
                      </label>
                      <input type="file" name="profile_image" id="profile_image" accept="image/*" class="profile-upload-input" />
                    </div>
                  </div>

                  <div class="settings-form-fields">
                    <div class="settings-field">
                      <label for="username" class="settings-label">
                        <i class="bi bi-person"></i> Username
                      </label>
                      <input id="username" name="username" class="settings-input" value="<?php echo htmlspecialchars($_SESSION['username']); ?>" required />
                      <div id="usernameFeedback" class="settings-feedback text-danger" style="display:none"></div>
                    </div>

                    <div class="settings-field">
                      <label for="full_name" class="settings-label">
                        <i class="bi bi-card-text"></i> Full Name
                      </label>
                      <input id="full_name" name="full_name" class="settings-input" value="<?php echo htmlspecialchars($full_name); ?>" required />
                      <div id="fullnameFeedback" class="settings-feedback text-danger" style="display:none"></div>
                    </div>

                    <div class="settings-field">
                      <label for="password" class="settings-label">
                        <i class="bi bi-lock"></i> New Password
                      </label>
                      <input id="password" name="password" type="password" class="settings-input" placeholder="Leave blank to keep current password" />
                      <small class="settings-hint">Leave blank if you don't want to change your password</small>
                    </div>

                    <div class="settings-actions">
                      <button class="btn btn-primary settings-save-btn" type="submit">
                        <i class="bi bi-check-lg me-2"></i>Save Changes
                      </button>
                      <a href="/TCC/public/teachers.php" class="btn btn-outline-secondary">
                        <i class="bi bi-arrow-left me-2"></i>Cancel
                      </a>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
          <?php
        } elseif ($view === 'transparency') {
          ?>
          <div class="records-container">
            <div class="records-header">
              <h2 class="records-title">Transparency / Projects</h2>
              <p class="records-subtitle">View project budgets and completion status</p>
            </div>
            <div class="records-main">
              <?php
              $pPath = __DIR__ . '/../database/projects.json';
              $projects = [];
              if (file_exists($pPath)) { $projects = json_decode(file_get_contents($pPath), true) ?: []; }
              ?>
              
              <?php if (empty($projects)): ?>
                <div class="info-card">
                  <div class="card-header-modern">
                    <i class="bi bi-folder-x"></i>
                    <h3>No Projects</h3>
                  </div>
                  <p class="text-muted mb-0">No project information available at this time.</p>
                </div>
              <?php else: ?>
                <div class="projects-grid">
                  <?php foreach ($projects as $proj): 
                    $isCompleted = isset($proj['completed']) && strtolower($proj['completed']) === 'yes';
                  ?>
                    <div class="project-card-modern">
                      <div class="project-card-header">
                        <div class="project-title-section">
                          <h4 class="project-title"><?php echo htmlspecialchars($proj['name']); ?></h4>
                          <div class="project-status-badge <?php echo $isCompleted ? 'status-completed' : 'status-ongoing'; ?>">
                            <i class="bi <?php echo $isCompleted ? 'bi-check-circle-fill' : 'bi-clock-history'; ?>"></i>
                            <span><?php echo $isCompleted ? 'Completed' : 'Ongoing'; ?></span>
                          </div>
                        </div>
                      </div>
                      <div class="project-details">
                        <div class="project-detail-item">
                          <div class="project-detail-label">
                            <i class="bi bi-cash-coin"></i>
                            <span>Budget</span>
                          </div>
                          <div class="project-detail-value"><?php echo htmlspecialchars($proj['budget']); ?></div>
                        </div>
                        <div class="project-detail-item">
                          <div class="project-detail-label">
                            <i class="bi bi-calendar-event"></i>
                            <span>Started</span>
                          </div>
                          <div class="project-detail-value"><?php echo htmlspecialchars($proj['started']); ?></div>
                        </div>
                      </div>
                    </div>
                  <?php endforeach; ?>
                </div>
              <?php endif; ?>
            </div>
          <?php
        }
        ?>
      </main>
    </div>
    <script src="js/bootstrap.bundle.min.js"></script>
    <script>
      // enable Bootstrap tooltips
      document.addEventListener('DOMContentLoaded', function () {
        var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
        tooltipTriggerList.forEach(function (el) {
          new bootstrap.Tooltip(el)
        })
      })
    </script>
    <?php if ($view === 'settings'): ?>
    <script>
      document.getElementById('profile_image').addEventListener('change', function (e) {
        const f = e.target.files[0];
        if (!f) return;
        const url = URL.createObjectURL(f);
        document.getElementById('preview').src = url;
      });

      function debounce(fn, wait) {
        let t;
        return function (...args) {
          clearTimeout(t);
          t = setTimeout(() => fn.apply(this, args), wait);
        };
      }

      const usernameInput = document.getElementById('username');
      const fullInput = document.getElementById('full_name');

      if (usernameInput) {
        usernameInput.addEventListener('input', debounce(function () {
          const val = this.value.trim();
          if (!val) return;
          fetch('/TCC/BackEnd/auth/check_availability.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'type=username&value=' + encodeURIComponent(val)
          })
          .then(r => r.json())
          .then(j => {
            const fb = document.getElementById('usernameFeedback');
            if (!j.success) { fb.style.display = 'block'; fb.textContent = 'Error checking availability'; }
            else if (!j.available) { fb.style.display = 'block'; fb.textContent = 'Username already taken'; }
            else { fb.style.display = 'none'; }
          });
        }, 400));
      }

      if (fullInput) {
        fullInput.addEventListener('input', debounce(function () {
          const val = this.value.trim();
          if (!val) return;
          fetch('/TCC/BackEnd/auth/check_availability.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'type=full_name&value=' + encodeURIComponent(val)
          })
          .then(r => r.json())
          .then(j => {
            const fb = document.getElementById('fullnameFeedback');
            if (!j.success) { fb.style.display = 'block'; fb.textContent = 'Error checking availability'; }
            else if (!j.available) { fb.style.display = 'block'; fb.textContent = 'Full name already used'; }
            else { fb.style.display = 'none'; }
          });
        }, 400));
      }
    </script>
    <?php endif; ?>
  </body>
</html>

