<?php
session_start();
// only for admins
if (!isset($_SESSION['username']) || ($_SESSION['role'] ?? '') !== 'admin') {
  header('Location: /TCC/public/index.html');
  exit();
}

function formatOrdinal($number) {
  $number = (int)$number;
  $ends = ['th', 'st', 'nd', 'rd', 'th', 'th', 'th', 'th', 'th', 'th'];
  if ((($number % 100) >= 11) && (($number % 100) <= 13)) {
    return $number . 'th';
  }
  return $number . ($ends[$number % 10] ?? 'th');
}

$image = $_SESSION['image_path'] ?? '/TCC/public/images/sample.jpg';
$adminName = $_SESSION['full_name'] ?? $_SESSION['username'];
$schoolId = $_SESSION['school_id'] ?? '';
$userRole = $_SESSION['role'] ?? 'admin';
$section = isset($_GET['section']) ? $_GET['section'] : 'announcements';
$courseMajorMap = [
  'IT' => ['Computer Technology', 'Electronics'],
  'BSED' => ['English', 'Physical Education', 'Math', 'Filipino', 'Social Science'],
  'HM' => ['General'],
  'BEED' => ['General'],
  'TOURISM' => ['General']
];
$semesterOptions = ['First Semester', 'Second Semester'];

// Redirect old user_management URLs to manage_students (preserve query parameters)
if ($section === 'user_management') {
  $params = $_GET;
  $params['section'] = 'manage_students';
  // Preserve tab parameter if it exists, otherwise default to students
  if (isset($params['tab'])) {
    if ($params['tab'] === 'teachers') {
      $params['section'] = 'manage_teachers';
      unset($params['tab']);
    } elseif ($params['tab'] === 'schedules') {
      $params['section'] = 'schedule_management';
      unset($params['tab']);
    } else {
      unset($params['tab']); // students tab -> manage_students
    }
  }
  header('Location: /TCC/public/admin_dashboard.php?' . http_build_query($params));
  exit();
}

// Temporarily route deprecated sections back to student management
if ($section === 'manage_teachers' || $section === 'schedule_management') {
  $params = $_GET;
  $params['section'] = 'manage_students';
  header('Location: /TCC/public/admin_dashboard.php?' . http_build_query($params));
  exit();
}

