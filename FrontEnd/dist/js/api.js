// Centralized API calls for the application

const API_BASE = "/api";

// Generic API call function
async function apiCall(endpoint, options = {}) {
  const url = API_BASE + endpoint;
  const isFormData = options.body instanceof FormData;

  const defaultOptions = {
    credentials: "include",
    headers: isFormData
      ? {}
      : {
          "Content-Type": "application/json",
        },
  };

  const config = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...(options.headers || {}),
    },
  };

  // Serialize body to JSON if it's an object (but not FormData)
  if (
    config.body &&
    typeof config.body === "object" &&
    !(config.body instanceof FormData)
  ) {
    config.body = JSON.stringify(config.body);
  }

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      const error = new Error(data.error || "API request failed");
      error.status = response.status;
      throw error;
    }

    return data;
  } catch (error) {
    console.error("API call error:", error);
    throw error;
  }
}

// Admin API
const AdminAPI = {
  // User management
  getUsers: async () => {
    return apiCall("/admin/users");
  },

  getUserAssignments: async () => {
    return apiCall("/admin/user-assignments");
  },

  createUserAssignment: async (assignment) => {
    return apiCall("/admin/user-assignments", {
      method: "POST",
      body: assignment,
    });
  },

  updateUserAssignment: async (id, assignment) => {
    return apiCall(`/admin/user-assignments/${id}`, {
      method: "PUT",
      body: assignment,
    });
  },

  deleteUserAssignment: async (id) => {
    return apiCall(`/admin/user-assignments/${id}`, {
      method: "DELETE",
    });
  },

  updateUserRole: async (userId, role) => {
    return apiCall(`/admin/users/${userId}/role`, {
      method: "PUT",
      body: { role },
    });
  },

  // Sections
  getSections: async () => {
    return apiCall("/admin/sections");
  },

  createSection: async (section) => {
    return apiCall("/admin/sections", {
      method: "POST",
      body: section,
    });
  },

  updateSection: async (id, section) => {
    return apiCall(`/admin/sections/${id}`, {
      method: "PUT",
      body: section,
    });
  },

  deleteSection: async (id) => {
    return apiCall(`/admin/sections/${id}`, {
      method: "DELETE",
    });
  },

  // Subjects
  getSubjects: async () => {
    return apiCall("/admin/subjects");
  },

  createSubject: async (subject) => {
    return apiCall("/admin/subjects", {
      method: "POST",
      body: subject,
    });
  },

  updateSubject: async (id, subject) => {
    return apiCall(`/admin/subjects/${id}`, {
      method: "PUT",
      body: subject,
    });
  },

  deleteSubject: async (id) => {
    return apiCall(`/admin/subjects/${id}`, {
      method: "DELETE",
    });
  },

  // Teacher assignments
  getTeacherAssignments: async () => {
    return apiCall("/admin/teacher-assignments");
  },

  createTeacherAssignment: async (assignment) => {
    return apiCall("/admin/teacher-assignments", {
      method: "POST",
      body: assignment,
    });
  },

  deleteTeacherAssignment: async (id) => {
    return apiCall(`/admin/teacher-assignments/${id}`, {
      method: "DELETE",
    });
  },

  // Schedules
  getSchedules: async () => {
    return apiCall("/admin/schedules");
  },

  createSchedule: async (schedule) => {
    return apiCall("/admin/schedules", {
      method: "POST",
      body: schedule,
    });
  },

  deleteSchedule: async (id) => {
    return apiCall(`/admin/schedules/${id}`, {
      method: "DELETE",
    });
  },

  // Buildings
  getBuildings: async () => {
    return apiCall("/admin/buildings");
  },

  createBuilding: async (building) => {
    return apiCall("/admin/buildings", {
      method: "POST",
      body: building,
    });
  },

  deleteBuilding: async (name) => {
    return apiCall(`/admin/buildings/${encodeURIComponent(name)}`, {
      method: "DELETE",
    });
  },

  // Section assignments
  getSectionAssignments: async () => {
    return apiCall("/admin/section-assignments");
  },

  createSectionAssignment: async (assignment) => {
    return apiCall("/admin/section-assignments", {
      method: "POST",
      body: assignment,
    });
  },

  updateSectionAssignment: async (id, assignment) => {
    return apiCall(`/admin/section-assignments/${id}`, {
      method: "PUT",
      body: assignment,
    });
  },

  deleteSectionAssignment: async (id) => {
    return apiCall(`/admin/section-assignments/${id}`, {
      method: "DELETE",
    });
  },

  // Announcements
  getAnnouncements: async () => {
    return apiCall("/admin/announcements");
  },

  createAnnouncement: async (announcement) => {
    return apiCall("/admin/announcements", {
      method: "POST",
      body: announcement,
    });
  },

  updateAnnouncement: async (id, announcement) => {
    return apiCall(`/admin/announcements/${id}`, {
      method: "PUT",
      body: announcement,
    });
  },

  deleteAnnouncement: async (id) => {
    return apiCall(`/admin/announcements/${id}`, {
      method: "DELETE",
    });
  },

  // Database cleanup
  cleanupPictures: async () => {
    return apiCall("/admin/cleanup-pictures", {
      method: "POST",
    });
  },

  cleanupCodebase: async () => {
    return apiCall("/admin/cleanup-codebase", {
      method: "POST",
    });
  },

  // Projects
  getProjects: async () => {
    return apiCall("/admin/projects");
  },

  createProject: async (project) => {
    return apiCall("/admin/projects", {
      method: "POST",
      body: project,
    });
  },

  updateProject: async (id, project) => {
    return apiCall(`/admin/projects/${id}`, {
      method: "PUT",
      body: project,
    });
  },

  deleteProject: async (id) => {
    return apiCall(`/admin/projects/${id}`, {
      method: "DELETE",
    });
  },

  // Study load
  getStudyLoad: async () => {
    return apiCall("/admin/study-load");
  },

  createStudyLoad: async (studyLoad) => {
    return apiCall("/admin/study-load", {
      method: "POST",
      body: studyLoad,
    });
  },

  updateStudyLoad: async (id, studyLoad) => {
    return apiCall(`/admin/study-load/${id}`, {
      method: "PUT",
      body: studyLoad,
    });
  },

  deleteStudyLoad: async (id) => {
    return apiCall(`/admin/study-load/${id}`, {
      method: "DELETE",
    });
  },

  // Grades
  getGrades: async () => {
    return apiCall("/admin/grades");
  },

  createGrade: async (grade) => {
    return apiCall("/admin/grades", {
      method: "POST",
      body: grade,
    });
  },

  updateGrade: async (id, grade) => {
    return apiCall(`/admin/grades/${id}`, {
      method: "PUT",
      body: grade,
    });
  },

  deleteGrade: async (id) => {
    return apiCall(`/admin/grades/${id}`, {
      method: "DELETE",
    });
  },

  // User suggestions (for search/autocomplete)
  getUserSuggestions: async (query, role = null) => {
    const params = new URLSearchParams({ q: query });
    if (role) params.append("role", role);
    return apiCall(`/admin/user-suggestions?${params.toString()}`);
  },
};

