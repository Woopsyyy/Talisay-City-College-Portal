<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'username' => 'required|string',
            'password' => 'required|string',
        ]);

        $user = User::where('username', $credentials['username'])->first();

        if (!$user || !Hash::check($credentials['password'], $user->password)) {
            return $this->error('Invalid credentials', 401);
        }

        // Using session-based auth for Laravel (Sanctum/Stateful)
        Auth::login($user);

        return response()->json([
            'success' => true,
            'user' => [
                'id' => $user->id,
                'username' => $user->username,
                'full_name' => $user->full_name,
                'role' => $user->role,
                'roles' => $user->roles ?? [$user->role],
                'sub_role' => $user->sub_role,
                'school_id' => $user->school_id,
                'email' => $user->email,
                'image_path' => $user->image_path,
                'gender' => $user->gender,
            ]
        ]);
    }

    public function signup(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'username' => 'required|string|unique:users',
            'password' => 'required|string|min:6',
            'full_name' => 'required|string',
            'email' => 'required|email|unique:users',
            'role' => 'nullable|string|in:student,teacher,admin,nt',
            'school_id' => 'nullable|string|unique:users',
        ]);

        if ($validator->fails()) {
            return $this->error($validator->errors()->first(), 422);
        }

        $data = $validator->validated();
        
        // Generate school_id if empty for students
        if (empty($data['school_id']) && ($data['role'] ?? 'student') === 'student') {
            $data['school_id'] = date('Y') . '-' . str_pad(mt_rand(0, 9999), 4, '0', STR_PAD_LEFT);
        }

        $user = new User([
            'username' => $data['username'],
            'password' => Hash::make($data['password']),
            'full_name' => $data['full_name'],
            'email' => $data['email'],
            'role' => $data['role'] ?? 'student',
            'school_id' => $data['school_id'],
            'image_path' => '/images/sample.jpg',
        ]);

        $user->save();

        if ($request->hasFile('profile_picture')) {
            $this->storeProfileImage($user, $request->file('profile_picture'));
        }

        return $this->success([
            'user_id' => $user->id,
            'username' => $user->username,
            'role' => $user->role,
        ], 'User created successfully', 201);
    }

    public function logout(Request $request)
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return $this->success([], 'Logged out successfully');
    }

    public function check(Request $request)
    {
        if (Auth::check()) {
            $user = Auth::user();
            return response()->json([
                'success' => true,
                'authenticated' => true,
                'user' => [
                    'id' => $user->id,
                    'username' => $user->username,
                    'full_name' => $user->full_name,
                'role' => $user->role,
                'roles' => $user->roles ?? [$user->role],
                'sub_role' => $user->sub_role,
                'school_id' => $user->school_id,
                'email' => $user->email,
                'image_path' => $user->image_path,
                'gender' => $user->gender,
            ]
            ]);
        }

        return response()->json([
            'success' => false,
            'authenticated' => false
        ], 401);
    }

    public function updateProfile(Request $request)
    {
        $user = Auth::user();
        if (!$user) return $this->error('Unauthorized', 401);

        $validator = Validator::make($request->all(), [
            'username' => 'nullable|string|max:50|unique:users,username,' . $user->id,
            'full_name' => 'nullable|string|max:100',
            'email' => 'nullable|email|unique:users,email,' . $user->id,
            'password' => 'nullable|string|min:8',
            'gender' => 'nullable|string|in:male,female,lgbtq+',
            'profile_image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
        ]);

        if ($validator->fails()) {
            return $this->error($validator->errors()->first(), 422);
        }

        if ($request->has('username')) {
            $user->username = $request->username;
        }

        if ($request->has('full_name')) {
            $user->full_name = $request->full_name;
        }

        if ($request->has('email')) {
            $user->email = $request->email;
        }

        if ($request->has('gender')) {
            $user->gender = $request->gender;
        }

        if ($request->filled('password')) {
            $user->password = Hash::make($request->password);
        }

        if ($request->hasFile('profile_image')) {
            $this->storeProfileImage($user, $request->file('profile_image'));
        }

        $user->save();

        return response()->json([
            'success' => true,
            'message' => 'Profile updated successfully',
            'user' => [
                'id' => $user->id,
                'username' => $user->username,
                'full_name' => $user->full_name,
                'role' => $user->role,
                'roles' => $user->roles ?? [$user->role],
                'sub_role' => $user->sub_role,
                'school_id' => $user->school_id,
                'image_path' => $user->image_path
            ]
        ]);
    }

    public function uploadProfilePicture(Request $request)
    {
        $user = Auth::user();
        if (!$user) return $this->error('Unauthorized', 401);

        $validator = Validator::make($request->all(), [
            'profile_picture' => 'required|image|mimes:jpeg,png,jpg,gif|max:2048',
        ]);

        if ($validator->fails()) {
            return $this->error($validator->errors()->first(), 422);
        }

        $this->storeProfileImage($user, $request->file('profile_picture'));

        return $this->success(['image_path' => $user->image_path], 'Profile picture updated');
    }

    public function deleteProfilePicture()
    {
        $user = Auth::user();
        if (!$user) return $this->error('Unauthorized', 401);

        $this->deleteProfileImages($user->id);

        $user->image_path = '/images/sample.jpg';
        $user->save();

        return $this->success(['image_path' => $user->image_path], 'Profile picture removed');
    }

    private function storeProfileImage(User $user, $file): void
    {
        if (!$file) {
            return;
        }

        $extension = strtolower($file->getClientOriginalExtension());
        $filename = $user->id . '.' . $extension;

        if (!file_exists(public_path('uploads/profiles'))) {
            mkdir(public_path('uploads/profiles'), 0755, true);
        }

        if ($user->image_path && $user->image_path !== '/images/sample.jpg' && strpos($user->image_path, '/uploads/profiles/') !== false) {
            $oldPath = public_path(str_replace('/', DIRECTORY_SEPARATOR, $user->image_path));
            if (file_exists($oldPath)) {
                @unlink($oldPath);
            }
        }

        $this->deleteProfileImages($user->id);

        $file->move(public_path('uploads/profiles'), $filename);
        $user->image_path = '/uploads/profiles/' . $filename;
        $user->save();
    }

    private function deleteProfileImages(int $userId): void
    {
        $pattern = public_path('uploads/profiles/' . $userId . '.*');
        foreach (glob($pattern) as $file) {
            if (file_exists($file)) {
                @unlink($file);
            }
        }
    }

    public function googleOAuth()
    {
        return $this->error('Google OAuth is not configured on this server', 501);
    }

    public function resetPassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'username' => 'required|string',
            'email' => 'nullable|email',
            'new_password' => 'nullable|string|min:6',
        ]);

        if ($validator->fails()) {
            return $this->error($validator->errors()->first(), 422);
        }

        $query = User::where('username', $request->username);
        if ($request->filled('email')) {
            $query->where('email', $request->email);
        }
        $user = $query->first();

        if (!$user) {
            return $this->error('User not found or email mismatch', 404);
        }

        $newPassword = $request->filled('new_password')
            ? $request->new_password
            : $this->generateTemporaryPassword();

        $user->password = Hash::make($newPassword);
        $user->save();

        return $this->success(['new_password' => $newPassword], 'Password reset successfully');
    }

    private function generateTemporaryPassword($length = 10)
    {
        $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
        $password = '';
        $max = strlen($chars) - 1;
        for ($i = 0; $i < $length; $i++) {
            $password .= $chars[random_int(0, $max)];
        }
        return $password;
    }
}
