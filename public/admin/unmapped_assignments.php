<?php
session_start();
if (!isset($_SESSION['username']) || ($_SESSION['role'] ?? '') !== 'admin') {
  header('Location: /TCC/public/index.html'); exit();
}
require_once __DIR__ . '/../../BackEnd/database/db.php';
$conn = Database::getInstance()->getConnection();

$rows = [];
$res = $conn->query("SELECT id, username, year, section FROM user_assignments WHERE user_id IS NULL OR user_id = 0 ORDER BY username");
if ($res) {
  while ($r = $res->fetch_assoc()) $rows[] = $r;
}
?>
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="stylesheet" href="/TCC/public/css/bootstrap.min.css" />
    <title>Unmapped Assignments</title>
  </head>
  <body class="p-4">
    <div class="container">
      <h4>Unmapped User Assignments</h4>
      <p class="text-muted">Rows with missing <code>user_id</code>. Confirm mapping to a user below.</p>
      <?php if (empty($rows)): ?>
        <div class="alert alert-success">No unmapped assignments found.</div>
      <?php else: ?>
        <table class="table table-sm">
          <thead><tr><th>Username (stored)</th><th>Year</th><th>Section</th><th>Suggested Matches</th><th>Action</th></tr></thead>
          <tbody>
            <?php foreach ($rows as $r):
              $uid = (int)$r['id'];
              $uname = $r['username'];
              // prepare suggestions
              $sugg = [];
              // exact full_name
              $ps = $conn->prepare("SELECT id, username, full_name FROM users WHERE full_name = ? LIMIT 5");
              if ($ps) { $ps->bind_param('s', $uname); $ps->execute(); $gr = $ps->get_result(); while ($g = $gr->fetch_assoc()) $sugg[] = $g; $ps->close(); }
              // exact username if none
              if (empty($sugg)) {
                $ps2 = $conn->prepare("SELECT id, username, full_name FROM users WHERE username = ? LIMIT 5");
                if ($ps2) { $ps2->bind_param('s', $uname); $ps2->execute(); $gr = $ps2->get_result(); while ($g = $gr->fetch_assoc()) $sugg[] = $g; $ps2->close(); }
              }
              // fuzzy LIKE
              if (empty($sugg)) {
                $like = '%' . $conn->real_escape_string($uname) . '%';
                $ps3 = $conn->prepare("SELECT id, username, full_name FROM users WHERE full_name LIKE ? OR username LIKE ? LIMIT 10");
                if ($ps3) { $ps3->bind_param('ss', $like, $like); $ps3->execute(); $gr = $ps3->get_result(); while ($g = $gr->fetch_assoc()) $sugg[] = $g; $ps3->close(); }
              }
            ?>
            <tr>
              <td><?php echo htmlspecialchars($uname); ?></td>
              <td><?php echo htmlspecialchars($r['year']); ?></td>
              <td><?php echo htmlspecialchars($r['section']); ?></td>
              <td>
                <?php if (empty($sugg)): ?>
                  <em class="text-muted">No suggestions</em>
                <?php else: ?>
                  <ul class="mb-0">
                    <?php foreach ($sugg as $su): ?>
                      <li><?php echo htmlspecialchars($su['full_name'] ?: $su['username']); ?> — <small class="text-muted">(<?php echo (int)$su['id']; ?>)</small></li>
                    <?php endforeach; ?>
                  </ul>
                <?php endif; ?>
              </td>
              <td>
                <form method="post" action="/TCC/BackEnd/admin/map_assignment.php" class="d-flex" style="gap:8px;">
                  <input type="hidden" name="assignment_id" value="<?php echo (int)$uid; ?>" />
                  <input type="text" name="user_id" class="form-control form-control-sm" placeholder="user id" style="width:100px;" />
                  <button class="btn btn-sm btn-primary">Map</button>
                </form>
              </td>
            </tr>
            <?php endforeach; ?>
          </tbody>
        </table>
      <?php endif; ?>
      <a href="/TCC/public/admin_dashboard.php" class="btn btn-link">Back to Admin Dashboard</a>
    </div>
  </body>
</html>
