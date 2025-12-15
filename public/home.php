<?php
session_start();
// Ensure user is logged in
if (!isset($_SESSION['username'])) {
  header('Location: /TCC/public/index.html');
  exit();
}

// Prefer values saved in session to avoid extra DB queries
$image = $_SESSION['image_path'] ?? '/TCC/public/images/sample.jpg';
$schoolId = $_SESSION['school_id'] ?? '';
$full_name = $_SESSION['full_name'] ?? $_SESSION['username'];

// default view: records on home
$view = isset($_GET['view']) ? $_GET['view'] : 'records';
require_once __DIR__ . '/../BackEnd/database/db.php';
$conn = Database::getInstance()->getConnection();
$username = $_SESSION['username'];
$stmt = $conn->prepare("SELECT id, image_path, school_id, role, created_at FROM users WHERE username = ?");
$stmt->bind_param("s", $username);
$stmt->execute();
$result = $stmt->get_result();
$row = $result->fetch_assoc();
$image = $row['image_path'] ?? '/TCC/public/images/sample.jpg';
$userRole = $row['role'] ?? $_SESSION['role'] ?? 'student';
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
    <title>Home</title>
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
              <a href="/TCC/public/home.php?view=announcements" class="nav-link <?php echo ($view === 'announcements') ? 'active' : '' ?>" data-bs-toggle="tooltip" data-bs-placement="right" title="Announcements">
                <i class="bi bi-megaphone-fill"></i>
                <span class="nav-label">Announcements</span>
              </a>
            </li>
            <li>
              <a href="/TCC/public/home.php?view=records" class="nav-link <?php echo ($view === 'records') ? 'active' : '' ?>" data-bs-toggle="tooltip" data-bs-placement="right" title="Records">
                <i class="bi bi-journal-text"></i>
                <span class="nav-label">Records</span>
              </a>
            </li>
            <li>
              <a href="/TCC/public/home.php?view=grades" class="nav-link <?php echo ($view === 'grades') ? 'active' : '' ?>" data-bs-toggle="tooltip" data-bs-placement="right" title="Grades">
                <i class="bi bi-journal-bookmark-fill"></i>
                <span class="nav-label">Grades</span>
              </a>
            </li>
            <li>
              <a href="/TCC/public/home.php?view=transparency" class="nav-link <?php echo ($view === 'transparency') ? 'active' : '' ?>" data-bs-toggle="tooltip" data-bs-placement="right" title="Transparency">
                <i class="bi bi-graph-up"></i>
                <span class="nav-label">Transparency</span>
              </a>
            </li>
            <li>
              <a href="/TCC/public/home.php?view=evaluation" class="nav-link <?php echo ($view === 'evaluation') ? 'active' : '' ?>" data-bs-toggle="tooltip" data-bs-placement="right" title="Teacher Evaluation">
                <i class="bi bi-clipboard-check"></i>
                <span class="nav-label">Evaluation</span>
              </a>
            </li>
            <li>
              <a href="/TCC/public/home.php?view=settings" class="nav-link <?php echo ($view === 'settings') ? 'active' : '' ?>" data-bs-toggle="tooltip" data-bs-placement="right" title="Settings">
                <i class="bi bi-gear-fill"></i>
                <span class="nav-label">Settings</span>
              </a>
            </li>
          </ul>
        </nav>

        <div class="sidebar-bottom">
          <?php if (isset($_SESSION['role']) && $_SESSION['role'] === 'admin'): ?>
            <a href="/TCC/public/admin_dashboard.php" class="btn btn-switch-view sidebar-switch-btn" title="Switch to Admin Dashboard" data-bs-toggle="tooltip" data-bs-placement="right">
              <i class="bi bi-shield-lock-fill"></i>
              <span>Admin View</span>
            </a>
          <?php endif; ?>
          <a href="/TCC/BackEnd/auth/logout.php" class="btn logout-icon" title="Logout"><i class="bi bi-box-arrow-right"></i></a>
        </div>
      </aside>

      <main class="home-main">
        <?php
        $view = isset($_GET['view']) ? $_GET['view'] : 'records';
        $heroSpotlights = [
          'records' => [
            'hero_copy' => 'Review building assignments, finances, and grades in a single, refreshed timeline built for clarity.',
            'spotlight_eyebrow' => 'Records overview',
            'spotlight_title' => 'My Records',
            'spotlight_copy' => 'Check building assignments, sanctions, financial status, and detailed grades in one cohesive space.'
          ],
          'announcements' => [
            'hero_copy' => 'Catch up on campus headlines, filter by year or department, and keep every announcement at your fingertips.',
            'spotlight_eyebrow' => 'Latest broadcasts',
            'spotlight_title' => 'Announcements',
            'spotlight_copy' => 'Browse targeted updates, stay informed on school activities, and never miss important campus news.'
          ],
          'grades' => [
            'hero_copy' => 'Review your academic progress, semester summaries, and detailed subject grades in one comprehensive view.',
            'spotlight_eyebrow' => 'Academic records',
            'spotlight_title' => 'My Grades',
            'spotlight_copy' => 'View all your subject grades organized by semester, track your academic performance, and monitor your progress throughout the year.'
          ],
          'transparency' => [
            'hero_copy' => 'See where resources go, review project milestones, and keep the community informed with transparent reporting.',
            'spotlight_eyebrow' => 'Project insights',
            'spotlight_title' => 'Transparency',
            'spotlight_copy' => 'Explore school project budgets, completion status, and milestones through an accessible transparency log.'
          ],
          'evaluation' => [
            'hero_copy' => 'Evaluate your teachers and provide feedback to help improve the quality of education.',
            'spotlight_eyebrow' => 'Teacher evaluation',
            'spotlight_title' => 'Teacher Evaluation',
            'spotlight_copy' => 'Rate your teachers based on their teaching methods, professionalism, and impact on your learning experience.'
          ],
          'settings' => [
            'hero_copy' => 'Personalize your profile, update your login details, and keep your account aligned with your current information.',
            'spotlight_eyebrow' => 'Account controls',
            'spotlight_title' => 'Settings',
            'spotlight_copy' => 'Update your username, display name, password, and profile picture to keep your account up to date.'
          ],
        ];
