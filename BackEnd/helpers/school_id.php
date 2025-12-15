<?php
/**
 * Utility helpers for generating and ensuring school IDs.
 * School ID format: YYYY - #### (year of creation + unique 4 digit sequence)
 */

if (!function_exists('generate_unique_school_id')) {
    /**
     * Generate a unique school ID string.
     *
     * @param mysqli $conn
     * @param string|null $createdAt Optional date string to derive the year. Defaults to current year.
     * @return string
     * @throws Exception when a unique value cannot be produced.
     */
    function generate_unique_school_id(mysqli $conn, ?string $createdAt = null): string
    {
        $year = $createdAt ? date('Y', strtotime($createdAt)) : date('Y');

        $attempts = 0;
        $maxAttempts = 40;
        do {
            $random = random_int(1000, 9999);
            $candidate = sprintf('%s - %04d', $year, $random);

            $stmt = $conn->prepare('SELECT id FROM users WHERE school_id = ? LIMIT 1');
            if ($stmt) {
                $stmt->bind_param('s', $candidate);
                $stmt->execute();
                $res = $stmt->get_result();
                $exists = $res && $res->num_rows > 0;
                $stmt->close();
            } else {
                $exists = false;
            }

            if (!$exists) {
                return $candidate;
            }
            $attempts++;
        } while ($attempts < $maxAttempts);

        throw new Exception('Unable to generate unique school ID after multiple attempts.');
    }
}

if (!function_exists('ensure_school_id_for_user')) {
    /**
     * Ensure that a given user has a school ID. Generates and persists if missing.
     *
     * @param mysqli $conn
     * @param array $userRow Row from users table (must include id, school_id, created_at).
     * @return string The ensured school ID.
     * @throws Exception
     */
    function ensure_school_id_for_user(mysqli $conn, array $userRow): string
    {
        if (!empty($userRow['school_id'])) {
            return $userRow['school_id'];
        }

        $schoolId = generate_unique_school_id($conn, $userRow['created_at'] ?? null);
        $stmt = $conn->prepare('UPDATE users SET school_id = ? WHERE id = ? LIMIT 1');
        if ($stmt) {
            $stmt->bind_param('si', $schoolId, $userRow['id']);
            $stmt->execute();
            $stmt->close();
        }
        return $schoolId;
    }
}