// Utility: Get avatar URL. For storage-stored avatars (filenames or storage paths),
// request a signed URL from the backend. Returns a URL string.
async function getAvatarUrl(userId, imagePath) {
  try {
    if (!imagePath) return "images/sample.jpg";

    // App-local public files
    if (imagePath.startsWith("/TCC/public/"))
      return imagePath.replace("/TCC/public/", "");
    if (imagePath.startsWith("images/")) return imagePath;

    // Already a full URL
    if (imagePath.startsWith("http://") || imagePath.startsWith("https://"))
      return imagePath;

    // Anything else (likely a storage filename like 'userId.webp' or 'avatars/userId.webp')
    // Use backend signed-url endpoint which looks up avatar_path by userId
    const data = await apiCall(
      `/avatar/signed-url/${encodeURIComponent(userId)}`
    );
    return data.url || "images/sample.jpg";
  } catch (err) {
    console.error("getAvatarUrl error", err);
    return "images/sample.jpg";
  }
}

// expose helper globally
window.getAvatarUrl = getAvatarUrl;

// Student API
const StudentAPI = {
  getAssignment: async () => {
    return apiCall("/student/assignment");
  },

  getGrades: async () => {
    return apiCall("/student/grades");
  },

  getStudyLoad: async () => {
    return apiCall("/student/study-load");
  },

  getAnnouncements: async () => {
    return apiCall("/student/announcements"); // Students can view announcements
  },

  getProjects: async () => {
    return apiCall("/student/projects");
  },

  getEvaluationSettings: async () => {
    return apiCall("/student/evaluation-settings");
  },

  getEvaluationTeachers: async () => {
    return apiCall("/student/evaluation/teachers");
  },

  submitEvaluation: async (data) => {
    return apiCall("/student/evaluation/submit", {
      method: "POST",
      body: data,
    });
  },
};

