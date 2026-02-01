import axios from 'axios';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});


api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API call error:', error);
    const customError = new Error(error.response?.data?.error || 'API request failed');
    customError.status = error.response?.status;
    throw customError;
  }
);


const formHeader = {
  headers: { 'Content-Type': undefined },
};


export const getAvatarUrl = async (_userId, imagePath) => {
  try {
    if (!imagePath) return "/images/sample.jpg";

    
    if (imagePath.startsWith("/TCC/public/")) {
      return imagePath.replace("/TCC/public/", "/");
    }

    
    if (imagePath.startsWith("images/") || imagePath.startsWith("/images/")) {
      return imagePath.startsWith("/") ? imagePath : "/" + imagePath;
    }

    
    if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
      return imagePath;
    }

    
    if (!imagePath.startsWith("/")) {
      return "/" + imagePath;
    }

    return imagePath;
  } catch (err) {
    console.error("getAvatarUrl error", err);
    return "/images/sample.jpg";
  }
};

export const AdminAPI = {
  getUsers: () => api.get('/admin/users'),
  getUserAssignments: () => api.get('/admin/user-assignments'),
  createUserAssignment: (assignment) => api.post('/admin/user-assignments', assignment),
  updateUserAssignment: (id, assignment) => api.put(`/admin/user-assignments/${id}`, assignment),
  deleteUserAssignment: (id) => api.delete(`/admin/user-assignments/${id}`),
  updateUserRole: (userId, role) => api.put(`/admin/users/${userId}/role`, { role }),
  deleteUser: (userId) => api.delete(`/admin/users/${userId}`),

  getSections: () => api.get('/admin/sections'),
  createSection: (section) => api.post('/admin/sections', section),
  updateSection: (id, section) => api.put(`/admin/sections/${id}`, section),
  deleteSection: (id) => api.delete(`/admin/sections/${id}`),

  getSubjects: () => api.get('/admin/subjects'),
  createSubject: (subject) => api.post('/admin/subjects', subject),
  updateSubject: (id, subject) => api.put(`/admin/subjects/${id}`, subject),
  deleteSubject: (id) => api.delete(`/admin/subjects/${id}`),

  getTeacherAssignments: () => api.get('/admin/teacher-assignments'),
  createTeacherAssignment: (assignment) => api.post('/admin/teacher-assignments', assignment),
  deleteTeacherAssignment: (id) => api.delete(`/admin/teacher-assignments/${id}`),

  getSchedules: () => api.get('/admin/schedules'),
  createSchedule: (schedule) => api.post('/admin/schedules', schedule),
  deleteSchedule: (id) => api.delete(`/admin/schedules/${id}`),

  getBuildings: () => api.get('/admin/buildings'),
  createBuilding: (building) => api.post('/admin/buildings', building),
  deleteBuilding: (name) => api.delete(`/admin/buildings/${encodeURIComponent(name)}`),

  getSectionAssignments: () => api.get('/admin/section-assignments'),
  createSectionAssignment: (assignment) => api.post('/admin/section-assignments', assignment),
  updateSectionAssignment: (id, assignment) => api.put(`/admin/section-assignments/${id}`, assignment),
  deleteSectionAssignment: (id) => api.delete(`/admin/section-assignments/${id}`),

  getAnnouncements: () => api.get('/admin/announcements'),
  createAnnouncement: (announcement) => api.post('/admin/announcements', announcement),
  updateAnnouncement: (id, announcement) => api.put(`/admin/announcements/${id}`, announcement),
  deleteAnnouncement: (id) => api.delete(`/admin/announcements/${id}`),

  cleanupPictures: () => api.post('/admin/cleanup-pictures'),
  cleanupCodebase: () => api.post('/admin/cleanup-codebase'),

  getProjects: () => api.get('/admin/projects'),
  createProject: (project) => api.post('/admin/projects', project),
  updateProject: (id, project) => api.put(`/admin/projects/${id}`, project),
  deleteProject: (id) => api.delete(`/admin/projects/${id}`),

  getStudyLoad: () => api.get('/admin/study-load'),
  getSectionsWithLoad: () => api.get('/admin/sections-with-load'),
  getSectionLoadDetails: (id) => api.get(`/admin/section-load-details?id=${id}`),
  clearSectionLoad: (sectionId) => api.post('/admin/clear-section-load', { section_id: sectionId }),
  createStudyLoad: (studyLoad) => api.post('/admin/study-load', studyLoad),
  updateStudyLoad: (id, studyLoad) => api.put(`/admin/study-load/${id}`, studyLoad),
  deleteStudyLoad: (id) => api.delete(`/admin/study-load/${id}`),

  getGrades: () => api.get('/admin/grades'),
  createGrade: (grade) => api.post('/admin/grades', grade),
  updateGrade: (id, grade) => api.put(`/admin/grades/${id}`, grade),
  deleteGrade: (id) => api.delete(`/admin/grades/${id}`),

  getUserSuggestions: (query, role = null) => {
    const params = new URLSearchParams({ q: query });
    if (role) params.append('role', role);
    return api.get(`/admin/user-suggestions?${params.toString()}`);
  },

  getEvaluationSettings: () => api.get('/admin/evaluation-settings'),
  updateEvaluationSettings: (settings) => api.post('/admin/evaluation-settings', settings),
  getLowestRatedTeachers: () => api.get('/admin/evaluation/lowest-rated'),
  
  createBackup: () => api.post('/admin/backup'),
  getBackups: () => api.get('/admin/backup'),
};


