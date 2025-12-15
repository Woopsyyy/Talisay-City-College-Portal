<?php
/**
 * Database Setup Script
 * Run this script once to set up the database and tables
 * Access via browser: http://localhost/TCC/BackEnd/setup_database.php
 */

require_once __DIR__ . '/database/db.php';
require_once __DIR__ . '/helpers/school_id.php';

header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Database Setup</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #2f2926;
            margin-top: 0;
        }
        .success {
            color: #28a745;
            background: #d4edda;
            padding: 12px;
            border-radius: 4px;
            margin: 10px 0;
        }
        .error {
            color: #dc3545;
            background: #f8d7da;
            padding: 12px;
            border-radius: 4px;
            margin: 10px 0;
        }
        .info {
            color: #0c5460;
            background: #d1ecf1;
            padding: 12px;
            border-radius: 4px;
            margin: 10px 0;
        }
        pre {
            background: #f8f9fa;
            padding: 10px;
            border-radius: 4px;
            overflow-x: auto;
        }
        .btn {
            display: inline-block;
            padding: 10px 20px;
            background: #848170;
            color: white;
            text-decoration: none;
            border-radius: 4px;
            margin-top: 20px;
        }
        .btn:hover {
            background: #6b6a5a;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Database Setup</h1>
        
        <?php
        try {
            $db = Database::getInstance();
            $conn = $db->getConnection();
            
            echo '<div class="success">✓ Database connection successful!</div>';

            // Ensure school_id column exists on users table
            $schoolColumn = $conn->query("SHOW COLUMNS FROM users LIKE 'school_id'");
            if ($schoolColumn && $schoolColumn->num_rows === 0) {
                if ($conn->query("ALTER TABLE users ADD COLUMN school_id VARCHAR(20) UNIQUE AFTER full_name")) {
                    echo '<div class="info">ℹ Added school_id column to users table.</div>';
                } else {
                    echo '<div class="error">✗ Failed to add school_id column: ' . htmlspecialchars($conn->error) . '</div>';
                }
            }
            
            // Read and execute schema.sql
            $schemaFile = __DIR__ . '/../database/schema.sql';
            
            if (!file_exists($schemaFile)) {
                echo '<div class="error">✗ Schema file not found: ' . htmlspecialchars($schemaFile) . '</div>';
                exit;
            }
            
            $schema = file_get_contents($schemaFile);
            
            // Remove DROP DATABASE and CREATE DATABASE statements as database already exists
            $schema = preg_replace('/DROP DATABASE.*?;/i', '', $schema);
            $schema = preg_replace('/CREATE DATABASE.*?;/i', '', $schema);
            $schema = preg_replace('/USE.*?;/i', '', $schema);
            
            // Split by semicolon and execute each statement
            $statements = array_filter(array_map('trim', explode(';', $schema)));
            
            $successCount = 0;
            $errorCount = 0;
            $errors = [];
            
            foreach ($statements as $statement) {
                if (empty($statement) || strpos($statement, '--') === 0) {
                    continue;
                }
                
                // Skip INSERT statements for now (we'll handle admin user separately)
                if (stripos($statement, 'INSERT INTO') !== false) {
                    continue;
                }
                
                if ($conn->query($statement)) {
                    $successCount++;
                } else {
                    $errorCount++;
                    // Only log non-duplicate errors
                    if (strpos($conn->error, 'already exists') === false && 
                        strpos($conn->error, 'Duplicate') === false) {
                        $errors[] = $conn->error . ' (Statement: ' . substr($statement, 0, 50) . '...)';
                    }
                }
            }
            
            // Create admin user if it doesn't exist
            $checkAdmin = $conn->query("SELECT id FROM users WHERE username = 'admin'");
            if ($checkAdmin->num_rows == 0) {
                $adminPassword = password_hash('admin123', PASSWORD_DEFAULT);
                $adminUsername = 'admin';
                $schoolIdAdmin = 'ADMIN - 0000';
                $stmt = $conn->prepare("INSERT INTO users (username, password, full_name, role, school_id) VALUES (?, ?, 'Administrator', 'admin', ?)");
                $stmt->bind_param('sss', $adminUsername, $adminPassword, $schoolIdAdmin);
                if ($stmt->execute()) {
                    echo '<div class="success">✓ Admin user created (username: admin, password: admin123)</div>';
                } else {
                    echo '<div class="error">✗ Failed to create admin user: ' . $conn->error . '</div>';
                }
                $stmt->close();
            } else {
                echo '<div class="info">ℹ Admin user already exists</div>';
            }

            // Ensure existing users have school IDs
            $missingIds = $conn->query("SELECT id, school_id, created_at FROM users WHERE school_id IS NULL OR school_id = ''");
            if ($missingIds && $missingIds->num_rows > 0) {
                while ($userRow = $missingIds->fetch_assoc()) {
                    try {
                        $newId = ensure_school_id_for_user($conn, $userRow);
                        echo '<div class="info">ℹ Assigned school ID ' . htmlspecialchars($newId) . ' to user #' . htmlspecialchars($userRow['id']) . '.</div>';
                    } catch (Exception $sidEx) {
                        echo '<div class="error">✗ Failed to assign school ID for user #' . htmlspecialchars($userRow['id']) . ': ' . htmlspecialchars($sidEx->getMessage()) . '</div>';
                    }
                }
            }
            
            echo '<div class="success">✓ Setup completed! Executed ' . $successCount . ' statements successfully.</div>';
            
            if ($errorCount > 0 && !empty($errors)) {
                echo '<div class="error">⚠ Some errors occurred (may be due to existing tables):</div>';
                echo '<pre>' . htmlspecialchars(implode("\n", array_slice($errors, 0, 5))) . '</pre>';
            }
            
            // Show current tables
            $tables = $conn->query("SHOW TABLES");
            if ($tables->num_rows > 0) {
                echo '<h2>Current Tables:</h2><ul>';
                while ($row = $tables->fetch_array()) {
                    echo '<li>' . htmlspecialchars($row[0]) . '</li>';
                }
                echo '</ul>';
            }
            
        } catch (Exception $e) {
            echo '<div class="error">✗ Error: ' . htmlspecialchars($e->getMessage()) . '</div>';
        }
        ?>
        
        <a href="/TCC/public/index.html" class="btn">Go to Login Page</a>
    </div>
</body>
</html>

