<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureRole
{
    /**
     * Ensure the authenticated user has one of the allowed roles.
     */
    public function handle(Request $request, Closure $next, ...$roles): Response
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $allowed = array_map('strtolower', $roles);
        $userRole = strtolower((string)($user->role ?? ''));
        $userRoles = array_map('strtolower', is_array($user->roles) ? $user->roles : []);

        $hasRole = in_array($userRole, $allowed, true);
        if (!$hasRole && !empty($userRoles)) {
            $hasRole = count(array_intersect($allowed, $userRoles)) > 0;
        }

        if (!$hasRole) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        return $next($request);
    }
}
