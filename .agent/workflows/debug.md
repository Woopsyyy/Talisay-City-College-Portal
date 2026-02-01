---
description: Debug the current React application status and common issues
---

1. Check if the backend is running
   - Run `php BackEnd/debug_api.php` to verify database connection and essential classes.
   - Run `curl -I http://localhost:8000/api/check.php` to see if the API is responsive.

2. Check if the frontend is running
   - Check if `npm run dev` is active.
   - Run `curl -I http://localhost:5173` (or the port shown in terminal).

3. Verify Database State
   - Run `php BackEnd/api/debug_users.php` to list users (if enabled/safe).
   - Check if `api_rate_limits` table exists using `mysql -u root -e "USE tccportal; SHOW TABLES LIKE 'api_rate_limits';"`

4. Common Fixes
   - If "Database connection failed": Check `BackEnd/config/constants.php` and Mysql service status.
   - If "Class not found": Check `BackEnd/config/header.php` requires.
   - If "Detailed errors": Check `BackEnd/.env` or `constants.php` APP_ENV setting.