$departmentMajors = [
  'IT' => ['Computer Technology', 'Electronics'],
  'BSED' => ['English', 'Physical Education', 'Math', 'Filipino', 'Social Science'],
  'HM' => ['General'],
  'BEED' => ['General'],
  'TOURISM' => ['General']
];
        $activeSpotlight = $heroSpotlights[$view] ?? $heroSpotlights['records'];
        ?>
        <section class="dashboard-hero">
          <div class="hero-content">
            <span class="hero-eyebrow">Student Dashboard</span>
            <h1 class="hero-title">Hi, <?php echo htmlspecialchars($full_name); ?>!</h1>
            <p class="hero-copy">
              <?php echo htmlspecialchars($activeSpotlight['hero_copy']); ?>
            </p>
            <div class="hero-action-group">
              <a class="hero-action <?php echo ($view === 'records') ? 'active' : ''; ?>" href="/TCC/public/home.php?view=records">
                <i class="bi bi-journal-text"></i>
                <span>Records</span>
              </a>
              <a class="hero-action <?php echo ($view === 'announcements') ? 'active' : ''; ?>" href="/TCC/public/home.php?view=announcements">
                <i class="bi bi-megaphone-fill"></i>
                <span>Announcements</span>
              </a>
              <a class="hero-action <?php echo ($view === 'grades') ? 'active' : ''; ?>" href="/TCC/public/home.php?view=grades">
                <i class="bi bi-journal-bookmark-fill"></i>
                <span>Grades</span>
              </a>
              <a class="hero-action <?php echo ($view === 'transparency') ? 'active' : ''; ?>" href="/TCC/public/home.php?view=transparency">
                <i class="bi bi-graph-up-arrow"></i>
                <span>Transparency</span>
              </a>
              <a class="hero-action <?php echo ($view === 'evaluation') ? 'active' : ''; ?>" href="/TCC/public/home.php?view=evaluation">
                <i class="bi bi-clipboard-check"></i>
                <span>Evaluation</span>
              </a>
              <a class="hero-action <?php echo ($view === 'settings') ? 'active' : ''; ?>" href="/TCC/public/home.php?view=settings">
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
            <div class="spotlight-card alt clock-card" id="homeClockCard">
              <p class="clock-time">
                <span id="homeClockTime">--:--:--</span>
                <span class="clock-time-sub" id="homeClockSub">--</span>
              </p>
              <p class="clock-day" id="homeClockDay">Loading...</p>
              <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 16 16" class="clock-moon" fill="currentColor" stroke="currentColor">
                <path d="M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278z"></path>
                <path d="M10.794 3.148a.217.217 0 0 1 .412 0l.387 1.162c.173.518.579.924 1.097 1.097l1.162.387a.217.217 0 0 1 0 .412l-1.162.387a1.734 1.734 0 0 0-1.097 1.097l-.387 1.162a.217.217 0 0 1-.412 0l-.387-1.162A1.734 1.734 0 0 0 9.31 6.593l-1.162-.387a.217.217 0 0 1 0-.412l1.162-.387a1.734 1.734 0 0 0 1.097-1.097l.387-1.162zM13.863.099a.145.145 0 0 1 .274 0l.258.774c.115.346.386.617.732.732l.774.258a.145.145 0 0 1 0 .274l-.774.258a1.156 1.156 0 0 0-.732.732l-.258.774a.145.145 0 0 1-.274 0l-.258-.774a1.156 1.156 0 0 0-.732-.732l-.774-.258a.145.145 0 0 1 0-.274l.774-.258c.346-.115.617-.386.732-.732L13.863.1z"></path>
              </svg>
            </div>
          </div>
        </section>
        <?php
        if ($view === 'records') {
          ?>
          <div class="records-container">
            <div class="records-header">
              <h2 class="records-title">My Records</h2>
              <p class="records-subtitle">View your academic and financial information</p>
            </div>
            
            <div class="records-grid">
              <div class="records-main">
                <div class="info-card assignment-card">
                  <div class="card-header-modern">
                    <i class="bi bi-building"></i>
                    <h3>Assignment Details</h3>
                  </div>
                  <?php
                  // initialize defaults
                  $buildingText = 'Unassigned';
                  $floorText = '';
                  $roomText = '';
                  $yearText = 'N/A';
                  $sectionText = 'N/A';

                  // attempt to read assignment from DB, with fallbacks
                  try {
                    require_once __DIR__ . '/../BackEnd/database/db.php';
                    $conn = Database::getInstance()->getConnection();
                    
                    // Ensure connection is valid
                    if (!$conn || $conn->connect_error) {
                      throw new Exception("Database connection failed");
                    }

                    $currentUserId = $_SESSION['user_id'] ?? null;
                    $currentFullName = $_SESSION['full_name'] ?? '';
                    $currentUsername = $_SESSION['username'] ?? '';

                    $userInfo = null;
                    $assignment_source = 'none';
                    $matched_key = null;

                    // 1) by user_id
                    if (!empty($currentUserId)) {
                      $ps = $conn->prepare("SELECT year, section, department, payment, sanctions, owing_amount FROM user_assignments WHERE user_id = ? LIMIT 1");
                      if ($ps) {
                        $ps->bind_param('i', $currentUserId);
                        $ps->execute();
                        $resu = $ps->get_result();
                        $userInfo = $resu ? $resu->fetch_assoc() : null;
                        $ps->close();
                      }
                      if ($userInfo) { $assignment_source = 'db:user_id'; $matched_key = $currentUserId; }
                    }

                    // 2) exact username/full_name
                    if (!$userInfo && $currentFullName !== '') {
                      $ps = $conn->prepare("SELECT year, section, department, payment, sanctions, owing_amount FROM user_assignments WHERE username = ? LIMIT 1");
                      if ($ps) {
                        $ps->bind_param('s', $currentFullName);
                        $ps->execute();
                        $resu = $ps->get_result();
                        $userInfo = $resu ? $resu->fetch_assoc() : null;
                        $ps->close();
                      }
                      if ($userInfo) { $assignment_source = 'db:exact_full_name'; $matched_key = $currentFullName; }
                    }
                    if (!$userInfo && $currentUsername !== '') {
                      $ps = $conn->prepare("SELECT year, section, department, payment, sanctions, owing_amount FROM user_assignments WHERE username = ? LIMIT 1");
                      if ($ps) {
                        $ps->bind_param('s', $currentUsername);
                        $ps->execute();
                        $resu = $ps->get_result();
                        $userInfo = $resu ? $resu->fetch_assoc() : null;
                        $ps->close();
                      }
                      if ($userInfo) { $assignment_source = 'db:exact_username'; $matched_key = $currentUsername; }
                    }

                    // 3) fuzzy LIKE on username
                    if (!$userInfo && $currentFullName !== '') {
                      $like = '%' . $conn->real_escape_string($currentFullName) . '%';
                      $ps = $conn->prepare("SELECT year, section, department, payment, sanctions, owing_amount FROM user_assignments WHERE username LIKE ? LIMIT 1");
                      if ($ps) {
                        $ps->bind_param('s', $like);
                        $ps->execute();
                        $resu = $ps->get_result();
                        $userInfo = $resu ? $resu->fetch_assoc() : null;
                        $ps->close();
                      }
                      if ($userInfo) { $assignment_source = 'db:like_full_name'; $matched_key = $currentFullName; }
                    }
                    if (!$userInfo && $currentUsername !== '') {
                      $like2 = '%' . $conn->real_escape_string($currentUsername) . '%';
                      $ps = $conn->prepare("SELECT year, section, department, payment, sanctions, owing_amount FROM user_assignments WHERE username LIKE ? LIMIT 1");
                      if ($ps) {
                        $ps->bind_param('s', $like2);
                        $ps->execute();
                        $resu = $ps->get_result();
                        $userInfo = $resu ? $resu->fetch_assoc() : null;
                        $ps->close();
                      }
                      if ($userInfo) { $assignment_source = 'db:like_username'; $matched_key = $currentUsername; }
                    }

                    // 4) try to resolve via users table then by user_id
                    if (!$userInfo && ($currentFullName !== '' || $currentUsername !== '')) {
                      $search = $currentFullName !== '' ? $currentFullName : $currentUsername;
                      $like3 = '%' . $conn->real_escape_string($search) . '%';
                      $psu = $conn->prepare("SELECT id FROM users WHERE full_name LIKE ? OR username LIKE ? LIMIT 1");
                      if ($psu) {
                        $psu->bind_param('ss', $like3, $like3);
                        $psu->execute();
                        $gres = $psu->get_result();
                        if ($g = $gres->fetch_assoc()) {
                          $tryId = (int)$g['id'];
                          $ps2 = $conn->prepare("SELECT year, section, department, payment, sanctions, owing_amount FROM user_assignments WHERE user_id = ? LIMIT 1");
                          if ($ps2) {
                            $ps2->bind_param('i', $tryId);
                            $ps2->execute();
                            $res2 = $ps2->get_result();
                            $userInfo = $res2 ? $res2->fetch_assoc() : null;
                            $ps2->close();
                          }
                          if ($userInfo) { $assignment_source = 'db:via_users'; $matched_key = $tryId; }
                        }
                        $psu->close();
                      }
                    }

                        // 5) If we have a session user_id but no assignment, try to auto-map a unique matching assignment to this user_id.
                        // This is a low-risk, per-login automatic map only when there is a single confident candidate.
                        if (empty($userInfo) && !empty($currentUserId)) {
                          // 5a) exact match by full_name or username
                          $candidateIds = [];
                          if ($currentFullName !== '') {
                            $psExact = $conn->prepare("SELECT id, year, section, username, user_id FROM user_assignments WHERE username = ? OR username = ?");
                            if ($psExact) {
                              $psExact->bind_param('ss', $currentFullName, $currentUsername);
                              $psExact->execute();
                              $resEx = $psExact->get_result();
                              while ($r = $resEx->fetch_assoc()) { $candidateIds[] = $r; }
                              $psExact->close();
                            }
                          }
                          // If exactly one candidate, map it
                          if (count($candidateIds) === 1) {
                            $cand = $candidateIds[0];
                            // only update if not already mapped
                            if (empty($cand['user_id']) || $cand['user_id'] == 0) {
                              $up = $conn->prepare("UPDATE user_assignments SET user_id = ? WHERE id = ?");
                              if ($up) {
                                $up->bind_param('ii', $currentUserId, $cand['id']);
                                @$up->execute();
                                $up->close();
                              }
                            }
                            // reload this assignment into $userInfo
                            $psReload = $conn->prepare("SELECT year, section, department, payment, sanctions, owing_amount FROM user_assignments WHERE id = ? LIMIT 1");
                            if ($psReload) {
                              $psReload->bind_param('i', $cand['id']);
                              $psReload->execute();
                              $resR = $psReload->get_result();
                              $userInfo = $resR ? $resR->fetch_assoc() : null;
                              $psReload->close();
                            }
                            if ($userInfo) { $assignment_source = 'db:auto_mapped_exact'; $matched_key = $cand['username'] ?? $cand['id']; }
                          } else {
                            // 5b) fuzzy candidate search - require a single high-confidence candidate
                            $best = null; $bestScore = 0.0; $bestId = null; $countBest = 0;
                            $norm = function($s) {
                              $s = mb_strtolower(trim($s));
                              $s = preg_replace('/[^\p{L}\p{N} ]+/u', ' ', $s);
                              $s = preg_replace('/\s+/', ' ', $s);
                              return $s;
                            };
                            $tokensA = array_filter(explode(' ', $norm($currentFullName ?: $currentUsername)));
                            if (!empty($tokensA)) {
                              $allQ = $conn->query("SELECT id, username, year, section, user_id FROM user_assignments");
                              if ($allQ) {
                                while ($r = $allQ->fetch_assoc()) {
                                  $tokensB = array_filter(explode(' ', $norm($r['username'] ?? '')));
                                  if (empty($tokensB)) continue;
                                  $common = count(array_intersect($tokensA, $tokensB));
                                  $score = $common / max(1, min(count($tokensA), count($tokensB)));
                                  if ($score > $bestScore) { $bestScore = $score; $best = $r; $bestId = $r['id']; $countBest = 1; }
                                  else if ($score === $bestScore) { $countBest++; }
                                }
                                // map only if unique best and high confidence
                                if ($best !== null && $countBest === 1 && $bestScore >= 0.8) {
                                  if (empty($best['user_id']) || $best['user_id'] == 0) {
                                    $up2 = $conn->prepare("UPDATE user_assignments SET user_id = ? WHERE id = ?");
                                    if ($up2) { $up2->bind_param('ii', $currentUserId, $bestId); @$up2->execute(); $up2->close(); }
                                  }
                                  $psr = $conn->prepare("SELECT year, section, department, payment, sanctions, owing_amount FROM user_assignments WHERE id = ? LIMIT 1");
                                  if ($psr) { $psr->bind_param('i', $bestId); $psr->execute(); $rr = $psr->get_result(); $userInfo = $rr ? $rr->fetch_assoc() : null; $psr->close(); }
                                  if ($userInfo) { $assignment_source = 'db:auto_mapped_fuzzy'; $matched_key = $best['username'] ?? $bestId; }
                                }
                              }
                            }
                          }
                        }

                    // 5) as a last resort, perform a token-overlap fuzzy match against assignment.username
                    if (!$userInfo && $currentFullName !== '') {
                      // lightweight normalization and token-overlap scoring
                      $norm = function($s) {
                        $s = mb_strtolower(trim($s));
                        $s = preg_replace('/[^\p{L}\p{N} ]+/u', ' ', $s);
                        $s = preg_replace('/\s+/', ' ', $s);
                        return $s;
                      };
                      $tokensA = array_filter(explode(' ', $norm($currentFullName)));
                      if (!empty($tokensA)) {
                        $best = null; $bestScore = 0.0;
                        $allAq = $conn->query("SELECT year, section, department, payment, sanctions, owing_amount, username, user_id FROM user_assignments");
                        if ($allAq) {
                          while ($rowA = $allAq->fetch_assoc()) {
                            $tokensB = array_filter(explode(' ', $norm($rowA['username'] ?? '')));
                            if (empty($tokensB)) continue;
                            $common = count(array_intersect($tokensA, $tokensB));
                            $score = $common / max(1, min(count($tokensA), count($tokensB)));
                            if ($score > $bestScore) { $bestScore = $score; $best = $rowA; }
                          }
                          // require reasonably high confidence (>= .6) to avoid false matches
                          if ($best !== null && $bestScore >= 0.5) {
                            $userInfo = $best;
                            $assignment_source = 'db:fuzzy_assignment';
                            $matched_key = $best['username'] ?? '';
                          }
                        }
                      }
                    }

                    if ($userInfo) {
                      $yearText = $userInfo['year'] ?? 'N/A';
                      $sectionText = $userInfo['section'] ?? 'N/A';

                      $ps2 = $conn->prepare("SELECT building, floor, room FROM section_assignments WHERE year = ? AND section = ? LIMIT 1");
                      if ($ps2) {
                        $ps2->bind_param('ss', $yearText, $sectionText);
                        $ps2->execute();
                        $res2 = $ps2->get_result();
                        if ($r2 = $res2->fetch_assoc()) {
                          if (!empty($r2['building'])) {
                          $buildingText = 'Building ' . $r2['building'];
                          } else {
                            $buildingText = 'Unassigned';
                          }
                          if (!empty($r2['floor']) && intval($r2['floor']) > 0) {
                            $floorText = formatOrdinal($r2['floor']) . ' Floor';
                          } else {
                            $floorText = '';
                          }
                          if (!empty($r2['room'])) {
                          $roomText = 'Room ' . $r2['room'];
                          } else {
                            $roomText = '';
                          }
                        }
                        $ps2->close();
                      }
                    }
                  // end try
                  } catch (Throwable $ex) {
                    // ignore DB errors and fallback to JSON below
                  }

                  // JSON fallback
                  if (empty($userInfo)) {
                    $uaPath = __DIR__ . '/../database/user_assignments.json';
                    $ua = [];
                    if (file_exists($uaPath)) { $ua = json_decode(file_get_contents($uaPath), true) ?: []; }

                    $currentUser = $_SESSION['username'];
                    $userInfo = $ua[$currentUser] ?? null;

                    $yearText = $userInfo['year'] ?? $yearText;
                    $sectionText = $userInfo['section'] ?? $sectionText;

                    $saPath = __DIR__ . '/../database/section_assignments.json';
                    $sa = [];
                    if (file_exists($saPath)) { $sa = json_decode(file_get_contents($saPath), true) ?: []; }
                    if ($userInfo) {
                      $key = $userInfo['year'] . '|' . $userInfo['section'];
                      if (isset($sa[$key])) {
                        $buildingText = 'Building ' . $sa[$key]['building'];
                        $floorText = $sa[$key]['floor'] . 'th Floor';
                        $roomText = 'Room ' . $sa[$key]['room'];
                        $assignment_source = 'json';
                        $matched_key = $currentUser;
                      }
                    }
                  }
                  if (!isset($assignment_source)) $assignment_source = 'none';
                  ?>
                  <div class="info-grid">
                    <div class="info-item">
                      <div class="info-icon">
                        <i class="bi bi-building"></i>
                      </div>
                      <div class="info-content">
                        <span class="info-label">Building</span>
                        <span class="info-value"><?php echo htmlspecialchars($buildingText); ?></span>
                      </div>
                    </div>
                    
                    <div class="info-item">
                      <div class="info-icon">
                        <i class="bi bi-layers"></i>
                      </div>
                      <div class="info-content">
                        <span class="info-label">Floor / Room</span>
                        <span class="info-value"><?php echo htmlspecialchars($floorText . ' / ' . $roomText); ?></span>
                      </div>
                    </div>
                    
                    <div class="info-item">
                      <div class="info-icon">
                        <i class="bi bi-calendar-year"></i>
                      </div>
                      <div class="info-content">
                        <span class="info-label">Year</span>
                        <span class="info-value"><?php echo htmlspecialchars($yearText); ?></span>
                      </div>
                    </div>
                    
                    <div class="info-item">
                      <div class="info-icon">
                        <i class="bi bi-people"></i>
                      </div>
                      <div class="info-content">
                        <span class="info-label">Section</span>
                        <span class="info-value"><?php echo htmlspecialchars($sectionText); ?></span>
                      </div>
                    </div>
                  </div>
                  <?php
                    // Get payment and sanctions data from userInfo
                    $owingAmount = $userInfo['owing_amount'] ?? null;
                    $paymentStatus = $userInfo['payment'] ?? 'paid';
                    $sanctions = $userInfo['sanctions'] ?? null;
                    
                    // Parse sanctions to check for date-based sanctions
                    $sanctionText = 'No';
                    $sanctionDays = null;
                    $sanctionNote = '';
                    if (!empty($sanctions)) {
                      // Try to parse date from sanctions (format: "YYYY-MM-DD" or similar)
                      if (preg_match('/(\d{4}-\d{2}-\d{2})/', $sanctions, $matches)) {
                        $sanctionDate = new DateTime($matches[1]);
                        $now = new DateTime();
                        if ($sanctionDate > $now) {
                          $diff = $now->diff($sanctionDate);
                          $sanctionDays = $diff->days;
                          $sanctionText = $sanctionDays . ' days';
                        } else {
                          $sanctionText = 'Expired';
                        }
                      } else {
                        // If it's a number, treat it as days
                        if (is_numeric($sanctions)) {
                          $sanctionDays = intval($sanctions);
                          $sanctionText = $sanctionDays . ' days';
                        } else {
                          $sanctionText = 'Yes';
                          $sanctionNote = trim((string)$sanctions);
                          if ($sanctionNote === '') {
                            $sanctionNote = null;
                          }
                        }
                      }
                    }
                    ?>
                </div>
                
                <div class="info-card financial-card">
                  <div class="card-header-modern">
                    <i class="bi bi-wallet2"></i>
                    <h3>Financial Status</h3>
                  </div>
                  <div class="financial-grid">
                    <div class="financial-item <?php echo $paymentStatus === 'owing' ? 'status-warning' : 'status-success'; ?>">
                      <div class="financial-icon">
                        <i class="bi <?php echo $paymentStatus === 'owing' ? 'bi-exclamation-triangle' : 'bi-check-circle'; ?>"></i>
                      </div>
                      <div class="financial-content">
                        <span class="financial-label">Outstanding Balance</span>
                        <span class="financial-value">
                          <?php if ($paymentStatus === 'owing' && !empty($owingAmount)): ?>
                            ₱<?php echo htmlspecialchars($owingAmount); ?>
                          <?php elseif ($paymentStatus === 'owing'): ?>
                            Amount pending
                          <?php else: ?>
                            ₱0.00
                          <?php endif; ?>
                        </span>
                      </div>
                    </div>
                    
                    <?php if (!empty($sanctions) || ($sanctionDays !== null && $sanctionDays > 0) || strpos($sanctionText, 'days') !== false || $sanctionText === 'Yes' || $sanctionText === 'Expired'): ?>
                    <div class="financial-item status-warning">
                      <div class="financial-icon">
                        <i class="bi bi-exclamation-triangle"></i>
                      </div>
                      <div class="financial-content">
                        <span class="financial-label">Sanctioned</span>
                        <span class="financial-value">
                          <?php if ($sanctionDays !== null && $sanctionDays > 0): ?>
                            <span class="days-remaining"><?php echo $sanctionDays; ?></span> days remaining
                          <?php elseif (strpos($sanctionText, 'days') !== false): ?>
                            <span class="days-remaining"><?php echo htmlspecialchars($sanctionText); ?></span>
                          <?php elseif ($sanctionText === 'Expired'): ?>
                            <span class="text-muted">Sanction expired</span>
                          <?php elseif ($sanctionText === 'Yes'): ?>
                            <span class="text-warning"><?php echo htmlspecialchars($sanctionText); ?></span>
                          <?php else: ?>
                            <span class="days-remaining"><?php echo htmlspecialchars($sanctionText); ?></span>
                          <?php endif; ?>
                        </span>
                        <?php if (!empty($sanctionNote)): ?>
                          <span class="sanction-note">Note: <?php echo htmlspecialchars($sanctionNote); ?></span>
                        <?php endif; ?>
                      </div>
                    </div>
                    <?php endif; ?>
                  </div>
                </div>
            </div>
          </div>
          <?php
        } elseif ($view === 'grades') {
          ?>
          <div class="records-container">
            <div class="records-header">
              <h2 class="records-title">My Grades</h2>
              <p class="records-subtitle">View your academic progress and subject grades</p>
            </div>
            <div class="records-main">
              <?php
              $currentUserId = $_SESSION['user_id'] ?? null;
              $currentUsername = $_SESSION['username'] ?? '';
              $currentFullName = $_SESSION['full_name'] ?? '';
              $studentGrades = [];

              $studyLoadMeta = [
                'studentId' => !empty($schoolId) ? $schoolId : 'Not set',
                'fullName' => $full_name ?? $currentUsername,
                'course' => 'Not set',
                'major' => '',
                'yearLevel' => '',
                'section' => ''
              ];
              $studyLoadSubjects = [];
              $studyLoadTotals = ['subjects' => 0, 'units' => 0];
              $studyLoadStatus = [
                'hasAssignment' => false,
                'message' => ''
              ];
              $studentCourse = '';
              $studentMajor = '';

              try {
                if ($conn && !$conn->connect_error) {
                  $hasMajorColumn = false;
                  try {
                    $colStmt = $conn->prepare("SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_assignments' AND COLUMN_NAME = 'major'");
                    if ($colStmt) {
                      $colStmt->execute();
                      $colRes = $colStmt->get_result();
                      $colRow = $colRes ? $colRes->fetch_assoc() : null;
                      if ($colRow && (int)$colRow['cnt'] > 0) {
                        $hasMajorColumn = true;
                      }
                      $colStmt->close();
                    }
                  } catch (Throwable $colEx) {
                    $hasMajorColumn = false;
                  }
                  $assignmentColumns = 'year, section, department, payment, sanctions, owing_amount';
                  if ($hasMajorColumn) {
                    $assignmentColumns .= ', major';
                  }

                  $assignmentRow = null;
                  $assignmentLookups = [];

                  if (!empty($currentUserId)) {
                    $assignmentLookups[] = ['sql' => 'user_id = ?', 'types' => 'i', 'params' => [$currentUserId]];
                  }
                  if (!empty($currentUsername)) {
                    $assignmentLookups[] = ['sql' => 'username = ?', 'types' => 's', 'params' => [$currentUsername]];
                  }
                  if (!empty($currentFullName) && $currentFullName !== $currentUsername) {
                    $assignmentLookups[] = ['sql' => 'username = ?', 'types' => 's', 'params' => [$currentFullName]];
                  }
                  if (!empty($currentUsername)) {
                    $assignmentLookups[] = ['sql' => 'username LIKE ?', 'types' => 's', 'params' => ['%' . $currentUsername . '%']];
                  }
                  if (!empty($currentFullName)) {
                    $assignmentLookups[] = ['sql' => 'username LIKE ?', 'types' => 's', 'params' => ['%' . $currentFullName . '%']];
                  }

                  foreach ($assignmentLookups as $attempt) {
                    $stmtAssign = $conn->prepare("SELECT {$assignmentColumns} FROM user_assignments WHERE {$attempt['sql']} LIMIT 1");
                    if ($stmtAssign) {
                      $stmtAssign->bind_param($attempt['types'], ...$attempt['params']);
                      $stmtAssign->execute();
                      $resAssign = $stmtAssign->get_result();
                      $assignmentRow = $resAssign ? $resAssign->fetch_assoc() : null;
                      $stmtAssign->close();
                    }
                    if ($assignmentRow) {
                      break;
                    }
                  }

                  if ($assignmentRow) {
                    $studyLoadStatus['hasAssignment'] = true;
                    $studyLoadMeta['yearLevel'] = $assignmentRow['year'] ?? '';
                    $studyLoadMeta['section'] = $assignmentRow['section'] ?? '';
                    $rawCourse = strtoupper($assignmentRow['department'] ?? '');
                    if ($rawCourse === 'BSEED') {
                      $rawCourse = 'BSED';
                    }
                    if ($rawCourse !== '') {
                      $studentCourse = $rawCourse;
                      $studyLoadMeta['course'] = $studentCourse;
                    }
                    if ($hasMajorColumn) {
                      $studentMajor = trim($assignmentRow['major'] ?? '');
                      $studyLoadMeta['major'] = $studentMajor;
                    }
                  }

                  $yearLevelNumeric = null;
                  if ($studyLoadMeta['yearLevel'] !== '') {
                    if (is_numeric($studyLoadMeta['yearLevel'])) {
                      $yearLevelNumeric = (int)$studyLoadMeta['yearLevel'];
                    } elseif (preg_match('/\d+/', $studyLoadMeta['yearLevel'], $matches)) {
                      $yearLevelNumeric = (int)$matches[0];
                    }
                  }

                  if ($studentCourse !== '' && $studyLoadMeta['section'] !== '' && $yearLevelNumeric !== null) {
                    // Try multiple query strategies to find study load
                    // Strategy 1: Exact match with major (if major is set)
                    if ($studentMajor !== '') {
                      $loadParams = [$studentCourse, $studentMajor, $yearLevelNumeric, $studyLoadMeta['section']];
                      $loadTypes = 'ssis';
                      $loadSql = "SELECT subject_code, subject_title, units, semester, teacher FROM study_load WHERE course = ? AND major = ? AND year_level = ? AND section = ? ORDER BY semester, subject_code";
                      
                      $stmtLoad = $conn->prepare($loadSql);
                      if ($stmtLoad) {
                        $stmtLoad->bind_param($loadTypes, ...$loadParams);
                        $stmtLoad->execute();
                        $resLoad = $stmtLoad->get_result();
                        while ($rowLoad = $resLoad->fetch_assoc()) {
                          $studyLoadSubjects[] = $rowLoad;
                          $studyLoadTotals['subjects']++;
                          $studyLoadTotals['units'] += (int)$rowLoad['units'];
                        }
                        $stmtLoad->close();
                      }
                    }

                    // Strategy 2: Match with case-insensitive major (handle minor differences)
                    if (empty($studyLoadSubjects) && $studentMajor !== '') {
                      $stmtLoad = $conn->prepare("SELECT subject_code, subject_title, units, semester, teacher FROM study_load WHERE course = ? AND LOWER(TRIM(major)) = LOWER(TRIM(?)) AND year_level = ? AND section = ? ORDER BY semester, subject_code");
                      if ($stmtLoad) {
                        $stmtLoad->bind_param('ssis', $studentCourse, $studentMajor, $yearLevelNumeric, $studyLoadMeta['section']);
                        $stmtLoad->execute();
                        $resLoad = $stmtLoad->get_result();
                        while ($rowLoad = $resLoad->fetch_assoc()) {
                          $studyLoadSubjects[] = $rowLoad;
                          $studyLoadTotals['subjects']++;
                          $studyLoadTotals['units'] += (int)$rowLoad['units'];
                        }
                        $stmtLoad->close();
                      }
                    }

                    // Strategy 3: Match without major (for courses that don't require major or if major isn't captured)
                    if (empty($studyLoadSubjects)) {
                      $stmtLoad = $conn->prepare("SELECT subject_code, subject_title, units, semester, teacher FROM study_load WHERE course = ? AND year_level = ? AND section = ? AND (major IS NULL OR TRIM(major) = '' OR LOWER(TRIM(major)) = 'general') ORDER BY semester, subject_code, updated_at DESC");
                      if ($stmtLoad) {
                        $stmtLoad->bind_param('sis', $studentCourse, $yearLevelNumeric, $studyLoadMeta['section']);
                        $stmtLoad->execute();
                        $resLoad = $stmtLoad->get_result();
                        while ($rowLoad = $resLoad->fetch_assoc()) {
                          $studyLoadSubjects[] = $rowLoad;
                          $studyLoadTotals['subjects']++;
                          $studyLoadTotals['units'] += (int)$rowLoad['units'];
                        }
                        $stmtLoad->close();
                      }
                    }
                  } else {
                    $studyLoadStatus['message'] = 'No year, section, or course assignment found. Please contact your administrator.';
                  }
                }
              } catch (Throwable $studyLoadException) {
                $studyLoadStatus['message'] = 'Unable to load study load information right now.';
              }

              try {
                // Build comprehensive query to match student grades
                $conditions = [];
                $types = '';
                $params = [];
                
                // Priority 1: Match by user_id (most reliable)
                if (!empty($currentUserId)) {
                  $conditions[] = 'sg.user_id = ?';
                  $types .= 'i';
                  $params[] = $currentUserId;
                }
                
                // Priority 2: Match by exact username
                if (!empty($currentUsername)) {
                  $conditions[] = 'sg.username = ?';
                  $types .= 's';
                  $params[] = $currentUsername;
                }
                
                // Priority 3: Match by exact full_name (if different from username)
                if (!empty($currentFullName) && $currentFullName !== $currentUsername) {
                  $conditions[] = 'sg.username = ?';
                  $types .= 's';
                  $params[] = $currentFullName;
                }
                
                // Priority 4: Fuzzy match by username LIKE (for partial matches)
                if (!empty($currentUsername)) {
                  $conditions[] = 'sg.username LIKE ?';
                  $types .= 's';
                  $params[] = '%' . $currentUsername . '%';
                }
                
                // Priority 5: Fuzzy match by full_name LIKE
                if (!empty($currentFullName)) {
                  $conditions[] = 'sg.username LIKE ?';
                  $types .= 's';
                  $params[] = '%' . $currentFullName . '%';
                }
                
                // Execute query if we have conditions
                if (!empty($conditions)) {
                  $sql = "SELECT DISTINCT sg.year, sg.semester, sg.subject, sg.instructor, sg.prelim_grade, sg.midterm_grade, sg.finals_grade
                          FROM student_grades sg
                          WHERE (" . implode(' OR ', $conditions) . ")
                          ORDER BY CAST(sg.year AS UNSIGNED), sg.semester, sg.subject";
                  
                  if ($stmtGrades = $conn->prepare($sql)) {
                    if ($types !== '') {
                      $bind = [];
                      $bind[] = &$types;
                      foreach ($params as $idx => $value) {
                        $bind[] = &$params[$idx];
                      }
                      call_user_func_array([$stmtGrades, 'bind_param'], $bind);
                    }
                    $stmtGrades->execute();
                    $resultGrades = $stmtGrades->get_result();
                    while ($rowGrade = $resultGrades->fetch_assoc()) {
                      $studentGrades[] = $rowGrade;
                    }
                    $stmtGrades->close();
                  }
                }

                if (!empty($studentGrades)):
                  // Normalize year/semester values to handle legacy and inconsistent data
                  $normalizeYear = function ($value) {
                    $raw = trim((string)$value);
                    if ($raw === '') {
                      return ['key' => 'unknown', 'label' => 'Year N/A'];
                    }
                    if (is_numeric($raw)) {
                      $num = (int)$raw;
                      if ($num > 0) {
                        $ordinal = formatOrdinal($num);
                        if ($ordinal !== '') {
                          return ['key' => (string)$num, 'label' => $ordinal . ' Year'];
                        }
                      }
                      return ['key' => (string)$raw, 'label' => trim($raw) . ' Year'];
                    }
                    if (preg_match('/(\d+)/', $raw, $matches)) {
                      $num = (int)$matches[1];
                      if ($num > 0) {
                        $ordinal = formatOrdinal($num);
                        if ($ordinal !== '') {
                          return ['key' => (string)$num, 'label' => $ordinal . ' Year'];
                        }
                      }
                    }
                    $lower = strtolower($raw);
                    $wordMap = [
                      'first' => 1,
                      'second' => 2,
                      'third' => 3,
                      'fourth' => 4,
                      '1st' => 1,
                      '2nd' => 2,
                      '3rd' => 3,
                      '4th' => 4,
                    ];
                    foreach ($wordMap as $needle => $num) {
                      if (strpos($lower, $needle) !== false) {
                        $ordinal = formatOrdinal($num);
                        if ($ordinal !== '') {
                          return ['key' => (string)$num, 'label' => $ordinal . ' Year'];
                        }
                      }
                    }
                    return ['key' => $raw, 'label' => ucfirst($raw)];
                  };

                  $normalizeSemester = function ($value) {
                    $raw = trim((string)$value);
                    if ($raw === '') {
                      return 'Other Semester';
                    }
                    $lower = strtolower($raw);
                    $firstAliases = ['1', '1st', 'first', 'first semester', 'sem 1', 'semester 1', '1st semester'];
                    foreach ($firstAliases as $alias) {
                      if ($lower === $alias) {
                        return 'First Semester';
                      }
                    }
                    if (strpos($lower, 'first') !== false || strpos($lower, '1st') !== false || strpos($lower, 'sem 1') !== false) {
                      return 'First Semester';
                    }
                    $secondAliases = ['2', '2nd', 'second', 'second semester', 'sem 2', 'semester 2', '2nd semester'];
                    foreach ($secondAliases as $alias) {
                      if ($lower === $alias) {
                        return 'Second Semester';
                      }
                    }
                    if (strpos($lower, 'second') !== false || strpos($lower, '2nd') !== false || strpos($lower, 'sem 2') !== false) {
                      return 'Second Semester';
                    }
                    return ucwords($raw);
                  };

                  // Group by normalized year and semester
                  $gradesByYear = [];
                  foreach ($studentGrades as $grade) {
                    $yearInfo = $normalizeYear($grade['year'] ?? '');
                    $yearKey = $yearInfo['key'];
                    $yearLabel = $yearInfo['label'];
                    if (!isset($gradesByYear[$yearKey])) {
                      $gradesByYear[$yearKey] = [
                        'label' => $yearLabel,
                        'semesters' => []
                      ];
                    }
                    $semesterLabel = $normalizeSemester($grade['semester'] ?? '');
                    if (!isset($gradesByYear[$yearKey]['semesters'][$semesterLabel])) {
                      $gradesByYear[$yearKey]['semesters'][$semesterLabel] = [];
                    }
                    $gradesByYear[$yearKey]['semesters'][$semesterLabel][] = $grade;
                  }

                  // Keep standard years in a predictable order, append the rest afterwards
                  $preferredYearOrder = ['1', '2', '3', '4'];
                  $orderedYears = [];
                  foreach ($preferredYearOrder as $yearKey) {
                    if (isset($gradesByYear[$yearKey])) {
                      $orderedYears[$yearKey] = $gradesByYear[$yearKey];
                      unset($gradesByYear[$yearKey]);
                    }
                  }
                  $gradesByYear = $orderedYears + $gradesByYear;
              ?>
              <?php foreach ($gradesByYear as $yearData): ?>
                <?php
                  $semesters = $yearData['semesters'];
                  $preferredSemesters = ['First Semester', 'Second Semester'];
                  $orderedSemesters = [];
                  foreach ($preferredSemesters as $semName) {
                    if (!empty($semesters[$semName])) {
                      $orderedSemesters[$semName] = $semesters[$semName];
                      unset($semesters[$semName]);
                    }
                  }
                  $orderedSemesters = $orderedSemesters + $semesters;
                ?>
                <div class="info-card grades-year-card">
                  <div class="card-header-modern">
                    <i class="bi bi-calendar-year"></i>
                    <h3><?php echo htmlspecialchars($yearData['label']); ?></h3>
                  </div>
                  
                  <?php foreach ($orderedSemesters as $semName => $gradesList): ?>
                    <?php if (!empty($gradesList)): ?>
                      <div class="grades-semester-section">
                        <div class="semester-header">
                          <i class="bi bi-journal-bookmark"></i>
                          <h4><?php echo htmlspecialchars($semName); ?></h4>
                          <span class="semester-badge"><?php echo count($gradesList); ?> <?php echo count($gradesList) === 1 ? 'subject' : 'subjects'; ?></span>
                        </div>
                        <div class="grades-grid">
                          <?php foreach ($gradesList as $grade): 
                            // Calculate average if all grades are available
                            $grades = array_filter([$grade['prelim_grade'], $grade['midterm_grade'], $grade['finals_grade']], function($g) { return $g !== null && $g !== ''; });
                            $average = !empty($grades) ? round(array_sum($grades) / count($grades), 2) : null;
                          ?>
                            <div class="grade-card-modern">
                              <div class="grade-card-header-modern">
                                <div class="grade-subject-info">
                                  <h5 class="grade-subject-name"><?php echo htmlspecialchars($grade['subject']); ?></h5>
                                  <?php if (!empty($grade['instructor'])): ?>
                                    <p class="grade-instructor">
                                      <i class="bi bi-person-badge"></i>
                                      <span><?php echo htmlspecialchars($grade['instructor']); ?></span>
                                    </p>
                                  <?php endif; ?>
                                </div>
                                <?php if ($average !== null): ?>
                                  <div class="grade-average-badge">
                                    <i class="bi bi-graph-up"></i>
                                    <span><?php echo number_format($average, 2); ?></span>
                                  </div>
                                <?php endif; ?>
                              </div>
                              <div class="grade-details-modern">
                                <div class="grade-detail-item">
                                  <span class="grade-period">
                                    <i class="bi bi-circle-fill"></i>
                                    Prelim
                                  </span>
                                  <span class="grade-number"><?php echo $grade['prelim_grade'] !== null ? number_format($grade['prelim_grade'], 2) : '—'; ?></span>
                                </div>
                                <div class="grade-detail-item">
                                  <span class="grade-period">
                                    <i class="bi bi-circle-fill"></i>
                                    Midterm
                                  </span>
                                  <span class="grade-number"><?php echo $grade['midterm_grade'] !== null ? number_format($grade['midterm_grade'], 2) : '—'; ?></span>
                                </div>
                                <div class="grade-detail-item">
                                  <span class="grade-period">
                                    <i class="bi bi-circle-fill"></i>
                                    Finals
                                  </span>
                                  <span class="grade-number"><?php echo $grade['finals_grade'] !== null ? number_format($grade['finals_grade'], 2) : '—'; ?></span>
                                </div>
                              </div>
                            </div>
                          <?php endforeach; ?>
                        </div>
                      </div>
                    <?php endif; ?>
                  <?php endforeach; ?>
                </div>
              <?php endforeach; ?>
              <?php
                endif;
              } catch (Throwable $ex) {
                // Silently fail if grades table doesn't exist or error occurs
              }
              if (empty($studentGrades)):
              ?>
              <div class="info-card">
                <div class="card-header-modern">
                  <i class="bi bi-journal-x"></i>
                  <h3>My Grades</h3>
                </div>
                <p class="text-muted mb-0">No grade records are available yet. Please check back later.</p>
              </div>
              <?php
              endif;
              ?>
              <div class="info-card study-load-card">
                <div class="card-header-modern">
                  <i class="bi bi-mortarboard-fill"></i>
                  <h3>Study Load</h3>
                </div>
                <?php
                  $yearLabel = 'Not assigned';
                  if ($studyLoadMeta['yearLevel'] !== '') {
                    $yearLabel = is_numeric($studyLoadMeta['yearLevel'])
                      ? formatOrdinal((int)$studyLoadMeta['yearLevel']) . ' Year'
                      : $studyLoadMeta['yearLevel'];
                  }
                  $sectionLabel = $studyLoadMeta['section'] !== '' ? $studyLoadMeta['section'] : 'Not assigned';
                  $courseLabel = $studyLoadMeta['course'] !== 'Not set' ? $studyLoadMeta['course'] : 'Not set';
                  $majorLabel = $studyLoadMeta['major'] !== '' ? $studyLoadMeta['major'] : 'Not set';
                ?>
                <div class="table-responsive study-load-table-wrapper">
                  <table class="table table-bordered align-middle study-load-table">
                    <tbody>
                      <tr>
                        <th colspan="5" class="text-center text-uppercase study-load-title">Study Load</th>
                      </tr>
                      <tr>
                        <td colspan="5">
                          <div class="row g-2">
                            <div class="col-md-6">
                              <strong>Student ID:</strong>
                              <span><?php echo htmlspecialchars($studyLoadMeta['studentId']); ?></span>
                            </div>
                            <div class="col-md-6">
                              <strong>Full Name:</strong>
                              <span><?php echo htmlspecialchars($studyLoadMeta['fullName']); ?></span>
                            </div>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td colspan="5">
                          <div class="row g-2">
                            <div class="col-md-3">
                              <strong>Course:</strong>
                              <span><?php echo htmlspecialchars($courseLabel); ?></span>
                            </div>
                            <div class="col-md-3">
                              <strong>Major:</strong>
                              <span><?php echo htmlspecialchars($majorLabel); ?></span>
                            </div>
                            <div class="col-md-3">
                              <strong>Year Level:</strong>
                              <span><?php echo htmlspecialchars($yearLabel); ?></span>
                            </div>
                            <div class="col-md-3">
                              <strong>Section:</strong>
                              <span><?php echo htmlspecialchars($sectionLabel); ?></span>
                            </div>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <th colspan="5" class="text-center study-load-subheader">Subject Enrolled</th>
                      </tr>
                      <tr>
                        <th scope="col">Subject Code</th>
                        <th scope="col">Subject Name</th>
                        <th scope="col">Semester</th>
                        <th scope="col" style="width: 110px;">Units</th>
                        <th scope="col">Subject Teacher</th>
                      </tr>
                      <?php if (!empty($studyLoadSubjects)): ?>
                        <?php foreach ($studyLoadSubjects as $subject): ?>
                        <tr>
                          <td><?php echo htmlspecialchars($subject['subject_code']); ?></td>
                          <td><?php echo htmlspecialchars($subject['subject_title']); ?></td>
                          <td><?php echo htmlspecialchars($subject['semester'] ?? '—'); ?></td>
                          <td><?php echo isset($subject['units']) ? (int)$subject['units'] : 0; ?></td>
                          <td>
                            <?php if (!empty($subject['teacher'])): ?>
                              <?php echo htmlspecialchars($subject['teacher']); ?>
                            <?php else: ?>
                              <span class="text-muted">TBA</span>
                            <?php endif; ?>
                          </td>
                        </tr>
                        <?php endforeach; ?>
                      <?php else: ?>
                        <tr>
                          <td colspan="5" class="text-center text-muted">
                            <?php echo $studyLoadStatus['hasAssignment'] ? 'No subjects have been assigned to your study load yet.' : 'Study load information is not available right now.'; ?>
                          </td>
                        </tr>
                      <?php endif; ?>
                      <tr class="study-load-total-row">
                        <td colspan="3">
                          <strong>Total Subjects:</strong>
                          <span><?php echo $studyLoadTotals['subjects']; ?></span>
                        </td>
                        <td colspan="2">
                          <strong>Total Units:</strong>
                          <span><?php echo $studyLoadTotals['units']; ?></span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <?php if (!empty($studyLoadStatus['message'])): ?>
                    <p class="text-warning small mb-0"><?php echo htmlspecialchars($studyLoadStatus['message']); ?></p>
                  <?php endif; ?>
                </div>
                <div class="study-load-actions">
                  <button type="button" class="btn btn-outline-primary study-load-download-btn" id="downloadStudyLoadBtn">
                    <i class="bi bi-download"></i>
                    <span>Download Study Load</span>
                  </button>
                </div>
              </div>
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
          <?php
        } elseif ($view === 'evaluation') {
          // Check if evaluations are enabled
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
            $evaluationsEnabled = true; // Default to enabled if table doesn't exist
          }
          
          // Get student's section
          $studentSection = '';
          $studentYear = '';
          $currentUserId = $_SESSION['user_id'] ?? null;
          $currentUsername = $_SESSION['username'] ?? '';
          $currentFullName = $_SESSION['full_name'] ?? '';
          
          try {
            if ($conn && !$conn->connect_error) {
              // Try to get section from user_assignments
              $assignmentRow = null;
              if (!empty($currentUserId)) {
                $stmtAssign = $conn->prepare("SELECT year, section FROM user_assignments WHERE user_id = ? LIMIT 1");
                if ($stmtAssign) {
                  $stmtAssign->bind_param('i', $currentUserId);
                  $stmtAssign->execute();
                  $resAssign = $stmtAssign->get_result();
                  $assignmentRow = $resAssign ? $resAssign->fetch_assoc() : null;
                  $stmtAssign->close();
                }
              }
              
              if (!$assignmentRow && !empty($currentFullName)) {
                $stmtAssign = $conn->prepare("SELECT year, section FROM user_assignments WHERE username = ? LIMIT 1");
                if ($stmtAssign) {
                  $stmtAssign->bind_param('s', $currentFullName);
                  $stmtAssign->execute();
                  $resAssign = $stmtAssign->get_result();
                  $assignmentRow = $resAssign ? $resAssign->fetch_assoc() : null;
                  $stmtAssign->close();
                }
              }
              
              if ($assignmentRow) {
                $studentSection = $assignmentRow['section'] ?? '';
                $studentYear = $assignmentRow['year'] ?? '';
              }
            }
          } catch (Throwable $e) {
            // Ignore errors
          }
          
          // Get teacher_id from URL if evaluating specific teacher
          $evaluateTeacherId = isset($_GET['teacher_id']) ? intval($_GET['teacher_id']) : 0;
          $evaluateTeacherName = isset($_GET['teacher_name']) ? urldecode($_GET['teacher_name']) : '';
          $evaluateSubject = isset($_GET['subject']) ? urldecode($_GET['subject']) : '';
          
          if ($evaluateTeacherId > 0 && !empty($evaluateTeacherName)) {
            // Show evaluation form
            ?>
            <div class="records-container">
              <div class="records-header">
                <h2 class="records-title">
                  <i class="bi bi-clipboard-check"></i> Teacher Evaluation Form
                </h2>
                <p class="records-subtitle">Evaluate <?php echo htmlspecialchars($evaluateTeacherName); ?></p>
              </div>
              
              <div class="records-main">
                <div class="info-card">
                  <div class="card-header-modern">
                    <i class="bi bi-info-circle"></i>
                    <h3>Evaluation Information</h3>
                  </div>
                  <p><strong>This Evaluation Form will be part of your REQUIREMENTS for CLEARANCE for the 1st Semester of S.Y. 2025-2026.</strong></p>
                  <p><strong>Directions:</strong> The following are statements about your SUBJECT TEACHER for the <strong>1st Semester of S.Y. 2025-2026</strong>. Please indicate the extent to which each statement characterizes the competence of your teacher by choosing the specific numerical rating based on the following:</p>
                  <div class="evaluation-rating-scale">
                    <div class="rating-scale-item">
                      <span class="rating-label"><strong>O (4)</strong> = Outstanding</span>
                    </div>
                    <div class="rating-scale-item">
                      <span class="rating-label"><strong>VS (3)</strong> = Very Satisfactory</span>
                    </div>
                    <div class="rating-scale-item">
                      <span class="rating-label"><strong>S (2)</strong> = Satisfactory</span>
                    </div>
                    <div class="rating-scale-item">
                      <span class="rating-label"><strong>NI (1)</strong> = Needs Improvement</span>
                    </div>
                  </div>
                </div>
                
                <form id="evaluationForm" action="/TCC/BackEnd/admin/save_evaluation.php" method="POST">
                  <input type="hidden" name="teacher_id" value="<?php echo $evaluateTeacherId; ?>">
                  <input type="hidden" name="teacher_name" value="<?php echo htmlspecialchars($evaluateTeacherName); ?>">
                  <input type="hidden" name="subject" value="<?php echo htmlspecialchars($evaluateSubject); ?>">
                  <input type="hidden" name="student_section" value="<?php echo htmlspecialchars($studentSection); ?>">
                  
                  <!-- PART I: My Teacher -->
                  <div class="info-card">
                    <div class="card-header-modern">
                      <i class="bi bi-person-check"></i>
                      <h3>PART I: My Teacher</h3>
                    </div>
                    
                    <?php
                    $part1Questions = [
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
                    
                    foreach ($part1Questions as $index => $question):
                      $qNum = $index + 1;
                    ?>
                      <div class="evaluation-question">
                        <label class="evaluation-question-label">
                          <span class="question-number"><?php echo $qNum; ?>.</span>
                          <span class="question-text"><?php echo htmlspecialchars($question); ?></span>
                        </label>
                        <div class="evaluation-ratings">
                          <label class="rating-option">
                            <input type="radio" name="part1_q<?php echo $qNum; ?>" value="4" required>
                            <span class="rating-value">O (4)</span>
                          </label>
                          <label class="rating-option">
                            <input type="radio" name="part1_q<?php echo $qNum; ?>" value="3" required>
                            <span class="rating-value">VS (3)</span>
                          </label>
                          <label class="rating-option">
                            <input type="radio" name="part1_q<?php echo $qNum; ?>" value="2" required>
                            <span class="rating-value">S (2)</span>
                          </label>
                          <label class="rating-option">
                            <input type="radio" name="part1_q<?php echo $qNum; ?>" value="1" required>
                            <span class="rating-value">NI (1)</span>
                          </label>
                        </div>
                      </div>
                    <?php endforeach; ?>
                  </div>
                  
                  <!-- PART II: As a Student -->
                  <div class="info-card">
                    <div class="card-header-modern">
                      <i class="bi bi-mortarboard"></i>
                      <h3>PART II: As a Student</h3>
                    </div>
                    
                    <?php
                    $part2Questions = [
                      'With my teacher\'s guidance, I can demonstrate the intended knowledge and skills with competence.',
                      'With my teacher\'s guidance, I can connect theory and practical knowledge of this subject.',
                      'With my teacher\'s guidance, I have improved my problem-solving, critical thinking, and decision-making skills through this subject.',
                      'I am happy that he/she is my teacher.',
                      'I can feel the teacher\'s concern for us, his/her students.',
                      'I look up to my teacher as a role model.',
                      'I like to be in his/her class again.',
                      'I notice that my teacher extends help to his/her students who are struggling academically.'
                    ];
                    
                    foreach ($part2Questions as $index => $question):
                      $qNum = $index + 1;
                    ?>
                      <div class="evaluation-question">
                        <label class="evaluation-question-label">
                          <span class="question-number"><?php echo $qNum; ?>.</span>
                          <span class="question-text"><?php echo htmlspecialchars($question); ?></span>
                        </label>
                        <div class="evaluation-ratings">
                          <label class="rating-option">
                            <input type="radio" name="part2_q<?php echo $qNum; ?>" value="4" required>
                            <span class="rating-value">O (4)</span>
                          </label>
                          <label class="rating-option">
                            <input type="radio" name="part2_q<?php echo $qNum; ?>" value="3" required>
                            <span class="rating-value">VS (3)</span>
                          </label>
                          <label class="rating-option">
                            <input type="radio" name="part2_q<?php echo $qNum; ?>" value="2" required>
                            <span class="rating-value">S (2)</span>
                          </label>
                          <label class="rating-option">
                            <input type="radio" name="part2_q<?php echo $qNum; ?>" value="1" required>
                            <span class="rating-value">NI (1)</span>
                          </label>
                        </div>
                      </div>
                    <?php endforeach; ?>
                  </div>
                  
                  <!-- Additional Questions -->
                  <div class="info-card">
                    <div class="card-header-modern">
                      <i class="bi bi-question-circle"></i>
                      <h3>Additional Questions</h3>
                    </div>
                    
                    <div class="evaluation-question">
                      <label class="evaluation-question-label">
                        In a scale of 1 (not satisfied) to 10 (very satisfied), how satisfied are you with your learning experiences in this subject?
                      </label>
                      <div class="satisfaction-scale">
                        <?php for ($i = 1; $i <= 10; $i++): ?>
                          <label class="satisfaction-option">
                            <input type="radio" name="satisfaction_rating" value="<?php echo $i; ?>" required>
                            <span class="satisfaction-value"><?php echo $i; ?></span>
                          </label>
                        <?php endfor; ?>
                      </div>
                      <div class="satisfaction-labels">
                        <span class="satisfaction-label-left">NOT SATISFIED</span>
                        <span class="satisfaction-label-right">VERY SATISFIED</span>
                      </div>
                    </div>
                    
                    <div class="evaluation-question">
                      <label class="evaluation-question-label">
                        Will you recommend the subject/s under the present teacher?
                      </label>
                      <div class="evaluation-ratings">
                        <label class="rating-option">
                          <input type="radio" name="recommend_teacher" value="YES" required>
                          <span class="rating-value">YES</span>
                        </label>
                        <label class="rating-option">
                          <input type="radio" name="recommend_teacher" value="NO" required>
                          <span class="rating-value">NO</span>
                        </label>
                      </div>
                    </div>
                    
                    <div class="evaluation-question">
                      <label class="evaluation-question-label" for="comments">
                        COMMENTS
                        <small>(This may include a message of gratitude or pointing out aspects which you want your teacher to consider for further improvement.)</small>
                      </label>
                      <textarea id="comments" name="comments" class="evaluation-comments" rows="5" placeholder="Enter your comments here..."></textarea>
                    </div>
                  </div>
                  
                  <div class="evaluation-actions">
                    <button type="submit" class="btn btn-primary evaluation-submit-btn">
                      <i class="bi bi-check-circle"></i>
                      Submit Evaluation
                    </button>
                    <a href="/TCC/public/home.php?view=evaluation" class="btn btn-outline-secondary">
                      <i class="bi bi-arrow-left"></i>
                      Cancel
                    </a>
                  </div>
                </form>
                
                <script>
                document.getElementById('evaluationForm').addEventListener('submit', function(e) {
                  e.preventDefault();
                  
                  const formData = new FormData(this);
                  const submitBtn = this.querySelector('.evaluation-submit-btn');
                  const originalText = submitBtn.innerHTML;
                  
                  submitBtn.disabled = true;
                  submitBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Submitting...';
                  
                  fetch('/TCC/BackEnd/admin/save_evaluation.php', {
                    method: 'POST',
                    body: formData
                  })
                  .then(response => response.json())
                  .then(data => {
                    if (data.success) {
                      alert('Evaluation submitted successfully!');
                      window.location.href = '/TCC/public/home.php?view=evaluation';
                    } else {
                      alert('Error: ' + data.message);
                      submitBtn.disabled = false;
                      submitBtn.innerHTML = originalText;
                    }
                  })
                  .catch(error => {
                    console.error('Error:', error);
                    alert('An error occurred while submitting the evaluation. Please try again.');
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalText;
                  });
                });
                </script>
              </div>
            </div>
            <?php
          } else {
            // Show list of teachers for student's section
            ?>
            <div class="records-container">
              <div class="records-header">
                <h2 class="records-title">
                  <i class="bi bi-clipboard-check"></i> Teacher Evaluation
                </h2>
                <p class="records-subtitle">Select a teacher to evaluate</p>
              </div>
              
              <?php if (!$evaluationsEnabled): ?>
                <div class="alert alert-warning">
                  <i class="bi bi-exclamation-triangle"></i>
                  Teacher evaluations are currently disabled by the administrator.
                </div>
              <?php elseif (empty($studentSection)): ?>
                <div class="alert alert-info">
                  <i class="bi bi-info-circle"></i>
                  Your section information is not available. Please contact the administrator to update your assignment.
                </div>
              <?php else: ?>
                <div class="records-main">
                  <div class="info-card">
                    <div class="card-header-modern">
                      <i class="bi bi-people"></i>
                      <h3>Teachers in Section: <?php echo htmlspecialchars($studentSection); ?></h3>
                    </div>
                    
                    <?php
                    // Get teachers who teach in this section
                    $teachers = [];
                    try {
                      if ($conn && !$conn->connect_error) {
                        // Get teachers from schedules table
                        $stmtTeachers = $conn->prepare("SELECT DISTINCT instructor, subject FROM schedules WHERE section = ? AND instructor IS NOT NULL AND instructor != '' ORDER BY instructor, subject");
                        if ($stmtTeachers) {
                          $stmtTeachers->bind_param('s', $studentSection);
                          $stmtTeachers->execute();
                          $resTeachers = $stmtTeachers->get_result();
                          while ($row = $resTeachers->fetch_assoc()) {
                            $teacherName = $row['instructor'];
                            $subject = $row['subject'];
                            if (!isset($teachers[$teacherName])) {
                              $teachers[$teacherName] = [];
                            }
                            $teachers[$teacherName][] = $subject;
                          }
                          $stmtTeachers->close();
                        }
                        
                        // Also check study_load table
                        $stmtStudyLoad = $conn->prepare("SELECT DISTINCT teacher, subject_title FROM study_load WHERE section = ? AND teacher IS NOT NULL AND teacher != '' ORDER BY teacher, subject_title");
                        if ($stmtStudyLoad) {
                          $stmtStudyLoad->bind_param('s', $studentSection);
                          $stmtStudyLoad->execute();
                          $resStudyLoad = $stmtStudyLoad->get_result();
                          while ($row = $resStudyLoad->fetch_assoc()) {
                            $teacherName = $row['teacher'];
                            $subject = $row['subject_title'];
                            if (!isset($teachers[$teacherName])) {
                              $teachers[$teacherName] = [];
                            }
                            if (!in_array($subject, $teachers[$teacherName])) {
                              $teachers[$teacherName][] = $subject;
                            }
                          }
                          $stmtStudyLoad->close();
                        }
                        
                        // Get teacher user_id from users table
                        foreach ($teachers as $teacherName => $subjects) {
                          $stmtUser = $conn->prepare("SELECT id FROM users WHERE full_name = ? OR username = ? LIMIT 1");
                          if ($stmtUser) {
                            $stmtUser->bind_param('ss', $teacherName, $teacherName);
                            $stmtUser->execute();
                            $resUser = $stmtUser->get_result();
                            $userRow = $resUser ? $resUser->fetch_assoc() : null;
                            $teacherId = $userRow ? $userRow['id'] : 0;
                            $stmtUser->close();
                            
                            // Check if student already evaluated this teacher
                            $alreadyEvaluated = false;
                            if ($currentUserId) {
                              // Check if table exists first
                              $tableCheck = $conn->query("SHOW TABLES LIKE 'teacher_evaluations'");
                              if ($tableCheck && $tableCheck->num_rows > 0) {
                                $stmtCheck = $conn->prepare("SELECT id FROM teacher_evaluations WHERE student_id = ? AND teacher_id = ? AND semester = 'First Semester' AND school_year = '2025-2026' LIMIT 1");
                                if ($stmtCheck) {
                                  $stmtCheck->bind_param('ii', $currentUserId, $teacherId);
                                  $stmtCheck->execute();
                                  $resCheck = $stmtCheck->get_result();
                                  $alreadyEvaluated = ($resCheck && $resCheck->num_rows > 0);
                                  $stmtCheck->close();
                                }
                              }
                            }
                            
                            $teachers[$teacherName] = [
                              'id' => $teacherId,
                              'subjects' => $subjects,
                              'evaluated' => $alreadyEvaluated
                            ];
                          }
                        }
                      }
                    } catch (Throwable $e) {
                      // Ignore errors
                    }
                    ?>
                    
                    <?php if (empty($teachers)): ?>
                      <p class="text-muted">No teachers found for your section. Please contact the administrator.</p>
                    <?php else: ?>
                      <div class="teachers-grid">
                        <?php foreach ($teachers as $teacherName => $teacherData): ?>
                          <div class="teacher-card-modern">
                            <div class="teacher-card-header">
                              <h4 class="teacher-name"><?php echo htmlspecialchars($teacherName); ?></h4>
                              <?php if ($teacherData['evaluated']): ?>
                                <span class="evaluation-badge evaluated">
                                  <i class="bi bi-check-circle-fill"></i>
                                  Evaluated
                                </span>
                              <?php else: ?>
                                <span class="evaluation-badge pending">
                                  <i class="bi bi-clock"></i>
                                  Pending
                                </span>
                              <?php endif; ?>
                            </div>
                            <div class="teacher-subjects">
                              <strong>Subjects:</strong>
                              <ul>
                                <?php foreach ($teacherData['subjects'] as $subject): ?>
                                  <li><?php echo htmlspecialchars($subject); ?></li>
                                <?php endforeach; ?>
                              </ul>
                            </div>
                            <?php if (!$teacherData['evaluated']): ?>
                              <div class="teacher-card-actions">
                                <a href="/TCC/public/home.php?view=evaluation&teacher_id=<?php echo $teacherData['id']; ?>&teacher_name=<?php echo urlencode($teacherName); ?>&subject=<?php echo urlencode(implode(', ', $teacherData['subjects'])); ?>" class="btn btn-primary evaluation-btn">
                                  <i class="bi bi-clipboard-check"></i>
                                  Evaluate Teacher
                                </a>
                              </div>
                            <?php else: ?>
                              <div class="teacher-card-actions">
                                <span class="text-muted">
                                  <i class="bi bi-check-circle"></i>
                                  You have already evaluated this teacher
                                </span>
                              </div>
                            <?php endif; ?>
                          </div>
                        <?php endforeach; ?>
                      </div>
                    <?php endif; ?>
                  </div>
                </div>
              <?php endif; ?>
            </div>
            <?php
          }
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
                      <a href="/TCC/public/home.php" class="btn btn-outline-secondary">
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
      (function () {
        function ordinal(n) {
          var suffixes = ['th', 'st', 'nd', 'rd'];
          var v = n % 100;
          return n + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
        }
        function updateClock(prefix) {
          var timeEl = document.getElementById(prefix + 'ClockTime');
          var subEl = document.getElementById(prefix + 'ClockSub');
          var dayEl = document.getElementById(prefix + 'ClockDay');
          if (!timeEl || !subEl || !dayEl) {
            return;
          }
          var now = new Date();
          var hours24 = now.getHours();
          var minutes = now.getMinutes();
          var seconds = now.getSeconds();
          var ampm = hours24 >= 12 ? 'PM' : 'AM';
          var displayHour = hours24 % 12;
          if (displayHour === 0) {
            displayHour = 12;
          }
          var hourText = displayHour < 10 ? '0' + displayHour : String(displayHour);
          var minuteText = minutes < 10 ? '0' + minutes : String(minutes);
          var secondText = seconds < 10 ? '0' + seconds : String(seconds);
          timeEl.textContent = hourText + ':' + minuteText + ':' + secondText;
          subEl.textContent = ampm;
          var weekday = now.toLocaleDateString(undefined, { weekday: 'long' });
          var month = now.toLocaleDateString(undefined, { month: 'long' });
          var day = ordinal(now.getDate());
          dayEl.textContent = weekday + ', ' + month + ' ' + day;
        }
        function startClock() {
          updateClock('home');
          if (window.__homeClockTimer) {
            clearInterval(window.__homeClockTimer);
          }
          window.__homeClockTimer = setInterval(function () {
            updateClock('home');
          }, 1000);
        }
        startClock();
        document.addEventListener('DOMContentLoaded', function () {
          try {
            var tooltipTriggerList = Array.prototype.slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
            tooltipTriggerList.forEach(function (el) {
              if (window.bootstrap && typeof window.bootstrap.Tooltip === 'function') {
                new window.bootstrap.Tooltip(el);
              }
            });
          } catch (err) {
            console.warn('Tooltip init skipped:', err);
          }
          startClock();
        });
        document.addEventListener('visibilitychange', function () {
          if (!document.hidden) {
            startClock();
          }
        });
        window.startHomeClock = startClock;
      })();
    </script>
    <?php if ($view === 'grades'): ?>
    <script>
      // Simple "download" for study load: opens printable view (user can save as PDF)
      document.addEventListener('DOMContentLoaded', function () {
        var btn = document.getElementById('downloadStudyLoadBtn');
        var wrapper = document.querySelector('.study-load-table-wrapper');
        if (!btn || !wrapper) return;

        btn.addEventListener('click', function () {
          var content = wrapper.innerHTML;
          var win = window.open('', '_blank');
          if (!win) return;
          win.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Study Load</title>');
          win.document.write('<link rel="stylesheet" href="css/bootstrap.min.css">');
          win.document.write('<style>body{padding:20px;font-family:Arial, sans-serif;}table{width:100%;border-collapse:collapse;}th,td{border:1px solid #ddd;padding:8px;}</style>');
          win.document.write('</head><body>');
          win.document.write('<h3 class="mb-3">Study Load</h3>');
          win.document.write(content);
          win.document.write('<script>window.onload=function(){window.print();};<\/script>');
          win.document.write('</body></html>');
          win.document.close();
        });
      });
    </script>
    <?php endif; ?>
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