// Teacher API
const TeacherAPI = {
  getSchedule: async () => {
    return apiCall("/teacher/schedule");
  },

  getAnnouncements: async () => {
    return apiCall("/teacher/announcements");
  },

  getProjects: async () => {
    return apiCall("/teacher/projects");
  },

  getGrades: async () => {
    return apiCall("/teacher/grades");
  },

  getTeacherSubjects: async () => {
    return apiCall("/teacher/subjects");
  },

  getSections: async () => {
    return apiCall("/teacher/sections");
  },

  createGrade: async (grade) => {
    return apiCall("/teacher/grades", {
      method: "POST",
      body: grade,
    });
  },

  updateGrade: async (id, grade) => {
    return apiCall(`/teacher/grades/${id}`, {
      method: "PUT",
      body: grade,
    });
  },

  deleteGrade: async (id) => {
    return apiCall(`/teacher/grades/${id}`, {
      method: "DELETE",
    });
  },

  getStudentsBySection: async (section) => {
    return apiCall(`/teacher/students?section=${encodeURIComponent(section)}`);
  },

  getEvaluationStatistics: async () => {
    return apiCall("/teacher/evaluation-statistics");
  },
};

// Auth API
const AuthAPI = {
  updateProfile: async (profileData) => {
    return apiCall("/auth/update-profile", {
      method: "POST",
      body: profileData,
    });
  },

  login: async (username, password) => {
    return apiCall("/auth/login", {
      method: "POST",
      body: { username, password },
    });
  },

  signup: async (userData) => {
    // userData can be either an object or FormData
    return apiCall("/auth/signup", {
      method: "POST",
      body: userData,
    });
  },

  logout: async () => {
    return apiCall("/auth/logout", {
      method: "POST",
    });
  },

  checkSession: async () => {
    return apiCall("/auth/check");
  },

  sendResetCode: async (username) => {
    return apiCall("/auth/send-reset-code", {
      method: "POST",
      body: { username },
    });
  },

  validateResetCode: async (username, code) => {
    return apiCall("/auth/validate-reset-code", {
      method: "POST",
      body: { username, code },
    });
  },

  resetPasswordWithCode: async (
    username,
    code,
    newPassword,
    confirmNewPassword
  ) => {
    return apiCall("/auth/reset-password", {
      method: "POST",
      body: {
        username,
        code,
        new_password: newPassword,
        confirm_new_password: confirmNewPassword,
      },
    });
  },

  checkAvailability: async (type, value) => {
    const params = new URLSearchParams();
    if (type === "username") {
      params.append("username", value);
    } else if (type === "full_name") {
      params.append("full_name", value);
    } else {
      params.append("username", value);
    }
    return apiCall(`/auth/check-availability?${params.toString()}`);
  },
};

// Export for use in other files
if (typeof module !== "undefined" && module.exports) {
  module.exports = { AdminAPI, StudentAPI, TeacherAPI, AuthAPI, apiCall };
}