if (empty($schoolId)) {
  try {
    require_once __DIR__ . '/../BackEnd/database/db.php';
    $conn = Database::getInstance()->getConnection();
    $stmt = $conn->prepare("SELECT id, school_id, role, created_at FROM users WHERE username = ? LIMIT 1");
    if ($stmt) {
      $usernameLookup = $_SESSION['username'];
      $stmt->bind_param('s', $usernameLookup);
      $stmt->execute();
      $res = $stmt->get_result();
      if ($row = $res->fetch_assoc()) {
        $schoolId = $row['school_id'] ?? '';
        $userRole = $row['role'] ?? $_SESSION['role'] ?? 'admin';
        if (empty($schoolId)) {
          require_once __DIR__ . '/../BackEnd/helpers/school_id.php';
          try {
            $schoolId = ensure_school_id_for_user($conn, $row);
          } catch (Throwable $th) {
            $schoolId = '';
          }
        }
        if (!empty($schoolId)) {
          $_SESSION['school_id'] = $schoolId;
        }
      }
      $stmt->close();
    }
  } catch (Throwable $th) {
    $schoolId = '';
  }
}
?>
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes" />
    <link rel="stylesheet" href="css/bootstrap.min.css" />
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" />
    <link rel="stylesheet" href="css/home.css" />
    <link rel="stylesheet" href="css/admin_dashboard.css" />
    <link rel="stylesheet" href="css/admin_sidebar.css" />
    <title>Admin Dashboard</title>
  </head>
  <body class="admin-dashboard">
    <!-- Edit User Modal -->
    <div class="modal fade" id="editUserModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-lg">
            <div class="modal-content">
              <form method="post" action="/TCC/BackEnd/admin/manage_users.php">
                <input type="hidden" name="action" value="update" />
                <div class="modal-header">
                  <h5 class="modal-title">
                    <i class="bi bi-pencil-square me-2"></i>Edit User Financial Status
                  </h5>
                  <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                  <div class="mb-3">
                    <label class="admin-form-label" id="modalFullNameLabel"><i class="bi bi-person-badge"></i> Full Name</label>
                    <p id="modalFullNameDisplay" class="form-control-plaintext fw-bold fs-5" aria-labelledby="modalFullNameLabel"></p>
                    <input type="hidden" name="full_name" id="modalFullName" />
                  </div>
                  <div class="row g-3">
                    <div class="col-md-6">
                      <label class="admin-form-label" for="modalPayment"><i class="bi bi-wallet2"></i> Payment Status</label>
                      <select name="payment" id="modalPayment" class="form-select form-select-lg">
                        <option value="paid">Paid</option>
                        <option value="owing">Lacking Payment</option>
                      </select>
                    </div>
                    <div class="col-md-6">
                      <label class="admin-form-label" for="modalDepartment"><i class="bi bi-building"></i> Department</label>
                      <select name="department" id="modalDepartment" class="form-select form-select-lg" data-course-select>
                        <option value="">(none)</option>
                        <option value="IT">IT</option>
                        <option value="HM">HM</option>
                        <option value="BSED">BSED</option>
                        <option value="BEED">BEED</option>
                        <option value="TOURISM">TOURISM</option>
                      </select>
                    </div>
                    <div class="col-md-6">
                      <label class="admin-form-label" for="modalMajor"><i class="bi bi-diagram-3"></i> Major</label>
                      <select name="major" id="modalMajor" class="form-select form-select-lg" data-major-select>
                        <option value="">(none)</option>
                      </select>
                    </div>
                  </div>
                  <div class="mb-3 mt-3" id="owingRow" style="display:none;">
                    <label class="admin-form-label" for="modalOwingAmount"><i class="bi bi-currency-dollar"></i> Amount Owing</label>
                    <input name="owing_amount" id="modalOwingAmount" class="form-control form-control-lg" placeholder="e.g. 2350.00" type="number" step="0.01" min="0"/>
                  </div>
                  <div class="mb-3">
                    <label class="admin-form-label" for="modalSanctions"><i class="bi bi-exclamation-triangle"></i> Sanctions (Days)</label>
                    <input name="sanctions" id="modalSanctions" class="form-control form-control-lg" placeholder="Enter number of days (e.g. 3) or date (YYYY-MM-DD)" />
                    <small class="text-muted">Enter number of days for sanction duration, or a date in YYYY-MM-DD format</small>
                  </div>
                </div>
                <div class="modal-footer">
                  <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                    <i class="bi bi-x-circle me-1"></i>Cancel
                  </button>
                  <button type="submit" class="btn btn-primary">
                    <i class="bi bi-check-circle me-1"></i>Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
    </div>
    <div class="page-container">
      <aside class="sidebar">
        <div class="sidebar-glass"></div>
        <div class="sidebar-top">
          <div class="sidebar-profile-tile">
            <img src="<?php echo htmlspecialchars($image); ?>" class="sidebar-logo" alt="admin"/>
            <?php if (!empty($schoolId)): ?>
              <span class="sidebar-school-id" title="School ID"><?php echo htmlspecialchars($schoolId); ?></span>
            <?php endif; ?>
            <?php if (!empty($userRole)): ?>
              <span class="sidebar-role" title="Role"><?php echo htmlspecialchars(ucfirst($userRole)); ?></span>
            <?php endif; ?>
          </div>
        </div>
        <nav class="sidebar-nav">
          <ul>
            <li><a href="/TCC/public/admin_dashboard.php?section=announcements" class="nav-link <?php echo ($section==='announcements')?'active':''?>" data-bs-toggle="tooltip" title="Announcements"><i class="bi bi-megaphone-fill"></i><span class="nav-label">Announcements</span></a></li>
            <li><a href="/TCC/public/admin_dashboard.php?section=buildings" class="nav-link <?php echo ($section==='buildings')?'active':''?>" data-bs-toggle="tooltip" title="Buildings"><i class="bi bi-building"></i><span class="nav-label">Buildings</span></a></li>
            <li><a href="/TCC/public/admin_dashboard.php?section=projects" class="nav-link <?php echo ($section==='projects')?'active':''?>" data-bs-toggle="tooltip" title="Projects"><i class="bi bi-folder-fill"></i><span class="nav-label">Projects</span></a></li>
            <li><a href="/TCC/public/admin_dashboard.php?section=manage_students" class="nav-link <?php echo ($section==='manage_students')?'active':''?>" data-bs-toggle="tooltip" title="Manage Students"><i class="bi bi-people-fill"></i><span class="nav-label">Manage Students</span></a></li>
            <li><a href="/TCC/public/admin_dashboard.php?section=manage_user" class="nav-link <?php echo ($section==='manage_user')?'active':''?>" data-bs-toggle="tooltip" title="Manage User"><i class="bi bi-person-gear"></i><span class="nav-label">Manage User</span></a></li>
            <li><a href="/TCC/public/admin_dashboard.php?section=teacher_management" class="nav-link <?php echo ($section==='teacher_management')?'active':''?>" data-bs-toggle="tooltip" title="Teacher Management"><i class="bi bi-person-badge"></i><span class="nav-label">Teacher Management</span></a></li>
            <li><a href="/TCC/public/admin_dashboard.php?section=evaluation" class="nav-link <?php echo ($section==='evaluation')?'active':''?>" data-bs-toggle="tooltip" title="Evaluation Management"><i class="bi bi-clipboard-check"></i><span class="nav-label">Evaluation</span></a></li>
            <li><a href="/TCC/public/admin_dashboard.php?section=sections" class="nav-link <?php echo ($section==='sections')?'active':''?>" data-bs-toggle="tooltip" title="Sections"><i class="bi bi-collection-fill"></i><span class="nav-label">Sections</span></a></li>
            <li><a href="/TCC/public/admin_dashboard.php?section=subjects" class="nav-link <?php echo ($section==='subjects')?'active':''?>" data-bs-toggle="tooltip" title="Subject Catalog"><i class="bi bi-journal-text"></i><span class="nav-label">Subjects</span></a></li>
            <li><a href="/TCC/public/admin_dashboard.php?section=study_load" class="nav-link <?php echo ($section==='study_load')?'active':''?>" data-bs-toggle="tooltip" title="Customize Study Load"><i class="bi bi-journal-check"></i><span class="nav-label">Customize Study Load</span></a></li>
            <li><a href="/TCC/public/admin_dashboard.php?section=grade_system" class="nav-link <?php echo ($section==='grade_system')?'active':''?>" data-bs-toggle="tooltip" title="Grade System"><i class="bi bi-journal-bookmark-fill"></i><span class="nav-label">Grade System</span></a></li>
            <li><a href="/TCC/public/admin_dashboard.php?section=settings" class="nav-link <?php echo ($section==='settings')?'active':''?>" data-bs-toggle="tooltip" title="Settings"><i class="bi bi-gear-fill"></i><span class="nav-label">Settings</span></a></li>
          </ul>
        </nav>
        <div class="sidebar-bottom">
          <a href="/TCC/public/home.php" class="btn btn-switch-view sidebar-switch-btn" title="Switch to User View">
            <i class="bi bi-people-fill"></i>
            <span>User View</span>
          </a>
          <a href="/TCC/BackEnd/auth/logout.php" class="btn logout-icon" title="Logout"><i class="bi bi-box-arrow-right"></i></a>
        </div>
      </aside>

      <main class="home-main">
        <?php
        $heroSpotlights = [
          'announcements' => [
            'title' => 'Announcements',
            'copy' => 'Compose fresh updates, pin urgent bulletins, and keep the campus informed with streamlined editing tools.'
          ],
          'buildings' => [
            'title' => 'Facilities & Rooms',
            'copy' => 'Assign sections in moments, review capacities, and keep building details aligned with the physical campus.'
          ],
          'projects' => [
            'title' => 'Campus Projects',
            'copy' => 'Surface budgets, highlight completion milestones, and maintain transparency on ongoing initiatives.'
          ],
          'manage_students' => [
            'title' => 'Manage Students',
            'copy' => 'Handle student assignments, monitor financial standing, and manage sanctions.'
          ],
          'manage_user' => [
            'title' => 'Manage User Roles',
            'copy' => 'Set user roles (Student, Admin, or Teacher) for all users in the system.'
          ],
          'teacher_management' => [
            'title' => 'Teacher Management',
            'copy' => 'View and manage teacher schedules, class assignments, and teaching loads.'
          ],
          'evaluation' => [
            'title' => 'Evaluation Management',
            'copy' => 'Enable or disable teacher evaluations and view teachers with lowest ratings.'
          ],
          'sections' => [
            'title' => 'Sections',
            'copy' => 'Create and manage academic sections for each year level. Organize students into groups like Power, Benevolence, and more.'
          ],
          'subjects' => [
            'title' => 'Subject Catalog',
            'copy' => 'Centralize every subject code, title, and unit requirement to eliminate typos during enrollment.'
          ],
          'study_load' => [
            'title' => 'Customize Study Load',
            'copy' => 'Assign subjects per year and section, manage units, and keep faculty loads aligned with the curriculum.'
          ],
          'grade_system' => [
            'title' => 'Grade System',
            'copy' => 'Manage student progress, semester summaries, and detailed records with the enhanced modal experience.'
          ],
          'settings' => [
            'title' => 'Settings',
            'copy' => 'Configure database backups, automate schedules, and keep administrative safeguards up to date.'
          ],
        ];
        $activeSpotlight = $heroSpotlights[$section] ?? $heroSpotlights['grade_system'];
        ?>
        <section class="dashboard-hero">
          <div class="hero-content">
            <span class="hero-eyebrow">Administrative Portal</span>
            <h1 class="hero-title">Welcome back, <?php echo htmlspecialchars($adminName); ?>.</h1>
            <p class="hero-copy">
              Stay in control of campus activity with quick insights and refined tools designed around our new aesthetic.
              Use the quick links to jump straight into the workspace you need.
            </p>
            <div class="hero-action-group">
              <a class="hero-action <?php echo ($section === 'announcements') ? 'active' : ''; ?>" href="/TCC/public/admin_dashboard.php?section=announcements">
                <i class="bi bi-megaphone-fill"></i>
                <span>Announcements</span>
              </a>
              <a class="hero-action <?php echo ($section === 'buildings') ? 'active' : ''; ?>" href="/TCC/public/admin_dashboard.php?section=buildings">
                <i class="bi bi-building"></i>
                <span>Facilities</span>
              </a>
              <a class="hero-action <?php echo ($section === 'projects') ? 'active' : ''; ?>" href="/TCC/public/admin_dashboard.php?section=projects">
                <i class="bi bi-folder-fill"></i>
                <span>Projects</span>
              </a>
              <a class="hero-action <?php echo ($section === 'manage_students') ? 'active' : ''; ?>" href="/TCC/public/admin_dashboard.php?section=manage_students">
                <i class="bi bi-people-fill"></i>
                <span>Students</span>
              </a>
              <a class="hero-action <?php echo ($section === 'manage_user') ? 'active' : ''; ?>" href="/TCC/public/admin_dashboard.php?section=manage_user">
                <i class="bi bi-person-gear"></i>
                <span>User Roles</span>
              </a>
              <a class="hero-action <?php echo ($section === 'teacher_management') ? 'active' : ''; ?>" href="/TCC/public/admin_dashboard.php?section=teacher_management">
                <i class="bi bi-person-badge"></i>
                <span>Teachers</span>
              </a>
              <a class="hero-action <?php echo ($section === 'evaluation') ? 'active' : ''; ?>" href="/TCC/public/admin_dashboard.php?section=evaluation">
                <i class="bi bi-clipboard-check"></i>
                <span>Evaluation</span>
              </a>
              <a class="hero-action <?php echo ($section === 'sections') ? 'active' : ''; ?>" href="/TCC/public/admin_dashboard.php?section=sections">
                <i class="bi bi-collection-fill"></i>
                <span>Sections</span>
              </a>
              <a class="hero-action <?php echo ($section === 'subjects') ? 'active' : ''; ?>" href="/TCC/public/admin_dashboard.php?section=subjects">
                <i class="bi bi-journal-text"></i>
                <span>Subjects</span>
              </a>
              <a class="hero-action <?php echo ($section === 'study_load') ? 'active' : ''; ?>" href="/TCC/public/admin_dashboard.php?section=study_load">
                <i class="bi bi-journal-check"></i>
                <span>Study Load</span>
              </a>
              <a class="hero-action <?php echo ($section === 'grade_system') ? 'active' : ''; ?>" href="/TCC/public/admin_dashboard.php?section=grade_system">
                <i class="bi bi-journal-bookmark-fill"></i>
                <span>Grade System</span>
              </a>
              <a class="hero-action <?php echo ($section === 'settings') ? 'active' : ''; ?>" href="/TCC/public/admin_dashboard.php?section=settings">
                <i class="bi bi-gear-fill"></i>
                <span>Settings</span>
              </a>
              </div>
            </div>
          <div class="hero-spotlight">
            <div class="spotlight-card">
              <span class="spotlight-eyebrow">Current Focus</span>
              <h2 class="spotlight-title"><?php echo htmlspecialchars($activeSpotlight['title']); ?></h2>
              <p class="spotlight-copy"><?php echo htmlspecialchars($activeSpotlight['copy']); ?></p>
              </div>
            <div class="spotlight-card alt clock-card">
              <p class="clock-time"><span id="admClockTime">--:--</span><span class="clock-time-sub" id="admClockSub">--</span></p>
              <p class="clock-day" id="admClockDay">Loading...</p>
              <i class="bi bi-moon-stars clock-moon"></i>
            </div>
          </div>
        </section>

          <?php if ($section === 'announcements'): ?>
            <?php
            // announcement edit support and pagination
            require_once __DIR__ . '/../BackEnd/database/db.php';
            $conn = Database::getInstance()->getConnection();
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
            $editId = isset($_GET['edit_id']) ? intval($_GET['edit_id']) : 0;
            $editRow = null;
            if ($editId > 0) {
              $s = $conn->prepare("SELECT id, title, content, year, department" . ($announcementHasMajor ? ", major" : "") . " FROM announcements WHERE id = ? LIMIT 1");
              $s->bind_param('i', $editId);
              $s->execute();
              $r = $s->get_result();
              $editRow = $r->fetch_assoc();
            }

            // pagination variables for announcements
            $annPerPage = 5;
            $annPage = isset($_GET['ann_page']) ? max(1, intval($_GET['ann_page'])) : 1;
            $annOffset = ($annPage - 1) * $annPerPage;
            $annList = [];
            $annTotal = 0;
            $annTotalPages = 1;
            try {
              // count total announcements
              $countRes = $conn->query("SELECT COUNT(*) as c FROM announcements");
              if ($countRes) { $cntRow = $countRes->fetch_assoc(); $annTotal = intval($cntRow['c']); }
              $annTotalPages = max(1, intval(ceil($annTotal / $annPerPage)));
              $stmt = $conn->prepare("SELECT $announcementSelectColumns FROM announcements ORDER BY date DESC LIMIT ? OFFSET ?");
              if ($stmt) {
                $stmt->bind_param('ii', $annPerPage, $annOffset);
                $stmt->execute();
                $res = $stmt->get_result();
                while ($row = $res->fetch_assoc()) { $annList[] = $row; }
                $stmt->close();
              }
            } catch (Throwable $ex) {
              // fallback to JSON when table missing or DB error
              $annPathFallback = __DIR__ . '/../database/announcements.json';
              if (file_exists($annPathFallback)) { $all = json_decode(file_get_contents($annPathFallback), true) ?: []; } else { $all = []; }
              $annTotal = count($all);
              $annTotalPages = max(1, intval(ceil($annTotal / $annPerPage)));
              $start = $annOffset;
              $annList = array_slice($all, $start, $annPerPage);
            }
            ?>
            <div class="records-container">
              <div class="records-header">
                <h2 class="records-title">
                  <i class="bi bi-megaphone-fill"></i> Announcements
                </h2>
                <p class="records-subtitle">Manage and create announcements for students</p>
              </div>
              <div class="records-main">
            <div class="info-card">
              <div class="card-header-modern">
                <i class="bi bi-megaphone-fill"></i>
                    <h3><?php echo $editRow ? 'Edit Announcement' : 'Create New Announcement'; ?></h3>
              </div>
                <form class="form-small" action="/TCC/BackEnd/admin/save_announcement.php" method="post">
                  <?php if ($editRow): ?><input type="hidden" name="id" value="<?php echo (int)$editRow['id']; ?>" /><?php endif; ?>
                  <div class="mb-2"><label class="form-label" for="announcementTitle">Title</label><input name="title" id="announcementTitle" class="form-control" required value="<?php echo $editRow ? htmlspecialchars($editRow['title']) : ''; ?>"/></div>
                  <div class="mb-2"><label class="form-label" for="announcementContent">Content</label><textarea name="content" id="announcementContent" class="form-control" rows="3" required><?php echo $editRow ? htmlspecialchars($editRow['content']) : ''; ?></textarea></div>
                  <div class="row g-2 mb-2">
                      <div class="col"><label class="form-label" for="announcementYear">Year</label><select name="year" id="announcementYear" class="form-select"><option value="">All</option><option value="1" <?php echo ($editRow && $editRow['year']=='1')?'selected':'';?>>1</option><option value="2" <?php echo ($editRow && $editRow['year']=='2')?'selected':'';?>>2</option><option value="3" <?php echo ($editRow && $editRow['year']=='3')?'selected':'';?>>3</option><option value="4" <?php echo ($editRow && $editRow['year']=='4')?'selected':'';?>>4</option></select></div>
                      <div class="col"><label class="form-label" for="announcementDepartment">Department</label><select name="department" id="announcementDepartment" class="form-select" data-course-select><option value="">All</option><option value="IT" <?php echo ($editRow && $editRow['department']=='IT')?'selected':'';?>>IT</option><option value="HM" <?php echo ($editRow && $editRow['department']=='HM')?'selected':'';?>>HM</option><option value="BSED" <?php echo ($editRow && $editRow['department']=='BSED')?'selected':'';?>>BSED</option><option value="BEED" <?php echo ($editRow && $editRow['department']=='BEED')?'selected':'';?>>BEED</option><option value="TOURISM" <?php echo ($editRow && $editRow['department']=='TOURISM')?'selected':'';?>>TOURISM</option></select></div>
                      <div class="col"><label class="form-label" for="announcementMajor">Major</label><select name="major" id="announcementMajor" class="form-select" data-major-select data-selected="<?php echo $editRow ? htmlspecialchars($editRow['major'] ?? '') : ''; ?>"><option value="">(none)</option></select></div>
                  </div>
                  <button class="btn btn-primary"><?php echo $editRow ? 'Update Announcement' : 'Save Announcement'; ?></button>
                  <?php if ($editRow): ?><a href="/TCC/public/admin_dashboard.php?section=announcements" class="btn btn-secondary ms-2">Cancel</a><?php endif; ?>
                </form>
              </div>

                <?php if (empty($annList)): ?>
            <div class="info-card mt-3">
              <div class="card-header-modern">
                      <i class="bi bi-megaphone"></i>
                      <h3>No Announcements</h3>
              </div>
                    <p class="text-muted mb-0">No announcements have been created yet. Create one above to get started.</p>
                  </div>
                <?php else: ?>
                  <div class="announcements-grid mt-3">
                  <?php foreach ($annList as $a):
                    $announcementMajor = $a['major'] ?? '';
                  ?>
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
                          <?php if (!empty($a['department'])): ?>
                            <span class="announcement-badge">
                              <i class="bi bi-building"></i>
                              <?php echo htmlspecialchars($a['department']); ?>
                            </span>
                          <?php endif; ?>
                          <?php if (!empty($announcementMajor)): ?>
                            <span class="announcement-badge">
                              <i class="bi bi-diagram-3"></i>
                              <?php echo htmlspecialchars($announcementMajor); ?>
                            </span>
                          <?php endif; ?>
                        <?php if (!empty($a['id'])): ?>
                            <div class="announcement-actions" style="display: flex; gap: 8px;">
                              <a href="/TCC/public/admin_dashboard.php?section=announcements&edit_id=<?php echo (int)$a['id']; ?>" class="Btn Btn-edit">
                                <div class="svgWrapper">
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 42 42" class="svgIcon">
                                    <path stroke-width="5" stroke="#fff" d="M21 5L7 19L5 37L23 35L37 21L21 5Z"></path>
                                    <path stroke-width="3" stroke="#fff" d="M21 5L37 21"></path>
                                    <path stroke-width="3" stroke="#fff" d="M15 19L23 27"></path>
                                  </svg>
                                  <div class="text">Edit</div>
                                </div>
                              </a>
                        <form method="post" action="/TCC/BackEnd/admin/delete_announcement.php" onsubmit="return confirm('Delete this announcement?');" style="display:inline;">
                          <input type="hidden" name="id" value="<?php echo (int)$a['id']; ?>" />
                                <button class="Btn Btn-delete" type="submit">
                                  <div class="svgWrapper">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 42 42" class="svgIcon">
                                      <path stroke-width="5" stroke="#fff" d="M9.14073 2.5H32.8593C33.3608 2.5 33.8291 2.75065 34.1073 3.16795L39.0801 10.6271C39.3539 11.0378 39.5 11.5203 39.5 12.0139V21V37C39.5 38.3807 38.3807 39.5 37 39.5H5C3.61929 39.5 2.5 38.3807 2.5 37V21V12.0139C2.5 11.5203 2.6461 11.0378 2.91987 10.6271L7.89266 3.16795C8.17086 2.75065 8.63921 2.5 9.14073 2.5Z"></path>
                                      <path stroke-width="5" stroke="#fff" d="M14 18L28 18M18 14V30M24 14V30"></path>
                                    </svg>
                                    <div class="text">Delete</div>
                                  </div>
                                </button>
                        </form>
                            </div>
                        <?php endif; ?>
                      </div>
                      </div>
                  <?php endforeach; ?>
              </div>

              <!-- pagination for announcements -->
              <?php if (isset($annTotalPages) && $annTotalPages > 1): ?>
                  <nav class="mt-3" aria-label="Announcements pages">
                    <ul class="pagination pagination-sm justify-content-center">
                  <?php
                  $baseParams = $_GET; unset($baseParams['ann_page']);
                  $prevPage = max(1, $annPage-1); $nextPage = min($annTotalPages, $annPage+1);
                  $prevClass = ($annPage <= 1) ? 'disabled' : '';
                  $nextClass = ($annPage >= $annTotalPages) ? 'disabled' : '';
                  $baseParams['ann_page'] = $prevPage; echo '<li class="page-item ' . $prevClass . '"><a class="page-link" href="?' . htmlspecialchars(http_build_query($baseParams)) . '" aria-label="Previous announcements page">&lt;</a></li>';

                  $showPages = min(5, $annTotalPages);
                  for ($p = 1; $p <= $showPages; $p++) {
                    $baseParams['ann_page'] = $p; $qstr = htmlspecialchars(http_build_query($baseParams));
                    $isActive = ($p === $annPage);
                    $active = $isActive ? ' active' : '';
                    $aria = $isActive ? ' aria-current="page"' : '';
                    echo '<li class="page-item' . $active . '"><a class="page-link" href="?' . $qstr . '" aria-label="Announcements page ' . $p . '"' . $aria . '>' . $p . '</a></li>';
                  }

                  $baseParams['ann_page'] = $nextPage; echo '<li class="page-item ' . $nextClass . '"><a class="page-link" href="?' . htmlspecialchars(http_build_query($baseParams)) . '" aria-label="Next announcements page">&gt;</a></li>';
                  ?>
                </ul>
              </nav>
                  <?php endif; ?>
              <?php endif; ?>
              </div>
            </div>
            <?php
            // end announcements
            ?>

          <?php elseif ($section === 'buildings'): ?>
            <?php
            // Initialize toast variables
            if (!isset($toastMessage)) $toastMessage = '';
            if (!isset($toastType)) $toastType = 'success';
            
            // Load database connection early
            require_once __DIR__ . '/../BackEnd/database/db.php';
            $bPath = __DIR__ . '/../database/buildings.json';
            $buildings = [];
            if (file_exists($bPath)) { $buildings = json_decode(file_get_contents($bPath), true) ?: []; }
            
            // Initialize editSectionRow early to prevent undefined variable error
            $editSectionId = isset($_GET['edit_section_id']) ? intval($_GET['edit_section_id']) : 0;
            $editSectionRow = null;
            if ($editSectionId > 0) {
              try {
                $connEdit = Database::getInstance()->getConnection();
                $editStmt = $connEdit->prepare("SELECT id, year, section, building, floor, room FROM section_assignments WHERE id = ? LIMIT 1");
                $editStmt->bind_param('i', $editSectionId);
                $editStmt->execute();
                $editRes = $editStmt->get_result();
                $editSectionRow = $editRes->fetch_assoc();
                $editStmt->close();
              } catch (Throwable $ex) {
                $editSectionRow = null;
              }
            }
            ?>
            <div class="records-container">
              <div class="records-header">
                <h2 class="records-title">
                  <i class="bi bi-building"></i> Buildings & Facilities
                </h2>
                <p class="records-subtitle">Manage buildings, rooms, and section assignments</p>
              </div>
              <div class="records-main">
            <?php 
            // Toast notifications for buildings section
            if (isset($_GET['success'])): 
              $successMsg = $_GET['success'];
              if ($successMsg === '1' || $successMsg === 'deleted' || $successMsg === 'updated'): 
                if ($successMsg === 'deleted') {
                  $toastMessage = 'Section assignment deleted successfully!';
                } elseif ($successMsg === 'updated') {
                  $toastMessage = 'Section assignment updated successfully!';
                } else {
                  $toastMessage = 'Section assignment saved successfully!';
                }
                $toastType = 'success';
              endif;
            endif;
            if (isset($_GET['error'])): 
              $errorMsg = $_GET['error'];
              $toastType = 'error';
              if ($errorMsg === 'missing') {
                $toastMessage = 'Error: Please fill in all required fields (Year, Section, Building, Floor, and Room).';
              } elseif ($errorMsg === 'notfound') {
                $toastMessage = 'Error: Building not found.';
              } elseif ($errorMsg === 'dberror') {
                $toastMessage = 'Error: Database operation failed. Please check the server logs or try again.';
              } elseif ($errorMsg === 'section_not_found') {
                $toastMessage = 'Error: Section does not exist. Please create the section first in the Sections section.';
              } else {
                $toastMessage = 'Error: ' . htmlspecialchars($errorMsg);
              }
            endif;
            ?>
            <div class="info-card">
              <div class="card-header-modern">
                <i class="bi bi-building"></i>
                <h3>Manage Buildings &amp; Rooms</h3>
              </div>
              <div class="card-body p-3">
                <form class="row g-3 align-items-end" action="/TCC/BackEnd/admin/manage_buildings.php" method="post">
                  <div class="col-md-3">
                    <label class="form-label fw-bold" for="buildingName">Building</label>
                    <input name="building" id="buildingName" class="form-control" placeholder="A" required autocomplete="off"/>
                  </div>
                  <div class="col-md-3">
                    <label class="form-label fw-bold" for="buildingFloors">Floors</label>
                    <input name="floors" id="buildingFloors" type="number" class="form-control" value="4" min="1" required autocomplete="off"/>
                  </div>
                  <div class="col-md-3">
                    <label class="form-label fw-bold" for="buildingRooms">Rooms per floor</label>
                    <input name="rooms" id="buildingRooms" type="number" class="form-control" value="4" min="1" required autocomplete="off"/>
                  </div>
                  <div class="col-md-3">
                    <label class="form-label d-block">&nbsp;</label>
                    <button class="btn btn-primary w-100">Save Building</button>
                  </div>
                </form>
              </div>
            </div>
            <?php
            // paginate buildings (convert assoc -> list of entries)
            $bldPerPage = 5;
            $bldPage = isset($_GET['bld_page']) ? max(1, intval($_GET['bld_page'])) : 1;
            $bEntries = [];
            foreach ($buildings as $bn => $binfo) { $bEntries[] = ['name'=>$bn, 'info'=>$binfo]; }
            $bldTotal = count($bEntries);
            $bldTotalPages = max(1, intval(ceil($bldTotal / $bldPerPage)));
            $bldSlice = array_slice($bEntries, ($bldPage-1)*$bldPerPage, $bldPerPage);
            
            // Load section assignments from database
            $sa = [];
            try {
              $connSa = Database::getInstance()->getConnection();
              $saQuery = $connSa->query("SELECT id, year, section, building, floor, room FROM section_assignments ORDER BY year, section");
              if ($saQuery) {
                while ($row = $saQuery->fetch_assoc()) {
                  $sa[] = $row;
                }
              }
            } catch (Throwable $ex) {
              // Fallback to JSON
              $saPath = __DIR__ . '/../database/section_assignments.json';
              if (file_exists($saPath)) { 
                $saJson = json_decode(file_get_contents($saPath), true) ?: [];
                foreach ($saJson as $key => $info) {
                  if (!isset($info['id'])) {
                    $info['id'] = 0; // Assign temporary ID for JSON entries
                  }
                  $sa[] = $info;
                }
              }
            }
            ?>
            <div class="buildings-grid mt-3">
              <div class="info-card buildings-card">
              <div class="card-header-modern">
                <i class="bi bi-building-check"></i>
                <h3>Configured Buildings</h3>
              </div>
                <ul class="list-group">
                  <?php if (empty($bEntries)): ?><li class="list-group-item text-muted">No buildings configured.</li><?php endif; ?>
                  <?php foreach ($bldSlice as $ent): $bname = $ent['name']; $binfo = $ent['info']; ?>
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                      <div>
                        <strong>Building <?php echo htmlspecialchars($bname); ?></strong> — Floors: <?php echo (int)$binfo['floors']; ?>, Rooms/floor: <?php echo (int)$binfo['rooms']; ?>
                      </div>
                      <form action="/TCC/BackEnd/admin/manage_buildings.php" method="post" style="display:inline;" onsubmit="return confirm('Are you sure you want to delete Building <?php echo htmlspecialchars($bname); ?>? This action cannot be undone.');">
                        <input type="hidden" name="action" value="delete" />
                        <input type="hidden" name="building" value="<?php echo htmlspecialchars($bname); ?>" />
                        <button type="submit" class="Btn Btn-delete">
                          <div class="svgWrapper">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 42 42" class="svgIcon">
                              <path stroke-width="5" stroke="#fff" d="M9.14073 2.5H32.8593C33.3608 2.5 33.8291 2.75065 34.1073 3.16795L39.0801 10.6271C39.3539 11.0378 39.5 11.5203 39.5 12.0139V21V37C39.5 38.3807 38.3807 39.5 37 39.5H5C3.61929 39.5 2.5 38.3807 2.5 37V21V12.0139C2.5 11.5203 2.6461 11.0378 2.91987 10.6271L7.89266 3.16795C8.17086 2.75065 8.63921 2.5 9.14073 2.5Z"></path>
                              <path stroke-width="5" stroke="#fff" d="M14 18L28 18M18 14V30M24 14V30"></path>
                            </svg>
                            <div class="text">Delete</div>
                          </div>
                        </button>
                      </form>
                    </li>
                  <?php endforeach; ?>
                </ul>
              <?php if ($bldTotalPages > 1): ?>
              <nav class="mt-2" aria-label="Buildings pages">
                <ul class="pagination pagination-sm">
                  <?php
                  $baseParams = $_GET; unset($baseParams['bld_page']);
                  $prevPage = max(1, $bldPage-1); $nextPage = min($bldTotalPages, $bldPage+1);
                  $prevClass = ($bldPage <= 1) ? 'disabled' : '';
                  $nextClass = ($bldPage >= $bldTotalPages) ? 'disabled' : '';
                  $baseParams['bld_page'] = $prevPage; echo '<li class="page-item ' . $prevClass . '"><a class="page-link" href="?' . htmlspecialchars(http_build_query($baseParams)) . '" aria-label="Previous buildings page">&lt;</a></li>';
                  $showPages = min(5, $bldTotalPages);
                  for ($p = 1; $p <= $showPages; $p++) { $baseParams['bld_page'] = $p; $qstr = htmlspecialchars(http_build_query($baseParams)); $isActive = ($p === $bldPage); $active = $isActive ? ' active' : ''; $aria = $isActive ? ' aria-current="page"' : ''; echo '<li class="page-item' . $active . '"><a class="page-link" href="?' . $qstr . '" aria-label="Buildings page ' . $p . '"' . $aria . '>' . $p . '</a></li>'; }
                  $baseParams['bld_page'] = $nextPage; echo '<li class="page-item ' . $nextClass . '"><a class="page-link" href="?' . htmlspecialchars(http_build_query($baseParams)) . '" aria-label="Next buildings page">&gt;</a></li>';
                  ?>
                </ul>
              </nav>
              <?php endif; ?>
              </div>
            </div>
            <?php
            // Get all sections from the sections table (synced with sections section)
            $availableSections = [];
            $existingAssignments = [];
            try {
              $connSections = Database::getInstance()->getConnection();
              
              // Ensure sections table exists
              $connSections->query("CREATE TABLE IF NOT EXISTS sections (
                id INT AUTO_INCREMENT PRIMARY KEY,
                year VARCHAR(10) NOT NULL,
                name VARCHAR(100) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uniq_year_name (year, name)
              ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
              
              // Get all sections from the sections table (this is the source of truth)
              $sectionsQuery = $connSections->query("SELECT year, name as section FROM sections ORDER BY CAST(year AS UNSIGNED), name");
              if ($sectionsQuery) {
                while ($row = $sectionsQuery->fetch_assoc()) {
                  $availableSections[] = $row;
                }
              }
              
              // Get all existing building/room assignments
              $existingQuery = $connSections->query("SELECT id, year, section, building, floor, room FROM section_assignments");
              if ($existingQuery) {
                while ($row = $existingQuery->fetch_assoc()) {
                  $key = $row['year'] . '|' . $row['section'];
                  $existingAssignments[$key] = $row;
                }
              }
            } catch (Throwable $ex) {
              $availableSections = [];
              $existingAssignments = [];
            }
            ?>
            <?php if ($editSectionRow): ?>
            <div class="info-card mt-3">
              <div class="card-header-modern">
                <i class="bi bi-pencil-square"></i>
                <h3>Edit Section Building &amp; Room Assignment</h3>
              </div>
                <form class="admin-user-assign-form" action="/TCC/BackEnd/admin/manage_section_assignments.php" method="post">
                <input type="hidden" name="action" value="update" />
                <input type="hidden" name="id" value="<?php echo (int)$editSectionRow['id']; ?>" />
                  <div class="row g-3">
                    <div class="col-md-3">
                      <div class="admin-form-group">
                        <label class="admin-form-label" for="editSectionYear"><i class="bi bi-calendar-year"></i> Year</label>
                        <select name="year" id="editSectionYear" class="form-select form-select-lg">
                        <option value="1" <?php echo ($editSectionRow['year']=='1')?'selected':'';?>>1st Year</option>
                        <option value="2" <?php echo ($editSectionRow['year']=='2')?'selected':'';?>>2nd Year</option>
                        <option value="3" <?php echo ($editSectionRow['year']=='3')?'selected':'';?>>3rd Year</option>
                        <option value="4" <?php echo ($editSectionRow['year']=='4')?'selected':'';?>>4th Year</option>
                        </select>
                      </div>
                    </div>
                    <div class="col-md-3">
                      <div class="admin-form-group">
                        <label class="admin-form-label" for="editSectionName"><i class="bi bi-people"></i> Section Name</label>
                      <input name="section" id="editSectionName" class="form-control form-control-lg" value="<?php echo htmlspecialchars($editSectionRow['section']); ?>" required autocomplete="off"/>
                      </div>
                    </div>
                    <div class="col-md-2">
                      <div class="admin-form-group">
                        <label class="admin-form-label" for="editSectionBuilding"><i class="bi bi-building"></i> Building</label>
                        <select name="building" id="editSectionBuilding" class="form-select form-select-lg" required>
                          <option value="">Select Building...</option>
                          <?php foreach (array_keys($buildings) as $bn): ?>
                          <option value="<?php echo htmlspecialchars($bn); ?>" <?php echo ($editSectionRow['building']===$bn)?'selected':'';?>><?php echo htmlspecialchars($bn); ?></option>
                          <?php endforeach; ?>
                        </select>
                      </div>
                    </div>
                    <div class="col-md-2">
                      <div class="admin-form-group">
                        <label class="admin-form-label" for="editSectionFloor"><i class="bi bi-layers"></i> Floor</label>
                      <input name="floor" id="editSectionFloor" type="number" class="form-control form-control-lg" value="<?php echo (int)$editSectionRow['floor']; ?>" min="1" required autocomplete="off"/>
                      </div>
                    </div>
                    <div class="col-md-2">
                      <div class="admin-form-group">
                        <label class="admin-form-label" for="editSectionRoom"><i class="bi bi-door-closed"></i> Room</label>
                      <input name="room" id="editSectionRoom" class="form-control form-control-lg" value="<?php echo htmlspecialchars($editSectionRow['room']); ?>" required autocomplete="off"/>
                      </div>
                    </div>
                  </div>
                  <div class="row g-3 mt-2">
                    <div class="col-md-12">
                      <button type="submit" class="btn btn-primary btn-lg">
                      <i class="bi bi-check-circle me-2"></i>Update Section Assignment
                      </button>
                    <a href="/TCC/public/admin_dashboard.php?section=buildings" class="btn btn-secondary btn-lg ms-2">
                      <i class="bi bi-x-circle me-2"></i>Cancel
                    </a>
                    </div>
                  </div>
                </form>
              </div>
            <?php else: ?>
            <div class="info-card mt-3">
              <div class="card-header-modern">
                <i class="bi bi-door-open"></i>
                <h3>Setup Section Building &amp; Room Assignment</h3>
              </div>
              <div class="admin-hint mb-3">
                <i class="bi bi-info-circle"></i>
                <span><strong>Note:</strong> When you assign a user to a year and section in User Management, their building and room will automatically display based on the section assignment below.</span>
              </div>
              <form class="admin-user-assign-form" action="/TCC/BackEnd/admin/manage_section_assignments.php" method="post">
                <input type="hidden" name="action" value="create" />
                <div class="row g-3">
                  <div class="col-md-3">
                    <div class="admin-form-group">
                      <label class="admin-form-label" for="sectionYear"><i class="bi bi-calendar-year"></i> Year</label>
                      <select name="year" id="sectionYear" class="form-select form-select-lg" required>
                        <option value="">Select Year...</option>
                        <option value="1">1st Year</option>
                        <option value="2">2nd Year</option>
                        <option value="3">3rd Year</option>
                        <option value="4">4th Year</option>
                      </select>
                    </div>
                  </div>
                  <div class="col-md-3">
                    <div class="admin-form-group">
                      <label class="admin-form-label" for="sectionName"><i class="bi bi-people"></i> Section Name</label>
                      <input name="section" id="sectionName" class="form-control form-control-lg" placeholder="Benevolence" required autocomplete="off"/>
                    </div>
                  </div>
                  <div class="col-md-2">
                    <div class="admin-form-group">
                      <label class="admin-form-label" for="sectionBuilding"><i class="bi bi-building"></i> Building</label>
                      <select name="building" id="sectionBuilding" class="form-select form-select-lg" required>
                        <option value="">Select Building...</option>
                        <?php foreach (array_keys($buildings) as $bn): ?>
                          <option value="<?php echo htmlspecialchars($bn); ?>"><?php echo htmlspecialchars($bn); ?></option>
                        <?php endforeach; ?>
                      </select>
                    </div>
                  </div>
                  <div class="col-md-2">
                    <div class="admin-form-group">
                      <label class="admin-form-label" for="sectionFloor"><i class="bi bi-layers"></i> Floor</label>
                      <input name="floor" id="sectionFloor" type="number" class="form-control form-control-lg" value="1" min="1" required autocomplete="off"/>
                    </div>
                  </div>
                  <div class="col-md-2">
                    <div class="admin-form-group">
                      <label class="admin-form-label" for="sectionRoom"><i class="bi bi-door-closed"></i> Room</label>
                      <input name="room" id="sectionRoom" class="form-control form-control-lg" placeholder="301" required autocomplete="off"/>
                    </div>
                  </div>
                </div>
                <div class="row g-3 mt-2">
                  <div class="col-md-12">
                    <button type="submit" class="btn btn-primary btn-lg">
                      <i class="bi bi-check-circle me-2"></i>Assign Section
                    </button>
                  </div>
                </div>
              </form>
            </div>
            <?php endif; ?>
            <div class="info-card mt-3">
              <div class="card-header-modern">
                <i class="bi bi-list-check"></i>
                <h3>Assign Building &amp; Room to Available Sections</h3>
              </div>
              <div class="admin-hint mb-3">
                <i class="bi bi-info-circle"></i>
                <span><strong>Quick Assign:</strong> Select from available sections and assign them to buildings and rooms.</span>
              </div>
              <?php if (empty($availableSections)): ?>
                <div class="alert alert-info">
                  <i class="bi bi-info-circle me-2"></i>No sections found. Please create sections in the Sections section first.
                </div>
              <?php else: ?>
                <div class="table-responsive">
                  <table class="table table-hover">
                    <thead>
                      <tr>
                        <th>Year</th>
                        <th>Section</th>
                        <th>Current Assignment</th>
                        <th>Building</th>
                        <th>Floor</th>
                        <th>Room</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      <?php foreach ($availableSections as $sec): 
                        $key = $sec['year'] . '|' . $sec['section'];
                        $existing = $existingAssignments[$key] ?? null;
                        $hasAssignment = $existing !== null;
                      ?>
                        <tr>
                          <td><strong><?php echo htmlspecialchars($sec['year']); ?></strong></td>
                          <td><?php echo htmlspecialchars($sec['section']); ?></td>
                          <td>
                            <?php if ($hasAssignment): ?>
                              <span class="badge bg-success">
                                <i class="bi bi-check-circle"></i> Building <?php echo htmlspecialchars($existing['building']); ?>, 
                                Floor <?php echo (int)$existing['floor']; ?>, 
                                Room <?php echo htmlspecialchars($existing['room']); ?>
                              </span>
                            <?php else: ?>
                              <span class="badge bg-warning">
                                <i class="bi bi-exclamation-triangle"></i> Not Assigned
                              </span>
                            <?php endif; ?>
                          </td>
                          <td>
                            <select name="building" class="form-select form-select-sm" form="assignForm_<?php echo htmlspecialchars($key); ?>" required>
                              <option value="">Select...</option>
                              <?php foreach (array_keys($buildings) as $bn): ?>
                                <option value="<?php echo htmlspecialchars($bn); ?>" <?php echo ($hasAssignment && $existing['building']===$bn)?'selected':'';?>><?php echo htmlspecialchars($bn); ?></option>
                              <?php endforeach; ?>
                            </select>
                          </td>
                          <td>
                            <input type="number" name="floor" class="form-control form-control-sm" 
                                   value="<?php echo $hasAssignment ? (int)$existing['floor'] : '1'; ?>" 
                                   min="1" form="assignForm_<?php echo htmlspecialchars($key); ?>" required />
                          </td>
                          <td>
                            <input type="text" name="room" class="form-control form-control-sm" 
                                   value="<?php echo $hasAssignment ? htmlspecialchars($existing['room']) : ''; ?>" 
                                   placeholder="301" form="assignForm_<?php echo htmlspecialchars($key); ?>" required />
                          </td>
                          <td>
                            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                              <form id="assignForm_<?php echo htmlspecialchars($key); ?>" action="/TCC/BackEnd/admin/manage_section_assignments.php" method="post" style="display:inline;" onsubmit="return updateSectionForm(this, '<?php echo htmlspecialchars($key); ?>')">
                                <input type="hidden" name="action" value="<?php echo $hasAssignment ? 'update' : 'create'; ?>" />
                                <?php if ($hasAssignment): ?>
                                  <input type="hidden" name="id" value="<?php echo (int)$existing['id']; ?>" />
                                <?php endif; ?>
                                <input type="hidden" name="year" value="<?php echo htmlspecialchars($sec['year']); ?>" />
                                <input type="hidden" name="section" value="<?php echo htmlspecialchars($sec['section']); ?>" />
                                <button type="submit" class="Btn Btn-edit">
                                  <div class="svgWrapper">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 42 42" class="svgIcon">
                                      <path stroke-width="5" stroke="#fff" d="M21 5L7 19L5 37L23 35L37 21L21 5Z"></path>
                                      <path stroke-width="3" stroke="#fff" d="M21 5L37 21"></path>
                                      <path stroke-width="3" stroke="#fff" d="M15 19L23 27"></path>
                                    </svg>
                                    <div class="text"><?php echo $hasAssignment ? 'Update' : 'Assign'; ?></div>
                                  </div>
                                </button>
                </form>
                              <?php if ($hasAssignment): ?>
                              <form action="/TCC/BackEnd/admin/manage_section_assignments.php" method="post" style="display:inline;" onsubmit="return confirm('Delete this section assignment? This will remove the building/room assignment for this section.');">
                                <input type="hidden" name="action" value="delete" />
                                <input type="hidden" name="id" value="<?php echo (int)$existing['id']; ?>" />
                                <input type="hidden" name="year" value="<?php echo htmlspecialchars($sec['year']); ?>" />
                                <input type="hidden" name="section" value="<?php echo htmlspecialchars($sec['section']); ?>" />
                                <button type="submit" class="Btn Btn-delete">
                                  <div class="svgWrapper">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 42 42" class="svgIcon">
                                      <path stroke-width="5" stroke="#fff" d="M9.14073 2.5H32.8593C33.3608 2.5 33.8291 2.75065 34.1073 3.16795L39.0801 10.6271C39.3539 11.0378 39.5 11.5203 39.5 12.0139V21V37C39.5 38.3807 38.3807 39.5 37 39.5H5C3.61929 39.5 2.5 38.3807 2.5 37V21V12.0139C2.5 11.5203 2.6461 11.0378 2.91987 10.6271L7.89266 3.16795C8.17086 2.75065 8.63921 2.5 9.14073 2.5Z"></path>
                                      <path stroke-width="5" stroke="#fff" d="M14 18L28 18M18 14V30M24 14V30"></path>
                                    </svg>
                                    <div class="text">Delete</div>
              </div>
                                </button>
                              </form>
                              <?php endif; ?>
            </div>
                          </td>
                        </tr>
                      <?php endforeach; ?>
                    </tbody>
                  </table>
                </div>
              <?php endif; ?>
            </div>
              </div>
            </div>

          <?php elseif ($section === 'projects'): ?>
            <?php
            // Initialize toast variables for projects
            if (!isset($toastMessage)) $toastMessage = '';
            if (!isset($toastType)) $toastType = 'success';
            
            // Handle toast notifications for projects
            if (isset($_GET['success'])) {
              if ($_GET['success'] === 'deleted') {
                $toastMessage = 'Project deleted successfully!';
              } else {
                $toastMessage = 'Project saved successfully!';
              }
              $toastType = 'success';
            } elseif (isset($_GET['error'])) {
              $toastType = 'error';
              if ($_GET['error'] === 'missing') {
                $toastMessage = 'Error: Please fill in all required fields.';
              } elseif ($_GET['error'] === 'invalid_index') {
                $toastMessage = 'Error: Invalid project index.';
              } else {
                $toastMessage = 'Error: ' . htmlspecialchars($_GET['error']);
              }
            }
            
            $pPath = __DIR__ . '/../database/projects.json';
            $projects = [];
            if (file_exists($pPath)) { $projects = json_decode(file_get_contents($pPath), true) ?: []; }
            // paginate projects
            $projPerPage = 5;
            $projPage = isset($_GET['proj_page']) ? max(1, intval($_GET['proj_page'])) : 1;
            $projTotal = count($projects);
            $projTotalPages = max(1, intval(ceil($projTotal / $projPerPage)));
            $projectsPage = array_slice($projects, ($projPage-1)*$projPerPage, $projPerPage);
            ?>
            <div class="records-container">
              <div class="records-header">
                <h2 class="records-title">
                  <i class="bi bi-folder-fill"></i> Projects
                </h2>
                <p class="records-subtitle">Manage campus projects and track their progress</p>
              </div>
              <div class="records-main">
                <div class="info-card">
                  <div class="card-header-modern">
                    <i class="bi bi-folder-fill"></i>
                    <h3>Create New Project</h3>
                  </div>
                  <form class="form-small" action="/TCC/BackEnd/admin/manage_projects.php" method="post">
                    <div class="mb-2"><label class="form-label" for="projectName">Project Name</label><input name="name" id="projectName" class="form-control" required autocomplete="organization"/></div>
                    <div class="mb-2 row g-2"><div class="col"><label class="form-label" for="projectBudget">Budget</label><input name="budget" id="projectBudget" class="form-control" required autocomplete="off"/></div><div class="col"><label class="form-label" for="projectStarted">Started</label><input name="started" id="projectStarted" type="date" class="form-control" required autocomplete="off"/></div></div>
                    <div class="mb-2"><label class="form-label" for="projectCompleted">Completed?</label><select name="completed" id="projectCompleted" class="form-select"><option value="no">No</option><option value="yes">Yes</option></select></div>
                    <button class="btn btn-primary">Save Project</button>
                  </form>
                </div>

                <?php if (empty($projectsPage)): ?>
            <div class="info-card mt-3">
              <div class="card-header-modern">
                      <i class="bi bi-folder-x"></i>
                      <h3>No Projects</h3>
              </div>
                    <p class="text-muted mb-0">No projects have been created yet. Create one above to get started.</p>
                </div>
                <?php else: ?>
                  <div class="projects-grid mt-3">
                    <?php foreach ($projectsPage as $index => $proj): 
                      $isCompleted = isset($proj['completed']) && strtolower($proj['completed']) === 'yes';
                      $actualIndex = ($projPage - 1) * $projPerPage + $index;
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
                        <div class="project-actions" style="margin-top: 12px; display: flex; gap: 8px; justify-content: flex-end;">
                          <form method="post" action="/TCC/BackEnd/admin/manage_projects.php" style="display:inline;" onsubmit="return confirm('Are you sure you want to delete this project?');">
                            <input type="hidden" name="action" value="delete" />
                            <input type="hidden" name="index" value="<?php echo $actualIndex; ?>" />
                            <button type="submit" class="Btn Btn-delete">
                              <div class="svgWrapper">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 42 42" class="svgIcon">
                                  <path stroke-width="5" stroke="#fff" d="M9.14073 2.5H32.8593C33.3608 2.5 33.8291 2.75065 34.1073 3.16795L39.0801 10.6271C39.3539 11.0378 39.5 11.5203 39.5 12.0139V21V37C39.5 38.3807 38.3807 39.5 37 39.5H5C3.61929 39.5 2.5 38.3807 2.5 37V21V12.0139C2.5 11.5203 2.6461 11.0378 2.91987 10.6271L7.89266 3.16795C8.17086 2.75065 8.63921 2.5 9.14073 2.5Z"></path>
                                  <path stroke-width="5" stroke="#fff" d="M14 18L28 18M18 14V30M24 14V30"></path>
                                </svg>
                                <div class="text">Delete</div>
                              </div>
                            </button>
                          </form>
                        </div>
                      </div>
                    <?php endforeach; ?>
              </div>

              <?php if ($projTotalPages > 1): ?>
                  <nav class="mt-3" aria-label="Projects pages">
                    <ul class="pagination pagination-sm justify-content-center">
                  <?php
                  $baseParams = $_GET; unset($baseParams['proj_page']);
                  $prevPage = max(1, $projPage-1); $nextPage = min($projTotalPages, $projPage+1);
                  $prevClass = ($projPage <= 1) ? 'disabled' : '';
                  $nextClass = ($projPage >= $projTotalPages) ? 'disabled' : '';
                  $baseParams['proj_page'] = $prevPage; echo '<li class="page-item ' . $prevClass . '"><a class="page-link" href="?' . htmlspecialchars(http_build_query($baseParams)) . '" aria-label="Previous projects page">&lt;</a></li>';
                  $showPages = min(5, $projTotalPages);
                  for ($p = 1; $p <= $showPages; $p++) { $baseParams['proj_page'] = $p; $qstr = htmlspecialchars(http_build_query($baseParams)); $isActive = ($p === $projPage); $active = $isActive ? ' active' : ''; $aria = $isActive ? ' aria-current="page"' : ''; echo '<li class="page-item' . $active . '"><a class="page-link" href="?' . $qstr . '" aria-label="Projects page ' . $p . '"' . $aria . '>' . $p . '</a></li>'; }
                  $baseParams['proj_page'] = $nextPage; echo '<li class="page-item ' . $nextClass . '"><a class="page-link" href="?' . htmlspecialchars(http_build_query($baseParams)) . '" aria-label="Next projects page">&gt;</a></li>';
                  ?>
                </ul>
              </nav>
                  <?php endif; ?>
              <?php endif; ?>
              </div>
            </div>

          <?php elseif ($section === 'manage_students'): ?>
            <?php
            require_once __DIR__ . '/../BackEnd/database/db.php';
            $conn = Database::getInstance()->getConnection();
            
            // Ensure teacher_assignments table exists
            $conn->query("CREATE TABLE IF NOT EXISTS teacher_assignments (
              id INT AUTO_INCREMENT PRIMARY KEY,
              user_id INT DEFAULT NULL,
              username VARCHAR(200) NOT NULL,
              year VARCHAR(10) NOT NULL,
              subject VARCHAR(255) NOT NULL,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              INDEX idx_user_id (user_id),
              INDEX idx_username (username),
              INDEX idx_year (year)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

            // filters
            $q = isset($_GET['q']) ? trim($_GET['q']) : '';
            $filterYear = isset($_GET['year_filter']) ? trim($_GET['year_filter']) : '';
            $filterSection = isset($_GET['section_filter']) ? trim($_GET['section_filter']) : '';
            $filterDept = isset($_GET['dept_filter']) ? trim($_GET['dept_filter']) : '';
            $filterMajor = isset($_GET['major_filter']) ? trim($_GET['major_filter']) : '';
            if ($filterDept === '' || !isset($courseMajorMap[$filterDept])) {
              $filterMajor = '';
            }
            $filterLacking = isset($_GET['lacking_payment']) ? true : false;
            $filterSanctions = isset($_GET['has_sanctions']) ? true : false;
            
            // Ensure sections table exists
            $conn->query("CREATE TABLE IF NOT EXISTS sections (
              id INT AUTO_INCREMENT PRIMARY KEY,
              year VARCHAR(10) NOT NULL,
              name VARCHAR(100) NOT NULL,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              UNIQUE KEY uniq_year_name (year, name)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
            
            // Get available years and sections for filter chips
            $availableFilterYears = [];
            $availableFilterSections = [];
            $availableFilterDepartments = [];
            
            // Get sections from the sections table (synced with sections section)
            $sectionsFilterQuery = $conn->query("SELECT DISTINCT year, name as section FROM sections ORDER BY CAST(year AS UNSIGNED), name");
            if ($sectionsFilterQuery) {
              while ($row = $sectionsFilterQuery->fetch_assoc()) {
                if (!empty($row['year']) && !in_array($row['year'], $availableFilterYears)) {
                  $availableFilterYears[] = $row['year'];
                }
                if (!empty($row['section']) && !in_array($row['section'], $availableFilterSections)) {
                  $availableFilterSections[] = $row['section'];
                }
              }
            }
            
            // Get departments from user_assignments (departments are not in sections table)
            $deptQuery = $conn->query("SELECT DISTINCT department FROM user_assignments WHERE department IS NOT NULL AND department <> '' ORDER BY department");
            if ($deptQuery) {
              while ($row = $deptQuery->fetch_assoc()) {
                if (!empty($row['department'])) {
                  $deptValue = $row['department'];
                  if ($deptValue === 'BSEED') { $deptValue = 'BSED'; }
                  if (!in_array($deptValue, $availableFilterDepartments)) {
                    $availableFilterDepartments[] = $deptValue;
                  }
                }
              }
            }
            ?>
            <?php

            // pagination
            $perPage = 10;
            $page = isset($_GET['ua_page']) ? max(1, intval($_GET['ua_page'])) : 1;
            $offset = ($page - 1) * $perPage;

            $conds = [];
            $types = '';
            $values = [];
            if ($q !== '') {
              $like = '%' . $q . '%';
              $conds[] = '(ua.username LIKE ? OR ua.section LIKE ? OR ua.department LIKE ?)';
              $types .= 'sss';
              $values[] = $like; $values[] = $like; $values[] = $like;
            }
            if ($filterYear !== '') { $conds[] = 'ua.year = ?'; $types .= 's'; $values[] = $filterYear; }
            if ($filterSection !== '') { $conds[] = 'ua.section = ?'; $types .= 's'; $values[] = $filterSection; }
            if ($filterDept !== '') {
              if ($filterDept === 'BSED') {
                $conds[] = "(ua.department = ? OR ua.department = 'BSEED')";
                $types .= 's';
                $values[] = $filterDept;
              } else {
                $conds[] = 'ua.department = ?';
                $types .= 's';
                $values[] = $filterDept;
              }
            }
            if ($filterMajor !== '') { $conds[] = 'ua.major = ?'; $types .= 's'; $values[] = $filterMajor; }
            if ($filterLacking) { $conds[] = 'ua.payment = ?'; $types .= 's'; $values[] = 'owing'; }
            if ($filterSanctions) { $conds[] = "TRIM(COALESCE(ua.sanctions,'')) <> ''"; }

            $where = count($conds) ? 'WHERE ' . implode(' AND ', $conds) : '';

            // total count
            $total = 0;
            $countSql = "SELECT COUNT(*) as c FROM user_assignments ua LEFT JOIN users u ON ua.user_id = u.id $where";
            $countStmt = $conn->prepare($countSql);
            if ($countStmt) {
              if ($types !== '') { $countStmt->bind_param($types, ...$values); }
              $countStmt->execute();
              $cres = $countStmt->get_result();
              if ($cr = $cres->fetch_assoc()) { $total = intval($cr['c']); }
              $countStmt->close();
            }

            $totalPages = max(1, intval(ceil($total / $perPage)));

            // fetch page rows with role information
            $ua = [];
            $selSql = "SELECT ua.id, ua.username, ua.year, ua.section, ua.department, ua.major, ua.payment, ua.sanctions, ua.owing_amount, ua.user_id, COALESCE(u.role, 'student') as role FROM user_assignments ua LEFT JOIN users u ON ua.user_id = u.id $where ORDER BY ua.year, ua.username LIMIT ? OFFSET ?";
            $selStmt = $conn->prepare($selSql);
            if ($selStmt) {
              if ($types !== '') {
                $bindTypes = $types . 'ii';
                $bindValues = array_merge($values, [$perPage, $offset]);
                $selStmt->bind_param($bindTypes, ...$bindValues);
              } else {
                $selStmt->bind_param('ii', $perPage, $offset);
              }
              $selStmt->execute();
              $res = $selStmt->get_result();
              while ($r = $res->fetch_assoc()) {
                $ua[] = $r;
              }
              $selStmt->close();
            }
            
            // Handle student management toasts
            if (isset($_GET['success'])) {
              $toastMessage = 'User assignment saved successfully!';
              $toastType = 'success';
            } elseif (isset($_GET['updated'])) {
              $toastMessage = 'User assignment updated successfully!';
              $toastType = 'success';
            } elseif (isset($_GET['deleted'])) {
              $toastMessage = 'User assignment deleted successfully!';
              $toastType = 'success';
            } elseif (isset($_GET['error'])) {
              $toastType = 'error';
              $errorMsg = $_GET['error'];
              if ($errorMsg === 'section_not_found') {
                $toastMessage = 'Error: Section does not exist. Please create the section first in the Sections section.';
              } elseif ($errorMsg === 'user_not_found') {
                $toastMessage = 'Error: User does not exist in the database. Please check the username or full name.';
              } else {
                $toastMessage = 'Error: ' . htmlspecialchars($errorMsg);
              }
            }
            ?>
            <div class="records-container">
              <div class="records-header">
                <h2 class="records-title">
                  <i class="bi bi-people-fill"></i> Manage Students
                </h2>
                <p class="records-subtitle">Manage student assignments, financial status, and sanctions</p>
              </div>
              <div class="records-main">
                <div class="info-card">
              <div class="card-header-modern">
                <i class="bi bi-person-plus"></i>
                <h3>Assign User to Year / Section</h3>
              </div>
              <form action="/TCC/BackEnd/admin/manage_users.php" method="post" class="admin-user-assign-form">
                <input type="hidden" name="action" value="assign" />
                <input type="hidden" id="existingUserIdHidden" name="existing_user_id" value="" />
                <div class="row g-3">
                  <div class="col-md-6">
                    <div class="admin-form-group">
                      <label class="admin-form-label" for="userSearchInput">
                        <i class="bi bi-search"></i> User Search
                      </label>
                      <div class="admin-search-wrapper">
                        <input type="text" id="userSearchInput" class="form-control form-control-lg" placeholder="Start typing a name or username" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="userSearchList" aria-haspopup="listbox" />
                        <ul id="userSearchList" role="listbox" class="admin-search-dropdown" aria-hidden="true"></ul>
                      </div>
                      <div class="admin-hint">
                        <i class="bi bi-info-circle"></i>
                        <span>Select a suggestion to map to an existing account, or type a full name to create an assignment without a user account.</span>
                      </div>
                    </div>
                  </div>
                  <div class="col-md-6">
                    <div class="admin-form-group">
                      <label class="admin-form-label" for="assignFullName">
                        <i class="bi bi-person-badge"></i> Full Name
                      </label>
                      <input type="text" id="assignFullName" name="full_name" class="form-control form-control-lg" placeholder="Full Name (e.g. Joshua Paculaba)" required />
                    </div>
                  </div>
                  <div class="col-md-3">
                    <div class="admin-form-group">
                      <label class="admin-form-label" for="assignYear">
                        <i class="bi bi-calendar-year"></i> Year
                      </label>
                      <select name="year" id="assignYear" class="form-select form-select-lg">
                        <option value="1">1st Year</option>
                        <option value="2">2nd Year</option>
                        <option value="3" selected>3rd Year</option>
                        <option value="4">4th Year</option>
                      </select>
                    </div>
                  </div>
                  <div class="col-md-3">
                    <div class="admin-form-group">
                      <label class="admin-form-label" for="assignSection">
                        <i class="bi bi-people"></i> Section
                      </label>
                      <input type="text" name="section" id="assignSection" class="form-control form-control-lg" placeholder="Benevolence" required />
                    </div>
                  </div>
                  <div class="col-md-3">
                    <div class="admin-form-group">
                      <label class="admin-form-label" for="assignDepartment">
                        <i class="bi bi-building"></i> Department
                      </label>
                      <select name="department" id="assignDepartment" class="form-select form-select-lg" data-course-select>
                        <option value="">(none)</option>
                        <option value="IT">IT</option>
                        <option value="HM">HM</option>
                        <option value="BSED">BSED</option>
                        <option value="BEED">BEED</option>
                        <option value="TOURISM">TOURISM</option>
                      </select>
                    </div>
                  </div>
                  <div class="col-md-3">
                    <div class="admin-form-group">
                      <label class="admin-form-label" for="assignMajor">
                        <i class="bi bi-diagram-3"></i> Major
                      </label>
                      <select name="major" id="assignMajor" class="form-select form-select-lg" data-major-select>
                        <option value="">(none)</option>
                      </select>
                    </div>
                  </div>
                  <div class="col-md-3 d-flex align-items-end">
                    <button type="submit" class="btn btn-primary btn-lg w-100">
                      <i class="bi bi-check-circle me-2"></i>Assign User
                    </button>
                  </div>
                </div>
              </form>
            </div>

            <div class="info-card mt-3 grade-filter-card">
              <div class="grade-filter-inner">
                <div class="grade-filter-head">
                  <div class="grade-filter-title">
                    <span class="grade-filter-icon"><i class="bi bi-funnel-fill"></i></span>
                    <div>
                      <h3>Filter Users</h3>
                      <p>Focus the overview by year, section, department, or status.</p>
                    </div>
                  </div>
                  <?php if ($filterYear !== '' || $filterSection !== '' || $filterDept !== '' || $filterMajor !== '' || $filterLacking || $filterSanctions || $q !== ''): ?>
                    <a href="/TCC/public/admin_dashboard.php?section=manage_students" class="grade-filter-reset">
                      <i class="bi bi-arrow-counterclockwise"></i> Reset view
                    </a>
                  <?php endif; ?>
                </div>
                
                <!-- Search Bar -->
                <form method="get" class="mb-3">
                  <input type="hidden" name="section" value="manage_students" />
                  <input type="hidden" name="year_filter" value="<?php echo htmlspecialchars($filterYear); ?>" />
                  <input type="hidden" name="section_filter" value="<?php echo htmlspecialchars($filterSection); ?>" />
                  <input type="hidden" name="dept_filter" value="<?php echo htmlspecialchars($filterDept); ?>" />
                  <input type="hidden" name="major_filter" value="<?php echo htmlspecialchars($filterMajor); ?>" />
                  <input type="hidden" name="lacking_payment" value="<?php echo $filterLacking ? '1' : ''; ?>" />
                  <input type="hidden" name="has_sanctions" value="<?php echo $filterSanctions ? '1' : ''; ?>" />
                  <div class="input-group input-group-lg">
                    <label for="userSearchQuery" class="visually-hidden">Search users</label>
                    <span class="input-group-text" style="background: rgba(107, 95, 79, 0.12); border: 1px solid rgba(107, 95, 79, 0.3);">
                      <i class="bi bi-search"></i>
                    </span>
                    <input type="search" name="q" id="userSearchQuery" class="form-control" placeholder="Search by full name, section, department, or major..." value="<?php echo htmlspecialchars($q); ?>" style="border: 1px solid rgba(107, 95, 79, 0.3);" autocomplete="off" />
                    <?php if ($q !== ''): ?>
                      <button type="submit" class="btn btn-primary">
                        <i class="bi bi-funnel-fill"></i> Search
                      </button>
                    <?php endif; ?>
                  </div>
                </form>
                
                <div class="grade-filter-actions">
                  <?php if (!empty($availableFilterYears)): ?>
                  <div class="grade-filter-group">
                    <span class="grade-filter-label">Year Level</span>
                    <?php 
                    $filterBase = $_GET;
                    $filterBase['section'] = 'manage_students';
                    unset($filterBase['year_filter']);
                    $yearBase = $filterBase;
                    $yearAllUrl = '/TCC/public/admin_dashboard.php?' . htmlspecialchars(http_build_query($yearBase));
                    ?>
                    <a href="<?php echo $yearAllUrl; ?>" class="grade-chip <?php echo ($filterYear === '') ? 'active' : ''; ?>">
                      <i class="bi bi-layers"></i>
                      <span>All Years</span>
                    </a>
                    <?php foreach ($availableFilterYears as $yearValue): 
                      $yearParams = $yearBase;
                      $yearParams['year_filter'] = $yearValue;
                      $yearUrl = '/TCC/public/admin_dashboard.php?' . htmlspecialchars(http_build_query($yearParams));
                      $yearLabel = $yearValue === '1' ? '1st Year' : ($yearValue === '2' ? '2nd Year' : ($yearValue === '3' ? '3rd Year' : ($yearValue === '4' ? '4th Year' : $yearValue . ' Year')));
                      ?>
                      <a href="<?php echo $yearUrl; ?>" class="grade-chip <?php echo ($filterYear === $yearValue) ? 'active' : ''; ?>">
                        <i class="bi bi-calendar-week"></i>
                        <span><?php echo htmlspecialchars($yearLabel); ?></span>
                      </a>
                    <?php endforeach; ?>
                  </div>
                  <?php endif; ?>
                  
                  <?php if (!empty($availableFilterSections)): ?>
                  <div class="grade-filter-group">
                    <span class="grade-filter-label">Section</span>
                    <?php
                    $sectionBase = $filterBase;
                    unset($sectionBase['section_filter']);
                    $sectionAllUrl = '/TCC/public/admin_dashboard.php?' . htmlspecialchars(http_build_query($sectionBase));
                    ?>
                    <a href="<?php echo $sectionAllUrl; ?>" class="grade-chip <?php echo (!isset($_GET['section_filter']) || $_GET['section_filter'] === '') ? 'active' : ''; ?>">
                      <i class="bi bi-grid-1x2"></i>
                      <span>All Sections</span>
                    </a>
                    <?php foreach ($availableFilterSections as $sectionValue): 
                      $sectionParams = $sectionBase;
                      $sectionParams['section_filter'] = $sectionValue;
                      $sectionUrl = '/TCC/public/admin_dashboard.php?' . htmlspecialchars(http_build_query($sectionParams));
                      ?>
                      <a href="<?php echo $sectionUrl; ?>" class="grade-chip <?php echo (isset($_GET['section_filter']) && $_GET['section_filter'] === $sectionValue) ? 'active' : ''; ?>">
                        <i class="bi bi-collection"></i>
                        <span><?php echo htmlspecialchars($sectionValue); ?></span>
                      </a>
                    <?php endforeach; ?>
                  </div>
                  <?php endif; ?>
                  
                  <?php if (!empty($availableFilterDepartments)): ?>
                  <div class="grade-filter-group">
                    <span class="grade-filter-label">Department</span>
                    <?php
                    $deptBase = $filterBase;
                    unset($deptBase['dept_filter']);
                    $deptAllUrl = '/TCC/public/admin_dashboard.php?' . htmlspecialchars(http_build_query($deptBase));
                    ?>
                    <a href="<?php echo $deptAllUrl; ?>" class="grade-chip <?php echo ($filterDept === '') ? 'active' : ''; ?>">
                      <i class="bi bi-grid-1x2"></i>
                      <span>All Departments</span>
                    </a>
                    <?php foreach ($availableFilterDepartments as $deptValue): 
                      $deptParams = $deptBase;
                      $deptParams['dept_filter'] = $deptValue;
                      $deptUrl = '/TCC/public/admin_dashboard.php?' . htmlspecialchars(http_build_query($deptParams));
                      ?>
                      <a href="<?php echo $deptUrl; ?>" class="grade-chip <?php echo ($filterDept === $deptValue) ? 'active' : ''; ?>">
                        <i class="bi bi-building"></i>
                        <span><?php echo htmlspecialchars($deptValue); ?></span>
                      </a>
                    <?php endforeach; ?>
                  </div>
                  <?php endif; ?>
                  
                  <?php
                  $majorOptionsForDept = ($filterDept !== '' && isset($courseMajorMap[$filterDept])) ? $courseMajorMap[$filterDept] : [];
                  if (!empty($majorOptionsForDept)):
                    $majorBase = $filterBase;
                    $majorBase['dept_filter'] = $filterDept;
                    unset($majorBase['major_filter']);
                    $majorAllUrl = '/TCC/public/admin_dashboard.php?' . htmlspecialchars(http_build_query($majorBase));
                  ?>
                  <div class="grade-filter-group">
                    <span class="grade-filter-label">Major</span>
                    <a href="<?php echo $majorAllUrl; ?>" class="grade-chip <?php echo ($filterMajor === '') ? 'active' : ''; ?>">
                      <i class="bi bi-diagram-3"></i>
                      <span>All Majors</span>
                    </a>
                    <?php foreach ($majorOptionsForDept as $majorValue): 
                      $majorParams = $majorBase;
                      $majorParams['major_filter'] = $majorValue;
                      $majorUrl = '/TCC/public/admin_dashboard.php?' . htmlspecialchars(http_build_query($majorParams));
                      ?>
                      <a href="<?php echo $majorUrl; ?>" class="grade-chip <?php echo ($filterMajor === $majorValue) ? 'active' : ''; ?>">
                        <i class="bi bi-bookmark-check"></i>
                        <span><?php echo htmlspecialchars($majorValue); ?></span>
                      </a>
                    <?php endforeach; ?>
                  </div>
                  <?php endif; ?>
                  
                  <div class="grade-filter-group">
                    <span class="grade-filter-label">Status</span>
                    <?php
                    $statusBase = $filterBase;
                    unset($statusBase['lacking_payment'], $statusBase['has_sanctions']);
                    $statusAllUrl = '/TCC/public/admin_dashboard.php?' . htmlspecialchars(http_build_query($statusBase));
                    ?>
                    <a href="<?php echo $statusAllUrl; ?>" class="grade-chip <?php echo (!$filterLacking && !$filterSanctions) ? 'active' : ''; ?>">
                      <i class="bi bi-check-circle"></i>
                      <span>All Status</span>
                    </a>
                    <?php
                    $lackingParams = $statusBase;
                    $lackingParams['lacking_payment'] = '1';
                    $lackingUrl = '/TCC/public/admin_dashboard.php?' . htmlspecialchars(http_build_query($lackingParams));
                    ?>
                    <a href="<?php echo $lackingUrl; ?>" class="grade-chip <?php echo $filterLacking ? 'active' : ''; ?>">
                      <i class="bi bi-exclamation-triangle"></i>
                      <span>Lacking Payment</span>
                    </a>
                    <?php
                    $sanctionsParams = $statusBase;
                    $sanctionsParams['has_sanctions'] = '1';
                    $sanctionsUrl = '/TCC/public/admin_dashboard.php?' . htmlspecialchars(http_build_query($sanctionsParams));
                    ?>
                    <a href="<?php echo $sanctionsUrl; ?>" class="grade-chip <?php echo $filterSanctions ? 'active' : ''; ?>">
                      <i class="bi bi-shield-exclamation"></i>
                      <span>Has Sanctions</span>
                    </a>
                  </div>
                </div>
                
                <?php if ($filterYear !== '' || $filterSection !== '' || $filterDept !== '' || $filterMajor !== '' || $filterLacking || $filterSanctions || $q !== ''): ?>
                  <div class="grade-filter-note">
                    <i class="bi bi-info-circle"></i>
                    Showing user assignments
                    <?php if ($filterYear !== ''): ?>
                      for <strong><?php echo htmlspecialchars($filterYear === '1' ? '1st Year' : ($filterYear === '2' ? '2nd Year' : ($filterYear === '3' ? '3rd Year' : ($filterYear === '4' ? '4th Year' : $filterYear . ' Year')))); ?></strong>
                    <?php endif; ?>
                    <?php if ($filterSection !== ''): ?>
                      in section <strong><?php echo htmlspecialchars($filterSection); ?></strong>
                    <?php endif; ?>
                    <?php if ($filterDept !== ''): ?>
                      in department <strong><?php echo htmlspecialchars($filterDept); ?></strong>
                    <?php endif; ?>
                    <?php if ($filterMajor !== ''): ?>
                      (Major <strong><?php echo htmlspecialchars($filterMajor); ?></strong>)
                    <?php endif; ?>
                    <?php if ($filterLacking): ?>
                      with <strong>lacking payment</strong>
                    <?php endif; ?>
                    <?php if ($filterSanctions): ?>
                      with <strong>sanctions</strong>
                    <?php endif; ?>
                    <?php if ($q !== ''): ?>
                      matching "<strong><?php echo htmlspecialchars($q); ?></strong>"
                    <?php endif; ?>
                    .
                  </div>
                <?php endif; ?>
              </div>
            </div>

            <div class="info-card mt-3">
              <div class="card-header-modern">
                <i class="bi bi-list-check"></i>
                <h3>User Assignments (<?php echo $total; ?> total)</h3>
              </div>
              <div class="table-responsive">
                <table class="table table-hover">
                  <thead>
                    <tr>
                      <th>Full Name</th>
                      <th>Role</th>
                      <th>Year</th>
                      <th>Section</th>
                      <th>Department</th>
                      <th>Major</th>
                      <th>Payment</th>
                      <th>Sanctions</th>
                      <th>Owing Amount</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <?php if (empty($ua)): ?>
                      <tr>
                        <td colspan="10" class="text-center text-muted py-4">
                          <i class="bi bi-inbox"></i> No user assignments found.
                        </td>
                      </tr>
                    <?php else: ?>
                      <?php foreach ($ua as $r):
                        $assignmentId = $r['id'] ?? null;
                        $fullName = $r['username'];
                        $role = $r['role'] ?? 'student';
                        $year = $r['year'] ?? '';
                        $sectionName = $r['section'] ?? '';
                        $department = $r['department'] ?? '';
                        if ($department === 'BSEED') { $department = 'BSED'; }
                        $major = $r['major'] ?? '';
                        $payment = $r['payment'] ?? 'paid';
                        $sanctions = $r['sanctions'] ?? '';
                        $owingAmount = $r['owing_amount'] ?? '';
                        
                        // Role badge colors
                        $roleBadgeClass = 'secondary';
                        $roleLabel = ucfirst($role);
                        if ($role === 'admin') {
                          $roleBadgeClass = 'danger';
                        } elseif ($role === 'teacher') {
                          $roleBadgeClass = 'info';
                        } elseif ($role === 'student') {
                          $roleBadgeClass = 'success';
                        }

                        $sanctionDisplay = 'None';
                        $sanctionDays = null;
                        if (!empty($sanctions)) {
                          if (preg_match('/(\d{4}-\d{2}-\d{2})/', $sanctions, $matches)) {
                            $sanctionDate = new DateTime($matches[1]);
                            $now = new DateTime();
                            if ($sanctionDate > $now) {
                              $diff = $now->diff($sanctionDate);
                              $sanctionDays = $diff->days;
                              $sanctionDisplay = $sanctionDays . ' days';
                            } else {
                              $sanctionDisplay = 'Expired';
                            }
                          } elseif (is_numeric($sanctions)) {
                            $sanctionDays = intval($sanctions);
                            $sanctionDisplay = $sanctionDays . ' days';
                          } else {
                            $sanctionDisplay = $sanctions;
                          }
                        }
                      ?>
                        <tr>
                          <td><strong><?php echo htmlspecialchars($fullName); ?></strong></td>
                          <td>
                            <span class="badge bg-<?php echo $roleBadgeClass; ?>">
                              <?php echo htmlspecialchars($roleLabel); ?>
                            </span>
                          </td>
                          <td><?php echo htmlspecialchars($year); ?></td>
                          <td><?php echo htmlspecialchars($sectionName); ?></td>
                          <td><?php echo htmlspecialchars($department ?: '-'); ?></td>
                          <td><?php echo htmlspecialchars($major ?: '-'); ?></td>
                          <td>
                            <span class="badge bg-<?php echo $payment === 'paid' ? 'success' : 'danger'; ?>">
                              <?php echo htmlspecialchars($payment); ?>
                            </span>
                          </td>
                          <td>
                            <?php if ($sanctionDays !== null && $sanctionDays > 0): ?>
                              <span class="badge bg-warning"><?php echo $sanctionDays; ?> days</span>
                            <?php elseif ($sanctionDisplay !== 'None'): ?>
                              <span class="badge bg-warning"><?php echo htmlspecialchars($sanctionDisplay); ?></span>
                            <?php else: ?>
                              <span class="badge bg-success">None</span>
                            <?php endif; ?>
                          </td>
                          <td>
                            <?php if ($payment === 'owing' && !empty($owingAmount)): ?>
                              <span class="text-danger fw-bold">₱<?php echo htmlspecialchars($owingAmount); ?></span>
                            <?php else: ?>
                              <span class="text-muted">-</span>
                            <?php endif; ?>
                          </td>
                          <td>
                            <div style="display: flex; gap: 8px;">
                              <button type="button" class="Btn Btn-edit" data-bs-toggle="modal" data-bs-target="#editUserModal"
                                data-fullname="<?php echo htmlspecialchars($fullName); ?>"
                                data-payment="<?php echo htmlspecialchars($payment); ?>"
                                data-sanctions="<?php echo htmlspecialchars($sanctions); ?>"
                                data-department="<?php echo htmlspecialchars($department); ?>"
                                data-major="<?php echo htmlspecialchars($major); ?>"
                                data-owing="<?php echo htmlspecialchars($owingAmount); ?>"
                              >
                                <div class="svgWrapper">
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 42 42" class="svgIcon">
                                    <path stroke-width="5" stroke="#fff" d="M21 5L7 19L5 37L23 35L37 21L21 5Z"></path>
                                    <path stroke-width="3" stroke="#fff" d="M21 5L37 21"></path>
                                    <path stroke-width="3" stroke="#fff" d="M15 19L23 27"></path>
                                  </svg>
                                  <div class="text">Edit</div>
                                </div>
                              </button>
                              <?php if ($assignmentId): ?>
                              <form method="post" action="/TCC/BackEnd/admin/manage_users.php" onsubmit="return confirm('Are you sure you want to delete this user assignment? This action cannot be undone.');" style="display:inline;">
                                <input type="hidden" name="action" value="delete" />
                                <input type="hidden" name="id" value="<?php echo (int)$assignmentId; ?>" />
                                <button type="submit" class="Btn Btn-delete">
                                  <div class="svgWrapper">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 42 42" class="svgIcon">
                                      <path stroke-width="5" stroke="#fff" d="M9.14073 2.5H32.8593C33.3608 2.5 33.8291 2.75065 34.1073 3.16795L39.0801 10.6271C39.3539 11.0378 39.5 11.5203 39.5 12.0139V21V37C39.5 38.3807 38.3807 39.5 37 39.5H5C3.61929 39.5 2.5 38.3807 2.5 37V21V12.0139C2.5 11.5203 2.6461 11.0378 2.91987 10.6271L7.89266 3.16795C8.17086 2.75065 8.63921 2.5 9.14073 2.5Z"></path>
                                      <path stroke-width="5" stroke="#fff" d="M14 18L28 18M18 14V30M24 14V30"></path>
                                    </svg>
                                    <div class="text">Delete</div>
                                  </div>
                                </button>
                              </form>
                              <?php endif; ?>
                            </div>
                          </td>
                        </tr>
                      <?php endforeach; ?>
                    <?php endif; ?>
                  </tbody>
                </table>
              </div>

              <?php if ($totalPages > 1): ?>
              <nav class="mt-3" aria-label="User assignments pages">
                <ul class="pagination justify-content-center">
                  <?php
                  $baseParams = $_GET;
                  unset($baseParams['ua_page']);
                  $prevPage = max(1, $page - 1);
                  $nextPage = min($totalPages, $page + 1);
                  $prevClass = ($page <= 1) ? 'disabled' : '';
                  $nextClass = ($page >= $totalPages) ? 'disabled' : '';

                  $baseParams['ua_page'] = $prevPage;
                  echo '<li class="page-item ' . $prevClass . '"><a class="page-link" href="?' . htmlspecialchars(http_build_query($baseParams)) . '">&laquo; Previous</a></li>';

                  $showPages = min(5, $totalPages);
                  $startPage = max(1, min($page - 2, $totalPages - $showPages + 1));
                  for ($p = $startPage; $p < $startPage + $showPages && $p <= $totalPages; $p++) {
                    $baseParams['ua_page'] = $p;
                    $qstr = htmlspecialchars(http_build_query($baseParams));
                    $isActive = ($p === $page);
                    $active = $isActive ? ' active' : '';
                    echo '<li class="page-item' . $active . '"><a class="page-link" href="?' . $qstr . '">' . $p . '</a></li>';
                  }

                  $baseParams['ua_page'] = $nextPage;
                  echo '<li class="page-item ' . $nextClass . '"><a class="page-link" href="?' . htmlspecialchars(http_build_query($baseParams)) . '">Next &raquo;</a></li>';
                  ?>
                </ul>
              </nav>
              <?php endif; ?>
                </div>
              </div>
            </div>
          </div>

          <?php elseif ($section === 'teacher_management'): ?>
            <?php
            require_once __DIR__ . '/../BackEnd/database/db.php';
            $conn = Database::getInstance()->getConnection();
            
            // Ensure teacher_assignments table exists with new schema
            $conn->query("CREATE TABLE IF NOT EXISTS teacher_assignments (
              id INT AUTO_INCREMENT PRIMARY KEY,
              user_id INT DEFAULT NULL,
              teacher_name VARCHAR(200) NOT NULL,
              subject_code VARCHAR(50) NOT NULL,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              INDEX idx_user_id (user_id),
              INDEX idx_teacher_name (teacher_name),
              INDEX idx_subject_code (subject_code),
              UNIQUE KEY uniq_teacher_subject (teacher_name, subject_code)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
            
            // Migrate old schema to new if needed
            $colCheck = $conn->query("SHOW COLUMNS FROM teacher_assignments LIKE 'teacher_name'");
            if ($colCheck && $colCheck->num_rows === 0) {
              // Old schema exists, migrate it
              $conn->query("ALTER TABLE teacher_assignments ADD COLUMN teacher_name VARCHAR(200) NOT NULL DEFAULT '' AFTER user_id");
              $conn->query("ALTER TABLE teacher_assignments ADD COLUMN subject_code VARCHAR(50) NOT NULL DEFAULT '' AFTER teacher_name");
              $conn->query("UPDATE teacher_assignments SET teacher_name = username, subject_code = subject WHERE teacher_name = '' OR subject_code = ''");
              $conn->query("ALTER TABLE teacher_assignments DROP COLUMN username");
              $conn->query("ALTER TABLE teacher_assignments DROP COLUMN year");
              $conn->query("ALTER TABLE teacher_assignments DROP COLUMN subject");
              $conn->query("ALTER TABLE teacher_assignments ADD UNIQUE KEY uniq_teacher_subject (teacher_name, subject_code)");
              $conn->query("ALTER TABLE teacher_assignments ADD INDEX idx_teacher_name (teacher_name)");
              $conn->query("ALTER TABLE teacher_assignments ADD INDEX idx_subject_code (subject_code)");
            }
            if ($colCheck) { $colCheck->close(); }
            
            // Ensure subjects table exists
            $conn->query("CREATE TABLE IF NOT EXISTS subjects (
              id INT AUTO_INCREMENT PRIMARY KEY,
              subject_code VARCHAR(50) NOT NULL,
              title VARCHAR(255) NOT NULL,
              units INT DEFAULT 0,
              course VARCHAR(20) NOT NULL,
              major VARCHAR(50) NOT NULL,
              year_level INT NOT NULL,
              semester VARCHAR(20) NOT NULL DEFAULT 'First Semester',
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              UNIQUE KEY uniq_subject_code (subject_code),
              INDEX idx_course_major_year (course, major, year_level, semester)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
            
            // Handle teacher management toasts
            if (isset($_GET['success'])) {
              $successMsg = $_GET['success'];
              if ($successMsg === 'teacher_assigned') {
                $toastMessage = 'Teacher assigned successfully!';
              } elseif ($successMsg === 'teacher_deleted') {
                $toastMessage = 'Teacher assignment deleted successfully!';
              } elseif ($successMsg === 'created') {
                $toastMessage = 'Schedule created successfully!';
              } elseif ($successMsg === 'updated') {
                $toastMessage = 'Schedule updated successfully!';
              } elseif ($successMsg === 'deleted') {
                $toastMessage = 'Schedule deleted successfully!';
              } else {
                $toastMessage = 'Operation completed successfully!';
              }
              $toastType = 'success';
            } elseif (isset($_GET['error'])) {
              $toastType = 'error';
              $errorMsg = $_GET['error'];
              if ($errorMsg === 'user_not_found') {
                $toastMessage = 'Error: User does not exist in the database. Please check the username or full name.';
              } elseif ($errorMsg === 'subject_not_found') {
                $toastMessage = 'Error: Subject does not exist. Please add the subject in the Subjects section first.';
              } elseif ($errorMsg === 'instructor_not_found') {
                $toastMessage = 'Error: No teacher assigned to this subject. Please assign a teacher to this subject in "Add Teacher to Subject" first.';
              } elseif ($errorMsg === 'section_not_found') {
                $toastMessage = 'Error: Section does not exist. Please add the section first.';
              } elseif ($errorMsg === 'building_not_found') {
                $toastMessage = 'Error: Building does not exist. Please add the building first.';
              } elseif ($errorMsg === 'missing') {
                $missingFields = isset($_GET['fields']) ? htmlspecialchars($_GET['fields']) : 'required fields';
                $toastMessage = 'Error: Please fill in all required fields. Missing: ' . $missingFields;
              } elseif ($errorMsg === 'db_error') {
                $toastMessage = 'Error: Database error occurred. Please try again.';
              } elseif ($errorMsg === 'invalid_id') {
                $toastMessage = 'Error: Invalid ID. Please try again.';
              } elseif ($errorMsg === 'not_teacher') {
                $toastMessage = 'Error: Selected user does not have teacher role. Please set the user role to "teacher" in Manage User section first.';
              } else {
                $toastMessage = 'Error: ' . htmlspecialchars($errorMsg);
              }
            }
            
            // Check if table has new schema (teacher_name, subject_code) or old (username, year, subject)
            $colCheck = $conn->query("SHOW COLUMNS FROM teacher_assignments LIKE 'teacher_name'");
            $hasNewSchema = $colCheck && $colCheck->num_rows > 0;
            if ($colCheck) { $colCheck->close(); }
            
            // Get teacher assignments
            $teacherAssignments = [];
            if ($hasNewSchema) {
              $teacherQuery = $conn->query("SELECT ta.id, ta.teacher_name, ta.subject_code, ta.user_id, u.full_name, COALESCE(u.role, 'teacher') as role, s.title as subject_title FROM teacher_assignments ta LEFT JOIN users u ON ta.user_id = u.id LEFT JOIN subjects s ON ta.subject_code = s.subject_code ORDER BY ta.teacher_name, ta.subject_code");
            } else {
              $teacherQuery = $conn->query("SELECT ta.id, ta.username as teacher_name, ta.year, ta.subject as subject_code, ta.user_id, u.full_name, COALESCE(u.role, 'teacher') as role FROM teacher_assignments ta LEFT JOIN users u ON ta.user_id = u.id ORDER BY ta.year, ta.subject, ta.username");
            }
            if ($teacherQuery) {
              while ($row = $teacherQuery->fetch_assoc()) {
                $teacherAssignments[] = $row;
              }
            }
            
            // Get all subjects for dropdown
            $allSubjects = [];
            $subjectsQuery = $conn->query("SELECT subject_code, title FROM subjects ORDER BY subject_code");
            if ($subjectsQuery) {
              while ($row = $subjectsQuery->fetch_assoc()) {
                $allSubjects[] = $row;
              }
            }
            
            // Get available buildings for schedule form
            $availableBuildings = [];
            $buildingsQuery = $conn->query("SELECT name FROM buildings ORDER BY name");
            if ($buildingsQuery) {
              while ($row = $buildingsQuery->fetch_assoc()) {
                $availableBuildings[] = $row['name'];
              }
            }
            // Also check JSON fallback
            if (empty($availableBuildings)) {
              $buildingsPath = __DIR__ . '/../database/buildings.json';
              if (file_exists($buildingsPath)) {
                $buildingsData = json_decode(file_get_contents($buildingsPath), true) ?: [];
                $availableBuildings = array_keys($buildingsData);
              }
            }
            
            // Get available sections for schedule form
            $availableSections = [];
            $sectionsQuery = $conn->query("SELECT DISTINCT name FROM sections ORDER BY name");
            if ($sectionsQuery) {
              while ($row = $sectionsQuery->fetch_assoc()) {
                $availableSections[] = $row['name'];
              }
            }
            
            // Ensure schedules table has class_type column
            $colCheck = $conn->query("SHOW COLUMNS FROM schedules LIKE 'class_type'");
            if ($colCheck && $colCheck->num_rows === 0) {
              $conn->query("ALTER TABLE schedules ADD COLUMN class_type ENUM('day', 'night') DEFAULT 'day' AFTER building");
            }
            if ($colCheck) { $colCheck->close(); }
            ?>
            <div class="records-container">
              <div class="records-header">
                <h2 class="records-title">
                  <i class="bi bi-person-badge"></i> Teacher Management
                </h2>
                <p class="records-subtitle">Assign teachers to subjects, manage instructor assignments</p>
              </div>
              <div class="records-main">
                <div class="info-card">
                  <div class="card-header-modern">
                    <i class="bi bi-person-badge"></i>
                    <h3>Add Teacher to Subject</h3>
                  </div>
                  <form action="/TCC/BackEnd/admin/manage_users.php" method="post" class="admin-user-assign-form" id="assignTeacherForm">
                    <input type="hidden" name="action" value="assign_teacher" />
                    <input type="hidden" id="teacherUserIdHidden" name="existing_user_id" value="" />
                    <div class="row g-3">
                      <div class="col-md-5">
                        <div class="admin-form-group">
                          <label class="admin-form-label" for="teacherFullName">
                            <i class="bi bi-person-badge"></i> Teacher Name
                          </label>
                          <select id="teacherFullName" name="full_name" class="form-select form-select-lg" required>
                            <option value="">Select Teacher...</option>
                            <?php
                            // Get all users with role='teacher'
                            $teacherUsers = [];
                            $teacherUsersQuery = $conn->query("SELECT id, full_name, username FROM users WHERE role = 'teacher' ORDER BY full_name");
                            if ($teacherUsersQuery) {
                              while ($tRow = $teacherUsersQuery->fetch_assoc()) {
                                $teacherUsers[] = $tRow;
                              }
                            }
                            foreach ($teacherUsers as $tUser): ?>
                              <option value="<?php echo htmlspecialchars($tUser['full_name']); ?>" data-user-id="<?php echo (int)$tUser['id']; ?>">
                                <?php echo htmlspecialchars($tUser['full_name']); ?>
                              </option>
                            <?php endforeach; ?>
                          </select>
                          <div class="admin-hint mt-2">
                            <i class="bi bi-info-circle"></i>
                            <span>Only users with role='teacher' can be assigned. If a teacher is not in the list, set their role to 'teacher' in Manage User section first.</span>
                          </div>
                        </div>
                      </div>
                      <div class="col-md-5">
                        <div class="admin-form-group">
                          <label class="admin-form-label" for="teacherSubjectCode">
                            <i class="bi bi-book"></i> Subject Code
                          </label>
                          <select name="subject_code" id="teacherSubjectCode" class="form-select form-select-lg" required>
                            <option value="">Select Subject...</option>
                            <?php if (empty($allSubjects)): ?>
                              <option value="" disabled>No subjects available. Add subjects first.</option>
                            <?php else: ?>
                              <?php foreach ($allSubjects as $subj): ?>
                                <option value="<?php echo htmlspecialchars($subj['subject_code']); ?>">
                                  <?php echo htmlspecialchars($subj['subject_code'] . ' — ' . $subj['title']); ?>
                                </option>
                              <?php endforeach; ?>
                            <?php endif; ?>
                          </select>
                          <div class="admin-hint mt-2">
                            <i class="bi bi-info-circle"></i>
                            <span><?php echo empty($allSubjects) ? 'No subjects found. Please add subjects in the Subjects section first.' : 'Subject must exist in the subjects list first'; ?></span>
                          </div>
                        </div>
                      </div>
                      <div class="col-md-2 d-flex align-items-end">
                        <button type="submit" class="btn btn-primary btn-lg w-100 mb-3">
                          <i class="bi bi-check-circle me-2"></i>Add
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
                
                <div class="info-card mt-3">
                  <div class="card-header-modern">
                    <i class="bi bi-list-check"></i>
                    <h3>Teacher Assignments</h3>
                    <span class="badge bg-secondary ms-auto"><?php echo count($teacherAssignments); ?> total</span>
                  </div>
                  <?php if (empty($teacherAssignments)): ?>
                    <div class="text-center text-muted py-5">
                      <i class="bi bi-inbox" style="font-size: 3rem; opacity: 0.3;"></i>
                      <p class="mt-3 mb-0">No teacher assignments found. Add a teacher above to get started.</p>
                    </div>
                  <?php else: ?>
                    <div class="table-responsive">
                      <table class="table table-hover align-middle">
                        <thead>
                          <tr>
                            <th style="width: 25%;">Teacher Name</th>
                            <th style="width: 15%;">Subject Code</th>
                            <th style="width: 45%;">Subject Title</th>
                            <th style="width: 15%;" class="text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          <?php foreach ($teacherAssignments as $ta): ?>
                            <tr>
                              <td>
                                <strong><?php echo htmlspecialchars($ta['full_name'] ?? $ta['teacher_name'] ?? 'Unknown'); ?></strong>
                              </td>
                              <td>
                                <code class="bg-light px-2 py-1 rounded"><?php echo htmlspecialchars($ta['subject_code'] ?? 'N/A'); ?></code>
                              </td>
                              <td><?php echo htmlspecialchars($ta['subject_title'] ?? 'N/A'); ?></td>
                              <td class="text-center">
                                <form method="post" action="/TCC/BackEnd/admin/manage_users.php" onsubmit="return confirm('Are you sure you want to delete this teacher assignment? This action cannot be undone.');" style="display:inline;">
                                  <input type="hidden" name="action" value="delete_teacher" />
                                  <input type="hidden" name="id" value="<?php echo (int)$ta['id']; ?>" />
                                  <button type="submit" class="btn btn-sm btn-outline-danger" title="Delete Assignment">
                                    <i class="bi bi-trash"></i>
                                  </button>
                                </form>
                              </td>
                            </tr>
                          <?php endforeach; ?>
                        </tbody>
                      </table>
                    </div>
                  <?php endif; ?>
                </div>
                
                <div class="info-card mt-3">
                  <div class="card-header-modern">
                    <i class="bi bi-calendar-plus"></i>
                    <h3>Add Teacher Schedule</h3>
                  </div>
                  <form action="/TCC/BackEnd/admin/manage_schedules.php" method="post" class="admin-user-assign-form">
                    <input type="hidden" name="action" value="create" />
                    <input type="hidden" name="from_section" value="teacher_management" />
                    <div class="row g-3">
                      <div class="col-md-4">
                        <div class="admin-form-group">
                          <label class="admin-form-label" for="scheduleSubjectCode">
                            <i class="bi bi-book"></i> Subject Code
                          </label>
                          <select name="subject" id="scheduleSubjectCode" class="form-select form-select-lg" required>
                            <option value="">Select Subject...</option>
                            <?php foreach ($allSubjects as $subj): ?>
                              <option value="<?php echo htmlspecialchars($subj['subject_code']); ?>" data-teacher="<?php 
                                // Find teacher assigned to this subject
                                $teacherForSubject = '';
                                $teacherCheck = $conn->prepare("SELECT teacher_name FROM teacher_assignments WHERE subject_code = ? LIMIT 1");
                                if ($teacherCheck) {
                                  $teacherCheck->bind_param('s', $subj['subject_code']);
                                  $teacherCheck->execute();
                                  $teacherResult = $teacherCheck->get_result();
                                  if ($teacherRow = $teacherResult->fetch_assoc()) {
                                    $teacherForSubject = htmlspecialchars($teacherRow['teacher_name']);
                                  }
                                  $teacherCheck->close();
                                }
                                echo $teacherForSubject;
                              ?>">
                                <?php echo htmlspecialchars($subj['subject_code'] . ' — ' . $subj['title']); ?>
                                <?php if (!empty($teacherForSubject)): ?>
                                  <span class="text-muted">(<?php echo htmlspecialchars($teacherForSubject); ?>)</span>
                                <?php endif; ?>
                              </option>
                            <?php endforeach; ?>
                          </select>
                          <div class="admin-hint mt-2">
                            <i class="bi bi-info-circle"></i>
                            <span>Teacher will be automatically assigned based on the subject. Make sure the subject has a teacher assigned in "Add Teacher to Subject" above.</span>
                          </div>
                        </div>
                      </div>
                      <div class="col-md-2">
                        <div class="admin-form-group">
                          <label class="admin-form-label" for="scheduleYear">
                            <i class="bi bi-calendar-year"></i> Year
                          </label>
                          <select name="year" id="scheduleYear" class="form-select form-select-lg" required>
                            <option value="">Select...</option>
                            <option value="1">1st Year</option>
                            <option value="2">2nd Year</option>
                            <option value="3">3rd Year</option>
                            <option value="4">4th Year</option>
                          </select>
                        </div>
                      </div>
                      <div class="col-md-2">
                        <div class="admin-form-group">
                          <label class="admin-form-label" for="scheduleSection">
                            <i class="bi bi-people"></i> Section
                          </label>
                          <select name="section" id="scheduleSection" class="form-select form-select-lg">
                            <option value="">Select...</option>
                            <?php foreach ($availableSections as $sec): ?>
                              <option value="<?php echo htmlspecialchars($sec); ?>">
                                <?php echo htmlspecialchars($sec); ?>
                              </option>
                            <?php endforeach; ?>
                          </select>
                        </div>
                      </div>
                      <div class="col-md-2">
                        <div class="admin-form-group">
                          <label class="admin-form-label" for="scheduleDay">
                            <i class="bi bi-calendar-day"></i> Day
                          </label>
                          <select name="day" id="scheduleDay" class="form-select form-select-lg" required>
                            <option value="">Select...</option>
                            <option value="Monday">Monday</option>
                            <option value="Tuesday">Tuesday</option>
                            <option value="Wednesday">Wednesday</option>
                            <option value="Thursday">Thursday</option>
                            <option value="Friday">Friday</option>
                            <option value="Saturday">Saturday</option>
                          </select>
                        </div>
                      </div>
                      <div class="col-md-2">
                        <div class="admin-form-group">
                          <label class="admin-form-label" for="scheduleClassType">
                            <i class="bi bi-sun-moon"></i> Class Type
                          </label>
                          <select name="class_type" id="scheduleClassType" class="form-select form-select-lg" required>
                            <option value="day">Day</option>
                            <option value="night">Night</option>
                          </select>
                        </div>
                      </div>
                      <div class="col-md-2">
                        <div class="admin-form-group">
                          <label class="admin-form-label" for="scheduleTimeStart">
                            <i class="bi bi-clock"></i> Time Start
                          </label>
                          <input type="time" name="time_start" id="scheduleTimeStart" class="form-control form-control-lg" required />
                        </div>
                      </div>
                      <div class="col-md-2">
                        <div class="admin-form-group">
                          <label class="admin-form-label" for="scheduleTimeEnd">
                            <i class="bi bi-clock-history"></i> Time End
                          </label>
                          <input type="time" name="time_end" id="scheduleTimeEnd" class="form-control form-control-lg" required />
                        </div>
                      </div>
                      <div class="col-md-2">
                        <div class="admin-form-group">
                          <label class="admin-form-label" for="scheduleBuilding">
                            <i class="bi bi-building"></i> Building
                          </label>
                          <select name="building" id="scheduleBuilding" class="form-select form-select-lg">
                            <option value="">Select...</option>
                            <?php foreach ($availableBuildings as $bld): ?>
                              <option value="<?php echo htmlspecialchars($bld); ?>">
                                <?php echo htmlspecialchars($bld); ?>
                              </option>
                            <?php endforeach; ?>
                          </select>
                        </div>
                      </div>
                      <div class="col-md-2">
                        <div class="admin-form-group">
                          <label class="admin-form-label" for="scheduleRoom">
                            <i class="bi bi-door-closed"></i> Room Number
                          </label>
                          <input type="text" name="room" id="scheduleRoom" class="form-control form-control-lg" placeholder="e.g. 301" />
                        </div>
                      </div>
                      <div class="col-md-2 d-flex align-items-end">
                        <button type="submit" class="btn btn-primary btn-lg w-100 mb-3">
                          <i class="bi bi-check-circle me-2"></i>Add Schedule
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
                
                <?php
                // Get all schedules for display
                $allSchedules = [];
                $schedulesQuery = $conn->query("SELECT s.id, s.year, s.subject, s.day, s.time_start, s.time_end, s.room, s.section, s.building, s.class_type, s.instructor, ta.teacher_name FROM schedules s LEFT JOIN teacher_assignments ta ON s.subject = ta.subject_code ORDER BY s.day, s.time_start");
                if ($schedulesQuery) {
                  while ($schedRow = $schedulesQuery->fetch_assoc()) {
                    $allSchedules[] = $schedRow;
                  }
                }
                ?>
                
                <div class="info-card mt-3">
                  <div class="card-header-modern">
                    <i class="bi bi-calendar-check"></i>
                    <h3>Teacher Schedules</h3>
                    <span class="badge bg-secondary ms-auto"><?php echo count($allSchedules); ?> total</span>
                  </div>
                  <?php if (empty($allSchedules)): ?>
                    <div class="text-center text-muted py-5">
                      <i class="bi bi-inbox" style="font-size: 3rem; opacity: 0.3;"></i>
                      <p class="mt-3 mb-0">No schedules found. Add a schedule above to get started.</p>
                    </div>
                  <?php else: ?>
                    <div class="table-responsive">
                      <table class="table table-hover align-middle">
                        <thead>
                          <tr>
                            <th style="width: 15%;">Teacher</th>
                            <th style="width: 12%;">Subject</th>
                            <th style="width: 8%;">Year</th>
                            <th style="width: 10%;">Section</th>
                            <th style="width: 10%;">Day</th>
                            <th style="width: 12%;">Time</th>
                            <th style="width: 8%;">Type</th>
                            <th style="width: 8%;">Room</th>
                            <th style="width: 7%;">Building</th>
                            <th style="width: 10%;" class="text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          <?php foreach ($allSchedules as $sched): 
                            $timeStart = date('g:i A', strtotime($sched['time_start']));
                            $timeEnd = date('g:i A', strtotime($sched['time_end']));
                            $timeRange = $timeStart . ' - ' . $timeEnd;
                            $classType = $sched['class_type'] ?? 'day';
                          ?>
                            <tr>
                              <td>
                                <strong><?php echo htmlspecialchars($sched['instructor'] ?? $sched['teacher_name'] ?? 'N/A'); ?></strong>
                              </td>
                              <td>
                                <code class="bg-light px-2 py-1 rounded"><?php echo htmlspecialchars($sched['subject'] ?? 'N/A'); ?></code>
                              </td>
                              <td><?php echo htmlspecialchars($sched['year'] ?? 'N/A'); ?></td>
                              <td><?php echo htmlspecialchars($sched['section'] ?? '—'); ?></td>
                              <td><?php echo htmlspecialchars($sched['day'] ?? 'N/A'); ?></td>
                              <td><?php echo htmlspecialchars($timeRange); ?></td>
                              <td>
                                <span class="badge bg-<?php echo $classType === 'night' ? 'dark' : 'warning'; ?>">
                                  <?php echo htmlspecialchars(ucfirst($classType)); ?>
                                </span>
                              </td>
                              <td><?php echo htmlspecialchars($sched['room'] ?? '—'); ?></td>
                              <td><?php echo htmlspecialchars($sched['building'] ?? '—'); ?></td>
                              <td class="text-center">
                                <form method="post" action="/TCC/BackEnd/admin/manage_schedules.php" onsubmit="return confirm('Are you sure you want to delete this schedule? This action cannot be undone.');" style="display:inline;">
                                  <input type="hidden" name="action" value="delete" />
                                  <input type="hidden" name="id" value="<?php echo (int)$sched['id']; ?>" />
                                  <input type="hidden" name="from_section" value="teacher_management" />
                                  <button type="submit" class="btn btn-sm btn-outline-danger" title="Delete Schedule">
                                    <i class="bi bi-trash"></i>
                                  </button>
                                </form>
                              </td>
                            </tr>
                          <?php endforeach; ?>
                        </tbody>
                      </table>
                    </div>
                  <?php endif; ?>
                </div>
              </div>
            </div>

          <?php elseif ($section === 'schedule_management'): ?>
            <?php
            require_once __DIR__ . '/../BackEnd/database/db.php';
            $conn = Database::getInstance()->getConnection();
            
            // Ensure schedules table exists
            $conn->query("CREATE TABLE IF NOT EXISTS schedules (
              id INT AUTO_INCREMENT PRIMARY KEY,
              year VARCHAR(10) NOT NULL,
              subject VARCHAR(255) NOT NULL,
              day VARCHAR(20) NOT NULL,
              time_start TIME NOT NULL,
              time_end TIME NOT NULL,
              room VARCHAR(100) DEFAULT NULL,
              instructor VARCHAR(255) DEFAULT NULL,
              section VARCHAR(100) DEFAULT NULL,
              building VARCHAR(10) DEFAULT NULL,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              INDEX idx_year (year),
              INDEX idx_subject (subject),
              INDEX idx_day (day)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
            
            // Check if building column exists, if not add it
            $columns = $conn->query("SHOW COLUMNS FROM schedules LIKE 'building'");
            if ($columns->num_rows === 0) {
              $conn->query("ALTER TABLE schedules ADD COLUMN building VARCHAR(10) DEFAULT NULL AFTER section");
            }
            
            // Get available buildings for dropdown
                $availableBuildings = [];
                $buildingsQuery = $conn->query("SELECT name FROM buildings ORDER BY name");
                if ($buildingsQuery) {
                  while ($row = $buildingsQuery->fetch_assoc()) {
                    $availableBuildings[] = $row['name'];
                  }
                }
                // Also check JSON fallback
                if (empty($availableBuildings)) {
                  $buildingsPath = __DIR__ . '/../database/buildings.json';
                  if (file_exists($buildingsPath)) {
                    $buildingsData = json_decode(file_get_contents($buildingsPath), true) ?: [];
                    $availableBuildings = array_keys($buildingsData);
                  }
                }
                
                // Handle edit schedule
                $editScheduleId = isset($_GET['edit_schedule_id']) ? intval($_GET['edit_schedule_id']) : 0;
                $editScheduleRow = null;
                if ($editScheduleId > 0) {
                  $s = $conn->prepare("SELECT id, year, subject, day, time_start, time_end, room, instructor, section, building FROM schedules WHERE id = ? LIMIT 1");
                  $s->bind_param('i', $editScheduleId);
                  $s->execute();
                  $r = $s->get_result();
                  $editScheduleRow = $r->fetch_assoc();
                }
                
                // Handle toast notifications for schedules
                if (isset($_GET['success'])) {
                  $successMsg = $_GET['success'];
                  if ($successMsg === 'deleted') {
                    $toastMessage = 'Schedule deleted successfully!';
                  } elseif ($successMsg === 'updated') {
                    $toastMessage = 'Schedule updated successfully!';
                  } elseif ($successMsg === 'created') {
                    $toastMessage = 'Schedule created successfully!';
                  }
                  $toastType = 'success';
                } elseif (isset($_GET['error'])) {
                  $errorMsg = $_GET['error'];
                  $toastType = 'error';
                  if ($errorMsg === 'missing') {
                    $toastMessage = 'Error: Please fill in all required fields.';
                  } elseif ($errorMsg === 'invalid_id') {
                    $toastMessage = 'Error: Invalid schedule ID.';
                  } elseif ($errorMsg === 'instructor_not_found') {
                    $toastMessage = 'Error: Instructor does not exist. Please assign the instructor first in the Manage Teachers section.';
                  } elseif ($errorMsg === 'section_not_found') {
                    $toastMessage = 'Error: Section does not exist. Please create the section first in the Sections section.';
                  } elseif ($errorMsg === 'building_not_found') {
                    $toastMessage = 'Error: Building does not exist. Please create the building first in the Buildings section.';
                  } else {
                    $toastMessage = 'Error: ' . htmlspecialchars($errorMsg);
                  }
                }
                
                // Get filter parameters
                $scheduleFilterYear = isset($_GET['schedule_year_filter']) ? trim($_GET['schedule_year_filter']) : '';
                $scheduleFilterSubject = isset($_GET['schedule_subject_filter']) ? trim($_GET['schedule_subject_filter']) : '';
                
                // Get available years and subjects for filter chips
                $availableScheduleYears = [];
                $availableScheduleSubjects = [];
                
                $scheduleYearsQuery = $conn->query("SELECT DISTINCT year FROM schedules WHERE year IS NOT NULL AND year <> '' ORDER BY CAST(year AS UNSIGNED)");
                if ($scheduleYearsQuery) {
                  while ($row = $scheduleYearsQuery->fetch_assoc()) {
                    if (!empty($row['year']) && !in_array($row['year'], $availableScheduleYears)) {
                      $availableScheduleYears[] = $row['year'];
                    }
                  }
                }
                
                $scheduleSubjectsQuery = $conn->query("SELECT DISTINCT subject FROM schedules WHERE subject IS NOT NULL AND subject <> '' ORDER BY subject");
                if ($scheduleSubjectsQuery) {
                  while ($row = $scheduleSubjectsQuery->fetch_assoc()) {
                    if (!empty($row['subject']) && !in_array($row['subject'], $availableScheduleSubjects)) {
                      $availableScheduleSubjects[] = $row['subject'];
                    }
                  }
                }
                
                // Build query with filters
                $scheduleConds = [];
                $scheduleTypes = '';
                $scheduleValues = [];
                if ($scheduleFilterYear !== '') {
                  $scheduleConds[] = 'year = ?';
                  $scheduleTypes .= 's';
                  $scheduleValues[] = $scheduleFilterYear;
                }
                if ($scheduleFilterSubject !== '') {
                  $scheduleConds[] = 'subject = ?';
                  $scheduleTypes .= 's';
                  $scheduleValues[] = $scheduleFilterSubject;
                }
                
                $scheduleWhere = count($scheduleConds) ? 'WHERE ' . implode(' AND ', $scheduleConds) : '';
                
                // Get schedules
                $schedules = [];
                $scheduleSql = "SELECT id, year, subject, day, time_start, time_end, room, instructor, section, building FROM schedules $scheduleWhere ORDER BY year, day, time_start";
                if (count($scheduleConds) > 0) {
                  $scheduleStmt = $conn->prepare($scheduleSql);
                  if ($scheduleStmt) {
                    $scheduleStmt->bind_param($scheduleTypes, ...$scheduleValues);
                    $scheduleStmt->execute();
                    $scheduleRes = $scheduleStmt->get_result();
                    while ($row = $scheduleRes->fetch_assoc()) {
                      $schedules[] = $row;
                    }
                    $scheduleStmt->close();
                  }
                } else {
                  $scheduleQuery = $conn->query($scheduleSql);
                  if ($scheduleQuery) {
                    while ($row = $scheduleQuery->fetch_assoc()) {
                      $schedules[] = $row;
                    }
                  }
                }
                ?>
            <div class="records-container">
              <div class="records-header">
                <h2 class="records-title">
                  <i class="bi bi-calendar-week"></i> Schedule Management
                </h2>
                <p class="records-subtitle">Create and manage class schedules, assign rooms and instructors</p>
              </div>
              <div class="records-main">
                <div class="info-card">
                  <div class="card-header-modern">
                    <i class="bi bi-calendar-plus"></i>
                    <h3><?php echo $editScheduleRow ? 'Edit Schedule' : 'Create New Schedule'; ?></h3>
                  </div>
                  <form action="/TCC/BackEnd/admin/manage_schedules.php" method="post" class="admin-user-assign-form">
                    <?php if ($editScheduleRow): ?>
                      <input type="hidden" name="action" value="update" />
                      <input type="hidden" name="id" value="<?php echo (int)$editScheduleRow['id']; ?>" />
                    <?php else: ?>
                      <input type="hidden" name="action" value="create" />
                    <?php endif; ?>
                    
                    <div class="row g-3">
                      <div class="col-md-3">
                        <div class="admin-form-group">
                          <label class="admin-form-label" for="scheduleYear"><i class="bi bi-calendar-year"></i> Year</label>
                          <select name="year" id="scheduleYear" class="form-select form-select-lg" required>
                            <option value="">Select Year...</option>
                            <option value="1" <?php echo ($editScheduleRow && $editScheduleRow['year']=='1')?'selected':'';?>>1st Year</option>
                            <option value="2" <?php echo ($editScheduleRow && $editScheduleRow['year']=='2')?'selected':'';?>>2nd Year</option>
                            <option value="3" <?php echo ($editScheduleRow && $editScheduleRow['year']=='3')?'selected':'';?>>3rd Year</option>
                            <option value="4" <?php echo ($editScheduleRow && $editScheduleRow['year']=='4')?'selected':'';?>>4th Year</option>
                          </select>
                        </div>
                      </div>
                      <div class="col-md-3">
                        <div class="admin-form-group">
                          <label class="admin-form-label" for="scheduleSubject"><i class="bi bi-book"></i> Subject</label>
                          <input type="text" name="subject" id="scheduleSubject" class="form-control form-control-lg" placeholder="e.g. Mathematics" required value="<?php echo $editScheduleRow ? htmlspecialchars($editScheduleRow['subject']) : ''; ?>"/>
                        </div>
                      </div>
                      <div class="col-md-3">
                        <div class="admin-form-group">
                          <label class="admin-form-label" for="scheduleDay"><i class="bi bi-calendar-day"></i> Day</label>
                          <select name="day" id="scheduleDay" class="form-select form-select-lg" required>
                            <option value="">Select Day...</option>
                            <option value="Monday" <?php echo ($editScheduleRow && $editScheduleRow['day']=='Monday')?'selected':'';?>>Monday</option>
                            <option value="Tuesday" <?php echo ($editScheduleRow && $editScheduleRow['day']=='Tuesday')?'selected':'';?>>Tuesday</option>
                            <option value="Wednesday" <?php echo ($editScheduleRow && $editScheduleRow['day']=='Wednesday')?'selected':'';?>>Wednesday</option>
                            <option value="Thursday" <?php echo ($editScheduleRow && $editScheduleRow['day']=='Thursday')?'selected':'';?>>Thursday</option>
                            <option value="Friday" <?php echo ($editScheduleRow && $editScheduleRow['day']=='Friday')?'selected':'';?>>Friday</option>
                            <option value="Saturday" <?php echo ($editScheduleRow && $editScheduleRow['day']=='Saturday')?'selected':'';?>>Saturday</option>
                            <option value="Sunday" <?php echo ($editScheduleRow && $editScheduleRow['day']=='Sunday')?'selected':'';?>>Sunday</option>
                          </select>
                        </div>
                      </div>
                      <div class="col-md-3">
                        <div class="admin-form-group">
                          <label class="admin-form-label" for="scheduleTimeStart"><i class="bi bi-clock"></i> Time Start</label>
                          <input type="time" name="time_start" id="scheduleTimeStart" class="form-control form-control-lg" required value="<?php echo $editScheduleRow ? htmlspecialchars($editScheduleRow['time_start']) : ''; ?>"/>
                        </div>
                      </div>
                      <div class="col-md-3">
                        <div class="admin-form-group">
                          <label class="admin-form-label" for="scheduleTimeEnd"><i class="bi bi-clock-history"></i> Time End</label>
                          <input type="time" name="time_end" id="scheduleTimeEnd" class="form-control form-control-lg" required value="<?php echo $editScheduleRow ? htmlspecialchars($editScheduleRow['time_end']) : ''; ?>"/>
                        </div>
                      </div>
                      <div class="col-md-3">
                        <div class="admin-form-group">
                          <label class="admin-form-label" for="scheduleRoom"><i class="bi bi-door-closed"></i> Room</label>
                          <input type="text" name="room" id="scheduleRoom" class="form-control form-control-lg" placeholder="e.g. Room 301" value="<?php echo $editScheduleRow ? htmlspecialchars($editScheduleRow['room'] ?? '') : ''; ?>"/>
                        </div>
                      </div>
                      <div class="col-md-3">
                        <div class="admin-form-group">
                          <label class="admin-form-label" for="scheduleInstructor"><i class="bi bi-person-badge"></i> Instructor</label>
                          <input type="text" name="instructor" id="scheduleInstructor" class="form-control form-control-lg" placeholder="e.g. Ms. Johnson" value="<?php echo $editScheduleRow ? htmlspecialchars($editScheduleRow['instructor'] ?? '') : ''; ?>"/>
                        </div>
                      </div>
                      <div class="col-md-3">
                        <div class="admin-form-group">
                          <label class="admin-form-label" for="scheduleSection"><i class="bi bi-people"></i> Section</label>
                          <input type="text" name="section" id="scheduleSection" class="form-control form-control-lg" placeholder="e.g. Benevolence" value="<?php echo $editScheduleRow ? htmlspecialchars($editScheduleRow['section'] ?? '') : ''; ?>"/>
                        </div>
                      </div>
                      <div class="col-md-3">
                        <div class="admin-form-group">
                          <label class="admin-form-label" for="scheduleBuilding"><i class="bi bi-building"></i> Building</label>
                          <select name="building" id="scheduleBuilding" class="form-select form-select-lg">
                            <option value="">Select Building...</option>
                            <?php foreach ($availableBuildings as $bld): ?>
                              <option value="<?php echo htmlspecialchars($bld); ?>" <?php echo ($editScheduleRow && isset($editScheduleRow['building']) && $editScheduleRow['building']===$bld)?'selected':'';?>><?php echo htmlspecialchars($bld); ?></option>
                            <?php endforeach; ?>
                          </select>
                        </div>
                      </div>
                    </div>
                    <div class="row g-3 mt-2">
                      <div class="col-md-12">
                        <button type="submit" class="btn btn-primary btn-lg">
                          <i class="bi bi-check-circle me-2"></i><?php echo $editScheduleRow ? 'Update Schedule' : 'Create Schedule'; ?>
                        </button>
                        <?php if ($editScheduleRow): ?>
                          <a href="/TCC/public/admin_dashboard.php?section=schedule_management" class="btn btn-secondary btn-lg ms-2">
                            <i class="bi bi-x-circle me-2"></i>Cancel
                          </a>
                        <?php endif; ?>
                      </div>
                    </div>
                  </form>
                </div>
                
                <!-- Schedule Filters -->
                <div class="info-card mt-3 grade-filter-card">
                  <div class="grade-filter-inner">
                    <div class="grade-filter-head">
                      <div class="grade-filter-title">
                        <span class="grade-filter-icon"><i class="bi bi-funnel-fill"></i></span>
                        <div>
                          <h3>Filter Schedules</h3>
                          <p>Focus the overview by year or subject.</p>
                        </div>
                      </div>
                      <?php if ($scheduleFilterYear !== '' || $scheduleFilterSubject !== ''): ?>
                        <a href="/TCC/public/admin_dashboard.php?section=schedule_management" class="grade-filter-reset">
                          <i class="bi bi-arrow-counterclockwise"></i> Reset view
                        </a>
                      <?php endif; ?>
                    </div>
                    
                    <div class="grade-filter-actions">
                      <?php if (!empty($availableScheduleYears)): ?>
                      <div class="grade-filter-group">
                        <span class="grade-filter-label">Year Level</span>
                        <?php 
                        $scheduleFilterBase = $_GET;
                        $scheduleFilterBase['section'] = 'schedule_management';
                        unset($scheduleFilterBase['schedule_year_filter']);
                        $scheduleYearBase = $scheduleFilterBase;
                        $scheduleYearAllUrl = '/TCC/public/admin_dashboard.php?' . htmlspecialchars(http_build_query($scheduleYearBase));
                        ?>
                        <a href="<?php echo $scheduleYearAllUrl; ?>" class="grade-chip <?php echo ($scheduleFilterYear === '') ? 'active' : ''; ?>">
                          <i class="bi bi-layers"></i>
                          <span>All Years</span>
                        </a>
                        <?php foreach ($availableScheduleYears as $yearValue): 
                          $scheduleYearParams = $scheduleYearBase;
                          $scheduleYearParams['schedule_year_filter'] = $yearValue;
                          $scheduleYearUrl = '/TCC/public/admin_dashboard.php?' . htmlspecialchars(http_build_query($scheduleYearParams));
                          $scheduleYearLabel = $yearValue === '1' ? '1st Year' : ($yearValue === '2' ? '2nd Year' : ($yearValue === '3' ? '3rd Year' : ($yearValue === '4' ? '4th Year' : $yearValue . ' Year')));
                          ?>
                          <a href="<?php echo $scheduleYearUrl; ?>" class="grade-chip <?php echo ($scheduleFilterYear === $yearValue) ? 'active' : ''; ?>">
                            <i class="bi bi-calendar-week"></i>
                            <span><?php echo htmlspecialchars($scheduleYearLabel); ?></span>
                          </a>
                        <?php endforeach; ?>
                      </div>
                      <?php endif; ?>
                      
                      <?php if (!empty($availableScheduleSubjects)): ?>
                      <div class="grade-filter-group">
                        <span class="grade-filter-label">Subject</span>
                        <?php
                        $scheduleSubjectBase = $scheduleFilterBase;
                        unset($scheduleSubjectBase['schedule_subject_filter']);
                        $scheduleSubjectAllUrl = '/TCC/public/admin_dashboard.php?' . htmlspecialchars(http_build_query($scheduleSubjectBase));
                        ?>
                        <a href="<?php echo $scheduleSubjectAllUrl; ?>" class="grade-chip <?php echo ($scheduleFilterSubject === '') ? 'active' : ''; ?>">
                          <i class="bi bi-grid-1x2"></i>
                          <span>All Subjects</span>
                        </a>
                        <?php foreach ($availableScheduleSubjects as $subjectValue): 
                          $scheduleSubjectParams = $scheduleSubjectBase;
                          $scheduleSubjectParams['schedule_subject_filter'] = $subjectValue;
                          $scheduleSubjectUrl = '/TCC/public/admin_dashboard.php?' . htmlspecialchars(http_build_query($scheduleSubjectParams));
                          ?>
                          <a href="<?php echo $scheduleSubjectUrl; ?>" class="grade-chip <?php echo ($scheduleFilterSubject === $subjectValue) ? 'active' : ''; ?>">
                            <i class="bi bi-book"></i>
                            <span><?php echo htmlspecialchars($subjectValue); ?></span>
                          </a>
                        <?php endforeach; ?>
                      </div>
                      <?php endif; ?>
                    </div>
                    
                    <?php if ($scheduleFilterYear !== '' || $scheduleFilterSubject !== ''): ?>
                      <div class="grade-filter-note">
                        <i class="bi bi-info-circle"></i>
                        Showing schedules
                        <?php if ($scheduleFilterYear !== ''): ?>
                          for <strong><?php echo htmlspecialchars($scheduleFilterYear === '1' ? '1st Year' : ($scheduleFilterYear === '2' ? '2nd Year' : ($scheduleFilterYear === '3' ? '3rd Year' : ($scheduleFilterYear === '4' ? '4th Year' : $scheduleFilterYear . ' Year')))); ?></strong>
                        <?php endif; ?>
                        <?php if ($scheduleFilterSubject !== ''): ?>
                          in subject <strong><?php echo htmlspecialchars($scheduleFilterSubject); ?></strong>
                        <?php endif; ?>
                        .
                      </div>
                    <?php endif; ?>
                  </div>
                </div>
                
                <!-- Schedules Table -->
                <div class="info-card mt-3">
                  <div class="card-header-modern">
                    <i class="bi bi-calendar-week"></i>
                    <h3>Schedules (<?php echo count($schedules); ?> total)</h3>
                  </div>
                  <div class="table-responsive">
                    <table class="table table-hover">
                      <thead>
                        <tr>
                          <th>Year</th>
                          <th>Subject</th>
                          <th>Day</th>
                          <th>Time</th>
                          <th>Room</th>
                          <th>Instructor</th>
                          <th>Section</th>
                          <th>Building</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        <?php if (empty($schedules)): ?>
                          <tr>
                            <td colspan="9" class="text-center text-muted py-4">
                              <i class="bi bi-inbox"></i> No schedules found.
                            </td>
                          </tr>
                        <?php else: ?>
                          <?php foreach ($schedules as $sched): ?>
                            <tr>
                              <td><strong><?php echo htmlspecialchars($sched['year']); ?></strong></td>
                              <td><?php echo htmlspecialchars($sched['subject']); ?></td>
                              <td><?php echo htmlspecialchars($sched['day']); ?></td>
                              <td><?php echo htmlspecialchars(date('g:i A', strtotime($sched['time_start'])) . ' - ' . date('g:i A', strtotime($sched['time_end']))); ?></td>
                              <td><?php echo htmlspecialchars($sched['room'] ?: '-'); ?></td>
                              <td><?php echo htmlspecialchars($sched['instructor'] ?: '-'); ?></td>
                              <td><?php echo htmlspecialchars($sched['section'] ?: '-'); ?></td>
                              <td><?php echo htmlspecialchars($sched['building'] ?: '-'); ?></td>
                              <td>
                                <div style="display: flex; gap: 8px;">
                                  <a href="/TCC/public/admin_dashboard.php?section=schedule_management&edit_schedule_id=<?php echo (int)$sched['id']; ?>" class="Btn Btn-edit">
                                    <div class="svgWrapper">
                                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 42 42" class="svgIcon">
                                        <path stroke-width="5" stroke="#fff" d="M21 5L7 19L5 37L23 35L37 21L21 5Z"></path>
                                        <path stroke-width="3" stroke="#fff" d="M21 5L37 21"></path>
                                        <path stroke-width="3" stroke="#fff" d="M15 19L23 27"></path>
                                      </svg>
                                      <div class="text">Edit</div>
                                    </div>
                                  </a>
                                  <form method="post" action="/TCC/BackEnd/admin/manage_schedules.php" onsubmit="return confirm('Are you sure you want to delete this schedule? This action cannot be undone.');" style="display:inline;">
                                    <input type="hidden" name="action" value="delete" />
                                    <input type="hidden" name="id" value="<?php echo (int)$sched['id']; ?>" />
                                    <button type="submit" class="Btn Btn-delete">
                                      <div class="svgWrapper">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 42 42" class="svgIcon">
                                          <path stroke-width="5" stroke="#fff" d="M9.14073 2.5H32.8593C33.3608 2.5 33.8291 2.75065 34.1073 3.16795L39.0801 10.6271C39.3539 11.0378 39.5 11.5203 39.5 12.0139V21V37C39.5 38.3807 38.3807 39.5 37 39.5H5C3.61929 39.5 2.5 38.3807 2.5 37V21V12.0139C2.5 11.5203 2.6461 11.0378 2.91987 10.6271L7.89266 3.16795C8.17086 2.75065 8.63921 2.5 9.14073 2.5Z"></path>
                                          <path stroke-width="5" stroke="#fff" d="M14 18L28 18M18 14V30M24 14V30"></path>
                                        </svg>
                                        <div class="text">Delete</div>
                                      </div>
                                    </button>
                                  </form>
                                </div>
                              </td>
                            </tr>
                          <?php endforeach; ?>
                        <?php endif; ?>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <?php elseif ($section === 'sections'): ?>
            <?php
            require_once __DIR__ . '/../BackEnd/database/db.php';
            $conn = Database::getInstance()->getConnection();
            
            // Ensure sections table exists
            $conn->query("CREATE TABLE IF NOT EXISTS sections (
              id INT AUTO_INCREMENT PRIMARY KEY,
              year VARCHAR(10) NOT NULL,
              name VARCHAR(100) NOT NULL,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              UNIQUE KEY uniq_year_name (year, name)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
            
            // Handle form submissions
            $editSectionId = isset($_GET['edit_section_id']) ? intval($_GET['edit_section_id']) : 0;
            $editSectionRow = null;
            if ($editSectionId > 0) {
              $s = $conn->prepare("SELECT id, year, name FROM sections WHERE id = ? LIMIT 1");
              $s->bind_param('i', $editSectionId);
              $s->execute();
              $r = $s->get_result();
              $editSectionRow = $r->fetch_assoc();
            }
            
            // Handle toast notifications
            if (!isset($toastMessage)) $toastMessage = '';
            if (!isset($toastType)) $toastType = 'success';
            
            if (isset($_GET['success'])) {
              $successMsg = $_GET['success'];
              if ($successMsg === 'deleted') {
                $toastMessage = 'Section deleted successfully!';
              } elseif ($successMsg === 'updated') {
                $toastMessage = 'Section updated successfully!';
              } elseif ($successMsg === 'created') {
                $toastMessage = 'Section created successfully!';
              } else {
                $toastMessage = 'Section saved successfully!';
              }
              $toastType = 'success';
            } elseif (isset($_GET['error'])) {
              $errorMsg = $_GET['error'];
              $toastType = 'error';
              if ($errorMsg === 'missing') {
                $toastMessage = 'Error: Please fill in all required fields.';
              } elseif ($errorMsg === 'duplicate') {
                $toastMessage = 'Error: A section with this name already exists for this year.';
              } elseif ($errorMsg === 'invalid_id') {
                $toastMessage = 'Error: Invalid section ID.';
              } else {
                $toastMessage = 'Error: ' . htmlspecialchars($errorMsg);
              }
            }
            
            // Get all sections grouped by year
            $sectionsByYear = [];
            $sectionsQuery = $conn->query("SELECT id, year, name, created_at FROM sections ORDER BY CAST(year AS UNSIGNED), name");
            if ($sectionsQuery) {
              while ($row = $sectionsQuery->fetch_assoc()) {
                $year = $row['year'];
                if (!isset($sectionsByYear[$year])) {
                  $sectionsByYear[$year] = [];
                }
                $sectionsByYear[$year][] = $row;
              }
            }
            ?>
            <div class="records-container">
              <div class="records-header">
                <h2 class="records-title">
                  <i class="bi bi-collection-fill"></i> Sections
                </h2>
                <p class="records-subtitle">Create and manage academic sections for each year level</p>
              </div>
              <div class="records-main">
                <div class="info-card">
                  <div class="card-header-modern">
                    <i class="bi bi-collection-fill"></i>
                    <h3><?php echo $editSectionRow ? 'Edit Section' : 'Create New Section'; ?></h3>
                  </div>
                  <form class="form-small" action="/TCC/BackEnd/admin/manage_sections.php" method="post">
                    <?php if ($editSectionRow): ?>
                      <input type="hidden" name="action" value="update" />
                      <input type="hidden" name="id" value="<?php echo (int)$editSectionRow['id']; ?>" />
                    <?php else: ?>
                      <input type="hidden" name="action" value="create" />
                    <?php endif; ?>
                    
                    <div class="row g-3 mb-3">
                      <div class="col-md-6">
                        <label class="admin-form-label" for="sectionFormYear"><i class="bi bi-calendar-year"></i> Year</label>
                        <select name="year" id="sectionFormYear" class="form-select form-select-lg" required>
                          <option value="">Select Year...</option>
                          <option value="1" <?php echo ($editSectionRow && $editSectionRow['year']=='1')?'selected':'';?>>1st Year</option>
                          <option value="2" <?php echo ($editSectionRow && $editSectionRow['year']=='2')?'selected':'';?>>2nd Year</option>
                          <option value="3" <?php echo ($editSectionRow && $editSectionRow['year']=='3')?'selected':'';?>>3rd Year</option>
                          <option value="4" <?php echo ($editSectionRow && $editSectionRow['year']=='4')?'selected':'';?>>4th Year</option>
                        </select>
                      </div>
                      <div class="col-md-6">
                        <label class="admin-form-label" for="sectionFormName"><i class="bi bi-tag-fill"></i> Section Name</label>
                        <input name="name" id="sectionFormName" class="form-control form-control-lg" placeholder="e.g. Power, Benevolence, Excellence" required value="<?php echo $editSectionRow ? htmlspecialchars($editSectionRow['name']) : ''; ?>" autocomplete="off"/>
                      </div>
                    </div>
                    
                    <button class="btn btn-primary btn-lg">
                      <i class="bi bi-check-circle me-2"></i><?php echo $editSectionRow ? 'Update Section' : 'Create Section'; ?>
                    </button>
                    <?php if ($editSectionRow): ?>
                      <a href="/TCC/public/admin_dashboard.php?section=sections" class="btn btn-secondary btn-lg ms-2">
                        <i class="bi bi-x-circle me-2"></i>Cancel
                      </a>
                    <?php endif; ?>
                  </form>
                </div>

                <?php if (empty($sectionsByYear)): ?>
                  <div class="info-card mt-3">
                    <div class="card-header-modern">
                      <i class="bi bi-collection"></i>
                      <h3>No Sections</h3>
                    </div>
                    <p class="text-muted mb-0">No sections have been created yet. Create one above to get started.</p>
                  </div>
                <?php else: ?>
                  <?php
                  $years = ['1', '2', '3', '4'];
                  foreach ($years as $yearNum):
                    if (!isset($sectionsByYear[$yearNum]) || empty($sectionsByYear[$yearNum])) {
                      continue;
                    }
                    $yearLabel = $yearNum == '1' ? '1st Year' : ($yearNum == '2' ? '2nd Year' : ($yearNum == '3' ? '3rd Year' : '4th Year'));
                  ?>
                    <div class="info-card grade-year-card mt-3">
                      <div class="card-header-modern">
                        <i class="bi bi-calendar-year"></i>
                        <h3><?php echo $yearLabel; ?></h3>
                      </div>
                      <div class="grade-year-body">
                        <div class="grade-student-list">
                          <?php foreach ($sectionsByYear[$yearNum] as $section): ?>
                            <div class="student-grade-card">
                              <div class="student-grade-main">
                                <div style="width: 56px; height: 56px; border-radius: 16px; background: linear-gradient(135deg, var(--color-flora), var(--color-sage)); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 700; color: white; flex-shrink: 0;">
                                  <?php echo strtoupper(substr(trim($section['name']), 0, 1)); ?>
                                </div>
                                <div>
                                  <span class="student-grade-name"><?php echo htmlspecialchars($section['name']); ?></span>
                                  <span class="student-grade-summary">Section for <?php echo htmlspecialchars($yearLabel); ?></span>
                                </div>
                              </div>
                              <div class="student-grade-meta">
                                <div style="display: flex; gap: 8px; align-items: center;">
                                  <a href="/TCC/public/admin_dashboard.php?section=sections&edit_section_id=<?php echo (int)$section['id']; ?>" class="Btn Btn-edit">
                                    <div class="svgWrapper">
                                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 42 42" class="svgIcon">
                                        <path stroke-width="5" stroke="#fff" d="M21 5L7 19L5 37L23 35L37 21L21 5Z"></path>
                                        <path stroke-width="3" stroke="#fff" d="M21 5L37 21"></path>
                                        <path stroke-width="3" stroke="#fff" d="M15 19L23 27"></path>
                                      </svg>
                                      <div class="text">Edit</div>
                                    </div>
                                  </a>
                                  <form action="/TCC/BackEnd/admin/manage_sections.php" method="post" style="display:inline;" onsubmit="return confirm('Are you sure you want to delete the section &quot;<?php echo htmlspecialchars($section['name']); ?>&quot;? This action cannot be undone.');">
                                    <input type="hidden" name="action" value="delete" />
                                    <input type="hidden" name="id" value="<?php echo (int)$section['id']; ?>" />
                                    <button type="submit" class="Btn Btn-delete">
                                      <div class="svgWrapper">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 42 42" class="svgIcon">
                                          <path stroke-width="5" stroke="#fff" d="M9.14073 2.5H32.8593C33.3608 2.5 33.8291 2.75065 34.1073 3.16795L39.0801 10.6271C39.3539 11.0378 39.5 11.5203 39.5 12.0139V21V37C39.5 38.3807 38.3807 39.5 37 39.5H5C3.61929 39.5 2.5 38.3807 2.5 37V21V12.0139C2.5 11.5203 2.6461 11.0378 2.91987 10.6271L7.89266 3.16795C8.17086 2.75065 8.63921 2.5 9.14073 2.5Z"></path>
                                          <path stroke-width="5" stroke="#fff" d="M14 18L28 18M18 14V30M24 14V30"></path>
                                        </svg>
                                        <div class="text">Delete</div>
                                      </div>
                                    </button>
                                  </form>
                                </div>
                              </div>
                            </div>
                          <?php endforeach; ?>
                        </div>
                      </div>
                    </div>
                  <?php endforeach; ?>
                <?php endif; ?>
              </div>
            </div>
          <?php elseif ($section === 'subjects'): ?>
            <?php
            require_once __DIR__ . '/../BackEnd/database/db.php';
            $conn = Database::getInstance()->getConnection();
            $conn->query("CREATE TABLE IF NOT EXISTS subjects (
              id INT AUTO_INCREMENT PRIMARY KEY,
              subject_code VARCHAR(50) NOT NULL,
              title VARCHAR(255) NOT NULL,
              units INT DEFAULT 0,
              course VARCHAR(20) NOT NULL,
              major VARCHAR(50) NOT NULL,
              year_level INT NOT NULL,
              semester VARCHAR(20) NOT NULL DEFAULT 'First Semester',
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              UNIQUE KEY uniq_subject_code (subject_code),
              INDEX idx_course_major_year (course, major, year_level, semester)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

            $subjectToastMessage = '';
            $subjectToastType = 'success';
            if (isset($_GET['success'])) {
              $subjectToastMessage = match ($_GET['success']) {
                'created' => 'Subject added successfully!',
                'updated' => 'Subject updated successfully!',
                'deleted' => 'Subject deleted successfully!',
                default => 'Subject saved successfully!'
              };
            } elseif (isset($_GET['error'])) {
              $subjectToastType = 'error';
              $subjectToastMessage = match ($_GET['error']) {
                'missing' => 'Please fill out all subject fields.',
                'duplicate' => 'Subject code already exists.',
                'invalid_major' => 'Select a valid major for the chosen course.',
                'year_range' => 'Year level must be between 1 and 4.',
                'invalid_semester' => 'Please select a valid semester.',
                'db_error' => 'Database error occurred. Please try again or contact support.',
                default => 'Unable to save subject right now.'
              };
            }

            $editSubjectId = isset($_GET['edit_subject_id']) ? (int)$_GET['edit_subject_id'] : 0;
            $editSubjectRow = null;
            if ($editSubjectId > 0) {
              $stmt = $conn->prepare("SELECT id, subject_code, title, units, course, major, year_level, semester FROM subjects WHERE id = ? LIMIT 1");
              $stmt->bind_param('i', $editSubjectId);
              $stmt->execute();
              $res = $stmt->get_result();
              $editSubjectRow = $res->fetch_assoc();
              $stmt->close();
            }

            $subjects = [];
            $subjectsQuery = $conn->query("SELECT id, subject_code, title, units, course, major, year_level, semester, updated_at FROM subjects ORDER BY course, major, year_level, semester, subject_code");
            if ($subjectsQuery) {
              while ($row = $subjectsQuery->fetch_assoc()) {
                $subjects[] = $row;
              }
            }
            ?>
            <div class="records-container">
              <div class="records-header">
                <h2 class="records-title">
                  <i class="bi bi-journal-text"></i> Subject Catalog
                </h2>
                <p class="records-subtitle">Centralize subject codes, titles, and units to avoid typos when building study loads.</p>
              </div>
              <div class="records-main">
                <?php if (!empty($subjectToastMessage)): ?>
                  <div class="alert alert-<?php echo $subjectToastType === 'error' ? 'danger' : 'success'; ?> alert-dismissible fade show" role="alert">
                    <?php echo htmlspecialchars($subjectToastMessage); ?>
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                  </div>
                <?php endif; ?>

                <div class="info-card">
                  <div class="card-header-modern">
                    <i class="bi bi-pencil-square"></i>
                    <h3><?php echo $editSubjectRow ? 'Edit Subject' : 'Add New Subject'; ?></h3>
                  </div>
                  <form class="form-small" action="/TCC/BackEnd/admin/manage_subjects.php" method="post">
                    <input type="hidden" name="action" value="<?php echo $editSubjectRow ? 'update' : 'create'; ?>" />
                    <?php if ($editSubjectRow): ?>
                      <input type="hidden" name="id" value="<?php echo (int)$editSubjectRow['id']; ?>" />
                    <?php endif; ?>
                    <div class="row g-3">
                      <div class="col-md-3">
                        <label class="admin-form-label" for="subjectCodeInput">
                          <i class="bi bi-upc-scan"></i> Subject Code
                        </label>
                        <input id="subjectCodeInput" name="subject_code" class="form-control form-control-lg" placeholder="e.g. IT101" value="<?php echo $editSubjectRow ? htmlspecialchars($editSubjectRow['subject_code']) : ''; ?>" required />
                      </div>
                      <div class="col-md-4">
                        <label class="admin-form-label" for="subjectTitleInput">
                          <i class="bi bi-journal-text"></i> Descriptive Title
                        </label>
                        <input id="subjectTitleInput" name="title" class="form-control form-control-lg" placeholder="Descriptive Title" value="<?php echo $editSubjectRow ? htmlspecialchars($editSubjectRow['title']) : ''; ?>" required />
                      </div>
                      <div class="col-md-2">
                        <label class="admin-form-label" for="subjectUnitsInput">
                          <i class="bi bi-hash"></i> Units
                        </label>
                        <input id="subjectUnitsInput" name="units" type="number" min="0" step="1" class="form-control form-control-lg" value="<?php echo $editSubjectRow ? (int)$editSubjectRow['units'] : ''; ?>" required />
                      </div>
                      <div class="col-md-3">
                        <label class="admin-form-label" for="subjectCourseSelect">
                          <i class="bi bi-mortarboard"></i> Course
                        </label>
                        <select id="subjectCourseSelect" name="course" class="form-select form-select-lg" required data-course-select>
                          <option value="">Select course...</option>
                          <?php foreach ($courseMajorMap as $courseKey => $majorsList): ?>
                            <option value="<?php echo $courseKey; ?>" <?php echo ($editSubjectRow && $editSubjectRow['course'] === $courseKey) ? 'selected' : ''; ?>>
                              <?php echo $courseKey; ?>
                            </option>
                          <?php endforeach; ?>
                        </select>
                      </div>
                      <div class="col-md-4">
                        <label class="admin-form-label" for="subjectMajorSelect">
                          <i class="bi bi-diagram-3"></i> Major
                        </label>
                        <select id="subjectMajorSelect" name="major" class="form-select form-select-lg" required data-major-select>
                          <option value="">Select major...</option>
                          <?php
                          $activeCourse = $editSubjectRow['course'] ?? array_key_first($courseMajorMap);
                          foreach ($courseMajorMap as $courseKey => $majorsList):
                            foreach ($majorsList as $majorName):
                          ?>
                              <option value="<?php echo htmlspecialchars($majorName); ?>" data-course="<?php echo $courseKey; ?>" <?php echo ($editSubjectRow && $editSubjectRow['major'] === $majorName) ? 'selected' : ''; ?>>
                                <?php echo htmlspecialchars($majorName); ?>
                              </option>
                          <?php
                            endforeach;
                          endforeach;
                          ?>
                        </select>
                      </div>
                      <div class="col-md-2">
                        <label class="admin-form-label" for="subjectYearSelect">
                          <i class="bi bi-calendar-year"></i> Year Level
                        </label>
                        <select id="subjectYearSelect" name="year_level" class="form-select form-select-lg" required>
                          <option value="">Select year...</option>
                          <?php for ($y = 1; $y <= 4; $y++): ?>
                            <option value="<?php echo $y; ?>" <?php echo ($editSubjectRow && (int)$editSubjectRow['year_level'] === $y) ? 'selected' : ''; ?>>
                              <?php echo formatOrdinal($y); ?>
                            </option>
                          <?php endfor; ?>
                        </select>
                      </div>
                      <div class="col-md-2">
                        <label class="admin-form-label" for="subjectSemesterSelect">
                          <i class="bi bi-clock-history"></i> Semester
                        </label>
                        <select id="subjectSemesterSelect" name="semester" class="form-select form-select-lg" required data-selected="<?php echo $editSubjectRow ? htmlspecialchars($editSubjectRow['semester'] ?? '') : 'First Semester'; ?>">
                          <?php foreach ($semesterOptions as $semOption): ?>
                            <option value="<?php echo htmlspecialchars($semOption); ?>" <?php echo ($editSubjectRow && ($editSubjectRow['semester'] ?? '') === $semOption) ? 'selected' : ''; ?>>
                              <?php echo htmlspecialchars($semOption); ?>
                            </option>
                          <?php endforeach; ?>
                        </select>
                      </div>
                    </div>
                    <div class="mt-3 d-flex gap-2">
                      <button class="btn btn-primary btn-lg" type="submit">
                        <i class="bi bi-check-circle me-2"></i><?php echo $editSubjectRow ? 'Save Changes' : 'Add Subject'; ?>
                      </button>
                      <?php if ($editSubjectRow): ?>
                        <a href="/TCC/public/admin_dashboard.php?section=subjects" class="btn btn-outline-secondary btn-lg">
                          <i class="bi bi-x-circle me-2"></i>Cancel
                        </a>
                      <?php endif; ?>
                    </div>
                  </form>
                </div>

                <div class="info-card">
                  <div class="card-header-modern">
                    <i class="bi bi-list-task"></i>
                    <h3>Subject List</h3>
                    <span class="badge bg-secondary ms-auto"><?php echo count($subjects); ?> total</span>
                  </div>
                  <?php if (empty($subjects)): ?>
                    <p class="text-muted mb-0">No subjects recorded yet. Add one using the form above.</p>
                  <?php else: ?>
                    <div class="table-responsive">
                      <table class="table table-hover align-middle">
                        <thead>
                          <tr>
                            <th>Code</th>
                            <th>Title</th>
                            <th>Units</th>
                            <th>Course</th>
                            <th>Major</th>
                            <th>Year</th>
                            <th>Semester</th>
                            <th>Updated</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          <?php foreach ($subjects as $subject): ?>
                            <tr>
                              <td><strong><?php echo htmlspecialchars($subject['subject_code']); ?></strong></td>
                              <td><?php echo htmlspecialchars($subject['title']); ?></td>
                              <td><?php echo (int)$subject['units']; ?></td>
                              <td><?php echo htmlspecialchars($subject['course']); ?></td>
                              <td><?php echo htmlspecialchars($subject['major']); ?></td>
                              <td><?php echo formatOrdinal((int)$subject['year_level']); ?></td>
                              <td><?php echo htmlspecialchars($subject['semester']); ?></td>
                              <td><?php echo htmlspecialchars(date('M d, Y', strtotime($subject['updated_at']))); ?></td>
                              <td>
                                <div class="d-flex gap-2">
                                  <a href="/TCC/public/admin_dashboard.php?section=subjects&edit_subject_id=<?php echo (int)$subject['id']; ?>" class="btn btn-sm btn-outline-primary" title="Edit Subject">
                                    <i class="bi bi-pencil"></i>
                                  </a>
                                  <form method="post" action="/TCC/BackEnd/admin/manage_subjects.php" onsubmit="return confirm('Delete subject <?php echo htmlspecialchars($subject['subject_code']); ?>?');">
                                    <input type="hidden" name="action" value="delete" />
                                    <input type="hidden" name="id" value="<?php echo (int)$subject['id']; ?>" />
                                    <button type="submit" class="btn btn-sm btn-outline-danger" title="Delete Subject">
                                      <i class="bi bi-trash"></i>
                                    </button>
                                  </form>
                                </div>
                              </td>
                            </tr>
                          <?php endforeach; ?>
                        </tbody>
                      </table>
                    </div>
                  <?php endif; ?>
                </div>
              </div>
            </div>
          <?php elseif ($section === 'study_load'): ?>
            <?php
            require_once __DIR__ . '/../BackEnd/database/db.php';
            $conn = Database::getInstance()->getConnection();
            $conn->query("CREATE TABLE IF NOT EXISTS study_load (
              id INT AUTO_INCREMENT PRIMARY KEY,
              course VARCHAR(20) NOT NULL,
              major VARCHAR(50) NOT NULL,
              year_level INT NOT NULL,
              section VARCHAR(100) NOT NULL,
              subject_code VARCHAR(50) NOT NULL,
              subject_title VARCHAR(255) NOT NULL,
              units INT DEFAULT 0,
              semester VARCHAR(20) NOT NULL DEFAULT 'First Semester',
              teacher VARCHAR(255) DEFAULT NULL,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              UNIQUE KEY uniq_load (course, major, year_level, section, semester, subject_code)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

            $conn->query("CREATE TABLE IF NOT EXISTS sections (
              id INT AUTO_INCREMENT PRIMARY KEY,
              year VARCHAR(10) NOT NULL,
              name VARCHAR(100) NOT NULL,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              UNIQUE KEY uniq_year_name (year, name)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

            $courseKeys = array_keys($courseMajorMap);
            $selectedCourse = strtoupper($_GET['filter_course'] ?? ($courseKeys[0] ?? 'IT'));
            if (!isset($courseMajorMap[$selectedCourse])) {
              $selectedCourse = $courseKeys[0] ?? 'IT';
            }
            $selectedMajor = isset($_GET['filter_major']) ? trim($_GET['filter_major']) : ($courseMajorMap[$selectedCourse][0] ?? '');
            if (!in_array($selectedMajor, $courseMajorMap[$selectedCourse], true)) {
              $selectedMajor = $courseMajorMap[$selectedCourse][0] ?? '';
            }
            $selectedYear = (int)($_GET['filter_year'] ?? 1);
            if ($selectedYear < 1 || $selectedYear > 4) {
              $selectedYear = 1;
            }
            $selectedSemester = isset($_GET['filter_semester']) ? trim($_GET['filter_semester']) : ($semesterOptions[0] ?? 'First Semester');
            if (!in_array($selectedSemester, $semesterOptions, true)) {
              $selectedSemester = $semesterOptions[0] ?? 'First Semester';
            }

            $sectionsForYear = [];
            $stmtSections = $conn->prepare("SELECT name FROM sections WHERE year = ? ORDER BY name");
            if ($stmtSections) {
              $yearString = (string)$selectedYear;
              $stmtSections->bind_param('s', $yearString);
              $stmtSections->execute();
              $resSections = $stmtSections->get_result();
              while ($row = $resSections->fetch_assoc()) {
                $sectionsForYear[] = $row['name'];
              }
              $stmtSections->close();
            }
            $selectedSection = trim($_GET['filter_section'] ?? '');
            if ($selectedSection === '' && !empty($sectionsForYear)) {
              $selectedSection = $sectionsForYear[0];
            }

            $subjectsAvailable = [];
            $stmtSubjects = $conn->prepare("SELECT subject_code, title, units FROM subjects WHERE course = ? AND major = ? AND year_level = ? AND semester = ? ORDER BY subject_code");
            if ($stmtSubjects) {
              $stmtSubjects->bind_param('ssis', $selectedCourse, $selectedMajor, $selectedYear, $selectedSemester);
              $stmtSubjects->execute();
              $resSubjects = $stmtSubjects->get_result();
              while ($row = $resSubjects->fetch_assoc()) {
                $subjectsAvailable[] = $row;
              }
              $stmtSubjects->close();
            }
            
            // Fetch teacher assignments for subjects
            $teacherAssignmentsMap = [];
            $colCheck = $conn->query("SHOW COLUMNS FROM teacher_assignments LIKE 'teacher_name'");
            $hasNewSchema = $colCheck && $colCheck->num_rows > 0;
            if ($colCheck) { $colCheck->close(); }
            
            if ($hasNewSchema) {
              $teacherAssignQuery = $conn->query("SELECT subject_code, teacher_name FROM teacher_assignments");
            } else {
              $teacherAssignQuery = $conn->query("SELECT subject as subject_code, username as teacher_name FROM teacher_assignments");
            }
            if ($teacherAssignQuery) {
              while ($row = $teacherAssignQuery->fetch_assoc()) {
                $subjCode = strtoupper(trim($row['subject_code'] ?? ''));
                if ($subjCode !== '') {
                  if (!isset($teacherAssignmentsMap[$subjCode])) {
                    $teacherAssignmentsMap[$subjCode] = [];
                  }
                  $teacherAssignmentsMap[$subjCode][] = $row['teacher_name'];
                }
              }
            }
            
            // Add teacher info to subjects
            foreach ($subjectsAvailable as &$subj) {
              $subjCode = strtoupper(trim($subj['subject_code'] ?? ''));
              $subj['teacher'] = isset($teacherAssignmentsMap[$subjCode]) && !empty($teacherAssignmentsMap[$subjCode]) 
                ? $teacherAssignmentsMap[$subjCode][0] 
                : '';
            }
            unset($subj);

            $assignedSubjects = [];
            $assignedTotals = ['subjects' => 0, 'units' => 0];
            if ($selectedSection !== '') {
              $stmtAssigned = $conn->prepare("SELECT id, subject_code, subject_title, units, semester, teacher FROM study_load WHERE course = ? AND major = ? AND year_level = ? AND section = ? AND semester = ? ORDER BY semester, subject_code");
              if ($stmtAssigned) {
                $stmtAssigned->bind_param('ssiss', $selectedCourse, $selectedMajor, $selectedYear, $selectedSection, $selectedSemester);
                $stmtAssigned->execute();
                $resAssigned = $stmtAssigned->get_result();
                while ($row = $resAssigned->fetch_assoc()) {
                  $assignedSubjects[] = $row;
                  $assignedTotals['subjects']++;
                  $assignedTotals['units'] += (int)$row['units'];
                }
                $stmtAssigned->close();
              }
            }

            $studyToastMessage = '';
            $studyToastType = 'success';
            if (isset($_GET['success'])) {
              $studyToastMessage = match ($_GET['success']) {
                'created' => 'Subject added to study load!',
                'updated' => 'Subject updated successfully!',
                'deleted' => 'Subject removed from study load.',
                default => 'Study load updated successfully!'
              };
            } elseif (isset($_GET['error'])) {
              $studyToastType = 'error';
              $studyToastMessage = match ($_GET['error']) {
                'missing_context' => 'Please complete the course, major, year, section, and semester filters before adding subjects.',
                'missing_subject' => 'Select a subject code from the dropdown.',
                'subject_missing' => 'Selected subject is not available in the catalog.',
                'duplicate' => 'That subject is already assigned to the selected section.',
                'invalid_major' => 'Please choose a valid major for the selected course.',
                'invalid_semester' => 'Please choose a valid semester option.',
                'invalid_id' => 'Invalid subject ID. Please try again.',
                'db_error' => 'Database error occurred. Please try again or contact support.',
                default => 'Unable to update the study load right now.'
              };
            }
            ?>
            <div class="records-container">
              <div class="records-header">
                <h2 class="records-title">
                  <i class="bi bi-journal-check"></i> Customize Study Load
                </h2>
                <p class="records-subtitle">Link curated subjects to sections using course, major, year level, section, and semester filters.</p>
              </div>
              <div class="records-main">
                <?php if (!empty($studyToastMessage)): ?>
                  <div class="alert alert-<?php echo $studyToastType === 'error' ? 'danger' : 'success'; ?> alert-dismissible fade show" role="alert">
                    <?php echo htmlspecialchars($studyToastMessage); ?>
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                  </div>
                <?php endif; ?>

                <div class="info-card">
                  <div class="card-header-modern">
                    <i class="bi bi-123"></i>
                    <h3>Step 1 — Select Filters</h3>
                  </div>
                  <form class="form-small" method="get">
                    <input type="hidden" name="section" value="study_load" />
                    <div class="row g-3">
                      <div class="col-md-3">
                        <label class="admin-form-label" for="studyCourseSelect">
                          <i class="bi bi-mortarboard"></i> Course
                        </label>
                        <select id="studyCourseSelect" name="filter_course" class="form-select form-select-lg" data-course-select>
                          <?php foreach ($courseMajorMap as $courseKey => $majorsList): ?>
                            <option value="<?php echo $courseKey; ?>" <?php echo $selectedCourse === $courseKey ? 'selected' : ''; ?>>
                              <?php echo $courseKey; ?>
                            </option>
                          <?php endforeach; ?>
                        </select>
                      </div>
                      <div class="col-md-3">
                        <label class="admin-form-label" for="studyMajorSelect">
                          <i class="bi bi-diagram-3"></i> Major
                        </label>
                        <select id="studyMajorSelect" name="filter_major" class="form-select form-select-lg" data-major-select>
                          <?php foreach ($courseMajorMap as $courseKey => $majorsList): ?>
                            <?php foreach ($majorsList as $majorName): ?>
                              <option value="<?php echo htmlspecialchars($majorName); ?>" data-course="<?php echo $courseKey; ?>" <?php echo ($selectedCourse === $courseKey && $selectedMajor === $majorName) ? 'selected' : ''; ?>>
                                <?php echo htmlspecialchars($majorName); ?>
                              </option>
                            <?php endforeach; ?>
                          <?php endforeach; ?>
                        </select>
                      </div>
                      <div class="col-md-2">
                        <label class="admin-form-label" for="studyYearFilter">
                          <i class="bi bi-calendar-year"></i> Year Level
                        </label>
                        <select id="studyYearFilter" name="filter_year" class="form-select form-select-lg">
                          <?php for ($y = 1; $y <= 4; $y++): ?>
                            <option value="<?php echo $y; ?>" <?php echo $selectedYear === $y ? 'selected' : ''; ?>>
                              <?php echo formatOrdinal($y); ?>
                            </option>
                          <?php endfor; ?>
                        </select>
                      </div>
                      <div class="col-md-3">
                        <label class="admin-form-label" for="studySectionFilter">
                          <i class="bi bi-collection-fill"></i> Section
                        </label>
                        <select id="studySectionFilter" name="filter_section" class="form-select form-select-lg" <?php echo empty($sectionsForYear) ? 'disabled' : ''; ?>>
                          <?php if (empty($sectionsForYear)): ?>
                            <option value="">No sections available</option>
                          <?php else: ?>
                            <?php foreach ($sectionsForYear as $sectionName): ?>
                              <option value="<?php echo htmlspecialchars($sectionName); ?>" <?php echo $selectedSection === $sectionName ? 'selected' : ''; ?>>
                                <?php echo htmlspecialchars($sectionName); ?>
                              </option>
                            <?php endforeach; ?>
                          <?php endif; ?>
                        </select>
                      </div>
                      <div class="col-md-2">
                        <label class="admin-form-label" for="studySemesterFilter">
                          <i class="bi bi-clock-history"></i> Semester
                        </label>
                        <select id="studySemesterFilter" name="filter_semester" class="form-select form-select-lg">
                          <?php foreach ($semesterOptions as $semOption): ?>
                            <option value="<?php echo htmlspecialchars($semOption); ?>" <?php echo $selectedSemester === $semOption ? 'selected' : ''; ?>>
                              <?php echo htmlspecialchars($semOption); ?>
                            </option>
                          <?php endforeach; ?>
                        </select>
                      </div>
                      <div class="col-md-1 align-self-end">
                        <button class="btn btn-primary btn-lg w-100" type="submit">
                          <i class="bi bi-arrow-repeat"></i>
                        </button>
                      </div>
                    </div>
                  </form>
                  <?php if (empty($sectionsForYear)): ?>
                    <div class="alert alert-warning mt-3 mb-0" role="alert">
                      Create a section for <?php echo htmlspecialchars(formatOrdinal($selectedYear)); ?> Year before assigning subjects.
                    </div>
                  <?php endif; ?>
                </div>

                <div class="info-card">
                  <div class="card-header-modern">
                    <i class="bi bi-collection"></i>
                    <h3>Step 2 — Available Subjects</h3>
                    <span class="badge bg-secondary ms-auto"><?php echo count($subjectsAvailable); ?> matches</span>
                  </div>
                  <?php if (empty($subjectsAvailable)): ?>
                    <p class="text-muted mb-0">No subjects found for this course, major, year level, and semester. Add them under the Subject Catalog first.</p>
                  <?php else: ?>
                    <div class="table-responsive">
                        <table class="table table-sm align-middle">
                          <thead>
                            <tr>
                              <th>Code</th>
                              <th>Title</th>
                              <th>Units</th>
                              <th>Semester</th>
                            </tr>
                          </thead>
                          <tbody>
                            <?php foreach ($subjectsAvailable as $subject): ?>
                              <tr>
                                <td><?php echo htmlspecialchars($subject['subject_code']); ?></td>
                                <td><?php echo htmlspecialchars($subject['title']); ?></td>
                                <td><?php echo (int)$subject['units']; ?></td>
                                <td><?php echo htmlspecialchars($selectedSemester); ?></td>
                              </tr>
                            <?php endforeach; ?>
                          </tbody>
                        </table>
                    </div>
                  <?php endif; ?>
                </div>

                <?php if ($selectedSection !== '' && !empty($sectionsForYear)): ?>
                  <div class="info-card">
                    <div class="card-header-modern">
                      <i class="bi bi-plus-square"></i>
                      <h3>Step 3 — Assign Subject to <?php echo htmlspecialchars($selectedSection); ?> • <?php echo htmlspecialchars($selectedSemester); ?></h3>
                    </div>
                    <form class="form-small" action="/TCC/BackEnd/admin/manage_study_load.php" method="post">
                      <input type="hidden" name="action" value="create" />
                      <input type="hidden" name="course" value="<?php echo htmlspecialchars($selectedCourse); ?>" />
                      <input type="hidden" name="major" value="<?php echo htmlspecialchars($selectedMajor); ?>" />
                      <input type="hidden" name="year_level" value="<?php echo (int)$selectedYear; ?>" />
                      <input type="hidden" name="section" value="<?php echo htmlspecialchars($selectedSection); ?>" />
                      <input type="hidden" name="semester" value="<?php echo htmlspecialchars($selectedSemester); ?>" />
                      <div class="row g-3 align-items-end">
                        <div class="col-md-12">
                          <label class="admin-form-label" for="studySubjectSelect">
                            <i class="bi bi-upc-scan"></i> Subject Code
                          </label>
                          <select id="studySubjectSelect" name="subject_code" class="form-select form-select-lg" <?php echo empty($subjectsAvailable) ? 'disabled' : ''; ?> data-subject-select required>
                            <option value="">Select subject...</option>
                            <?php foreach ($subjectsAvailable as $subject): ?>
                              <option value="<?php echo htmlspecialchars($subject['subject_code']); ?>" data-title="<?php echo htmlspecialchars($subject['title']); ?>" data-units="<?php echo (int)$subject['units']; ?>" data-teacher="<?php echo htmlspecialchars($subject['teacher'] ?? ''); ?>">
                                <?php echo htmlspecialchars($subject['subject_code'] . ' — ' . $subject['title']); ?>
                              </option>
                            <?php endforeach; ?>
                          </select>
                          <input type="hidden" id="studyTeacherHidden" name="teacher" value="" />
                          <div class="admin-hint mt-2">
                            <i class="bi bi-info-circle"></i>
                            <span>Teacher will be automatically assigned based on the subject code from Teacher Management</span>
                          </div>
                        </div>
                      </div>
                      <div class="mt-3 d-flex gap-2">
                        <button class="btn btn-primary btn-lg" type="submit" <?php echo empty($subjectsAvailable) ? 'disabled' : ''; ?>>
                          <i class="bi bi-check-circle me-2"></i>Add to Section
                        </button>
                        <button class="btn btn-outline-secondary btn-lg" type="reset">
                          <i class="bi bi-arrow-counterclockwise me-2"></i>Reset
                        </button>
                      </div>
                    </form>
                  </div>

                  <div class="info-card">
                    <div class="card-header-modern">
                      <i class="bi bi-list-check"></i>
                      <h3>Assigned Subjects • <?php echo htmlspecialchars($selectedSection); ?></h3>
                      <span class="badge bg-secondary ms-auto"><?php echo $assignedTotals['subjects']; ?> subjects</span>
                    </div>
                    <?php if (empty($assignedSubjects)): ?>
                      <p class="text-muted mb-0">No subjects assigned yet for this combination.</p>
                    <?php else: ?>
                      <div class="table-responsive">
                        <table class="table table-hover align-middle">
                          <thead>
                            <tr>
                              <th>Code</th>
                              <th>Title</th>
                              <th>Units</th>
                              <th>Semester</th>
                              <th>Teacher</th>
                              <th style="width: 140px;">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            <?php foreach ($assignedSubjects as $assigned): ?>
                              <?php $formId = 'loadUpdate' . $assigned['id']; ?>
                              <tr>
                                <td><strong><?php echo htmlspecialchars($assigned['subject_code']); ?></strong></td>
                                <td><?php echo htmlspecialchars($assigned['subject_title']); ?></td>
                                <td><?php echo (int)$assigned['units']; ?></td>
                                <td><?php echo htmlspecialchars($assigned['semester'] ?? $selectedSemester); ?></td>
                                <td>
                                  <form id="<?php echo $formId; ?>" action="/TCC/BackEnd/admin/manage_study_load.php" method="post" class="d-flex gap-2 align-items-center">
                                    <input type="hidden" name="action" value="update" />
                                    <input type="hidden" name="id" value="<?php echo (int)$assigned['id']; ?>" />
                                    <input type="hidden" name="course" value="<?php echo htmlspecialchars($selectedCourse); ?>" />
                                    <input type="hidden" name="major" value="<?php echo htmlspecialchars($selectedMajor); ?>" />
                                    <input type="hidden" name="year_level" value="<?php echo (int)$selectedYear; ?>" />
                                    <input type="hidden" name="section" value="<?php echo htmlspecialchars($selectedSection); ?>" />
                                    <input type="hidden" name="subject_code" value="<?php echo htmlspecialchars($assigned['subject_code']); ?>" />
                                    <input type="hidden" name="semester" value="<?php echo htmlspecialchars($assigned['semester'] ?? $selectedSemester); ?>" />
                                    <input name="teacher" class="form-control form-control-sm" placeholder="Subject Teacher" value="<?php echo htmlspecialchars($assigned['teacher'] ?? ''); ?>" />
                                  </form>
                                </td>
                                <td class="text-nowrap">
                                  <button type="submit" class="btn btn-sm btn-primary me-2" form="<?php echo $formId; ?>" title="Save Teacher">
                                    <i class="bi bi-save"></i>
                                  </button>
                                  <form method="post" action="/TCC/BackEnd/admin/manage_study_load.php" class="d-inline" onsubmit="return confirm('Remove <?php echo htmlspecialchars($assigned['subject_code']); ?> from this section?');">
                                    <input type="hidden" name="action" value="delete" />
                                    <input type="hidden" name="id" value="<?php echo (int)$assigned['id']; ?>" />
                                    <input type="hidden" name="course" value="<?php echo htmlspecialchars($selectedCourse); ?>" />
                                    <input type="hidden" name="major" value="<?php echo htmlspecialchars($selectedMajor); ?>" />
                                    <input type="hidden" name="year_level" value="<?php echo (int)$selectedYear; ?>" />
                                    <input type="hidden" name="section" value="<?php echo htmlspecialchars($selectedSection); ?>" />
                                    <input type="hidden" name="semester" value="<?php echo htmlspecialchars($assigned['semester'] ?? $selectedSemester); ?>" />
                                    <button type="submit" class="btn btn-sm btn-outline-danger" title="Delete Subject">
                                      <i class="bi bi-trash"></i>
                                    </button>
                                  </form>
                                </td>
                              </tr>
                            <?php endforeach; ?>
                          </tbody>
                          <tfoot>
                            <tr>
                              <th colspan="3">Total Subjects: <?php echo $assignedTotals['subjects']; ?></th>
                              <th colspan="3">Total Units: <?php echo $assignedTotals['units']; ?></th>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    <?php endif; ?>
                  </div>
                <?php endif; ?>
              </div>
            </div>
          <?php elseif ($section === 'grade_system'): ?>
            <?php
            require_once __DIR__ . '/../BackEnd/database/db.php';
            $conn = Database::getInstance()->getConnection();
            
            // Handle form submissions
            $editGradeId = isset($_GET['edit_grade_id']) ? intval($_GET['edit_grade_id']) : 0;
            $editGradeRow = null;
            if ($editGradeId > 0) {
              $s = $conn->prepare("SELECT id, user_id, username, year, semester, subject, instructor, prelim_grade, midterm_grade, finals_grade FROM student_grades WHERE id = ? LIMIT 1");
              $s->bind_param('i', $editGradeId);
              $s->execute();
              $r = $s->get_result();
              $editGradeRow = $r->fetch_assoc();
            }
            
            // Get all students for dropdown / search suggestions
            $students = [];
            $studentsQuery = $conn->query("SELECT id, username, full_name FROM users WHERE role = 'student' ORDER BY full_name, username");
            if ($studentsQuery) {
              while ($row = $studentsQuery->fetch_assoc()) {
                $students[] = $row;
              }
            }
            $gradeStudentDisplay = '';
            $gradeStudentIdValue = '';
            if ($editGradeRow) {
              if (!empty($editGradeRow['user_id'])) {
                foreach ($students as $student) {
                  if ((int)$student['id'] === (int)$editGradeRow['user_id']) {
                    $gradeStudentDisplay = trim($student['full_name'] ?? '');
                    if ($gradeStudentDisplay === '') {
                      $gradeStudentDisplay = $student['username'] ?? '';
                    }
                    break;
                  }
                }
                $gradeStudentIdValue = (string)(int)$editGradeRow['user_id'];
              }
              if ($gradeStudentDisplay === '' && !empty($editGradeRow['username'])) {
                $gradeStudentDisplay = $editGradeRow['username'];
              }
            }
            
            // Handle toast notifications for grade system
            if (!isset($toastMessage)) $toastMessage = '';
            if (!isset($toastType)) $toastType = 'success';
            
            if (isset($_GET['success'])) {
              $successMsg = $_GET['success'];
              if ($successMsg === 'deleted') {
                $toastMessage = 'Grade deleted successfully!';
              } elseif ($successMsg === 'deleted_all') {
                $toastMessage = 'All student grades deleted successfully!';
              } elseif ($successMsg === 'updated') {
                $toastMessage = 'Grade updated successfully!';
              } else {
                $toastMessage = 'Grade saved successfully!';
              }
              $toastType = 'success';
            } elseif (isset($_GET['error'])) {
              $errorMsg = $_GET['error'];
              $toastType = 'error';
              if ($errorMsg === 'missing') {
                $toastMessage = 'Error: Please fill in all required fields.';
              } elseif ($errorMsg === 'invalid_id' || $errorMsg === 'invalid_ids') {
                $toastMessage = 'Error: Invalid grade ID(s).';
              } elseif ($errorMsg === 'no_grades') {
                $toastMessage = 'Error: No grades found to delete.';
              } else {
                $toastMessage = 'Error: ' . htmlspecialchars($errorMsg);
              }
            }
            ?>
            <div class="records-container">
              <div class="records-header">
                <h2 class="records-title">
                  <i class="bi bi-journal-bookmark-fill"></i> Grade System
                </h2>
                <p class="records-subtitle">Manage student grades and academic records</p>
              </div>
              <div class="records-main">
            <div class="info-card">
              <div class="card-header-modern">
                <i class="bi bi-journal-bookmark-fill"></i>
                <h3><?php echo $editGradeRow ? 'Edit Student Grade' : 'Add Student Grade'; ?></h3>
              </div>
              <form class="form-small" action="/TCC/BackEnd/admin/manage_grades.php" method="post">
                <?php if ($editGradeRow): ?>
                  <input type="hidden" name="action" value="update" />
                  <input type="hidden" name="id" value="<?php echo (int)$editGradeRow['id']; ?>" />
                <?php else: ?>
                  <input type="hidden" name="action" value="create" />
                <?php endif; ?>

                <div class="row g-3 mb-3">
                  <div class="col-lg-7">
                    <div class="admin-form-group">
                      <label class="admin-form-label" for="gradeStudentSearchInput">
                        <i class="bi bi-search"></i> Student Search
                      </label>
                      <div class="admin-search-wrapper">
                        <input
                          type="text"
                          id="gradeStudentSearchInput"
                          class="form-control form-control-lg"
                          placeholder="Start typing a student name or username"
                          autocomplete="off"
                          role="combobox"
                          aria-autocomplete="list"
                          aria-expanded="false"
                          aria-controls="gradeStudentSearchList"
                          aria-haspopup="listbox"
                          value="<?php echo htmlspecialchars($gradeStudentDisplay); ?>"
                          required
                        />
                        <ul id="gradeStudentSearchList" role="listbox" class="admin-search-dropdown" aria-hidden="true"></ul>
                      </div>
                      <input type="hidden" name="user_id" id="gradeStudentIdHidden" value="<?php echo htmlspecialchars($gradeStudentIdValue); ?>" />
                      <div class="admin-hint">
                        <i class="bi bi-info-circle"></i>
                        <span>Select a student from the suggestions to link this grade to the correct record.</span>
                      </div>
                      <noscript>
                        <select name="user_id" class="form-select form-select-lg" style="margin-top: 10px;">
                          <option value="">Select Student...</option>
                          <?php if (empty($students)): ?>
                            <option value="" disabled>No students found. Please create student accounts first.</option>
                          <?php else: ?>
                            <?php foreach ($students as $student):
                              $studentLabel = trim($student['full_name'] ?? '');
                              if ($studentLabel === '') {
                                $studentLabel = $student['username'] ?? '';
                              }
                              $studentUsername = $student['username'] ?? '';
                              $optionText = $studentLabel;
                              if ($studentUsername && $studentUsername !== $studentLabel) {
                                $optionText .= ' (' . $studentUsername . ')';
                              }
                            ?>
                              <option value="<?php echo (int)$student['id']; ?>" <?php echo ($gradeStudentIdValue !== '' && (int)$student['id'] === (int)$gradeStudentIdValue) ? 'selected' : ''; ?>>
                                <?php echo htmlspecialchars($optionText); ?>
                              </option>
                            <?php endforeach; ?>
                          <?php endif; ?>
                        </select>
                      </noscript>
                    </div>
                  </div>
                  <div class="col-lg-5">
                    <label class="admin-form-label"><i class="bi bi-person-badge"></i> Instructor</label>
                    <input name="instructor" class="form-control form-control-lg" placeholder="e.g. Ms. Johnson"
                      value="<?php echo $editGradeRow ? htmlspecialchars($editGradeRow['instructor'] ?? '') : ''; ?>"/>
                  </div>
                </div>

                <div class="row g-3 mb-3">
                  <div class="col-md-4">
                    <label class="admin-form-label"><i class="bi bi-calendar-year"></i> Year</label>
                    <select name="year" class="form-select form-select-lg" required>
                      <option value="1" <?php echo ($editGradeRow && $editGradeRow['year']=='1')?'selected':'';?>>1st Year</option>
                      <option value="2" <?php echo ($editGradeRow && $editGradeRow['year']=='2')?'selected':'';?>>2nd Year</option>
                      <option value="3" <?php echo ($editGradeRow && $editGradeRow['year']=='3')?'selected':'';?>>3rd Year</option>
                      <option value="4" <?php echo ($editGradeRow && $editGradeRow['year']=='4')?'selected':'';?>>4th Year</option>
                    </select>
                  </div>
                  <div class="col-md-4">
                    <label class="admin-form-label"><i class="bi bi-calendar3"></i> Semester</label>
                    <select name="semester" class="form-select form-select-lg" required>
                      <option value="First Semester" <?php echo ($editGradeRow && $editGradeRow['semester']=='First Semester')?'selected':'';?>>First Semester</option>
                      <option value="Second Semester" <?php echo ($editGradeRow && $editGradeRow['semester']=='Second Semester')?'selected':'';?>>Second Semester</option>
                    </select>
                  </div>
                  <div class="col-md-4">
                    <label class="admin-form-label"><i class="bi bi-book"></i> Subject</label>
                    <input name="subject" class="form-control form-control-lg" placeholder="e.g. Mathematics" required
                      value="<?php echo $editGradeRow ? htmlspecialchars($editGradeRow['subject']) : ''; ?>"/>
                  </div>
                </div>

                <div class="row g-3">
                  <div class="col-md-4">
                    <label class="admin-form-label"><i class="bi bi-1-circle"></i> Prelim</label>
                    <input name="prelim_grade" type="number" step="0.01" min="0" max="100"
                      class="form-control form-control-lg" placeholder="88"
                      value="<?php echo $editGradeRow ? htmlspecialchars($editGradeRow['prelim_grade'] ?? '') : ''; ?>"/>
                  </div>
                  <div class="col-md-4">
                    <label class="admin-form-label"><i class="bi bi-2-circle"></i> Midterm</label>
                    <input name="midterm_grade" type="number" step="0.01" min="0" max="100"
                      class="form-control form-control-lg" placeholder="92"
                      value="<?php echo $editGradeRow ? htmlspecialchars($editGradeRow['midterm_grade'] ?? '') : ''; ?>"/>
                  </div>
                  <div class="col-md-4">
                    <label class="admin-form-label"><i class="bi bi-3-circle"></i> Finals</label>
                    <input name="finals_grade" type="number" step="0.01" min="0" max="100"
                      class="form-control form-control-lg" placeholder="90"
                      value="<?php echo $editGradeRow ? htmlspecialchars($editGradeRow['finals_grade'] ?? '') : ''; ?>"/>
                  </div>
                </div>

                <div class="d-flex align-items-center gap-2 mt-4">
                  <button class="btn btn-primary btn-lg">
                    <i class="bi bi-check-circle me-2"></i><?php echo $editGradeRow ? 'Update Grade' : 'Save Grade'; ?>
                  </button>
                  <?php if ($editGradeRow): ?>
                    <a href="/TCC/public/admin_dashboard.php?section=grade_system" class="btn btn-secondary btn-lg">
                      <i class="bi bi-x-circle me-2"></i>Cancel
                    </a>
                  <?php endif; ?>
                </div>
              </form>
            </div>
            
            <!-- Grade Filter -->
            <?php
            // Ensure sections table exists
            $conn->query("CREATE TABLE IF NOT EXISTS sections (
              id INT AUTO_INCREMENT PRIMARY KEY,
              year VARCHAR(10) NOT NULL,
              name VARCHAR(100) NOT NULL,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              UNIQUE KEY uniq_year_name (year, name)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
            
            $availableYears = [];
            $yearOptions = $conn->query("SELECT DISTINCT year FROM student_grades ORDER BY CAST(year AS UNSIGNED)");
            if ($yearOptions) {
              while ($row = $yearOptions->fetch_assoc()) {
                $availableYears[] = (string)$row['year'];
                }
              }
            $availableSections = [];
            // Get all sections from the sections table, not just from user_assignments
            $sectionOptions = $conn->query("SELECT DISTINCT name as section FROM sections WHERE name IS NOT NULL AND name <> '' ORDER BY name");
            if ($sectionOptions) {
              while ($row = $sectionOptions->fetch_assoc()) {
                $availableSections[] = $row['section'];
              }
            }
            $selectedYearFilter = isset($_GET['grade_year']) ? trim($_GET['grade_year']) : '';
            $selectedSectionFilter = isset($_GET['grade_section']) ? trim($_GET['grade_section']) : '';
            ?>
            
            <?php if (!empty($availableYears) || !empty($availableSections)): ?>
            <div class="info-card mt-3 grade-filter-card">
              <div class="grade-filter-inner">
                <div class="grade-filter-head">
                  <div class="grade-filter-title">
                    <span class="grade-filter-icon"><i class="bi bi-funnel-fill"></i></span>
                    <div>
                      <h3>Filter by Level & Section</h3>
                      <p>Focus the overview by academic year or section.</p>
              </div>
                  </div>
                  <?php if ($selectedYearFilter !== '' || $selectedSectionFilter !== ''): ?>
                    <a href="/TCC/public/admin_dashboard.php?section=grade_system" class="grade-filter-reset">
                      <i class="bi bi-arrow-counterclockwise"></i> Reset view
                  </a>
                  <?php endif; ?>
                </div>
                <div class="grade-filter-actions">
                  <?php
                  $filterBase = $_GET ?? [];
                  $filterBase['section'] = 'grade_system';
                  ?>
                  <?php if (!empty($availableYears)): ?>
                  <div class="grade-filter-group">
                    <span class="grade-filter-label">Year Level</span>
                    <?php 
                    $yearBase = $filterBase;
                    unset($yearBase['grade_year']);
                    $yearAllUrl = '/TCC/public/admin_dashboard.php?' . htmlspecialchars(http_build_query($yearBase));
                    ?>
                    <a href="<?php echo $yearAllUrl; ?>" class="grade-chip <?php echo ($selectedYearFilter === '') ? 'active' : ''; ?>">
                      <i class="bi bi-layers"></i>
                      <span>All Years</span>
                    </a>
                    <?php foreach ($availableYears as $yearValue): 
                      $yearParams = $yearBase;
                      $yearParams['grade_year'] = $yearValue;
                      $yearUrl = '/TCC/public/admin_dashboard.php?' . htmlspecialchars(http_build_query($yearParams));
                      $yearLabel = $yearValue === '1' ? '1st Year' : ($yearValue === '2' ? '2nd Year' : ($yearValue === '3' ? '3rd Year' : ($yearValue === '4' ? '4th Year' : $yearValue . ' Year')));
                      ?>
                      <a href="<?php echo $yearUrl; ?>" class="grade-chip <?php echo ($selectedYearFilter === $yearValue) ? 'active' : ''; ?>">
                        <i class="bi bi-calendar-week"></i>
                        <span><?php echo htmlspecialchars($yearLabel); ?></span>
                    </a>
                  <?php endforeach; ?>
                </div>
                  <?php endif; ?>
                  
                  <?php if (!empty($availableSections)): ?>
                  <div class="grade-filter-group">
                    <span class="grade-filter-label">Section</span>
                    <?php
                    $sectionBase = $filterBase;
                    unset($sectionBase['grade_section']);
                    $sectionAllUrl = '/TCC/public/admin_dashboard.php?' . htmlspecialchars(http_build_query($sectionBase));
                    ?>
                    <a href="<?php echo $sectionAllUrl; ?>" class="grade-chip <?php echo ($selectedSectionFilter === '') ? 'active' : ''; ?>">
                      <i class="bi bi-grid-1x2"></i>
                      <span>All Sections</span>
                    </a>
                    <?php foreach ($availableSections as $sectionValue): 
                      $sectionParams = $sectionBase;
                      $sectionParams['grade_section'] = $sectionValue;
                      $sectionUrl = '/TCC/public/admin_dashboard.php?' . htmlspecialchars(http_build_query($sectionParams));
                      ?>
                      <a href="<?php echo $sectionUrl; ?>" class="grade-chip <?php echo ($selectedSectionFilter === $sectionValue) ? 'active' : ''; ?>">
                        <i class="bi bi-collection"></i>
                        <span><?php echo htmlspecialchars($sectionValue); ?></span>
                      </a>
                    <?php endforeach; ?>
                  </div>
                  <?php endif; ?>
                </div>
                <?php if ($selectedYearFilter !== '' || $selectedSectionFilter !== ''): ?>
                  <div class="grade-filter-note">
                    <i class="bi bi-info-circle"></i>
                    Showing grade records
                    <?php if ($selectedYearFilter !== ''): ?>
                      for <strong><?php echo htmlspecialchars($selectedYearFilter === '1' ? '1st Year' : ($selectedYearFilter === '2' ? '2nd Year' : ($selectedYearFilter === '3' ? '3rd Year' : ($selectedYearFilter === '4' ? '4th Year' : $selectedYearFilter . ' Year')))); ?></strong>
                    <?php endif; ?>
                    <?php if ($selectedSectionFilter !== ''): ?>
                      in section <strong><?php echo htmlspecialchars($selectedSectionFilter); ?></strong>
                    <?php endif; ?>
                    .
                  </div>
                <?php endif; ?>
              </div>
            </div>
            <?php endif; ?>
 
            <!-- Display Grades by Year -->
            <div class="grade-system-wrapper">
            <?php
            $years = ['1', '2', '3', '4'];
            foreach ($years as $yearNum):
              if ($selectedYearFilter !== '' && $selectedYearFilter !== $yearNum) {
                continue;
              }
              
              if ($selectedSectionFilter !== '') {
                $gradesQuery = $conn->prepare("SELECT sg.*, u.full_name, u.image_path, ua.section FROM student_grades sg LEFT JOIN users u ON sg.user_id = u.id LEFT JOIN user_assignments ua ON (ua.user_id = sg.user_id OR (ua.user_id IS NULL AND ua.username = sg.username)) WHERE sg.year = ? AND ua.section = ? ORDER BY sg.user_id, sg.username, sg.semester, sg.subject");
                $gradesQuery->bind_param('ss', $yearNum, $selectedSectionFilter);
              } else {
                $gradesQuery = $conn->prepare("SELECT sg.*, u.full_name, u.image_path, ua.section FROM student_grades sg LEFT JOIN users u ON sg.user_id = u.id LEFT JOIN user_assignments ua ON (ua.user_id = sg.user_id OR (ua.user_id IS NULL AND ua.username = sg.username)) WHERE sg.year = ? ORDER BY sg.user_id, sg.username, sg.semester, sg.subject");
                $gradesQuery->bind_param('s', $yearNum);
              }
              $gradesQuery->execute();
              $gradesResult = $gradesQuery->get_result();
              $yearGrades = [];
              while ($row = $gradesResult->fetch_assoc()) {
                $yearGrades[] = $row;
              }
              $gradesQuery->close();

              if (empty($yearGrades)) {
                continue;
              }

              $studentGroups = [];
              foreach ($yearGrades as $grade) {
                $studentId = !empty($grade['user_id']) ? (int)$grade['user_id'] : null;
                $studentIdentifier = $studentId !== null ? 'id_' . $studentId : 'name_' . strtolower(trim($grade['username'] ?? $grade['full_name'] ?? uniqid()));
                $displayName = $grade['full_name'] ?? $grade['username'] ?? 'Unnamed Student';
                $imagePath = $grade['image_path'] ?? '/TCC/public/images/sample.jpg';
                if (!isset($studentGroups[$studentIdentifier])) {
                  $studentGroups[$studentIdentifier] = [
                    'user_id' => $studentId,
                    'display' => $displayName,
                    'image_path' => $imagePath,
                    'semesters' => [
                      'First Semester' => [],
                      'Second Semester' => []
                    ]
                  ];
                }
                $semesterKey = ($grade['semester'] === 'Second Semester') ? 'Second Semester' : 'First Semester';
                $studentGroups[$studentIdentifier]['semesters'][$semesterKey][] = $grade;
              }

              if (empty($studentGroups)) {
                continue;
              }
            ?>
            <div class="info-card grade-year-card">
              <div class="card-header-modern">
                <i class="bi bi-calendar-year"></i>
                <h3><?php echo $yearNum; ?><?php echo $yearNum == '1' ? 'st' : ($yearNum == '2' ? 'nd' : ($yearNum == '3' ? 'rd' : 'th')); ?> Year</h3>
              </div>
              <div class="grade-year-body">
                <div class="grade-student-list">
                  <?php foreach ($studentGroups as $groupKey => $group): ?>
                    <?php
                      $displayName = $group['display'];
                      $imagePath = $group['image_path'] ?? '/TCC/public/images/sample.jpg';
                      $initial = strtoupper(substr(trim($displayName), 0, 1));
                      $subjectCount = 0;
                      $scoredSubjects = 0;
                      $totalScores = 0;
                      $semesterSummaries = [];
                      foreach (['First Semester', 'Second Semester'] as $semName) {
                        if (!empty($group['semesters'][$semName])) {
                          foreach ($group['semesters'][$semName] as $grade) {
                            $subjectCount++;
                            $gradeParts = [];
                            foreach (['prelim_grade','midterm_grade','finals_grade'] as $field) {
                              if (isset($grade[$field]) && $grade[$field] !== '' && $grade[$field] !== null && is_numeric($grade[$field])) {
                                $gradeParts[] = floatval($grade[$field]);
                      }
                            }
                            if (!empty($gradeParts)) {
                              $scoredSubjects++;
                              $totalScores += array_sum($gradeParts) / count($gradeParts);
                            }
                          }

                          $semSubjectCount = count($group['semesters'][$semName]);
                          $semScoreTotal = 0;
                          $semScoreCount = 0;
                          foreach ($group['semesters'][$semName] as $grade) {
                            $gradeParts = [];
                            foreach (['prelim_grade','midterm_grade','finals_grade'] as $field) {
                              if (isset($grade[$field]) && $grade[$field] !== '' && $grade[$field] !== null && is_numeric($grade[$field])) {
                                $gradeParts[] = floatval($grade[$field]);
                              }
                            }
                            if (!empty($gradeParts)) {
                              $semScoreCount++;
                              $semScoreTotal += array_sum($gradeParts) / count($gradeParts);
                            }
                          }
                          $semAverage = $semScoreCount > 0 ? round($semScoreTotal / $semScoreCount, 1) : null;
                          $semesterSummaries[] = [
                            'label' => $semName === 'Second Semester' ? '2nd Sem' : '1st Sem',
                            'count' => $semSubjectCount,
                            'average' => $semAverage
                          ];
                        }
                      }
                      $summaryText = $subjectCount > 0 ? $subjectCount . ' ' . ($subjectCount === 1 ? 'subject' : 'subjects') . ' recorded' : 'No grades yet';
                      $averageScore = $scoredSubjects > 0 ? round($totalScores / $scoredSubjects, 1) : null;
                      $yearLabel = $yearNum == '1' ? '1st Year' : ($yearNum == '2' ? '2nd Year' : ($yearNum == '3' ? '3rd Year' : '4th Year'));
                      $modalSemesters = [];
                      foreach (['First Semester', 'Second Semester'] as $semNameModal) {
                        if (!empty($group['semesters'][$semNameModal])) {
                          $subjectsModal = [];
                          foreach ($group['semesters'][$semNameModal] as $gradeModal) {
                            $subjectsModal[] = [
                              'id' => (int)$gradeModal['id'],
                              'subject' => $gradeModal['subject'],
                              'instructor' => $gradeModal['instructor'] ?? '',
                              'prelim' => $gradeModal['prelim_grade'],
                              'midterm' => $gradeModal['midterm_grade'],
                              'finals' => $gradeModal['finals_grade']
                            ];
                          }
                          $modalSemesters[] = [
                            'name' => $semNameModal,
                            'subjects' => $subjectsModal
                          ];
                        }
                      }
                      // Collect all grade IDs for delete functionality
                      $allGradeIds = [];
                      foreach (['First Semester', 'Second Semester'] as $semNameForIds) {
                        if (!empty($group['semesters'][$semNameForIds])) {
                          foreach ($group['semesters'][$semNameForIds] as $gradeForIds) {
                            if (isset($gradeForIds['id'])) {
                              $allGradeIds[] = (int)$gradeForIds['id'];
                            }
                          }
                        }
                      }
                      
                      $modalPayload = [
                        'student' => $displayName,
                        'yearLabel' => $yearLabel,
                        'subjectCount' => $subjectCount,
                        'averageScore' => $averageScore,
                        'semesters' => $modalSemesters
                      ];
                      if ($group['user_id'] !== null) {
                        $modalPayload['studentId'] = (int)$group['user_id'];
                      }
                      $modalJson = htmlspecialchars(json_encode($modalPayload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), ENT_QUOTES, 'UTF-8');
                    ?>
                    <div class="student-grade-card">
                      <div class="student-grade-main">
                        <img src="<?php echo htmlspecialchars($imagePath); ?>" alt="<?php echo htmlspecialchars($displayName); ?>" class="student-profile-picture" onerror="this.src='/TCC/public/images/sample.jpg'; this.onerror=null;">
                        <div>
                          <span class="student-grade-name"><?php echo htmlspecialchars($displayName); ?></span>
                          <span class="student-grade-summary"><?php echo htmlspecialchars($summaryText); ?></span>
                                    </div>
                                      </div>
                      <div class="student-grade-meta">
                        <?php foreach ($semesterSummaries as $semInfo): ?>
                          <span class="meta-pill<?php echo ($semInfo['average'] !== null) ? ' meta-pill--has-avg' : ''; ?>">
                            <?php echo htmlspecialchars($semInfo['label']); ?>
                            <?php if ($semInfo['average'] !== null): ?>
                              <small><?php echo htmlspecialchars($semInfo['average']); ?> avg</small>
                                      <?php endif; ?>
                          </span>
                        <?php endforeach; ?>
                        <?php if ($averageScore !== null): ?>
                          <span class="meta-pill meta-pill-accent"><?php echo htmlspecialchars($averageScore); ?><small>avg</small></span>
                        <?php endif; ?>
                        <!-- View removed -->
                        <?php if (!empty($allGradeIds)): ?>
                        <form action="/TCC/BackEnd/admin/manage_grades.php" method="post" style="display:inline;" onsubmit="return confirm('Are you sure you want to delete all grades for <?php echo htmlspecialchars($displayName); ?>? This action cannot be undone.');" class="delete-student-grades-form">
                          <?php foreach ($allGradeIds as $gradeId): ?>
                            <input type="hidden" name="grade_ids[]" value="<?php echo $gradeId; ?>" />
                          <?php endforeach; ?>
                          <input type="hidden" name="action" value="delete_all" />
                          <input type="hidden" name="student_name" value="<?php echo htmlspecialchars($displayName); ?>" />
                          <button type="submit" class="meta-pill delete-pill" title="Delete all grades">
                                          <i class="bi bi-trash"></i> Delete
                                        </button>
                                      </form>
                        <?php endif; ?>
                                    </div>
                                  </div>
                                <?php endforeach; ?>
                              </div>
                            </div>
                                      </div>
                        <?php endforeach; ?>
                      </div>

                    </div>
            <!-- Grade view modal removed -->
              </div>
            </div>

            <?php // close section switch: if ($section === 'announcements') / elseif / elseif ... ?>
            <?php endif; ?>
            
            <?php if ($section === 'evaluation'): ?>
              <?php
              // Ensure database connection is available
              if (!isset($conn)) {
                require_once __DIR__ . '/../BackEnd/database/db.php';
                $conn = Database::getInstance()->getConnection();
              }
              ?>
              <div class="records-container">
                <div class="records-header">
                  <h2 class="records-title">
                    <i class="bi bi-clipboard-check"></i> Evaluation Management
                  </h2>
                  <p class="records-subtitle">Enable or disable teacher evaluations and view lowest rated teachers</p>
                </div>
                
                <div class="records-main">
                  <!-- Toggle Section -->
                  <div class="info-card">
                    <div class="card-header-modern">
                      <i class="bi bi-toggle-on"></i>
                      <h3>Evaluation Settings</h3>
                    </div>
                    
                    <?php
                    $evaluationsEnabled = true;
                    try {
                      // Check if table exists first
                      $tableCheck = $conn->query("SHOW TABLES LIKE 'evaluation_settings'");
                      if ($tableCheck && $tableCheck->num_rows > 0) {
                        $settingsQuery = $conn->query("SELECT setting_value FROM evaluation_settings WHERE setting_key = 'evaluations_enabled' LIMIT 1");
                        if ($settingsQuery && $row = $settingsQuery->fetch_assoc()) {
                          $evaluationsEnabled = ($row['setting_value'] == '1');
                        }
                      }
                    } catch (Throwable $e) {
                      $evaluationsEnabled = true;
                    }
                    ?>
                    
                    <div class="evaluation-toggle-section">
                      <div class="toggle-control">
                        <label class="toggle-label">
                          <span class="toggle-text">Enable Teacher Evaluations</span>
                          <span class="toggle-description">When enabled, students can evaluate their teachers. When disabled, students cannot access the evaluation form.</span>
                        </label>
                        <div class="toggle-switch-container">
                          <label class="toggle-switch">
                            <input type="checkbox" id="evaluationToggle" <?php echo $evaluationsEnabled ? 'checked' : ''; ?>>
                            <span class="toggle-slider"></span>
                          </label>
                          <span class="toggle-status" id="toggleStatus">
                            <?php echo $evaluationsEnabled ? 'Enabled' : 'Disabled'; ?>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <!-- Lowest Rated Teachers Section -->
                  <div class="info-card">
                    <div class="card-header-modern">
                      <i class="bi bi-exclamation-triangle"></i>
                      <h3>Lowest Rated Teachers</h3>
                    </div>
                    
                    <div id="lowestRatedContainer">
                      <p class="text-muted">Loading teacher ratings...</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <script>
              document.addEventListener('DOMContentLoaded', function() {
                // Toggle functionality
                const toggle = document.getElementById('evaluationToggle');
                const status = document.getElementById('toggleStatus');
                
                toggle.addEventListener('change', function() {
                  const enabled = this.checked;
                  const formData = new FormData();
                  formData.append('enabled', enabled);
                  
                  fetch('/TCC/BackEnd/admin/toggle_evaluation.php', {
                    method: 'POST',
                    body: formData
                  })
                  .then(response => response.json())
                  .then(data => {
                    if (data.success) {
                      status.textContent = enabled ? 'Enabled' : 'Disabled';
                      status.className = 'toggle-status ' + (enabled ? 'status-enabled' : 'status-disabled');
                    } else {
                      alert('Error: ' + data.message);
                      this.checked = !enabled; // Revert toggle
                    }
                  })
                  .catch(error => {
                    console.error('Error:', error);
                    alert('An error occurred while updating the setting');
                    this.checked = !enabled; // Revert toggle
                  });
                });
                
                // Set initial status class
                status.className = 'toggle-status ' + (toggle.checked ? 'status-enabled' : 'status-disabled');
                
                // Load lowest rated teachers
                fetch('/TCC/BackEnd/admin/get_lowest_rated_teachers.php')
                  .then(response => response.json())
                  .then(data => {
                    const container = document.getElementById('lowestRatedContainer');
                    
                    if (!data.success || !data.teachers || data.teachers.length === 0) {
                      container.innerHTML = '<p class="text-muted">No teacher evaluations available yet.</p>';
                      return;
                    }
                    
                    let html = '<div class="leaderboard-container">';
                    data.teachers.forEach((teacher, index) => {
                      const ratingClass = teacher.percentage < 50 ? 'rating-low' : (teacher.percentage < 70 ? 'rating-medium' : 'rating-high');
                      const rank = index + 1;
                      html += `
                        <div class="leaderboard-item">
                          <div class="leaderboard-rank">${rank}</div>
                          <div class="leaderboard-avatar">
                            <img src="${escapeHtml(teacher.image_path)}" alt="${escapeHtml(teacher.full_name)}" class="avatar-img" onerror="this.src='/TCC/public/images/sample.jpg'">
                          </div>
                          <div class="leaderboard-info">
                            <h4 class="leaderboard-name">${escapeHtml(teacher.full_name)}</h4>
                            <div class="leaderboard-stats">
                              <span class="stat-badge">${teacher.total_evaluations} evaluation${teacher.total_evaluations !== 1 ? 's' : ''}</span>
                              <span class="rating-badge ${ratingClass}">${teacher.average_rating.toFixed(2)} / 4.00</span>
                            </div>
                          </div>
                          <div class="leaderboard-rating">
                            <div class="rating-percentage-large ${ratingClass}">
                              ${teacher.percentage.toFixed(1)}%
                            </div>
                          </div>
                        </div>
                      `;
                    });
                    html += '</div>';
                    container.innerHTML = html;
                  })
                  .catch(error => {
                    console.error('Error loading lowest rated teachers:', error);
                    document.getElementById('lowestRatedContainer').innerHTML = 
                      '<p class="text-danger">An error occurred while loading teacher ratings.</p>';
                  });
              });
              
              function escapeHtml(text) {
                const div = document.createElement('div');
                div.textContent = text;
                return div.innerHTML;
              }
              </script>
            <?php endif; ?>

          <?php // end settings block ?>

          <?php if ($section === 'manage_user'): ?>
            <?php
            require_once __DIR__ . '/../BackEnd/database/db.php';
            $conn = Database::getInstance()->getConnection();

            $userToastMessage = '';
            $userToastType = 'success';
            if (isset($_GET['success'])) {
              $userToastMessage = match ($_GET['success']) {
                'updated' => 'User role updated successfully!',
                default => 'User updated successfully!'
              };
            } elseif (isset($_GET['error'])) {
              $userToastType = 'error';
              $userToastMessage = match ($_GET['error']) {
                'missing' => 'Please select a user and role.',
                'invalid_id' => 'Invalid user ID.',
                'invalid_role' => 'Invalid role selected.',
                'db_error' => 'Database error occurred. Please try again.',
                'self_demote' => 'You cannot change your own role.',
                default => 'Unable to update user role right now.'
              };
            }

            $users = [];
            $stmt = $conn->prepare("SELECT id, username, full_name, role, school_id, image_path, created_at FROM users ORDER BY created_at DESC");
            if ($stmt) {
              $stmt->execute();
              $result = $stmt->get_result();
              while ($row = $result->fetch_assoc()) {
                $users[] = $row;
              }
              $stmt->close();
            }
            ?>
            <div class="records-container">
              <div class="records-header">
                <h2 class="records-title">
                  <i class="bi bi-person-gear"></i> Manage User Roles
                </h2>
                <p class="records-subtitle">Set user roles (Student, Admin, or Teacher) for all users in the system.</p>
              </div>
              <div class="records-main">
                <?php if (!empty($userToastMessage)): ?>
                  <div class="alert alert-<?php echo $userToastType === 'error' ? 'danger' : 'success'; ?> alert-dismissible fade show" role="alert">
                    <?php echo htmlspecialchars($userToastMessage); ?>
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                  </div>
                <?php endif; ?>

                <div class="info-card">
                  <div class="card-header-modern">
                    <i class="bi bi-people"></i>
                    <h3>All Users</h3>
                    <span class="badge bg-secondary ms-auto"><?php echo count($users); ?> total</span>
                  </div>
                  <?php if (empty($users)): ?>
                    <p class="text-muted mb-0">No users found in the system.</p>
                  <?php else: ?>
                    <div class="table-responsive">
                      <table class="table table-hover align-middle">
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Username</th>
                            <th>Full Name</th>
                            <th>School ID</th>
                            <th>Current Role</th>
                            <th>Change Role</th>
                            <th>Created</th>
                          </tr>
                        </thead>
                        <tbody>
                          <?php foreach ($users as $user): ?>
                            <?php $formId = 'roleForm' . $user['id']; ?>
                            <tr>
                              <td><?php echo (int)$user['id']; ?></td>
                              <td><strong><?php echo htmlspecialchars($user['username']); ?></strong></td>
                              <td><?php echo htmlspecialchars($user['full_name'] ?? '—'); ?></td>
                              <td><?php echo htmlspecialchars($user['school_id'] ?? '—'); ?></td>
                              <td>
                                <span class="badge bg-<?php 
                                  echo $user['role'] === 'admin' ? 'danger' : ($user['role'] === 'teacher' ? 'warning' : 'info'); 
                                ?>">
                                  <?php echo htmlspecialchars(ucfirst($user['role'])); ?>
                                </span>
                              </td>
                              <td>
                                <form id="<?php echo $formId; ?>" action="/TCC/BackEnd/admin/manage_user_role.php" method="post" class="d-flex gap-2 align-items-center">
                                  <input type="hidden" name="action" value="update_role" />
                                  <input type="hidden" name="user_id" value="<?php echo (int)$user['id']; ?>" />
                                  <select name="role" class="form-select form-select-sm" style="width: auto; min-width: 120px;">
                                    <option value="student" <?php echo $user['role'] === 'student' ? 'selected' : ''; ?>>Student</option>
                                    <option value="teacher" <?php echo $user['role'] === 'teacher' ? 'selected' : ''; ?>>Teacher</option>
                                    <option value="admin" <?php echo $user['role'] === 'admin' ? 'selected' : ''; ?>>Admin</option>
                                  </select>
                                  <button type="submit" class="btn btn-sm btn-primary" title="Update Role">
                                    <i class="bi bi-save"></i>
                                  </button>
                                </form>
                              </td>
                              <td class="text-muted small">
                                <?php 
                                  if ($user['created_at']) {
                                    $date = new DateTime($user['created_at']);
                                    echo $date->format('M d, Y');
                                  } else {
                                    echo '—';
                                  }
                                ?>
                              </td>
                            </tr>
                          <?php endforeach; ?>
                        </tbody>
                      </table>
                    </div>
                  <?php endif; ?>
                </div>
              </div>
            </div>
          <?php endif; ?>

          <?php if ($section === 'teacher_management'): ?>
            <?php
            require_once __DIR__ . '/../BackEnd/database/db.php';
            $conn = Database::getInstance()->getConnection();
            
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
            
            $teacherToastMessage = '';
            $teacherToastType = 'success';
            if (isset($_GET['success'])) {
              $teacherToastMessage = match ($_GET['success']) {
                'created' => 'Teacher schedule created successfully!',
                'updated' => 'Teacher schedule updated successfully!',
                'deleted' => 'Teacher schedule deleted successfully!',
                default => 'Teacher schedule saved successfully!'
              };
            } elseif (isset($_GET['error'])) {
              $teacherToastType = 'error';
              $teacherToastMessage = match ($_GET['error']) {
                'missing' => 'Please fill in all required fields.',
                'invalid_id' => 'Invalid schedule ID.',
                'db_error' => 'Database error occurred. Please try again.',
                default => 'Unable to save schedule right now.'
              };
            }
            
            // Get all teachers from multiple sources
            $allTeacherNames = [];
            
            // 1. Get teachers from teacher_assignments table (new system)
            $colCheck = $conn->query("SHOW COLUMNS FROM teacher_assignments LIKE 'teacher_name'");
            $hasNewSchema = $colCheck && $colCheck->num_rows > 0;
            if ($colCheck) { $colCheck->close(); }
            
            if ($hasNewSchema) {
              $taQuery = $conn->query("SELECT DISTINCT teacher_name FROM teacher_assignments WHERE teacher_name IS NOT NULL AND teacher_name <> '' ORDER BY teacher_name");
              if ($taQuery) {
                while ($row = $taQuery->fetch_assoc()) {
                  $teacherName = trim($row['teacher_name']);
                  if ($teacherName !== '' && !in_array($teacherName, $allTeacherNames)) {
                    $allTeacherNames[] = $teacherName;
                  }
                }
              }
            } else {
              // Old schema
              $taQuery = $conn->query("SELECT DISTINCT username as teacher_name FROM teacher_assignments WHERE username IS NOT NULL AND username <> '' ORDER BY username");
              if ($taQuery) {
                while ($row = $taQuery->fetch_assoc()) {
                  $teacherName = trim($row['teacher_name']);
                  if ($teacherName !== '' && !in_array($teacherName, $allTeacherNames)) {
                    $allTeacherNames[] = $teacherName;
                  }
                }
              }
            }
            
            // 2. Get teachers from schedules table
            $teachers = [];
            $teachersQuery = $conn->query("SELECT DISTINCT instructor FROM schedules WHERE instructor IS NOT NULL AND instructor <> '' ORDER BY instructor");
            if ($teachersQuery) {
              while ($row = $teachersQuery->fetch_assoc()) {
                $teacherName = trim($row['instructor']);
                if ($teacherName !== '' && !in_array($teacherName, $allTeacherNames)) {
                  $allTeacherNames[] = $teacherName;
                  $teachers[] = $teacherName;
                }
              }
            }
            
            // 3. Get all users with teacher role
            $teacherUsers = [];
            $teacherUsersQuery = $conn->query("SELECT id, username, full_name FROM users WHERE role = 'teacher' ORDER BY full_name, username");
            if ($teacherUsersQuery) {
              while ($row = $teacherUsersQuery->fetch_assoc()) {
                $teacherUsers[] = $row;
                $teacherDisplay = trim($row['full_name'] ?? '');
                if ($teacherDisplay === '') {
                  $teacherDisplay = $row['username'] ?? '';
                }
                if ($teacherDisplay !== '' && !in_array($teacherDisplay, $allTeacherNames)) {
                  $allTeacherNames[] = $teacherDisplay;
                }
              }
            }
            
            // Sort all teacher names
            sort($allTeacherNames);
            
            // Get schedules for selected teacher
            $selectedTeacher = isset($_GET['filter_teacher']) ? trim($_GET['filter_teacher']) : '';
            $teacherSchedules = [];
            if ($selectedTeacher !== '') {
              $schedStmt = $conn->prepare("SELECT id, year, subject, day, time_start, time_end, room, section, building, class_type, instructor FROM schedules WHERE instructor = ? ORDER BY FIELD(day, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'), time_start");
              if ($schedStmt) {
                $schedStmt->bind_param('s', $selectedTeacher);
                $schedStmt->execute();
                $schedRes = $schedStmt->get_result();
                while ($row = $schedRes->fetch_assoc()) {
                  $teacherSchedules[] = $row;
                }
                $schedStmt->close();
              }
            }
            
            // Get available sections and buildings
            $availableSections = [];
            $sectionsQuery = $conn->query("SELECT DISTINCT name FROM sections ORDER BY name");
            if ($sectionsQuery) {
              while ($row = $sectionsQuery->fetch_assoc()) {
                $availableSections[] = $row['name'];
              }
            }
            
            $availableBuildings = [];
            $buildingsQuery = $conn->query("SELECT name FROM buildings ORDER BY name");
            if ($buildingsQuery) {
              while ($row = $buildingsQuery->fetch_assoc()) {
                $availableBuildings[] = $row['name'];
              }
            }
            if (empty($availableBuildings)) {
              $buildingsPath = __DIR__ . '/../database/buildings.json';
              if (file_exists($buildingsPath)) {
                $buildingsData = json_decode(file_get_contents($buildingsPath), true) ?: [];
                $availableBuildings = array_keys($buildingsData);
              }
            }
            ?>
            <div class="records-container">
              <div class="records-header">
                <h2 class="records-title">
                  <i class="bi bi-person-badge"></i> Teacher Management
                </h2>
                <p class="records-subtitle">View and manage teacher schedules and assignments</p>
              </div>
              <div class="records-main">
                <?php if (!empty($teacherToastMessage)): ?>
                  <div class="alert alert-<?php echo $teacherToastType === 'error' ? 'danger' : 'success'; ?> alert-dismissible fade show" role="alert">
                    <?php echo htmlspecialchars($teacherToastMessage); ?>
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                  </div>
                <?php endif; ?>
                
                <div class="info-card">
                  <div class="card-header-modern">
                    <i class="bi bi-funnel"></i>
                    <h3>Filter by Teacher</h3>
                  </div>
                  <form method="get" class="form-small">
                    <input type="hidden" name="section" value="teacher_management" />
                    <div class="row g-3">
                      <div class="col-md-8">
                        <label class="admin-form-label" for="teacherFilterSelect">
                          <i class="bi bi-person-badge"></i> Select Teacher
                        </label>
                        <select id="teacherFilterSelect" name="filter_teacher" class="form-select form-select-lg" onchange="this.form.submit()">
                          <option value="">Select a teacher...</option>
                          <?php foreach ($allTeacherNames as $teacherName): ?>
                            <option value="<?php echo htmlspecialchars($teacherName); ?>" <?php echo $selectedTeacher === $teacherName ? 'selected' : ''; ?>>
                              <?php echo htmlspecialchars($teacherName); ?>
                            </option>
                          <?php endforeach; ?>
                        </select>
                      </div>
                      <div class="col-md-4 align-self-end">
                        <?php if ($selectedTeacher !== ''): ?>
                          <a href="/TCC/public/admin_dashboard.php?section=teacher_management" class="btn btn-outline-secondary btn-lg w-100">
                            <i class="bi bi-x-circle me-2"></i>Clear Filter
                          </a>
                        <?php endif; ?>
                      </div>
                    </div>
                  </form>
                </div>
                
                <?php if ($selectedTeacher !== ''): ?>
                  <div class="info-card mt-3">
                    <div class="card-header-modern">
                      <i class="bi bi-calendar-week"></i>
                      <h3>Schedule for <?php echo htmlspecialchars($selectedTeacher); ?></h3>
                      <span class="badge bg-secondary ms-auto"><?php echo count($teacherSchedules); ?> classes</span>
                    </div>
                    <?php if (empty($teacherSchedules)): ?>
                      <p class="text-muted mb-0">No schedules found for this teacher.</p>
                    <?php else: ?>
                      <?php
                      // Group schedules by day
                      $schedulesByDay = [];
                      foreach ($teacherSchedules as $schedule) {
                        $day = $schedule['day'] ?? 'Unknown';
                        if (!isset($schedulesByDay[$day])) {
                          $schedulesByDay[$day] = [];
                        }
                        $schedulesByDay[$day][] = $schedule;
                      }
                      
                      $teacherDayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                      uksort($schedulesByDay, function($a, $b) use ($teacherDayOrder) {
                        $posA = array_search($a, $teacherDayOrder);
                        $posB = array_search($b, $teacherDayOrder);
                        if ($posA === false) $posA = 999;
                        if ($posB === false) $posB = 999;
                        return $posA - $posB;
                      });
                      ?>
                      <?php foreach ($schedulesByDay as $day => $daySchedules): ?>
                        <div class="mt-3">
                          <h5 class="mb-3"><i class="bi bi-calendar-day"></i> <?php echo htmlspecialchars($day); ?></h5>
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
                                  </tr>
                                <?php endforeach; ?>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      <?php endforeach; ?>
                    <?php endif; ?>
                  </div>
                <?php else: ?>
                  <div class="info-card mt-3">
                    <div class="card-header-modern">
                      <i class="bi bi-info-circle"></i>
                      <h3>Select a Teacher</h3>
                    </div>
                    <p class="text-muted mb-0">Select a teacher from the dropdown above to view their schedule.</p>
                  </div>
                <?php endif; ?>
              </div>
            </div>
          <?php endif; ?>

          <?php if ($section === 'settings'): ?>
            <?php include __DIR__ . '/../BackEnd/admin/settings_section.php'; ?>
          <?php endif; ?>

      </main>
    </div>
    
    <!-- Toast Notification Container -->
    <div class="toast-container" id="toastContainer"></div>
    
    <script src="js/bootstrap.bundle.min.js"></script>
    <script>
      // Function to update section assignment form inputs
      function updateSectionForm(form, key) {
        // Find form elements by form attribute
        var buildingSelect = document.querySelector('select[form="assignForm_' + key + '"]');
        var floorInput = document.querySelector('input[name="floor"][form="assignForm_' + key + '"]');
        var roomInput = document.querySelector('input[name="room"][form="assignForm_' + key + '"]');
        
        if (!buildingSelect || !floorInput || !roomInput) {
          alert('Error: Could not find form fields. Please refresh the page and try again.');
          console.error('Missing form elements:', {buildingSelect, floorInput, roomInput, key});
          return false;
        }
        
        if (!buildingSelect.value || !floorInput.value || !roomInput.value.trim()) {
          alert('Please fill in all fields (Building, Floor, and Room)');
          return false;
        }
        
        // Values are already in the form inputs, so form will submit them directly
        return true;
      }
      
      // Save scroll position before form submission
      function saveScrollPosition() {
        sessionStorage.setItem('scrollPosition', window.pageYOffset || document.documentElement.scrollTop);
      }
      
      // Restore scroll position after page load
      function restoreScrollPosition() {
        const savedPosition = sessionStorage.getItem('scrollPosition');
        if (savedPosition !== null) {
          // Use multiple attempts to ensure DOM is ready and layout is complete
          const restore = () => {
            window.scrollTo(0, parseInt(savedPosition, 10));
            sessionStorage.removeItem('scrollPosition');
          };
          
          // Try immediately
          requestAnimationFrame(() => {
            restore();
            // Also try after a short delay to handle dynamic content
            setTimeout(restore, 100);
          });
        }
      }
      
      // Toast Notification System
      function showToast(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = 'toast-notification' + (type === 'error' ? ' error' : '');
        
        const icon = type === 'error' ? 'bi-exclamation-triangle' : 'bi-check-circle';
        
        toast.innerHTML = `
          <i class="bi ${icon}"></i>
          <div class="toast-content">${message}</div>
          <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="bi bi-x"></i>
          </button>
        `;
        
        container.appendChild(toast);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
          toast.style.animation = 'fadeOut 0.3s ease-in forwards';
          setTimeout(() => {
            if (toast.parentElement) {
              toast.remove();
            }
          }, 300);
        }, 3000);
      }
      
      document.addEventListener('DOMContentLoaded', ()=>{
        var t=document.querySelectorAll('[data-bs-toggle="tooltip"]');Array.from(t).forEach(el=>new bootstrap.Tooltip(el));
        
        // Hero clock updater (admin)
        (function(){
          function ordinal(n){var s=["th","st","nd","rd"],v=n%100;return n+(s[(v-20)%10]||s[v]||s[0]);}
          function updateClock(prefix){
            var timeEl=document.getElementById(prefix+'ClockTime');
            var subEl=document.getElementById(prefix+'ClockSub');
            var dayEl=document.getElementById(prefix+'ClockDay');
            if(!timeEl||!subEl||!dayEl) return;
            var d=new Date();
            var hours24=d.getHours();
            var minutes=d.getMinutes();
            var seconds=d.getSeconds();
            var ampm=hours24>=12?'PM':'AM';
            var displayHour=hours24%12;
            if(displayHour===0){displayHour=12;}
            var hh=displayHour<10?'0'+displayHour:String(displayHour);
            var mm=minutes<10?'0'+minutes:String(minutes);
            var ss=seconds<10?'0'+seconds:String(seconds);
            timeEl.textContent=hh+':'+mm+':'+ss;
            subEl.textContent=ampm;
            var weekday=d.toLocaleDateString(undefined,{weekday:'long'});
            var month=d.toLocaleDateString(undefined,{month:'long'});
            var day=d.getDate();
            dayEl.textContent=weekday+', '+month+' '+ordinal(day);
          }
          updateClock('adm');
          setInterval(function(){updateClock('adm');}, 1000);
        })();
        
        // Restore scroll position if it was saved (form was submitted)
        restoreScrollPosition();
        
        // Clean up any lingering modal backdrops on page load
        var lingeringBackdrops = document.querySelectorAll('.modal-backdrop:not(.show)');
        lingeringBackdrops.forEach(function(backdrop) {
          backdrop.remove();
        });
        
        // Ensure grade system is clickable
        var gradeSystemWrapper = document.querySelector('.grade-system-wrapper');
        if (gradeSystemWrapper) {
          gradeSystemWrapper.style.pointerEvents = 'auto';
          gradeSystemWrapper.style.zIndex = '1';
        }
        
        // Auto-populate teacher when subject is selected in study load
        var studySubjectSelect = document.getElementById('studySubjectSelect');
        var studyTeacherHidden = document.getElementById('studyTeacherHidden');
        if (studySubjectSelect && studyTeacherHidden) {
          studySubjectSelect.addEventListener('change', function() {
            var selectedOption = this.options[this.selectedIndex];
            if (selectedOption && selectedOption.value) {
              var teacher = selectedOption.getAttribute('data-teacher') || '';
              studyTeacherHidden.value = teacher;
              if (teacher) {
                // Show a visual indicator that teacher was auto-filled
                var hint = this.parentElement.querySelector('.admin-hint');
                if (hint) {
                  hint.innerHTML = '<i class="bi bi-check-circle text-success"></i> <span>Teacher automatically assigned: <strong>' + teacher + '</strong></span>';
                }
              } else {
                var hint = this.parentElement.querySelector('.admin-hint');
                if (hint) {
                  hint.innerHTML = '<i class="bi bi-exclamation-triangle text-warning"></i> <span>No teacher assigned for this subject. Please add a teacher in Teacher Management first.</span>';
                }
              }
            } else {
              studyTeacherHidden.value = '';
              var hint = this.parentElement.querySelector('.admin-hint');
              if (hint) {
                hint.innerHTML = '<i class="bi bi-info-circle"></i> <span>Teacher will be automatically assigned based on the subject code from Teacher Management</span>';
              }
            }
          });
        }
        
        // Ensure all student grade cards are properly styled
        var studentCards = document.querySelectorAll('.student-grade-card');
        studentCards.forEach(function(card) {
          card.style.pointerEvents = 'auto';
          card.style.cursor = 'default';
          card.style.zIndex = '1';
        });
        
        // Show toast notifications if message exists
        <?php if (!empty($toastMessage)): ?>
        showToast('<?php echo addslashes($toastMessage); ?>', '<?php echo $toastType; ?>');
        <?php endif; ?>
        
        // Attach scroll position saving to all forms that redirect
        const forms = document.querySelectorAll('form[action*="manage_section_assignments"], form[action*="manage_buildings"], form[action*="manage_users"], form[action*="delete_announcement"], form[action*="manage_grades"], form[action*="manage_sections"], form[action*="manage_schedules"], form[action*="manage_subjects"], form[action*="manage_study_load"]');
        forms.forEach(form => {
          form.addEventListener('submit', function() {
            saveScrollPosition();
          });
        });

        // Grade view modal removed

        var editModal = document.getElementById('editUserModal');
        if (editModal) {
          editModal.addEventListener('show.bs.modal', function (event) {
            var button = event.relatedTarget;
            var fullname = button.getAttribute('data-fullname') || '';
            var payment = button.getAttribute('data-payment') || 'paid';
            var sanctions = button.getAttribute('data-sanctions') || '';
            var department = button.getAttribute('data-department') || '';
            var major = button.getAttribute('data-major') || '';
            var owing = button.getAttribute('data-owing') || '';

            // display full name and set hidden input
            var display = document.getElementById('modalFullNameDisplay');
            var hidden = document.getElementById('modalFullName');
            if (display) display.textContent = fullname;
            if (hidden) hidden.value = fullname;

            var paymentEl = document.getElementById('modalPayment');
            var sanctionsEl = document.getElementById('modalSanctions');
            var deptEl = document.getElementById('modalDepartment');
            var majorEl = document.getElementById('modalMajor');
            var owingEl = document.getElementById('modalOwingAmount');
            var owingRow = document.getElementById('owingRow');
            if (paymentEl) paymentEl.value = payment;
            if (sanctionsEl) sanctionsEl.value = sanctions;
            if (majorEl) {
              majorEl.setAttribute('data-selected', major);
            }
            if (deptEl) {
              deptEl.value = department;
              deptEl.dispatchEvent(new Event('change'));
            }
            if (majorEl && major !== '') {
              majorEl.value = major;
            }
            if (owingEl) owingEl.value = owing;

            if (owingRow) {
              owingRow.style.display = (payment === 'owing') ? '' : 'none';
            }
          });

          // toggle when payment select changes inside modal
          var paymentSelect = document.getElementById('modalPayment');
          if (paymentSelect) {
            paymentSelect.addEventListener('change', function(e){
              var owingRow = document.getElementById('owingRow');
              var owingEl = document.getElementById('modalOwingAmount');
              if (e.target.value === 'owing') {
                if (owingRow) owingRow.style.display = '';
              } else {
                if (owingRow) owingRow.style.display = 'none';
                if (owingEl) owingEl.value = '';
              }
            });
          }
        }
        // Autocomplete hookup for user/teacher search (with keyboard navigation)
        (function(){
          function initAdminSearchAutocomplete(opts){
            var input = document.getElementById(opts.inputId);
            var list = document.getElementById(opts.listId);
            if (!input || !list) return;

            var hidden = opts.hiddenId ? document.getElementById(opts.hiddenId) : null;
            var fullName = opts.fullNameId ? document.getElementById(opts.fullNameId) : null;
            var debounceTimer = null;
            var selectedIndex = -1;
            var limit = typeof opts.limit === 'number' ? opts.limit : 12;
            var suggestionPrefix = opts.suggestionPrefix || opts.inputId || 'opt';
            var debug = !!opts.debug;

            function highlightAt(idx) {
              var items = list.querySelectorAll('.admin-search-item');
              items.forEach(function(it, i){
                var sel = (i===idx);
                it.classList.toggle('active', sel);
                it.setAttribute('aria-selected', sel ? 'true' : 'false');
              });
              selectedIndex = (idx >= 0 && idx < items.length) ? idx : -1;
              if (selectedIndex !== -1) {
                var el = items[selectedIndex];
                if (el && el.scrollIntoView) el.scrollIntoView({block:'nearest'});
                if (input) input.setAttribute('aria-activedescendant', el.id || '');
              }
            }

            function clearList(){
              list.innerHTML = '';
              list.classList.remove('show');
              list.style.display = 'none';
              list.setAttribute('aria-hidden','true');
              input.setAttribute('aria-expanded','false');
              input.removeAttribute('aria-activedescendant');
            }

            function chooseItem(id, name, username){
              if (hidden) hidden.value = id ? id : '';
              var chosenValue = name || username || '';
              if (fullName) fullName.value = chosenValue;
              if (input) input.value = chosenValue;
              clearList();
              selectedIndex = -1;
            }

            input.addEventListener('input', function(){
              var q = input.value.trim();
              if (debounceTimer) clearTimeout(debounceTimer);
              if (hidden) hidden.value = '';
              if (q.length < 2) {
                clearList();
                return;
              }
              debounceTimer = setTimeout(function(){
                var searchParams = new URLSearchParams();
                searchParams.set('q', q);
                searchParams.set('limit', limit);
                if (opts.role) searchParams.set('role', opts.role);
                if (opts.extraParams) {
                  Object.keys(opts.extraParams).forEach(function(key){
                    searchParams.set(key, opts.extraParams[key]);
                  });
                }
                var endpoint = '/TCC/BackEnd/admin/user_search.php?' + searchParams.toString();
                if (debug) {
                  console.debug('[admin-search] fetching', endpoint);
                }
                fetch(endpoint)
                  .then(function(res){ return res.json(); })
                  .then(function(data){
                    if (debug) {
                      console.debug('[admin-search] response', data);
                    }
                    list.innerHTML = '';
                    if (!data || !Array.isArray(data.results) || data.results.length === 0) {
                      clearList();
                      return;
                    }
                    var sugCounter = 0;
                    data.results.forEach(function(r){
                      var li = document.createElement('li');
                      li.className = 'admin-search-item';
                      li.style.cursor = 'pointer';
                      var displayName = r.full_name || r.username || '';
                    var detailPieces = [];
                    if (r.username) detailPieces.push('(' + r.username + ')');
                    var metaPieces = [];
                    if (r.role) metaPieces.push(r.role);
                    if (r.meta) metaPieces.push(r.meta);
                    if (metaPieces.length > 0) detailPieces.push(metaPieces.join(' · '));
                    var detailText = detailPieces.join(' ').trim();
                    li.innerHTML = '<strong>' + displayName + '</strong>' + (detailText ? ' <span class="text-muted">' + detailText + '</span>' : '');
                    li.dataset.id = (r.id !== undefined && r.id !== null) ? r.id : '';
                      li.dataset.full = displayName;
                      li.dataset.user = r.username || '';
                      li.id = suggestionPrefix + '-' + (r.id || 'x') + '-' + (sugCounter++);
                      li.setAttribute('role','option');
                      li.setAttribute('aria-selected','false');
                      li.addEventListener('click', function(){ chooseItem(li.dataset.id, li.dataset.full, li.dataset.user); });
                      li.addEventListener('mouseenter', function(){ highlightAt(parseInt(li.getAttribute('data-index'), 10)); });
                      li.setAttribute('data-index', sugCounter - 1);
                      list.appendChild(li);
                    });
                    list.setAttribute('role','listbox');
                    list.setAttribute('aria-hidden','false');
                    list.style.display = 'block';
                    list.classList.add('show');
                    input.setAttribute('aria-expanded','true');
                    selectedIndex = -1;
                  })
                  .catch(function(){
                    if (debug) {
                      console.error('[admin-search] fetch failed', endpoint);
                    }
                    clearList();
                  });
              }, 220);
            });

            input.addEventListener('keydown', function(ev){
              var items = list.querySelectorAll('.admin-search-item');
              if (ev.key === 'ArrowDown') {
                if (items.length === 0) return;
                ev.preventDefault();
                var ni = selectedIndex + 1;
                if (ni >= items.length) ni = 0;
                highlightAt(ni);
              } else if (ev.key === 'ArrowUp') {
                if (items.length === 0) return;
                ev.preventDefault();
                var ni = selectedIndex - 1;
                if (ni < 0) ni = items.length - 1;
                highlightAt(ni);
              } else if (ev.key === 'Enter') {
                if (selectedIndex !== -1) {
                  ev.preventDefault();
                  var chosen = items[selectedIndex];
                  if (chosen) chooseItem(chosen.dataset.id, chosen.dataset.full, chosen.dataset.user);
                }
              } else if (ev.key === 'Escape') {
                clearList();
              }
            });

            document.addEventListener('click', function(ev){
              if (!input.contains(ev.target) && !list.contains(ev.target)) {
                clearList();
              }
            });
          }

          initAdminSearchAutocomplete({
            inputId: 'userSearchInput',
            listId: 'userSearchList',
            hiddenId: 'existingUserIdHidden',
            fullNameId: 'assignFullName',
            suggestionPrefix: 'useropt'
          });

          initAdminSearchAutocomplete({
            inputId: 'teacherSearchInput',
            listId: 'teacherSearchList',
            hiddenId: 'teacherUserIdHidden',
            fullNameId: 'teacherFullName',
            role: 'teacher',
            suggestionPrefix: 'teacheropt',
            debug: true
          });

          initAdminSearchAutocomplete({
            inputId: 'gradeStudentSearchInput',
            listId: 'gradeStudentSearchList',
            hiddenId: 'gradeStudentIdHidden',
            role: 'student',
            suggestionPrefix: 'gradeopt'
          });

          var gradeForm = document.querySelector('form[action="/TCC/BackEnd/admin/manage_grades.php"]');
          if (gradeForm) {
            gradeForm.addEventListener('submit', function(ev){
              var hiddenField = document.getElementById('gradeStudentIdHidden');
              var textField = document.getElementById('gradeStudentSearchInput');
              var userIdValue = hiddenField ? parseInt(hiddenField.value, 10) : 0;
              if (!userIdValue) {
                if (textField) {
                  textField.focus();
                }
                ev.preventDefault();
                alert('Please select a student from the suggestions before saving the grade.');
              }
            });
          }
        })();
        
        // Course/Major dependent dropdowns
        const courseMajorConfig = <?php echo json_encode($courseMajorMap, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP); ?>;
        function refreshMajorOptions(courseSelect, majorSelect) {
          if (!courseSelect || !majorSelect) return;
          const course = courseSelect.value;
          const majors = courseMajorConfig[course] || [];
          const presetValue = majorSelect.getAttribute('data-selected');
          const currentValue = (presetValue !== null && presetValue !== '') ? presetValue : majorSelect.value;
          majorSelect.innerHTML = '<option value="">Select major...</option>';
          let matched = false;
          majors.forEach(function(major){
            const opt = document.createElement('option');
            opt.value = major;
            opt.textContent = major;
            if (!matched && currentValue === major) {
              opt.selected = true;
              matched = true;
            }
            majorSelect.appendChild(opt);
          });
          if (!matched && majors.length > 0) {
            majorSelect.selectedIndex = 1;
          }
          if (presetValue !== null) {
            majorSelect.removeAttribute('data-selected');
          }
          majorSelect.disabled = majors.length === 0;
          if (majors.length === 0) {
            majorSelect.value = '';
          }
        }
        document.querySelectorAll('[data-course-select]').forEach(function(courseSelect){
          const parent = courseSelect.closest('form') || document;
          const majorSelect = parent.querySelector('[data-major-select]');
          if (!majorSelect) return;
          refreshMajorOptions(courseSelect, majorSelect);
          courseSelect.addEventListener('change', function(){
            refreshMajorOptions(courseSelect, majorSelect);
          });
        });

        // Auto-submit study load filter form when filters change
        (function(){
          const sectionInput = document.querySelector('form[method="get"] input[name="section"][value="study_load"]');
          if (sectionInput) {
            const filterForm = sectionInput.closest('form');
            if (filterForm) {
              const filterSelects = filterForm.querySelectorAll('select[name^="filter_"]');
              filterSelects.forEach(function(select) {
                select.addEventListener('change', function() {
                  filterForm.submit();
                });
              });
            }
          }
        })();

        // Subject select is now simplified - no preview needed
        
        // Add form validation for teacher assignment form
        var assignTeacherForm = document.getElementById('assignTeacherForm');
        if (assignTeacherForm) {
          // Update hidden user_id field when teacher is selected from dropdown
          var teacherSelect = document.getElementById('teacherFullName');
          var teacherUserIdHidden = document.getElementById('teacherUserIdHidden');
          if (teacherSelect && teacherUserIdHidden) {
            teacherSelect.addEventListener('change', function() {
              var selectedOption = this.options[this.selectedIndex];
              var userId = selectedOption.getAttribute('data-user-id') || '';
              teacherUserIdHidden.value = userId;
            });
          }
          
          assignTeacherForm.addEventListener('submit', function(e) {
            var fullName = document.getElementById('teacherFullName');
            var subjectCode = document.getElementById('teacherSubjectCode');
            
            if (!fullName || !fullName.value.trim()) {
              e.preventDefault();
              alert('Please select a teacher.');
              if (fullName) fullName.focus();
              return false;
            }
            
            if (!subjectCode || !subjectCode.value) {
              e.preventDefault();
              alert('Please select a subject from the dropdown.');
              if (subjectCode) subjectCode.focus();
              return false;
            }
            
            return true;
          });
        }
        
      });
    </script>
  </body>
</html>