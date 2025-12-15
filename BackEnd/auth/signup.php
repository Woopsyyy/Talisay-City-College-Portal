<?php
require_once __DIR__ . '/../database/db.php';
require_once __DIR__ . '/../helpers/school_id.php';

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $full_name = trim($_POST['name'] ?? '');
    $username = trim($_POST['username'] ?? '');
    $raw_password = $_POST['password'] ?? '';
    $password = password_hash($raw_password, PASSWORD_DEFAULT);
    $image_path = '/TCC/public/images/default.jpg'; // Default web-accessible image path

    // Simple server-side validation
    if ($full_name === '' || $username === '' || $raw_password === '') {
        header("Location: /TCC/public/signup.php?error=missing");
        exit();
    }

    // Strip tags and normalize
    $full_name = trim(strip_tags($full_name));
    $username = trim(strip_tags($username));

    // Enforce lengths and patterns
    if (mb_strlen($full_name) < 2 || mb_strlen($full_name) > 100) {
        header("Location: /TCC/public/signup.php?error=invalidname");
        exit();
    }
    if (!preg_match('/^[a-zA-Z0-9_.-]{3,30}$/', $username)) {
        header("Location: /TCC/public/signup.php?error=invalidusername");
        exit();
    }

    // Password strength: min 8 chars, at least one upper, one lower, one digit
    if (strlen($raw_password) < 8 ||
        !preg_match('/[A-Z]/', $raw_password) ||
        !preg_match('/[a-z]/', $raw_password) ||
        !preg_match('/[0-9]/', $raw_password)) {
        header("Location: /TCC/public/signup.php?error=weakpassword");
        exit();
    }

    // Handle file upload if a file was provided
    if (isset($_FILES['profileImage']) && $_FILES['profileImage']['error'] == 0) {
        $target_dir = rtrim($_SERVER['DOCUMENT_ROOT'], '/') . "/TCC/database/pictures/";
        if (!file_exists($target_dir)) {
            mkdir($target_dir, 0777, true);
        }

        $file_extension = strtolower(pathinfo($_FILES["profileImage"]["name"], PATHINFO_EXTENSION));
        $sanitized_name = preg_replace('/[^a-z0-9]+/', '-', strtolower($full_name));
        $new_filename = $sanitized_name . '_' . date('YmdHis') . '.' . $file_extension;
        $target_file = $target_dir . $new_filename;

        // Basic image validation
        $check = getimagesize($_FILES["profileImage"]["tmp_name"]);
        if ($check !== false) {
            if (move_uploaded_file($_FILES["profileImage"]["tmp_name"], $target_file)) {
                // Use a web-accessible path for storage in DB
                $image_path = '/TCC/database/pictures/' . $new_filename;
            }
        }
    }

    $db = Database::getInstance();
    $conn = $db->getConnection();

    // Check for existing username
    $checkStmt = $conn->prepare("SELECT id FROM users WHERE username = ? LIMIT 1");
    $checkStmt->bind_param("s", $username);
    $checkStmt->execute();
    $checkRes = $checkStmt->get_result();
    if ($checkRes && $checkRes->num_rows > 0) {
        header("Location: /TCC/public/signup.php?error=usernametaken");
        exit();
    }

    // Check for existing full name
    $checkStmt = $conn->prepare("SELECT id FROM users WHERE full_name = ? LIMIT 1");
    $checkStmt->bind_param("s", $full_name);
    $checkStmt->execute();
    $checkRes = $checkStmt->get_result();
    if ($checkRes && $checkRes->num_rows > 0) {
        header("Location: /TCC/public/signup.php?error=nametaken");
        exit();
    }

    // Generate school_id - if it fails, we'll set it later
    $school_id = null;
    try {
        $school_id = generate_unique_school_id($conn);
    } catch (Exception $e) {
        error_log("Failed to generate school_id during signup: " . $e->getMessage());
        // Continue without school_id - it will be generated on first login
        $school_id = null;
    }

    // Insert new user - school_id can be NULL and will be set later if needed
    $stmt = $conn->prepare("INSERT INTO users (username, password, full_name, school_id, image_path, role) VALUES (?, ?, ?, ?, ?, 'student')");
    if (!$stmt) {
        error_log("Failed to prepare INSERT statement: " . $conn->error);
        header("Location: /TCC/public/signup.php?error=dberror");
        exit();
    }
    $stmt->bind_param("sssss", $username, $password, $full_name, $school_id, $image_path);
    if ($stmt->execute()) {
        error_log("User created successfully: " . $username);
        // If school_id wasn't generated, try to set it now
        if (empty($school_id)) {
            try {
                $newUserId = $stmt->insert_id;
                $userRow = ['id' => $newUserId, 'school_id' => null, 'created_at' => date('Y-m-d H:i:s')];
                $school_id = ensure_school_id_for_user($conn, $userRow);
                error_log("School ID generated after signup: " . $school_id);
            } catch (Exception $e) {
                error_log("Failed to generate school_id after signup: " . $e->getMessage());
                // Continue anyway - school_id will be generated on first login
            }
        }
        $stmt->close();
        header("Location: /TCC/public/index.html?signup=success");
        exit();
    } else {
        // Handle duplicate/other errors defensively
        $err = $stmt->error;
        error_log("Failed to insert user: " . $err);
        $stmt->close();
        if (stripos($err, 'username') !== false) {
            header("Location: /TCC/public/signup.php?error=usernametaken");
        } elseif (stripos($err, 'full_name') !== false) {
            header("Location: /TCC/public/signup.php?error=nametaken");
        } else {
            header("Location: /TCC/public/signup.php?error=duplicate");
        }
        exit();
    }
}
?>