<?php
session_start();
// Ensure user is logged in
if (!isset($_SESSION['username'])) {
  header('Location: /TCC/public/index.html');
  exit();
}

$image = $_SESSION['image_path'] ?? '/TCC/public/images/sample.jpg';
$full_name = $_SESSION['full_name'] ?? $_SESSION['username'];
?>
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="stylesheet" href="css/bootstrap.min.css" />
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" />
    <title>Records</title>
    <style>
      body { background: #f1efe9; }
      .topbar { display:flex; align-items:center; gap:12px; padding:12px 18px; }
      .profile-sm { width:40px; height:40px; border-radius:8px; object-fit:cover; }
      .card-grid { display:flex; gap:1rem; flex-wrap:wrap; }
      .small-card { background:#fff; padding:14px; border-radius:10px; box-shadow:0 6px 18px rgba(47,41,38,0.06); }
    </style>
  </head>
  <body>
    <div class="container-fluid">
      <div class="topbar">
        <img src="<?php echo htmlspecialchars($image); ?>" alt="user" class="profile-sm" />
        <div>
          <div><strong><?php echo htmlspecialchars($full_name); ?></strong></div>
          <div class="text-muted">Records Dashboard</div>
        </div>
      </div>

      <div class="container mt-3">
        <div class="row">
          <div class="col-md-8">
            <div class="card mb-3">
              <div class="card-body">
                <h5 class="card-title">City Weather</h5>
                <p class="card-text">Sunny, 26°C</p>
                <div class="row">
                  <div class="col-6 small-card">
                    <strong>Year</strong>
                    <div>3rd Year</div>
                  </div>
                  <div class="col-6 small-card">
                    <strong>Section</strong>
                    <div>A</div>
                  </div>
                </div>

                <div class="row mt-3">
                  <div class="col-6 small-card">
                    <strong>Building</strong>
                    <div>Building C</div>
                  </div>
                  <div class="col-6 small-card">
                    <strong>Room</strong>
                    <div>Room 402</div>
                  </div>
                </div>

              </div>
            </div>

            <div class="card">
              <div class="card-body">
                <h5 class="card-title">Lackings / Payments</h5>
                <p class="text-danger">You have outstanding fees: <strong>₱2,350.00</strong></p>
                <p class="text-muted">Payment and student account management is controlled in the admin dashboard.</p>
              </div>
            </div>
          </div>

          <div class="col-md-4">
            <div class="card">
              <div class="card-body">
                <h6>Quick Info</h6>
                <ul class="list-unstyled">
                  <li>Buildings: A, B, C, D</li>
                  <li>Floors per building: 4 (Building C includes 4th floor)</li>
                  <li>Rooms per floor: 4</li>
                </ul>
                <p class="small text-muted">These values are managed from the admin dashboard.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>
