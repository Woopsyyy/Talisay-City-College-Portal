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
    <title>Transparency</title>
    <style>
      body { background: #f7f6f2; }
      .topbar { display:flex; align-items:center; gap:12px; padding:12px 18px; }
      .profile-sm { width:40px; height:40px; border-radius:8px; object-fit:cover; }
    </style>
  </head>
  <body>
    <div class="container-fluid">
      <div class="topbar">
        <img src="<?php echo htmlspecialchars($image); ?>" alt="user" class="profile-sm" />
        <div>
          <div><strong><?php echo htmlspecialchars($full_name); ?></strong></div>
          <div class="text-muted">Transparency / Projects</div>
        </div>
      </div>

      <div class="container mt-3">
        <div class="card">
          <div class="card-body">
            <h5 class="card-title">School Projects</h5>
            <div class="table-responsive">
              <table class="table table-striped">
                <thead>
                  <tr>
                    <th>Project Name</th>
                    <th>Budget</th>
                    <th>Project Started</th>
                    <th>Project Completed</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Library Renovation</td>
                    <td>₱500,000.00</td>
                    <td>2024-02-15</td>
                    <td>Yes</td>
                  </tr>
                  <tr>
                    <td>New Computer Lab</td>
                    <td>₱750,000.00</td>
                    <td>2025-01-10</td>
                    <td>No</td>
                  </tr>
                  <tr>
                    <td>Campus Fence</td>
                    <td>₱250,000.00</td>
                    <td>2023-09-01</td>
                    <td>Yes</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>
