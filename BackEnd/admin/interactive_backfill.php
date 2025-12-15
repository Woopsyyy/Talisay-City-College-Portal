<?php
// Interactive backfill: presents unmapped user_assignments and candidate users
// Run from CLI: php BackEnd/admin/interactive_backfill.php

if (php_sapi_name() !== 'cli') {
    echo "This script must be run from CLI\n";
    exit(1);
}

require_once __DIR__ . '/../database/db.php';
$conn = Database::getInstance()->getConnection();

// fetch all users
$users = [];
$ur = $conn->query("SELECT id, username, full_name FROM users");
if ($ur) {
    while ($u = $ur->fetch_assoc()) {
        $users[] = $u;
    }
} else {
    echo "Failed to fetch users: " . $conn->error . "\n";
    exit(1);
}

// fetch unmapped assignments
$ar = $conn->query("SELECT id, username, year, section FROM user_assignments WHERE user_id IS NULL OR user_id = 0 ORDER BY id LIMIT 1000");
if (!$ar) {
    echo "Failed to fetch user_assignments: " . $conn->error . "\n";
    exit(1);
}

function normalize($s) {
    $s = mb_strtolower(trim($s));
    $s = preg_replace('/[^\p{L}\p{N} ]+/u', ' ', $s);
    $s = preg_replace('/\s+/', ' ', $s);
    return $s;
}

function score_names($a, $b) {
    // token overlap score
    $ta = array_filter(explode(' ', normalize($a)));
    $tb = array_filter(explode(' ', normalize($b)));
    if (empty($ta) || empty($tb)) return 0;
    $common = count(array_intersect($ta, $tb));
    $score = $common / max(1, min(count($ta), count($tb)));
    return $score;
}

$updateStmt = $conn->prepare("UPDATE user_assignments SET user_id = ? WHERE id = ?");
$auditStmt = $conn->prepare("INSERT INTO audit_log (admin_user, action, target_table, target_id, details, created_at) VALUES (?, ?, ?, ?, ?, NOW())");

while ($a = $ar->fetch_assoc()) {
    echo "\nAssignment id={$a['id']} username='{$a['username']}' year={$a['year']} section={$a['section']}\n";
    // compute candidate scores
    $candidates = [];
    foreach ($users as $u) {
        $nameScore = score_names($a['username'], $u['full_name'] ?? '');
        $userScore = score_names($a['username'], $u['username'] ?? '');
        $score = max($nameScore, $userScore);
        if ($score > 0) {
            $candidates[] = ['id'=>$u['id'],'username'=>$u['username'],'full_name'=>$u['full_name'],'score'=>$score];
        }
    }
    usort($candidates, function($x,$y){ return $y['score'] <=> $x['score']; });

    if (empty($candidates)) {
        echo "  No candidates found.\n";
    } else {
        echo "  Candidates:\n";
        $i = 1;
        foreach (array_slice($candidates,0,5) as $c) {
            printf("    [%d] id=%d user=%s full_name=%s score=%.2f\n", $i, $c['id'], $c['username'], $c['full_name'], $c['score']);
            $i++;
        }
    }

    // prompt
    echo "\nChoose action: number=accept candidate, i=enter id manually, s=skip, q=quit\n> ";
    $choice = trim(fgets(STDIN));
    if ($choice === 'q') {
        echo "Quitting.\n";
        break;
    }
    if ($choice === 's' || $choice === '') {
        echo "Skipped.\n";
        continue;
    }
    $chosenId = null;
    if ($choice === 'i') {
        echo "Enter user id to map to (or blank to cancel): ";
        $entered = trim(fgets(STDIN));
        if ($entered === '') { echo "Cancelled.\n"; continue; }
        $chosenId = (int)$entered;
    } else if (ctype_digit($choice)) {
        $idx = (int)$choice;
        if ($idx >= 1 && $idx <= min(5, count($candidates))) {
            $chosenId = $candidates[$idx-1]['id'];
        } else {
            echo "Invalid selection. Skipping.\n";
            continue;
        }
    } else {
        echo "Unknown input. Skipping.\n";
        continue;
    }

    if ($chosenId) {
        // apply update
        $updateStmt->bind_param('ii', $chosenId, $a['id']);
        if ($updateStmt->execute()) {
            echo "  Updated assignment id={$a['id']} -> user_id={$chosenId}\n";
            // attempt to insert audit log (admin_user from CLI = 'cli')
            $adminUser = 'cli';
            $action = 'map_assignment';
            $table = 'user_assignments';
            $details = "mapped to user_id={$chosenId} via interactive_backfill";
            $auditStmt->bind_param('sssss', $adminUser, $action, $table, (string)$a['id'], $details);
            @$auditStmt->execute();
        } else {
            echo "  Failed to update: " . $updateStmt->error . "\n";
        }
    }
}

echo "\nInteractive backfill complete.\n";