export const StudentAPI = {
  getAssignment: () => api.get('/student/assignment'),
  getGrades: () => api.get('/student/grades'),
  getStudyLoad: () => api.get('/student/study-load'),
  getAnnouncements: () => api.get('/student/announcements'),
  getProjects: () => api.get('/student/projects'),
  getCampusProjects: () => api.get('/student/campus-projects'),
  getEvaluationSettings: () => api.get('/student/evaluation-settings'),
  getEvaluationTeachers: () => api.get('/student/evaluation/teachers'),
  submitEvaluation: (data) => api.post('/student/evaluation/submit', data),
};


export const TeacherAPI = {
  getSchedule: () => api.get('/teacher/schedule'),
  getAnnouncements: () => api.get('/teacher/announcements'),
  getProjects: () => api.get('/teacher/projects'),
  getGrades: (params) => api.get('/teacher/grades', { params }),
  getTeacherSubjects: () => api.get('/teacher/subjects'),
  getSections: () => api.get('/teacher/sections'),
  createGrade: (grade) => api.post('/teacher/grades', grade),
  updateGrade: (id, grade) => api.put(`/teacher/grades/${id}`, grade),
  deleteGrade: (id) => api.delete(`/teacher/grades/${id}`),
  getStudentsBySection: (section) => api.get(`/teacher/students?section=${encodeURIComponent(section)}`),
  getEvaluationStatistics: () => api.get('/teacher/evaluation-statistics'),
};


export const AuthAPI = {
  
  updateProfile: async (profileData) => {
    try {
      const data =
        profileData instanceof FormData
          ? await api.post('/auth/update-profile', profileData, formHeader)
          : await api.post('/auth/update-profile', profileData, formHeader);
      return { success: true, ...data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  
  login: async (username, password) => {
    const data = await api.post('/auth/login', { username, password });
    return data;
  },

  
  signup: async (userData) => {
    
    
    if (userData instanceof FormData) {
        
        
        
        
        
        const data = await api.post('/auth/signup', userData, formHeader);
        return data;
    }

    
    const payload = {
            username: userData.username,
            password: userData.password,
            full_name: userData.full_name || userData.name,
            email: userData.email,
            role: userData.role || 'student',
            school_id: userData.school_id,
    };
    const data = await api.post('/auth/signup', payload); 
    return data;
  },

  
  logout: async () => {
    const data = await api.post('/auth/logout');
    return data;
  },

  
  check: async () => {
    const data = await api.get('/auth/check');
    return data;
  },

  
  resetPassword: async (username) => {
    const data = await api.post('/auth/reset-password', { username });
    return data;
  },

  checkSession: async () => {
    return AuthAPI.check();
  },

  
  checkAvailability: async () => {
    return { available: true };
  },

  
  uploadProfilePicture: async (file) => {
    const formData = new FormData();
    formData.append('profile_picture', file);
    const data = await api.post('/upload-profile-picture', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return data;
  },

  
  deleteProfilePicture: async () => {
    const data = await api.delete('/upload-profile-picture');
    return data;
  },
};

export default api;
