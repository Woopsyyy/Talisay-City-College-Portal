// Admin Dashboard JavaScript
// All patches from conversation applied

// Utility function to escape HTML
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Save scroll position before form submission
function saveScrollPosition() {
  sessionStorage.setItem(
    "scrollPosition",
    window.pageYOffset || document.documentElement.scrollTop
  );
}

// Restore scroll position after page load
function restoreScrollPosition() {
  const savedPosition = sessionStorage.getItem("scrollPosition");
  if (savedPosition !== null) {
    // Use multiple attempts to ensure DOM is ready and layout is complete
    const restore = () => {
      window.scrollTo(0, parseInt(savedPosition, 10));
      sessionStorage.removeItem("scrollPosition");
    };

    // Try immediately
    requestAnimationFrame(() => {
      restore();
      // Also try after a short delay to handle dynamic content
      setTimeout(restore, 100);
    });
  }
}

// Toast Notification System
function showToast(message, type = "success") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = "toast-notification" + (type === "error" ? " error" : "");

  const icon = type === "error" ? "bi-exclamation-triangle" : "bi-check-circle";

  toast.innerHTML = `
        <i class="bi ${icon}"></i>
        <div class="toast-content">${message}</div>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="bi bi-x"></i>
        </button>
    `;

  container.appendChild(toast);

  // Auto remove after 3 seconds
  setTimeout(() => {
    toast.style.animation = "fadeOut 0.3s ease-in forwards";
    setTimeout(() => {
      if (toast.parentElement) {
        toast.remove();
      }
    }, 300);
  }, 3000);
}

// Function to update section assignment form inputs
function updateSectionForm(form, key) {
  // Find form elements by form attribute
  const buildingSelect = document.querySelector(
    'select[form="assignForm_' + key + '"]'
  );
  const floorInput = document.querySelector(
    'input[name="floor"][form="assignForm_' + key + '"]'
  );
  const roomInput = document.querySelector(
    'input[name="room"][form="assignForm_' + key + '"]'
  );

  if (!buildingSelect || !floorInput || !roomInput) {
    alert(
      "Error: Could not find form fields. Please refresh the page and try again."
    );
    console.error("Missing form elements:", {
      buildingSelect,
      floorInput,
      roomInput,
      key,
    });
    return false;
  }

  if (!buildingSelect.value || !floorInput.value || !roomInput.value.trim()) {
    alert("Please fill in all fields (Building, Floor, and Room)");
    return false;
  }

  // Values are already in the form inputs, so form will submit them directly
  return true;
}

// Helper function to create records container structure
function createRecordsContainer(title, subtitle, icon, content) {
  return `
        <div class="records-container">
            <div class="records-header">
                <h2 class="records-title">
                    ${icon ? `<i class="${icon}"></i> ` : ""}${escapeHtml(
    title
  )}
                </h2>
                ${
                  subtitle
                    ? `<p class="records-subtitle">${escapeHtml(subtitle)}</p>`
                    : ""
                }
            </div>
            <div class="records-main">
                ${content}
            </div>
        </div>
    `;
}

// Format project date
function formatProjectDate(dateString) {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  } catch (e) {
    return dateString;
  }
}

// Format announcement date
function formatAnnouncementDate(dateString) {
  if (!dateString) return "Date not specified";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString;
    }
    const options = {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    return date.toLocaleDateString("en-US", options);
  } catch (e) {
    return dateString;
  }
}

// View configurations
const viewConfigs = {
  teacher_management: { title: "Teacher Management", icon: "bi-person-badge" },
  manage_students: { title: "Manage Students", icon: "bi-people" },
  sections: { title: "Sections", icon: "bi-collection" },
  subjects: { title: "Subjects", icon: "bi-book" },
  announcements: { title: "Announcements", icon: "bi-megaphone" },
  projects: { title: "Projects", icon: "bi-folder" },
  study_load: { title: "Study Load", icon: "bi-journal-text" },
  grade_system: { title: "Grade System", icon: "bi-clipboard-data" },
};

// Current section
let currentSection = "teacher_management";

// Hero spotlight configurations
const heroSpotlights = {
  announcements: {
    title: "Announcements",
    copy: "Compose fresh updates, pin urgent bulletins, and keep the campus informed with streamlined editing tools.",
  },
  buildings: {
    title: "Facilities & Rooms",
    copy: "Manage building configurations, assign sections to rooms, and keep facility data organized and accessible.",
  },
  projects: {
    title: "Projects",
    copy: "Track campus initiatives, monitor budgets, and maintain transparency with detailed project management.",
  },
  manage_students: {
    title: "Student Management",
    copy: "Assign students to sections, manage financial status, track sanctions, and maintain comprehensive student records.",
  },
  manage_user: {
    title: "User Roles",
    copy: "Manage user permissions, assign roles, and control access across the campus management system.",
  },
  teacher_management: {
    title: "Teacher Management",
    copy: "Assign instructors to subjects, manage schedules, and coordinate faculty resources efficiently.",
  },
  evaluation: {
    title: "Evaluation",
    copy: "Review teacher performance, manage evaluation forms, and track feedback from students and administrators.",
  },
  sections: {
    title: "Sections",
    copy: "Create and organize class sections by year level, manage enrollment, and maintain section assignments.",
  },
  subjects: {
    title: "Subject Catalog",
    copy: "Maintain the course catalog, define subject codes, units, and prerequisites for each program.",
  },
  study_load: {
    title: "Customize Study Load",
    copy: "Assign subjects per year and section, manage units, and keep faculty loads aligned with the curriculum.",
  },
  grade_system: {
    title: "Grade System",
    copy: "Manage student progress, semester summaries, and detailed records with the enhanced modal experience.",
  },
  settings: {
    title: "Settings",
    copy: "Configure database backups, automate schedules, and keep administrative safeguards up to date.",
  },
};

// Format ordinal numbers
function formatOrdinal(number) {
  number = parseInt(number);
  const ends = ["th", "st", "nd", "rd", "th", "th", "th", "th", "th", "th"];
  if (number % 100 >= 11 && number % 100 <= 13) {
    return number + "th";
  }
  return number + (ends[number % 10] || "th");
}

// Update hero spotlight based on section
function updateHeroSpotlight(section) {
  const spotlight = heroSpotlights[section] || heroSpotlights["grade_system"];
  const titleEl = document.getElementById("adminSpotlightTitle");
  const copyEl = document.getElementById("adminSpotlightCopy");
  if (titleEl) titleEl.textContent = spotlight.title;
  if (copyEl) copyEl.textContent = spotlight.copy;
}

// Course/Major configuration - global
const courseMajorConfig = {
  IT: ["Computer Technology", "Electronics"],
  BSED: ["English", "Physical Education", "Math", "Filipino", "Social Science"],
  HM: ["General"],
  BEED: ["General"],
  TOURISM: ["General"],
};

// Refresh major options based on selected course/department - global function
function refreshMajorOptions(courseSelect, majorSelect) {
  if (!courseSelect || !majorSelect) return;
  const course = courseSelect.value;
  const majors = courseMajorConfig[course] || [];
  const currentValue = majorSelect.value;

  // Check if options have data-course attributes (for subjects form)
  const allOptions = majorSelect.querySelectorAll("option[data-course]");
  if (allOptions.length > 0) {
    // Filter by data-course attribute
    allOptions.forEach((opt) => {
      opt.style.display =
        opt.getAttribute("data-course") === course ? "" : "none";
    });

    // If current value doesn't match the course, clear it
    if (course && currentValue) {
      const currentOption = majorSelect.querySelector(
        `option[value="${currentValue}"]`
      );
      if (
        currentOption &&
        currentOption.getAttribute("data-course") !== course
      ) {
        majorSelect.value = "";
      }
    } else if (!course) {
      majorSelect.value = "";
    }
  } else {
    // For manage students form - rebuild options dynamically
    majorSelect.innerHTML = '<option value="">(none)</option>';
    if (course && majors.length > 0) {
      majors.forEach((major) => {
        const option = document.createElement("option");
        option.value = major;
        option.textContent = major;
        majorSelect.appendChild(option);
      });
    }
  }

  // Show/hide the placeholder option
  const placeholderOption = majorSelect.querySelector('option[value=""]');
  if (placeholderOption) {
    placeholderOption.textContent = course ? "Select major..." : "(none)";
  }

  majorSelect.disabled = !course || majors.length === 0;
}

// Initialize dashboard
document.addEventListener("DOMContentLoaded", async () => {
  // Check authentication
  try {
    const session = await AuthAPI.checkSession();
    if (!session.authenticated || session.user.role !== "admin") {
      window.location.href = "index.html";
      return;
    }

    // Update sidebar with user info
    if (session.user.image_path) {
      const imgEl = document.getElementById("adminUserImage");
      if (imgEl) {
        // Normalize image path - remove /TCC/public prefix if present
        let imagePath = session.user.image_path;
        if (imagePath.startsWith("/TCC/public/")) {
          imagePath = imagePath.replace("/TCC/public/", "");
          imgEl.src = imagePath || "images/sample.jpg";
        } else if (
          imagePath.startsWith("/TCC/database/pictures/") ||
          (!imagePath.startsWith("images/") && !imagePath.startsWith("http"))
        ) {
          // Fetch signed URL from backend for private Supabase storage or filename
          imgEl.src = "images/sample.jpg";
          getAvatarUrl(session.user.id, imagePath)
            .then((url) => {
              imgEl.src = url;
            })
            .catch(() => {});
        } else {
          imgEl.src = imagePath || "images/sample.jpg";
        }
      }
    }
    if (session.user.school_id) {
      const schoolIdEl = document.getElementById("adminSchoolId");
      if (schoolIdEl) {
        schoolIdEl.textContent = session.user.school_id;
        schoolIdEl.style.display = "inline";
      }
    }
    const roleEl = document.getElementById("adminRole");
    if (roleEl) {
      roleEl.textContent = session.user.role
        ? session.user.role.charAt(0).toUpperCase() + session.user.role.slice(1)
        : "Admin";
      roleEl.style.display = "inline";
    }
    const userNameEl = document.getElementById("adminUserName");
    if (userNameEl)
      userNameEl.textContent = session.user.full_name || session.user.username;
  } catch (error) {
    window.location.href = "index.html";
    return;
  }

  // Setup clock
  function updateClock() {
    function ordinal(n) {
      const s = ["th", "st", "nd", "rd", "th", "th", "th", "th", "th", "th"];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    }
    const timeEl = document.getElementById("admClockTime");
    const subEl = document.getElementById("admClockSub");
    const dayEl = document.getElementById("admClockDay");
    if (!timeEl || !subEl || !dayEl) return;
    const d = new Date();
    const hours24 = d.getHours();
    const minutes = d.getMinutes();
    const seconds = d.getSeconds();
    const ampm = hours24 >= 12 ? "PM" : "AM";
    let displayHour = hours24 % 12;
    if (displayHour === 0) displayHour = 12;
    const hh = displayHour < 10 ? "0" + displayHour : String(displayHour);
    const mm = minutes < 10 ? "0" + minutes : String(minutes);
    const ss = seconds < 10 ? "0" + seconds : String(seconds);
    timeEl.textContent = hh + ":" + mm + ":" + ss;
    subEl.textContent = ampm;
    const weekday = d.toLocaleDateString(undefined, { weekday: "long" });
    const month = d.toLocaleDateString(undefined, { month: "long" });
    const day = d.getDate();
    dayEl.textContent = weekday + ", " + month + " " + ordinal(day);
  }
  updateClock();
  setInterval(updateClock, 1000);

  // Setup logout
  const logoutBtn = document.getElementById("adminLogoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      try {
        await AuthAPI.logout();
        window.location.href = "index.html";
      } catch (error) {
        console.error("Logout error:", error);
        window.location.href = "index.html";
      }
    });
  }

  // Initialize tooltips
  const tooltipTriggerList = [].slice.call(
    document.querySelectorAll('[data-bs-toggle="tooltip"]')
  );
  tooltipTriggerList.forEach(function (el) {
    if (window.bootstrap && typeof window.bootstrap.Tooltip === "function") {
      new window.bootstrap.Tooltip(el);
    }
  });

  // Restore scroll position if it was saved (form was submitted)
  restoreScrollPosition();

  // Clean up any lingering modal backdrops on page load
  const lingeringBackdrops = document.querySelectorAll(
    ".modal-backdrop:not(.show)"
  );
  lingeringBackdrops.forEach(function (backdrop) {
    backdrop.remove();
  });

  // Ensure grade system is clickable
  const gradeSystemWrapper = document.querySelector(".grade-system-wrapper");
  if (gradeSystemWrapper) {
    gradeSystemWrapper.style.pointerEvents = "auto";
    gradeSystemWrapper.style.zIndex = "1";
  }

  // Initialize course/major dropdowns
  document
    .querySelectorAll("[data-course-select]")
    .forEach(function (courseSelect) {
      const parent = courseSelect.closest("form") || document;
      const majorSelect = parent.querySelector("[data-major-select]");
      if (!majorSelect) return;
      refreshMajorOptions(courseSelect, majorSelect);
      courseSelect.addEventListener("change", function () {
        refreshMajorOptions(courseSelect, majorSelect);
      });
    });

  // Setup navigation
  setupNavigation();

  // Load initial section from URL or default
  const urlParams = new URLSearchParams(window.location.search);
  const section = urlParams.get("section") || "announcements";
  updateHeroSpotlight(section);
  await loadSection(section);
});

// Setup navigation
function setupNavigation() {
  // Setup sidebar navigation
  document.querySelectorAll(".sidebar-nav .nav-link").forEach((item) => {
    item.addEventListener("click", async (e) => {
      e.preventDefault();
      const section = item.getAttribute("data-section");
      if (section) {
        // Update URL without reload
        window.history.pushState({ section }, "", `?section=${section}`);
        await loadSection(section);
      }
    });
  });

  // Setup hero action buttons
  document.querySelectorAll(".hero-action").forEach((item) => {
    item.addEventListener("click", async (e) => {
      e.preventDefault();
      const section = item.getAttribute("data-section");
      if (section) {
        // Update URL without reload
        window.history.pushState({ section }, "", `?section=${section}`);
        await loadSection(section);
      }
    });
  });

  // Handle browser back/forward
  window.addEventListener("popstate", (e) => {
    const section =
      e.state?.section ||
      new URLSearchParams(window.location.search).get("section") ||
      "teacher_management";
    loadSection(section);
  });
}

// Load section
async function loadSection(section) {
  currentSection = section;
  const contentArea = document.getElementById("adminContentArea");
  contentArea.innerHTML = '<div class="loading">Loading...</div>';

  // Update hero spotlight
  updateHeroSpotlight(section);

  // Update active nav link in sidebar
  document.querySelectorAll(".sidebar-nav .nav-link").forEach((item) => {
    item.classList.remove("active");
    if (item.getAttribute("data-section") === section) {
      item.classList.add("active");
    }
  });

  // Update active hero action button
  document.querySelectorAll(".hero-action").forEach((item) => {
    item.classList.remove("active");
    if (item.getAttribute("data-section") === section) {
      item.classList.add("active");
    }
  });

  try {
    switch (section) {
      case "teacher_management":
        await loadTeacherManagementSection();
        break;
      case "manage_students":
        await loadManageStudentsSection();
        break;
      case "sections":
        await loadSectionsSection();
        break;
      case "subjects":
        await loadSubjectsSection();
        break;
      case "announcements":
        await loadAnnouncementsSection();
        break;
      case "projects":
        await loadProjectsSection();
        break;
      case "study_load":
        await loadStudyLoadSection();
        break;
      case "grade_system":
        await loadGradeSystemSection();
        break;
      case "buildings":
        await loadBuildingsSection();
        break;
      case "manage_user":
        await loadManageUserSection();
        break;
      case "evaluation":
        await loadEvaluationSection();
        break;
      case "settings":
        await loadSettingsSection();
        break;
      default:
        contentArea.innerHTML =
          '<div class="alert alert-danger">Section not found</div>';
    }
  } catch (error) {
    console.error("Error loading section:", error);
    contentArea.innerHTML = `<div class="alert alert-danger">Error loading section: ${error.message}</div>`;
  }
}

// ==================== TEACHER MANAGEMENT ====================
async function loadTeacherManagementSection() {
  const contentArea = document.getElementById("adminContentArea");

  try {
    const urlParams = new URLSearchParams(window.location.search);
    const selectedTeacher = urlParams.get("filter_teacher") || "";

    // Get all data needed
    const [assignments, subjects, teachers, schedules, buildingsRaw, sections] =
      await Promise.all([
        AdminAPI.getTeacherAssignments().catch(() => []),
        AdminAPI.getSubjects().catch(() => []),
        AdminAPI.getUsers()
          .then((users) => users.filter((u) => u.role === "teacher"))
          .catch(() => []),
        AdminAPI.getSchedules().catch(() => []),
        AdminAPI.getBuildings().catch(() => []),
        AdminAPI.getSections().catch(() => []),
      ]);

    // Normalize data
    const assignmentsList = Array.isArray(assignments) ? assignments : [];
    const subjectsList = Array.isArray(subjects) ? subjects : [];
    const schedulesList = Array.isArray(schedules) ? schedules : [];
    const sectionsList = Array.isArray(sections) ? sections : [];
    const buildings = Array.isArray(buildingsRaw)
      ? buildingsRaw
          .map((b) => {
            if (typeof b === "string") return { name: b };
            return { name: b.name || b.building || "" };
          })
          .filter((b) => b.name)
      : [];

    // Collect all unique teacher names for filter
    const allTeacherNames = new Set();
    assignmentsList.forEach((ta) => {
      const name = ta.teacher_name || ta.full_name;
      if (name) allTeacherNames.add(name);
    });
    schedulesList.forEach((sched) => {
      if (sched.instructor) allTeacherNames.add(sched.instructor);
    });
    teachers.forEach((user) => {
      const name = user.full_name || user.username;
      if (name) allTeacherNames.add(name);
    });
    const sortedTeacherNames = Array.from(allTeacherNames).sort();

    // Get schedules for selected teacher (for filter view)
    let teacherSchedules = [];
    if (selectedTeacher) {
      teacherSchedules = schedulesList
        .filter((sched) => sched.instructor === selectedTeacher)
        .sort((a, b) => {
          const dayOrder = [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
          ];
          const dayA =
            dayOrder.indexOf(a.day) === -1 ? 999 : dayOrder.indexOf(a.day);
          const dayB =
            dayOrder.indexOf(b.day) === -1 ? 999 : dayOrder.indexOf(b.day);
          if (dayA !== dayB) return dayA - dayB;
          return (a.time_start || "").localeCompare(b.time_start || "");
        });
    }

    let html = `
            <div class="records-container">
                <div class="records-header">
                    <h2 class="records-title">
                        <i class="bi bi-person-badge"></i> Teacher Management
                    </h2>
                    <p class="records-subtitle">Assign teachers to subjects, manage instructor assignments</p>
                </div>
                <div class="records-main">
                    <div class="info-card">
                        <div class="card-header-modern">
                            <i class="bi bi-person-badge"></i>
                            <h3>Add Teacher to Subject</h3>
                        </div>
                        <form id="assignTeacherForm" class="admin-user-assign-form">
                            <input type="hidden" name="action" value="assign_teacher" />
                            <input type="hidden" id="teacherUserIdHidden" name="existing_user_id" value="" />
                            <div class="row g-3">
                                <div class="col-md-5">
                                    <div class="admin-form-group">
                                        <label class="admin-form-label" for="teacherFullName">
                                            <i class="bi bi-person-badge"></i> Teacher Name
                                        </label>
                                        <select id="teacherFullName" name="full_name" class="form-select form-select-lg" required>
                                            <option value="">Select Teacher...</option>
                                            ${teachers
                                              .map(
                                                (t) => `
                                                <option value="${escapeHtml(
                                                  t.full_name || t.username
                                                )}" data-user-id="${t.id}">
                                                    ${escapeHtml(
                                                      t.full_name || t.username
                                                    )}
                                                </option>
                                            `
                                              )
                                              .join("")}
                                        </select>
                                        <div class="admin-hint mt-2">
                                            <i class="bi bi-info-circle"></i>
                                            <span>Only users with role='teacher' can be assigned. If a teacher is not in the list, set their role to 'teacher' in Manage User section first.</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-5">
                                    <div class="admin-form-group">
                                        <label class="admin-form-label" for="teacherSubjectCode">
                                            <i class="bi bi-book"></i> Subject Code
                                        </label>
                                        <div class="admin-search-wrapper">
                                            <input type="text" name="subject_code" id="teacherSubjectCode" class="form-control form-control-lg" placeholder="Type subject code (e.g. IT101)" required autocomplete="off" />
                                            <ul id="teacherSubjectSuggestions" class="admin-search-dropdown" style="display: none;"></ul>
                                        </div>
                                        <div class="admin-hint mt-2">
                                            <i class="bi bi-info-circle"></i>
                                            <span>Type a subject code to see suggestions. Subject must exist in the subjects list first.</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-2 d-flex align-items-end">
                                    <button type="submit" class="btn btn-primary btn-lg w-100 mb-3">
                                        <i class="bi bi-check-circle me-2"></i>Add
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                    
                    <div class="info-card mt-3">
                        <div class="card-header-modern">
                            <i class="bi bi-list-check"></i>
                            <h3>Teacher Assignments</h3>
                            <span class="badge bg-secondary ms-auto">${
                              assignmentsList.length
                            } total</span>
                        </div>
                        ${
                          assignmentsList.length === 0
                            ? `
                            <div class="text-center text-muted py-5">
                                <i class="bi bi-inbox" style="font-size: 3rem; opacity: 0.3;"></i>
                                <p class="mt-3 mb-0">No teacher assignments found. Add a teacher above to get started.</p>
                            </div>
                        `
                            : `
                            <div class="table-responsive">
                                <table class="table table-hover align-middle">
                                    <thead>
                                        <tr>
                                            <th style="width: 25%;">Teacher Name</th>
                                            <th style="width: 15%;">Subject Code</th>
                                            <th style="width: 45%;">Subject Title</th>
                                            <th style="width: 15%;" class="text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${assignmentsList
                                          .map((ta) => {
                                            const subject = subjectsList.find(
                                              (s) =>
                                                s.subject_code ===
                                                ta.subject_code
                                            );
                                            return `
                                                <tr>
                                                    <td>
                                                        <strong>${escapeHtml(
                                                          ta.full_name ||
                                                            ta.teacher_name ||
                                                            "Unknown"
                                                        )}</strong>
                                                    </td>
                                                    <td>
                                                        <code class="bg-light px-2 py-1 rounded">${escapeHtml(
                                                          ta.subject_code ||
                                                            "N/A"
                                                        )}</code>
                                                    </td>
                                                    <td>${escapeHtml(
                                                      subject?.title ||
                                                        ta.subject_title ||
                                                        "N/A"
                                                    )}</td>
                                                    <td class="text-center">
                                                        <button class="btn btn-sm btn-outline-danger" onclick="deleteTeacherAssignment(${
                                                          ta.id
                                                        })" title="Delete Assignment">
                                                            <i class="bi bi-trash"></i>
                                                        </button>
                                                    </td>
                                                </tr>
                                            `;
                                          })
                                          .join("")}
                                    </tbody>
                                </table>
                            </div>
                        `
                        }
                    </div>
                    
                    <div class="info-card mt-3">
                        <div class="card-header-modern">
                            <i class="bi bi-calendar-plus"></i>
                            <h3>Add Teacher Schedule</h3>
                        </div>
                        <form id="scheduleForm" class="admin-user-assign-form">
                            <input type="hidden" name="action" value="create" />
                            <div class="row g-3">
                                <div class="col-md-4">
                                    <div class="admin-form-group" style="position: relative;">
                                        <label class="admin-form-label" for="scheduleSubjectCode">
                                            <i class="bi bi-book"></i> Subject Code
                                        </label>
                                        <input type="text" 
                                               name="subject" 
                                               id="scheduleSubjectCode" 
                                               class="form-control form-control-lg" 
                                               autocomplete="off"
                                               placeholder="Type to search subject code..."
                                               required />
                                        <div id="subjectCodeSuggestions" class="list-group" style="position: absolute; z-index: 1000; width: 100%; max-height: 300px; overflow-y: auto; display: none; border: 1px solid #dee2e6; border-radius: 0.375rem; background: white; box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);"></div>
                                        <div class="admin-hint mt-2">
                                            <i class="bi bi-info-circle"></i>
                                            <span>Type to search subject code. Teacher will be automatically assigned based on the subject.</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-2">
                                    <div class="admin-form-group">
                                        <label class="admin-form-label" for="scheduleYear">
                                            <i class="bi bi-calendar-year"></i> Year
                                        </label>
                                        <select name="year" id="scheduleYear" class="form-select form-select-lg" required>
                                            <option value="">Select...</option>
                                            <option value="1">1st Year</option>
                                            <option value="2">2nd Year</option>
                                            <option value="3">3rd Year</option>
                                            <option value="4">4th Year</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="col-md-2">
                                    <div class="admin-form-group">
                                        <label class="admin-form-label" for="scheduleSection">
                                            <i class="bi bi-people"></i> Section
                                        </label>
                                        <select name="section" id="scheduleSection" class="form-select form-select-lg">
                                            <option value="">Select...</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="col-md-2">
                                    <div class="admin-form-group">
                                        <label class="admin-form-label" for="scheduleDay">
                                            <i class="bi bi-calendar-day"></i> Day
                                        </label>
                                        <select name="day" id="scheduleDay" class="form-select form-select-lg" required>
                                            <option value="">Select...</option>
                                            <option value="Monday">Monday</option>
                                            <option value="Tuesday">Tuesday</option>
                                            <option value="Wednesday">Wednesday</option>
                                            <option value="Thursday">Thursday</option>
                                            <option value="Friday">Friday</option>
                                            <option value="Saturday">Saturday</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="col-md-2">
                                    <div class="admin-form-group">
                                        <label class="admin-form-label" for="scheduleClassType">
                                            <i class="bi bi-sun-moon"></i> Class Type
                                        </label>
                                        <select name="class_type" id="scheduleClassType" class="form-select form-select-lg" required>
                                            <option value="day">Day</option>
                                            <option value="night">Night</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="col-md-2">
                                    <div class="admin-form-group">
                                        <label class="admin-form-label" for="scheduleTimeStart">
                                            <i class="bi bi-clock"></i> Time Start
                                        </label>
                                        <input type="time" name="time_start" id="scheduleTimeStart" class="form-control form-control-lg" required />
                                    </div>
                                </div>
                                <div class="col-md-2">
                                    <div class="admin-form-group">
                                        <label class="admin-form-label" for="scheduleTimeEnd">
                                            <i class="bi bi-clock-history"></i> Time End
                                        </label>
                                        <input type="time" name="time_end" id="scheduleTimeEnd" class="form-control form-control-lg" required />
                                    </div>
                                </div>
                                <div class="col-md-2">
                                    <div class="admin-form-group">
                                        <label class="admin-form-label" for="scheduleBuilding">
                                            <i class="bi bi-building"></i> Building
                                        </label>
                                        <select name="building" id="scheduleBuilding" class="form-select form-select-lg">
                                            <option value="">Select...</option>
                                            ${buildings
                                              .map((bld) => {
                                                const buildingName =
                                                  typeof bld === "string"
                                                    ? bld
                                                    : bld.building ||
                                                      bld.name ||
                                                      "";
                                                return buildingName
                                                  ? `
                                                    <option value="${escapeHtml(
                                                      buildingName
                                                    )}">
                                                        ${escapeHtml(
                                                          buildingName
                                                        )}
                                                    </option>
                                                `
                                                  : "";
                                              })
                                              .filter(Boolean)
                                              .join("")}
                                        </select>
                                    </div>
                                </div>
                                <div class="col-md-2">
                                    <div class="admin-form-group">
                                        <label class="admin-form-label" for="scheduleRoom">
                                            <i class="bi bi-door-closed"></i> Room Number
                                        </label>
                                        <input type="text" name="room" id="scheduleRoom" class="form-control form-control-lg" placeholder="e.g. 301" />
                                    </div>
                                </div>
                                <div class="col-md-2 d-flex align-items-end">
                                    <button type="submit" class="btn btn-primary btn-lg w-100 mb-3">
                                        <i class="bi bi-check-circle me-2"></i>Add Schedule
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                    
                    <div class="info-card mt-3">
                        <div class="card-header-modern">
                            <i class="bi bi-calendar-check"></i>
                            <h3>Teacher Schedules</h3>
                            <span class="badge bg-secondary ms-auto">${
                              schedulesList.length
                            } total</span>
                        </div>
                        ${
                          schedulesList.length === 0
                            ? `
                            <div class="text-center text-muted py-5">
                                <i class="bi bi-inbox" style="font-size: 3rem; opacity: 0.3;"></i>
                                <p class="mt-3 mb-0">No schedules found. Add a schedule above to get started.</p>
                            </div>
                        `
                            : `
                            <div class="table-responsive">
                                <table class="table table-hover align-middle">
                                    <thead>
                                        <tr>
                                            <th style="width: 15%;">Teacher</th>
                                            <th style="width: 12%;">Subject</th>
                                            <th style="width: 8%;">Year</th>
                                            <th style="width: 10%;">Section</th>
                                            <th style="width: 10%;">Day</th>
                                            <th style="width: 12%;">Time</th>
                                            <th style="width: 8%;">Type</th>
                                            <th style="width: 8%;">Room</th>
                                            <th style="width: 7%;">Building</th>
                                            <th style="width: 10%;" class="text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${schedulesList
                                          .map((sched) => {
                                            const timeStart = new Date(
                                              "2000-01-01T" + sched.time_start
                                            ).toLocaleTimeString("en-US", {
                                              hour: "numeric",
                                              minute: "2-digit",
                                              hour12: true,
                                            });
                                            const timeEnd = new Date(
                                              "2000-01-01T" + sched.time_end
                                            ).toLocaleTimeString("en-US", {
                                              hour: "numeric",
                                              minute: "2-digit",
                                              hour12: true,
                                            });
                                            const timeRange =
                                              timeStart + " - " + timeEnd;
                                            const classType =
                                              sched.class_type || "day";
                                            const teacherAssignment =
                                              assignmentsList.find(
                                                (ta) =>
                                                  ta.subject_code ===
                                                  sched.subject
                                              );
                                            const teacherName =
                                              sched.instructor ||
                                              teacherAssignment?.full_name ||
                                              teacherAssignment?.teacher_name ||
                                              "N/A";
                                            return `
                                                <tr>
                                                    <td>
                                                        <strong>${escapeHtml(
                                                          teacherName
                                                        )}</strong>
                                                    </td>
                                                    <td>
                                                        <code class="bg-light px-2 py-1 rounded">${escapeHtml(
                                                          sched.subject || "N/A"
                                                        )}</code>
                                                    </td>
                                                    <td>${escapeHtml(
                                                      sched.year || "N/A"
                                                    )}</td>
                                                    <td>${escapeHtml(
                                                      sched.section || "—"
                                                    )}</td>
                                                    <td>${escapeHtml(
                                                      sched.day || "N/A"
                                                    )}</td>
                                                    <td>${escapeHtml(
                                                      timeRange
                                                    )}</td>
                                                    <td>
                                                        <span class="badge bg-${
                                                          classType === "night"
                                                            ? "dark"
                                                            : "warning"
                                                        }">
                                                            ${escapeHtml(
                                                              classType
                                                                .charAt(0)
                                                                .toUpperCase() +
                                                                classType.slice(
                                                                  1
                                                                )
                                                            )}
                                                        </span>
                                                    </td>
                                                    <td>${escapeHtml(
                                                      sched.room || "—"
                                                    )}</td>
                                                    <td>${escapeHtml(
                                                      sched.building || "—"
                                                    )}</td>
                                                    <td class="text-center">
                                                        <button class="btn btn-sm btn-outline-danger" onclick="deleteSchedule(${
                                                          sched.id
                                                        })" title="Delete Schedule">
                                                            <i class="bi bi-trash"></i>
                                                        </button>
                                                    </td>
                                                </tr>
                                            `;
                                          })
                                          .join("")}
                                    </tbody>
                                </table>
                            </div>
                        `
                        }
                    </div>
                    
                    <div class="info-card mt-3">
                        <div class="card-header-modern">
                            <i class="bi bi-funnel"></i>
                            <h3>Filter by Teacher</h3>
                        </div>
                        <form method="get" class="form-small" id="teacherFilterForm">
                            <input type="hidden" name="section" value="teacher_management" />
                            <div class="row g-3">
                                <div class="col-md-8">
                                    <label class="admin-form-label" for="teacherFilterSelect">
                                        <i class="bi bi-person-badge"></i> Select Teacher
                                    </label>
                                    <select id="teacherFilterSelect" name="filter_teacher" class="form-select form-select-lg">
                                        <option value="">Select a teacher...</option>
                                        ${sortedTeacherNames
                                          .map(
                                            (name) => `
                                            <option value="${escapeHtml(
                                              name
                                            )}" ${
                                              selectedTeacher === name
                                                ? "selected"
                                                : ""
                                            }>
                                                ${escapeHtml(name)}
                                            </option>
                                        `
                                          )
                                          .join("")}
                                    </select>
                                </div>
                                <div class="col-md-4 align-self-end">
                                    ${
                                      selectedTeacher
                                        ? `
                                        <a href="admin_dashboard.html?section=teacher_management" class="btn btn-outline-secondary btn-lg w-100">
                                            <i class="bi bi-x-circle me-2"></i>Clear Filter
                                        </a>
                                    `
                                        : ""
                                    }
                                </div>
                            </div>
                        </form>
                    </div>
                    
                    ${
                      selectedTeacher
                        ? `
                        <div class="info-card mt-3">
                            <div class="card-header-modern">
                                <i class="bi bi-calendar-week"></i>
                                <h3>Schedule for ${escapeHtml(
                                  selectedTeacher
                                )}</h3>
                                <span class="badge bg-secondary ms-auto">${
                                  teacherSchedules.length
                                } classes</span>
                            </div>
                            ${
                              teacherSchedules.length === 0
                                ? `
                                <p class="text-muted mb-0">No schedules found for this teacher.</p>
                            `
                                : (() => {
                                    const schedulesByDay = {};
                                    teacherSchedules.forEach((schedule) => {
                                      const day = schedule.day || "Unknown";
                                      if (!schedulesByDay[day]) {
                                        schedulesByDay[day] = [];
                                      }
                                      schedulesByDay[day].push(schedule);
                                    });

                                    const dayOrder = [
                                      "Monday",
                                      "Tuesday",
                                      "Wednesday",
                                      "Thursday",
                                      "Friday",
                                      "Saturday",
                                    ];
                                    const sortedDays = Object.keys(
                                      schedulesByDay
                                    ).sort((a, b) => {
                                      const posA =
                                        dayOrder.indexOf(a) === -1
                                          ? 999
                                          : dayOrder.indexOf(a);
                                      const posB =
                                        dayOrder.indexOf(b) === -1
                                          ? 999
                                          : dayOrder.indexOf(b);
                                      return posA - posB;
                                    });

                                    return sortedDays
                                      .map((day) => {
                                        const daySchedules =
                                          schedulesByDay[day];
                                        return `
                                        <div class="mt-3">
                                            <h5 class="mb-3"><i class="bi bi-calendar-day"></i> ${escapeHtml(
                                              day
                                            )}</h5>
                                            <div class="table-responsive">
                                                <table class="table table-hover align-middle">
                                                    <thead>
                                                        <tr>
                                                            <th>Subject</th>
                                                            <th>Year</th>
                                                            <th>Section</th>
                                                            <th>Time</th>
                                                            <th>Class Type</th>
                                                            <th>Room</th>
                                                            <th>Building</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        ${daySchedules
                                                          .map((schedule) => {
                                                            const timeStart =
                                                              new Date(
                                                                "2000-01-01T" +
                                                                  schedule.time_start
                                                              ).toLocaleTimeString(
                                                                "en-US",
                                                                {
                                                                  hour: "numeric",
                                                                  minute:
                                                                    "2-digit",
                                                                  hour12: true,
                                                                }
                                                              );
                                                            const timeEnd =
                                                              new Date(
                                                                "2000-01-01T" +
                                                                  schedule.time_end
                                                              ).toLocaleTimeString(
                                                                "en-US",
                                                                {
                                                                  hour: "numeric",
                                                                  minute:
                                                                    "2-digit",
                                                                  hour12: true,
                                                                }
                                                              );
                                                            const timeRange =
                                                              timeStart +
                                                              " - " +
                                                              timeEnd;
                                                            const classType =
                                                              schedule.class_type ||
                                                              "day";
                                                            return `
                                                                <tr>
                                                                    <td><strong>${escapeHtml(
                                                                      schedule.subject ||
                                                                        "N/A"
                                                                    )}</strong></td>
                                                                    <td>${escapeHtml(
                                                                      schedule.year ||
                                                                        "N/A"
                                                                    )}</td>
                                                                    <td>${escapeHtml(
                                                                      schedule.section ||
                                                                        "—"
                                                                    )}</td>
                                                                    <td>${escapeHtml(
                                                                      timeRange
                                                                    )}</td>
                                                                    <td>
                                                                        <span class="badge bg-${
                                                                          classType ===
                                                                          "night"
                                                                            ? "dark"
                                                                            : "warning"
                                                                        }">
                                                                            ${escapeHtml(
                                                                              classType
                                                                                .charAt(
                                                                                  0
                                                                                )
                                                                                .toUpperCase() +
                                                                                classType.slice(
                                                                                  1
                                                                                )
                                                                            )}
                                                                        </span>
                                                                    </td>
                                                                    <td>${escapeHtml(
                                                                      schedule.room ||
                                                                        "—"
                                                                    )}</td>
                                                                    <td>${escapeHtml(
                                                                      schedule.building ||
                                                                        "—"
                                                                    )}</td>
                                                                </tr>
                                                            `;
                                                          })
                                                          .join("")}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    `;
                                      })
                                      .join("");
                                  })()
                            }
                        </div>
                    `
                        : `
                        <div class="info-card mt-3">
                            <div class="card-header-modern">
                                <i class="bi bi-info-circle"></i>
                                <h3>Select a Teacher</h3>
                            </div>
                            <p class="text-muted mb-0">Select a teacher from the dropdown above to view their schedule.</p>
                        </div>
                    `
                    }
                </div>
            </div>
        `;

    contentArea.innerHTML = html;

    // Setup filter form auto-submit
    const filterForm = document.getElementById("teacherFilterForm");
    const filterSelect = document.getElementById("teacherFilterSelect");
    if (filterForm && filterSelect) {
      filterSelect.addEventListener("change", function () {
        filterForm.submit();
      });
    }

    // Setup teacher dropdown change handler
    const teacherSelect = document.getElementById("teacherFullName");
    const userIdHidden = document.getElementById("teacherUserIdHidden");
    if (teacherSelect && userIdHidden) {
      teacherSelect.addEventListener("change", function () {
        const selectedOption = this.options[this.selectedIndex];
        const userId = selectedOption.getAttribute("data-user-id");
        userIdHidden.value = userId || "";
      });
    }

    // Setup form submission
    const assignForm = document.getElementById("assignTeacherForm");
    if (assignForm) {
      assignForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        try {
          const teacherSelect = document.getElementById("teacherFullName");
          const selectedOption =
            teacherSelect.options[teacherSelect.selectedIndex];
          const teacherName = teacherSelect.value;
          const userId = selectedOption.getAttribute("data-user-id");
          const subjectCode =
            document.getElementById("teacherSubjectCode").value;

          if (!teacherName || !subjectCode) {
            alert("Please select a teacher and subject code");
            return;
          }

          await AdminAPI.createTeacherAssignment({
            teacher_name: teacherName,
            subject_code: subjectCode,
            user_id: userId || null,
          });

          window.location.href = `admin_dashboard.html?section=teacher_management&success=created&_t=${Date.now()}`;
        } catch (error) {
          alert(`Error creating assignment: ${error.message}`);
        }
      });
    }

    // Store subjects with teacher assignments for suggestions
    const subjectsWithTeachers = subjectsList.map((subj) => {
      const teacherAssignment = assignmentsList.find(
        (ta) => ta.subject_code === subj.subject_code
      );
      const teacherName = teacherAssignment
        ? teacherAssignment.full_name || teacherAssignment.teacher_name
        : "";
      return {
        subject_code: subj.subject_code,
        title: subj.title || "",
        teacher: teacherName,
      };
    });

    // Setup subject code suggestions
    const subjectCodeInput = document.getElementById("scheduleSubjectCode");
    const subjectSuggestionsDiv = document.getElementById(
      "subjectCodeSuggestions"
    );
    let subjectSearchTimeout;

    if (subjectCodeInput && subjectSuggestionsDiv) {
      subjectCodeInput.addEventListener("input", function (e) {
        const query = e.target.value.trim().toLowerCase();
        clearTimeout(subjectSearchTimeout);

        if (query.length < 1) {
          subjectSuggestionsDiv.style.display = "none";
          return;
        }

        subjectSearchTimeout = setTimeout(() => {
          // Filter subjects by code or title
          const filtered = subjectsWithTeachers
            .filter((subj) => {
              const codeMatch = subj.subject_code.toLowerCase().includes(query);
              const titleMatch = subj.title.toLowerCase().includes(query);
              return codeMatch || titleMatch;
            })
            .slice(0, 10); // Limit to 10 results

          if (filtered.length === 0) {
            subjectSuggestionsDiv.style.display = "none";
            return;
          }

          subjectSuggestionsDiv.innerHTML = filtered
            .map((subj) => {
              const teacherText = subj.teacher
                ? ` <span class="text-muted">(${escapeHtml(
                    subj.teacher
                  )})</span>`
                : "";
              return `
                            <a href="#" class="list-group-item list-group-item-action" 
                               onclick="selectSubjectCode('${escapeHtml(
                                 subj.subject_code
                               )}', '${escapeHtml(
                subj.teacher
              )}'); return false;">
                                <strong>${escapeHtml(
                                  subj.subject_code
                                )}</strong> — ${escapeHtml(
                subj.title
              )}${teacherText}
                            </a>
                        `;
            })
            .join("");
          subjectSuggestionsDiv.style.display = "block";
        }, 200);
      });

      // Hide suggestions when clicking outside
      document.addEventListener("click", (e) => {
        if (
          !subjectCodeInput.contains(e.target) &&
          !subjectSuggestionsDiv.contains(e.target)
        ) {
          subjectSuggestionsDiv.style.display = "none";
        }
      });

      // Store selected teacher name
      let selectedTeacherName = "";
      window.selectSubjectCode = function (subjectCode, teacherName) {
        subjectCodeInput.value = subjectCode;
        selectedTeacherName = teacherName || "";
        subjectSuggestionsDiv.style.display = "none";
      };
    }

    // Setup subject code autocomplete for teacher assignment
    const teacherSubjectCodeInput =
      document.getElementById("teacherSubjectCode");
    const teacherSubjectSuggestions = document.getElementById(
      "teacherSubjectSuggestions"
    );
    if (teacherSubjectCodeInput && teacherSubjectSuggestions) {
      let searchTimeout;
      teacherSubjectCodeInput.addEventListener("input", function (e) {
        const query = e.target.value.trim().toUpperCase();
        clearTimeout(searchTimeout);

        if (query.length < 1) {
          teacherSubjectSuggestions.style.display = "none";
          return;
        }

        searchTimeout = setTimeout(() => {
          const matches = subjectsList
            .filter((subj) => {
              const code = (subj.subject_code || "").toUpperCase();
              const title = (subj.title || "").toUpperCase();
              return code.includes(query) || title.includes(query);
            })
            .slice(0, 10); // Limit to 10 suggestions

          if (matches.length === 0) {
            teacherSubjectSuggestions.style.display = "none";
            return;
          }

          teacherSubjectSuggestions.innerHTML = matches
            .map(
              (subj) => `
                        <li class="list-group-item list-group-item-action" 
                            onclick="selectSubjectForTeacher('${escapeHtml(
                              subj.subject_code || ""
                            )}'); return false;">
                            <strong>${escapeHtml(
                              subj.subject_code || ""
                            )}</strong> — ${escapeHtml(subj.title || "")}
                        </li>
                    `
            )
            .join("");
          teacherSubjectSuggestions.style.display = "block";
        }, 200);
      });

      // Hide suggestions when clicking outside
      document.addEventListener("click", (e) => {
        if (
          !teacherSubjectCodeInput.contains(e.target) &&
          !teacherSubjectSuggestions.contains(e.target)
        ) {
          teacherSubjectSuggestions.style.display = "none";
        }
      });
    }

    // Setup year change handler to filter sections
    const scheduleYearSelect = document.getElementById("scheduleYear");
    const scheduleSectionSelect = document.getElementById("scheduleSection");
    if (scheduleYearSelect && scheduleSectionSelect) {
      scheduleYearSelect.addEventListener("change", function () {
        const selectedYear = this.value;
        // Clear current options
        scheduleSectionSelect.innerHTML = '<option value="">Select...</option>';

        if (selectedYear) {
          // Filter sections by selected year
          const filteredSections = sectionsList.filter(
            (s) => s.year === selectedYear
          );
          filteredSections.forEach((section) => {
            const option = document.createElement("option");
            option.value = section.name || section.section;
            option.textContent = section.name || section.section;
            scheduleSectionSelect.appendChild(option);
          });
        }
      });
    }

    // Setup schedule form submission
    const scheduleForm = document.getElementById("scheduleForm");
    if (scheduleForm) {
      scheduleForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        try {
          const subjectInput = document.getElementById("scheduleSubjectCode");
          const subjectCode = subjectInput.value.trim();

          // Find teacher name from stored data
          let teacherName = "";
          if (subjectCode) {
            const subjectData = subjectsWithTeachers.find(
              (s) => s.subject_code === subjectCode
            );
            teacherName = subjectData ? subjectData.teacher : "";
          }

          // Get class_type value - ensure it's properly captured
          const classTypeSelect = document.getElementById("scheduleClassType");
          const classType = classTypeSelect ? classTypeSelect.value : "day";

          await AdminAPI.createSchedule({
            subject: subjectCode,
            year: document.getElementById("scheduleYear").value,
            section: document.getElementById("scheduleSection").value || null,
            day: document.getElementById("scheduleDay").value,
            time_start: document.getElementById("scheduleTimeStart").value,
            time_end: document.getElementById("scheduleTimeEnd").value,
            building: document.getElementById("scheduleBuilding").value || null,
            room: document.getElementById("scheduleRoom").value || null,
            class_type: classType,
            instructor: teacherName || null,
          });

          window.location.href = `admin_dashboard.html?section=teacher_management&success=created&_t=${Date.now()}`;
        } catch (error) {
          alert(`Error creating schedule: ${error.message}`);
        }
      });
    }
  } catch (error) {
    contentArea.innerHTML = `<div class="alert alert-danger">Error loading teacher management: ${error.message}</div>`;
  }
}

function selectSubjectForTeacher(subjectCode) {
  const input = document.getElementById("teacherSubjectCode");
  const suggestions = document.getElementById("teacherSubjectSuggestions");
  if (input) {
    input.value = subjectCode;
  }
  if (suggestions) {
    suggestions.style.display = "none";
  }
}

async function deleteSchedule(id) {
  if (
    !confirm(
      "Are you sure you want to delete this schedule? This action cannot be undone."
    )
  )
    return;
  try {
    await AdminAPI.deleteSchedule(id);
    window.location.href = `admin_dashboard.html?section=teacher_management&success=deleted&_t=${Date.now()}`;
  } catch (error) {
    alert(`Error deleting schedule: ${error.message}`);
  }
}

let teacherSearchTimeout;
function setupTeacherSearch() {
  const searchInput = document.getElementById("teacherSearch");
  const suggestionsDiv = document.getElementById("teacherSuggestions");
  const teacherIdInput = document.getElementById("selectedTeacherId");
  const teacherNameInput = document.getElementById("selectedTeacherName");

  searchInput.addEventListener("input", async (e) => {
    const query = e.target.value.trim();
    clearTimeout(teacherSearchTimeout);

    if (query.length < 2) {
      suggestionsDiv.style.display = "none";
      return;
    }

    teacherSearchTimeout = setTimeout(async () => {
      try {
        const suggestions = await AdminAPI.getUserSuggestions(query, "teacher");
        if (suggestions.length === 0) {
          suggestionsDiv.style.display = "none";
          return;
        }

        suggestionsDiv.innerHTML = suggestions
          .map(
            (user) => `
                    <a href="#" class="list-group-item list-group-item-action" 
                       onclick="selectTeacher(${user.id}, '${escapeHtml(
              user.full_name || user.username
            )}'); return false;">
                        ${escapeHtml(
                          user.full_name || user.username
                        )} (${escapeHtml(user.username)})
                    </a>
                `
          )
          .join("");
        suggestionsDiv.style.display = "block";
      } catch (error) {
        console.error("Error fetching suggestions:", error);
      }
    }, 300);
  });

  // Hide suggestions when clicking outside
  document.addEventListener("click", (e) => {
    if (!searchInput.contains(e.target) && !suggestionsDiv.contains(e.target)) {
      suggestionsDiv.style.display = "none";
    }
  });
}

function selectTeacher(userId, name) {
  document.getElementById("selectedTeacherId").value = userId;
  document.getElementById("selectedTeacherName").value = name;
  document.getElementById("teacherSearch").value = name;
  document.getElementById("teacherSuggestions").style.display = "none";
}

function setupSubjectFilters(subjects, years, departments) {
  const yearFilter = document.getElementById("subjectYearFilter");
  const deptFilter = document.getElementById("subjectDepartmentFilter");
  const subjectSelect = document.getElementById("subjectCodeSelect");

  function updateSubjectOptions() {
    const selectedYear = yearFilter.value;
    const selectedDept = deptFilter.value;

    const filtered = subjects.filter((s) => {
      if (selectedYear && s.year_level != selectedYear) return false;
      if (selectedDept && s.major !== selectedDept) return false;
      return true;
    });

    subjectSelect.innerHTML =
      '<option value="">Select Subject Code</option>' +
      filtered
        .map(
          (s) =>
            `<option value="${escapeHtml(s.subject_code)}">${escapeHtml(
              s.subject_code
            )} - ${escapeHtml(s.title)}</option>`
        )
        .join("");
  }

  yearFilter.addEventListener("change", updateSubjectOptions);
  deptFilter.addEventListener("change", updateSubjectOptions);
  updateSubjectOptions();
}

async function handleTeacherAssignmentSubmit(e) {
  e.preventDefault();
  const teacherId = document.getElementById("selectedTeacherId").value;
  const teacherName = document.getElementById("selectedTeacherName").value;
  const subjectCode = document.getElementById("subjectCodeSelect").value;
  const yearFilter = document.getElementById("subjectYearFilter").value;

  if (!teacherName || !subjectCode) {
    alert("Please select a teacher and subject code");
    return;
  }

  // Frontend duplicate check
  try {
    const assignments = await AdminAPI.getTeacherAssignments();
    const duplicate = assignments.find(
      (ta) =>
        (ta.user_id == teacherId ||
          ta.teacher_name === teacherName ||
          ta.full_name === teacherName) &&
        ta.subject_code === subjectCode
    );
    if (duplicate) {
      alert(
        "This teacher is already assigned to this subject. Duplicate assignments are not allowed."
      );
      return;
    }
  } catch (error) {
    console.error("Error checking duplicates:", error);
  }

  try {
    await AdminAPI.createTeacherAssignment({
      teacher_name: teacherName,
      subject_code: subjectCode,
      user_id: teacherId || null,
      year: yearFilter || null,
    });

    // Reset form
    document.getElementById("teacherSearch").value = "";
    document.getElementById("selectedTeacherId").value = "";
    document.getElementById("selectedTeacherName").value = "";
    document.getElementById("subjectCodeSelect").value = "";

    // Real-time update - reload section without page reload
    await loadTeacherManagementSection();
  } catch (error) {
    alert(`Error creating teacher assignment: ${error.message}`);
  }
}

async function deleteTeacherAssignment(id) {
  if (!confirm("Are you sure you want to delete this assignment?")) return;
  saveScrollPosition();
  try {
    await AdminAPI.deleteTeacherAssignment(id);
    // Real-time update
    await loadTeacherManagementSection();
  } catch (error) {
    alert(`Error deleting assignment: ${error.message}`);
  }
}

// ==================== MANAGE STUDENTS ====================
async function loadManageStudentsSection() {
  const contentArea = document.getElementById("adminContentArea");

  try {
    const urlParams = new URLSearchParams(window.location.search);
    const q = urlParams.get("q") || "";
    const filterYear = urlParams.get("year_filter") || "";
    const filterSection = urlParams.get("section_filter") || "";
    const filterDept = urlParams.get("dept_filter") || "";
    const filterMajor = urlParams.get("major_filter") || "";
    const filterLacking = urlParams.has("lacking_payment");
    const filterSanctions = urlParams.has("has_sanctions");
    const page = parseInt(urlParams.get("ua_page")) || 1;
    const perPage = 10;

    // Get all data needed
    const [sections, assignments, departments] = await Promise.all([
      AdminAPI.getSections(),
      AdminAPI.getUserAssignments(),
      AdminAPI.getUserAssignments(), // Get departments from assignments
    ]);

    // Ensure assignments is always an array
    const assignmentsList = Array.isArray(assignments)
      ? assignments
      : assignments
      ? [assignments]
      : [];
    const sectionsList = Array.isArray(sections)
      ? sections
      : sections
      ? [sections]
      : [];

    // Get available filter options
    const availableFilterYears = [
      ...new Set(sectionsList.map((s) => s.year).filter(Boolean)),
    ].sort();
    const availableFilterSections = [
      ...new Set(sectionsList.map((s) => s.name).filter(Boolean)),
    ].sort();
    const availableFilterDepartments = [
      ...new Set(assignmentsList.map((a) => a.department).filter(Boolean)),
    ].sort();

    // Filter assignments based on query params
    let filteredAssignments = assignmentsList.filter((a) => {
      if (
        q &&
        !a.username?.toLowerCase().includes(q.toLowerCase()) &&
        !a.section?.toLowerCase().includes(q.toLowerCase()) &&
        !a.department?.toLowerCase().includes(q.toLowerCase()) &&
        !a.major?.toLowerCase().includes(q.toLowerCase())
      )
        return false;
      if (filterYear && a.year !== filterYear) return false;
      if (filterSection && a.section !== filterSection) return false;
      if (filterDept && a.department !== filterDept) return false;
      if (filterMajor && a.major !== filterMajor) return false;
      if (filterLacking && a.payment !== "owing") return false;
      if (filterSanctions && !a.sanctions) return false;
      return true;
    });

    // Pagination
    const total = filteredAssignments.length;
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const offset = (page - 1) * perPage;
    const paginatedAssignments = filteredAssignments.slice(
      offset,
      offset + perPage
    );

    // Course/Major mapping
    const courseMajorMap = {
      IT: ["Computer Technology", "Electronics"],
      BSED: [
        "English",
        "Physical Education",
        "Math",
        "Filipino",
        "Social Science",
      ],
      HM: ["General"],
      BEED: ["General"],
      TOURISM: ["General"],
    };
    const majorOptionsForDept =
      filterDept && courseMajorMap[filterDept]
        ? courseMajorMap[filterDept]
        : [];

    let html = `
            <div class="records-container">
                <div class="records-header">
                    <h2 class="records-title">
                        <i class="bi bi-people-fill"></i> Manage Students
                    </h2>
                    <p class="records-subtitle">Manage student assignments, financial status, and sanctions</p>
                </div>
                <div class="records-main">
                    <div class="info-card">
                        <div class="card-header-modern">
                            <i class="bi bi-person-plus"></i>
                            <h3>Assign User to Year / Section</h3>
                        </div>
                        <form id="assignUserForm" class="admin-user-assign-form">
                            <input type="hidden" name="action" value="assign" />
                            <input type="hidden" id="existingUserIdHidden" name="existing_user_id" value="" />
                            <div class="row g-3">
                                <div class="col-md-6">
                                    <div class="admin-form-group">
                                        <label class="admin-form-label" for="userSearchInput">
                                            <i class="bi bi-search"></i> User Search
                                        </label>
                                        <div class="admin-search-wrapper">
                                            <input type="text" id="userSearchInput" class="form-control form-control-lg" placeholder="Start typing a name or username" autocomplete="off" />
                                            <ul id="userSearchList" class="admin-search-dropdown" style="display: none;"></ul>
                                        </div>
                                        <div class="admin-hint">
                                            <i class="bi bi-info-circle"></i>
                                            <span>Select a suggestion to map to an existing account, or type a full name to create an assignment without a user account.</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="admin-form-group">
                                        <label class="admin-form-label" for="assignFullName">
                                            <i class="bi bi-person-badge"></i> Full Name
                                        </label>
                                        <input type="text" id="assignFullName" name="full_name" class="form-control form-control-lg" placeholder="Full Name (e.g. Joshua Paculaba)" required />
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="admin-form-group">
                                        <label class="admin-form-label" for="assignYear">
                                            <i class="bi bi-calendar-year"></i> Year
                                        </label>
                                        <select name="year" id="assignYear" class="form-select form-select-lg">
                                            <option value="1">1st Year</option>
                                            <option value="2">2nd Year</option>
                                            <option value="3" selected>3rd Year</option>
                                            <option value="4">4th Year</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="admin-form-group">
                                        <label class="admin-form-label" for="assignSection">
                                            <i class="bi bi-people"></i> Section
                                        </label>
                                        <input type="text" name="section" id="assignSection" class="form-control form-control-lg" placeholder="Benevolence" required />
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="admin-form-group">
                                        <label class="admin-form-label" for="assignDepartment">
                                            <i class="bi bi-building"></i> Department
                                        </label>
                                        <select name="department" id="assignDepartment" class="form-select form-select-lg" data-course-select>
                                            <option value="">(none)</option>
                                            <option value="IT">IT</option>
                                            <option value="HM">HM</option>
                                            <option value="BSED">BSED</option>
                                            <option value="BEED">BEED</option>
                                            <option value="TOURISM">TOURISM</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="admin-form-group">
                                        <label class="admin-form-label" for="assignMajor">
                                            <i class="bi bi-diagram-3"></i> Major
                                        </label>
                                        <select name="major" id="assignMajor" class="form-select form-select-lg" data-major-select>
                                            <option value="">(none)</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="col-md-3 d-flex align-items-end">
                                    <button type="submit" class="btn btn-primary btn-lg w-100">
                                        <i class="bi bi-check-circle me-2"></i>Assign User
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>

                    <div class="info-card mt-3 grade-filter-card">
                        <div class="grade-filter-inner">
                            <div class="grade-filter-head">
                                <div class="grade-filter-title">
                                    <span class="grade-filter-icon"><i class="bi bi-funnel-fill"></i></span>
                                    <div>
                                        <h3>Filter Users</h3>
                                        <p>Focus the overview by year, section, department, or status.</p>
                                    </div>
                                </div>
                                ${
                                  filterYear ||
                                  filterSection ||
                                  filterDept ||
                                  filterMajor ||
                                  filterLacking ||
                                  filterSanctions ||
                                  q
                                    ? `
                                    <a href="admin_dashboard.html?section=manage_students" class="grade-filter-reset">
                                        <i class="bi bi-arrow-counterclockwise"></i> Reset view
                                    </a>
                                `
                                    : ""
                                }
                            </div>
                            
                            <form method="get" class="mb-3" id="filterSearchForm">
                                <input type="hidden" name="section" value="manage_students" />
                                <input type="hidden" name="year_filter" value="${filterYear}" />
                                <input type="hidden" name="section_filter" value="${filterSection}" />
                                <input type="hidden" name="dept_filter" value="${filterDept}" />
                                <input type="hidden" name="major_filter" value="${filterMajor}" />
                                <input type="hidden" name="lacking_payment" value="${
                                  filterLacking ? "1" : ""
                                }" />
                                <input type="hidden" name="has_sanctions" value="${
                                  filterSanctions ? "1" : ""
                                }" />
                                <div class="input-group input-group-lg">
                                    <span class="input-group-text" style="background: rgba(107, 95, 79, 0.12); border: 1px solid rgba(107, 95, 79, 0.3);">
                                        <i class="bi bi-search"></i>
                                    </span>
                                    <input type="search" name="q" id="userSearchQuery" class="form-control" placeholder="Search by full name, section, department, or major..." value="${escapeHtml(
                                      q
                                    )}" style="border: 1px solid rgba(107, 95, 79, 0.3);" autocomplete="off" />
                                    ${
                                      q
                                        ? `
                                        <button type="submit" class="btn btn-primary">
                                            <i class="bi bi-funnel-fill"></i> Search
                                        </button>
                                    `
                                        : ""
                                    }
                                </div>
                            </form>
                            
                            <div class="grade-filter-actions">
                                ${
                                  availableFilterYears.length > 0
                                    ? `
                                    <div class="grade-filter-group">
                                        <span class="grade-filter-label">Year Level</span>
                                        <a href="admin_dashboard.html?section=manage_students" class="grade-chip ${
                                          !filterYear ? "active" : ""
                                        }">
                                            <i class="bi bi-layers"></i>
                                            <span>All Years</span>
                                        </a>
                                        ${availableFilterYears
                                          .map((yearValue) => {
                                            const yearLabel =
                                              yearValue === "1"
                                                ? "1st Year"
                                                : yearValue === "2"
                                                ? "2nd Year"
                                                : yearValue === "3"
                                                ? "3rd Year"
                                                : yearValue === "4"
                                                ? "4th Year"
                                                : yearValue + " Year";
                                            const params = new URLSearchParams({
                                              section: "manage_students",
                                              year_filter: yearValue,
                                            });
                                            return `<a href="admin_dashboard.html?${params.toString()}" class="grade-chip ${
                                              filterYear === yearValue
                                                ? "active"
                                                : ""
                                            }">
                                                <i class="bi bi-calendar-week"></i>
                                                <span>${escapeHtml(
                                                  yearLabel
                                                )}</span>
                                            </a>`;
                                          })
                                          .join("")}
                                    </div>
                                `
                                    : ""
                                }
                                
                                ${
                                  availableFilterSections.length > 0
                                    ? `
                                    <div class="grade-filter-group">
                                        <span class="grade-filter-label">Section</span>
                                        <a href="admin_dashboard.html?section=manage_students" class="grade-chip ${
                                          !filterSection ? "active" : ""
                                        }">
                                            <i class="bi bi-grid-1x2"></i>
                                            <span>All Sections</span>
                                        </a>
                                        ${availableFilterSections
                                          .map((sectionValue) => {
                                            const params = new URLSearchParams({
                                              section: "manage_students",
                                              section_filter: sectionValue,
                                            });
                                            if (filterYear)
                                              params.set(
                                                "year_filter",
                                                filterYear
                                              );
                                            return `<a href="admin_dashboard.html?${params.toString()}" class="grade-chip ${
                                              filterSection === sectionValue
                                                ? "active"
                                                : ""
                                            }">
                                                <i class="bi bi-collection"></i>
                                                <span>${escapeHtml(
                                                  sectionValue
                                                )}</span>
                                            </a>`;
                                          })
                                          .join("")}
                                    </div>
                                `
                                    : ""
                                }
                                
                                ${
                                  availableFilterDepartments.length > 0
                                    ? `
                                    <div class="grade-filter-group">
                                        <span class="grade-filter-label">Department</span>
                                        <a href="admin_dashboard.html?section=manage_students" class="grade-chip ${
                                          !filterDept ? "active" : ""
                                        }">
                                            <i class="bi bi-grid-1x2"></i>
                                            <span>All Departments</span>
                                        </a>
                                        ${availableFilterDepartments
                                          .map((deptValue) => {
                                            const params = new URLSearchParams({
                                              section: "manage_students",
                                              dept_filter: deptValue,
                                            });
                                            return `<a href="admin_dashboard.html?${params.toString()}" class="grade-chip ${
                                              filterDept === deptValue
                                                ? "active"
                                                : ""
                                            }">
                                                <i class="bi bi-building"></i>
                                                <span>${escapeHtml(
                                                  deptValue
                                                )}</span>
                                            </a>`;
                                          })
                                          .join("")}
                                    </div>
                                `
                                    : ""
                                }
                                
                                ${
                                  majorOptionsForDept.length > 0
                                    ? `
                                    <div class="grade-filter-group">
                                        <span class="grade-filter-label">Major</span>
                                        <a href="admin_dashboard.html?section=manage_students&dept_filter=${filterDept}" class="grade-chip ${
                                        !filterMajor ? "active" : ""
                                      }">
                                            <i class="bi bi-diagram-3"></i>
                                            <span>All Majors</span>
                                        </a>
                                        ${majorOptionsForDept
                                          .map((majorValue) => {
                                            const params = new URLSearchParams({
                                              section: "manage_students",
                                              dept_filter: filterDept,
                                              major_filter: majorValue,
                                            });
                                            return `<a href="admin_dashboard.html?${params.toString()}" class="grade-chip ${
                                              filterMajor === majorValue
                                                ? "active"
                                                : ""
                                            }">
                                                <i class="bi bi-bookmark-check"></i>
                                                <span>${escapeHtml(
                                                  majorValue
                                                )}</span>
                                            </a>`;
                                          })
                                          .join("")}
                                    </div>
                                `
                                    : ""
                                }
                                
                                <div class="grade-filter-group">
                                    <span class="grade-filter-label">Status</span>
                                    <a href="admin_dashboard.html?section=manage_students" class="grade-chip ${
                                      !filterLacking && !filterSanctions
                                        ? "active"
                                        : ""
                                    }">
                                        <i class="bi bi-check-circle"></i>
                                        <span>All Status</span>
                                    </a>
                                    <a href="admin_dashboard.html?section=manage_students&lacking_payment=1" class="grade-chip ${
                                      filterLacking ? "active" : ""
                                    }">
                                        <i class="bi bi-exclamation-triangle"></i>
                                        <span>Lacking Payment</span>
                                    </a>
                                    <a href="admin_dashboard.html?section=manage_students&has_sanctions=1" class="grade-chip ${
                                      filterSanctions ? "active" : ""
                                    }">
                                        <i class="bi bi-shield-exclamation"></i>
                                        <span>Has Sanctions</span>
                                    </a>
                                </div>
                            </div>
                            
                            ${
                              filterYear ||
                              filterSection ||
                              filterDept ||
                              filterMajor ||
                              filterLacking ||
                              filterSanctions ||
                              q
                                ? `
                                <div class="grade-filter-note">
                                    <i class="bi bi-info-circle"></i>
                                    Showing user assignments
                                    ${
                                      filterYear
                                        ? `for <strong>${
                                            filterYear === "1"
                                              ? "1st Year"
                                              : filterYear === "2"
                                              ? "2nd Year"
                                              : filterYear === "3"
                                              ? "3rd Year"
                                              : filterYear === "4"
                                              ? "4th Year"
                                              : filterYear + " Year"
                                          }</strong>`
                                        : ""
                                    }
                                    ${
                                      filterSection
                                        ? `in section <strong>${escapeHtml(
                                            filterSection
                                          )}</strong>`
                                        : ""
                                    }
                                    ${
                                      filterDept
                                        ? `in department <strong>${escapeHtml(
                                            filterDept
                                          )}</strong>`
                                        : ""
                                    }
                                    ${
                                      filterMajor
                                        ? `(Major <strong>${escapeHtml(
                                            filterMajor
                                          )}</strong>)`
                                        : ""
                                    }
                                    ${
                                      filterLacking
                                        ? `with <strong>lacking payment</strong>`
                                        : ""
                                    }
                                    ${
                                      filterSanctions
                                        ? `with <strong>sanctions</strong>`
                                        : ""
                                    }
                                    ${
                                      q
                                        ? `matching "<strong>${escapeHtml(
                                            q
                                          )}</strong>"`
                                        : ""
                                    }
                                    .
                                </div>
                            `
                                : ""
                            }
                        </div>
                    </div>

                    <div class="info-card mt-3">
                        <div class="card-header-modern">
                            <i class="bi bi-list-check"></i>
                            <h3>User Assignments (${total} total)</h3>
                        </div>
                        <div class="table-responsive">
                            <table class="table table-hover">
                                <thead>
                                    <tr>
                                        <th>Full Name</th>
                                        <th>Role</th>
                                        <th>Year</th>
                                        <th>Section</th>
                                        <th>Department</th>
                                        <th>Major</th>
                                        <th>Payment</th>
                                        <th>Sanctions</th>
                                        <th>Owing Amount</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${
                                      paginatedAssignments.length === 0
                                        ? `
                                        <tr>
                                            <td colspan="10" class="text-center text-muted py-4">
                                                <i class="bi bi-inbox"></i> No user assignments found.
                                            </td>
                                        </tr>
                                    `
                                        : paginatedAssignments
                                            .map((r) => {
                                              const fullName =
                                                r.username || "N/A";
                                              const role = r.role || "student";
                                              const roleBadgeClass =
                                                role === "admin"
                                                  ? "danger"
                                                  : role === "teacher"
                                                  ? "info"
                                                  : "success";
                                              const payment =
                                                r.payment || "paid";
                                              const sanctions =
                                                r.sanctions || "";
                                              const owingAmount =
                                                r.owing_amount || "";

                                              // Parse sanctions
                                              let sanctionDisplay = "None";
                                              let sanctionDays = null;
                                              if (sanctions) {
                                                const dateMatch =
                                                  sanctions.match(
                                                    /(\d{4}-\d{2}-\d{2})/
                                                  );
                                                if (dateMatch) {
                                                  const sanctionDate = new Date(
                                                    dateMatch[1]
                                                  );
                                                  const now = new Date();
                                                  if (sanctionDate > now) {
                                                    const diff = Math.ceil(
                                                      (sanctionDate - now) /
                                                        (1000 * 60 * 60 * 24)
                                                    );
                                                    sanctionDays = diff;
                                                    sanctionDisplay =
                                                      diff + " days";
                                                  } else {
                                                    sanctionDisplay = "Expired";
                                                  }
                                                } else if (!isNaN(sanctions)) {
                                                  sanctionDays =
                                                    parseInt(sanctions);
                                                  sanctionDisplay =
                                                    sanctionDays + " days";
                                                } else {
                                                  sanctionDisplay = sanctions;
                                                }
                                              }

                                              return `
                                            <tr>
                                                <td><strong>${escapeHtml(
                                                  fullName
                                                )}</strong></td>
                                                <td>
                                                    <span class="badge bg-${roleBadgeClass}">
                                                        ${escapeHtml(
                                                          role
                                                            .charAt(0)
                                                            .toUpperCase() +
                                                            role.slice(1)
                                                        )}
                                                    </span>
                                                </td>
                                                <td>${escapeHtml(
                                                  r.year || "-"
                                                )}</td>
                                                <td>${escapeHtml(
                                                  r.section || "-"
                                                )}</td>
                                                <td>${escapeHtml(
                                                  r.department || "-"
                                                )}</td>
                                                <td>${escapeHtml(
                                                  r.major || "-"
                                                )}</td>
                                                <td>
                                                    <span class="badge bg-${
                                                      payment === "paid"
                                                        ? "success"
                                                        : "danger"
                                                    }">
                                                        ${escapeHtml(payment)}
                                                    </span>
                                                </td>
                                                <td>
                                                    ${
                                                      sanctionDays !== null &&
                                                      sanctionDays > 0
                                                        ? `
                                                        <span class="badge bg-warning">${sanctionDays} days</span>
                                                    `
                                                        : sanctionDisplay !==
                                                          "None"
                                                        ? `
                                                        <span class="badge bg-warning">${escapeHtml(
                                                          sanctionDisplay
                                                        )}</span>
                                                    `
                                                        : `
                                                        <span class="badge bg-success">None</span>
                                                    `
                                                    }
                                                </td>
                                                <td>
                                                    ${
                                                      payment === "owing" &&
                                                      owingAmount
                                                        ? `
                                                        <span class="text-danger fw-bold">₱${escapeHtml(
                                                          owingAmount
                                                        )}</span>
                                                    `
                                                        : `
                                                        <span class="text-muted">-</span>
                                                    `
                                                    }
                                                </td>
                                                <td>
                                                    <div style="display: flex; gap: 8px;">
                                                        <button type="button" class="Btn Btn-edit" onclick="editUser(${
                                                          r.user_id || "null"
                                                        }, '${escapeHtml(
                                                fullName
                                              )}', '${escapeHtml(
                                                r.section || ""
                                              )}', ${r.id || "null"})">
                                                            <div class="svgWrapper">
                                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 42 42" class="svgIcon">
                                                                    <path stroke-width="5" stroke="#fff" d="M21 5L7 19L5 37L23 35L37 21L21 5Z"></path>
                                                                    <path stroke-width="3" stroke="#fff" d="M21 5L37 21"></path>
                                                                    <path stroke-width="3" stroke="#fff" d="M15 19L23 27"></path>
                                                                </svg>
                                                                <div class="text">Edit</div>
                                                            </div>
                                                        </button>
                                                        ${
                                                          r.id
                                                            ? `
                                                            <button class="Btn Btn-delete" onclick="deleteUserAssignment(${r.id})" type="button">
                                                                <div class="svgWrapper">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 42 42" class="svgIcon">
                                                                        <path stroke-width="5" stroke="#fff" d="M9.14073 2.5H32.8593C33.3608 2.5 33.8291 2.75065 34.1073 3.16795L39.0801 10.6271C39.3539 11.0378 39.5 11.5203 39.5 12.0139V21V37C39.5 38.3807 38.3807 39.5 37 39.5H5C3.61929 39.5 2.5 38.3807 2.5 37V21V12.0139C2.5 11.5203 2.6461 11.0378 2.91987 10.6271L7.89266 3.16795C8.17086 2.75065 8.63921 2.5 9.14073 2.5Z"></path>
                                                                        <path stroke-width="5" stroke="#fff" d="M14 18L28 18M18 14V30M24 14V30"></path>
                                                                    </svg>
                                                                    <div class="text">Delete</div>
                                                                </div>
                                                            </button>
                                                        `
                                                            : ""
                                                        }
                                                    </div>
                                                </td>
                                            </tr>
                                        `;
                                            })
                                            .join("")
                                    }
                                </tbody>
                            </table>
                        </div>
        `;

    // Pagination
    if (totalPages > 1) {
      html += `
                        <nav class="mt-3" aria-label="User assignments pages">
                            <ul class="pagination justify-content-center">
            `;

      const baseParams = new URLSearchParams(window.location.search);
      baseParams.delete("ua_page");

      const prevPage = Math.max(1, page - 1);
      const nextPage = Math.min(totalPages, page + 1);
      const prevClass = page <= 1 ? "disabled" : "";
      const nextClass = page >= totalPages ? "disabled" : "";

      baseParams.set("ua_page", prevPage.toString());
      html += `<li class="page-item ${prevClass}"><a class="page-link" href="?${baseParams.toString()}">&laquo; Previous</a></li>`;

      const showPages = Math.min(5, totalPages);
      const startPage = Math.max(
        1,
        Math.min(page - 2, totalPages - showPages + 1)
      );
      for (
        let p = startPage;
        p < startPage + showPages && p <= totalPages;
        p++
      ) {
        baseParams.set("ua_page", p.toString());
        const isActive = p === page;
        const active = isActive ? " active" : "";
        html += `<li class="page-item${active}"><a class="page-link" href="?${baseParams.toString()}">${p}</a></li>`;
      }

      baseParams.set("ua_page", nextPage.toString());
      html += `<li class="page-item ${nextClass}"><a class="page-link" href="?${baseParams.toString()}">Next &raquo;</a></li>`;

      html += `
                            </ul>
                        </nav>
            `;
    }

    html += `
                    </div>
                </div>
            </div>
        `;

    contentArea.innerHTML = html;

    // Setup course/major dropdowns
    const deptSelect = document.getElementById("assignDepartment");
    const majorSelect = document.getElementById("assignMajor");
    if (deptSelect && majorSelect) {
      refreshMajorOptions(deptSelect, majorSelect);
      deptSelect.addEventListener("change", () =>
        refreshMajorOptions(deptSelect, majorSelect)
      );
    }

    // Setup user search autocomplete
    const userSearchInput = document.getElementById("userSearchInput");
    const userSearchList = document.getElementById("userSearchList");
    const assignFullName = document.getElementById("assignFullName");
    const existingUserIdHidden = document.getElementById(
      "existingUserIdHidden"
    );

    if (userSearchInput && userSearchList) {
      let searchTimeout;
      userSearchInput.addEventListener("input", async (e) => {
        const query = e.target.value.trim();
        clearTimeout(searchTimeout);

        if (query.length < 2) {
          userSearchList.style.display = "none";
          return;
        }

        searchTimeout = setTimeout(async () => {
          try {
            const suggestions = await AdminAPI.getUserSuggestions(query);
            if (suggestions.length === 0) {
              userSearchList.style.display = "none";
              return;
            }

            userSearchList.innerHTML = suggestions
              .map(
                (user) => `
                            <li class="list-group-item list-group-item-action" 
                                onclick="selectUserForAssignment(${
                                  user.id
                                }, '${escapeHtml(
                  user.full_name || user.username
                )}'); return false;">
                                ${escapeHtml(
                                  user.full_name || user.username
                                )} (${escapeHtml(user.username)})
                            </li>
                        `
              )
              .join("");
            userSearchList.style.display = "block";
          } catch (error) {
            console.error("Error fetching suggestions:", error);
          }
        }, 300);
      });

      // Hide suggestions when clicking outside
      document.addEventListener("click", (e) => {
        if (
          !userSearchInput.contains(e.target) &&
          !userSearchList.contains(e.target)
        ) {
          userSearchList.style.display = "none";
        }
      });
    }

    // Setup form submission
    const assignForm = document.getElementById("assignUserForm");
    if (assignForm) {
      assignForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        try {
          const userIdValue = existingUserIdHidden.value;
          const userId =
            userIdValue && userIdValue.trim() !== ""
              ? parseInt(userIdValue)
              : null;

          await AdminAPI.createUserAssignment({
            username: assignFullName.value.trim(),
            year: document.getElementById("assignYear").value,
            section: document.getElementById("assignSection").value.trim(),
            department:
              document.getElementById("assignDepartment").value || null,
            major: document.getElementById("assignMajor").value || null,
            user_id: userId,
          });
          window.location.href = `admin_dashboard.html?section=manage_students&success=created&_t=${Date.now()}`;
        } catch (error) {
          alert(`Error creating assignment: ${error.message}`);
        }
      });
    }
  } catch (error) {
    contentArea.innerHTML = `<div class="alert alert-danger">Error loading students: ${error.message}</div>`;
  }
}

function selectUserForAssignment(userId, fullName) {
  document.getElementById("existingUserIdHidden").value = userId;
  document.getElementById("assignFullName").value = fullName;
  document.getElementById("userSearchInput").value = fullName;
  document.getElementById("userSearchList").style.display = "none";
}

async function deleteUserAssignment(id) {
  if (
    !confirm(
      "Are you sure you want to delete this user assignment? This action cannot be undone."
    )
  )
    return;
  try {
    await AdminAPI.deleteUserAssignment(id);
    window.location.href = `admin_dashboard.html?section=manage_students&success=deleted&_t=${Date.now()}`;
  } catch (error) {
    alert(`Error deleting assignment: ${error.message}`);
  }
}

async function editUser(userId, fullName, section, assignmentId) {
  try {
    // Get assignment data
    let assignment = null;
    const assignments = await AdminAPI.getUserAssignments();
    const assignmentsList = Array.isArray(assignments)
      ? assignments
      : assignments
      ? [assignments]
      : [];

    if (assignmentId) {
      assignment = assignmentsList.find((a) => a.id == assignmentId);
    } else {
      assignment = assignmentsList.find(
        (a) =>
          (a.user_id == userId || a.username === fullName) &&
          (!section || a.section === section)
      );
    }

    const modal = document.getElementById("editUserModal");
    if (!modal) return;

    // Populate modal
    document.getElementById("modalFullNameDisplay").textContent = fullName;
    document.getElementById("modalFullName").value = fullName;
    document.getElementById("modalPayment").value =
      assignment?.payment || "paid";
    document.getElementById("modalDepartment").value =
      assignment?.department || "";
    document.getElementById("modalMajor").value = assignment?.major || "";
    document.getElementById("modalOwingAmount").value =
      assignment?.owing_amount || "";
    document.getElementById("modalSanctions").value =
      assignment?.sanctions || "";

    // Setup course/major dropdowns
    const deptSelect = document.getElementById("modalDepartment");
    const majorSelect = document.getElementById("modalMajor");
    if (deptSelect && majorSelect) {
      refreshMajorOptions(deptSelect, majorSelect);
      if (assignment?.department) {
        deptSelect.value = assignment.department;
        refreshMajorOptions(deptSelect, majorSelect);
        if (assignment.major) {
          setTimeout(() => {
            majorSelect.value = assignment.major;
          }, 100);
        }
      }
      deptSelect.addEventListener("change", () =>
        refreshMajorOptions(deptSelect, majorSelect)
      );
    }

    // Show/hide owing amount based on payment status
    const paymentSelect = document.getElementById("modalPayment");
    const owingRow = document.getElementById("owingRow");
    function toggleOwingRow() {
      owingRow.style.display =
        paymentSelect.value === "owing" ? "block" : "none";
    }
    paymentSelect.addEventListener("change", toggleOwingRow);
    toggleOwingRow();

    // Store IDs and assignment data in modal dataset
    modal.dataset.assignmentId = assignment?.id || "";
    modal.dataset.userId = userId || "";
    modal.dataset.username = assignment?.username || fullName || "";
    modal.dataset.year = assignment?.year || "";
    modal.dataset.section = assignment?.section || section || "";

    // Show modal
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();

    // Setup form submission
    const form = document.getElementById("editUserForm");
    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        await saveUserEdit();
      };
    }
  } catch (error) {
    alert(`Error loading user data: ${error.message}`);
  }
}

async function saveUserEdit() {
  const modal = document.getElementById("editUserModal");
  if (!modal) return;

  const assignmentId = modal.dataset.assignmentId;
  const userId = modal.dataset.userId;
  const username =
    modal.dataset.username || document.getElementById("modalFullName").value;
  const year = modal.dataset.year || "";
  const section = modal.dataset.section || "";
  const fullName = document.getElementById("modalFullName").value;
  const payment = document.getElementById("modalPayment").value;
  const department = document.getElementById("modalDepartment").value;
  const major = document.getElementById("modalMajor").value;
  const owingAmount = document.getElementById("modalOwingAmount").value;
  const sanctions = document.getElementById("modalSanctions").value;

  try {
    if (!username || !year || !section) {
      alert(
        "Error: Missing required fields (username, year, section). Please refresh and try again."
      );
      return;
    }

    const assignmentData = {
      username: username,
      year: year,
      section: section,
      user_id: userId && userId !== "null" ? parseInt(userId) : null,
      payment: payment || null,
      department: department || null,
      major: major || null,
      owing_amount:
        payment === "owing" && owingAmount ? parseFloat(owingAmount) : null,
      sanctions: sanctions || null,
    };

    if (assignmentId && assignmentId !== "") {
      await AdminAPI.updateUserAssignment(assignmentId, assignmentData);
    } else if (userId && userId !== "null") {
      // If no assignment exists, we'd need to create one
      // For now, just update if assignment exists
      alert("Assignment not found. Please create assignment first.");
      return;
    } else {
      alert("Error: No assignment ID found. Please refresh and try again.");
      return;
    }

    // Close modal
    const bsModal = bootstrap.Modal.getInstance(modal);
    bsModal.hide();

    // Reload section
    await loadManageStudentsSection();
  } catch (error) {
    alert(`Error saving user: ${error.message}`);
  }
}

// ==================== SECTIONS ====================
async function loadSectionsSection() {
  const contentArea = document.getElementById("adminContentArea");

  try {
    const sections = await AdminAPI.getSections();

    // Check if we're editing a section
    const urlParams = new URLSearchParams(window.location.search);
    const editSectionId = parseInt(urlParams.get("edit_section_id")) || 0;
    let editSectionRow = null;

    if (editSectionId > 0) {
      editSectionRow = sections.find((s) => s.id === editSectionId);
    }

    // Group sections by year
    const sectionsByYear = {};
    sections.forEach((s) => {
      const year = s.year || "1";
      if (!sectionsByYear[year]) {
        sectionsByYear[year] = [];
      }
      sectionsByYear[year].push(s);
    });

    let html = `
            <div class="records-container">
                <div class="records-header">
                    <h2 class="records-title">
                        <i class="bi bi-collection-fill"></i> Sections
                    </h2>
                    <p class="records-subtitle">Create and manage academic sections for each year level</p>
                </div>
                <div class="records-main">
                    <div class="info-card">
                        <div class="card-header-modern">
                            <i class="bi bi-collection-fill"></i>
                            <h3>${
                              editSectionRow
                                ? "Edit Section"
                                : "Create New Section"
                            }</h3>
                        </div>
                        <form id="sectionForm" class="form-small">
                            ${
                              editSectionRow
                                ? `
                                <input type="hidden" name="action" value="update" />
                                <input type="hidden" name="id" value="${editSectionRow.id}" />
                            `
                                : `
                                <input type="hidden" name="action" value="create" />
                            `
                            }
                            
                            <div class="row g-3 mb-3">
                                <div class="col-md-6">
                                    <label class="admin-form-label" for="sectionFormYear"><i class="bi bi-calendar-year"></i> Year</label>
                                    <select name="year" id="sectionFormYear" class="form-select form-select-lg" required>
                                        <option value="">Select Year...</option>
                                        <option value="1" ${
                                          editSectionRow &&
                                          editSectionRow.year === "1"
                                            ? "selected"
                                            : ""
                                        }>1st Year</option>
                                        <option value="2" ${
                                          editSectionRow &&
                                          editSectionRow.year === "2"
                                            ? "selected"
                                            : ""
                                        }>2nd Year</option>
                                        <option value="3" ${
                                          editSectionRow &&
                                          editSectionRow.year === "3"
                                            ? "selected"
                                            : ""
                                        }>3rd Year</option>
                                        <option value="4" ${
                                          editSectionRow &&
                                          editSectionRow.year === "4"
                                            ? "selected"
                                            : ""
                                        }>4th Year</option>
                                    </select>
                                </div>
                                <div class="col-md-6">
                                    <label class="admin-form-label" for="sectionFormName"><i class="bi bi-tag-fill"></i> Section Name</label>
                                    <input name="name" id="sectionFormName" class="form-control form-control-lg" placeholder="e.g. Power, Benevolence, Excellence" required value="${
                                      editSectionRow
                                        ? escapeHtml(editSectionRow.name)
                                        : ""
                                    }" autocomplete="off"/>
                                </div>
                            </div>
                            
                            <button type="submit" class="btn btn-primary btn-lg">
                                <i class="bi bi-check-circle me-2"></i>${
                                  editSectionRow
                                    ? "Update Section"
                                    : "Create Section"
                                }
                            </button>
                            ${
                              editSectionRow
                                ? `
                                <a href="admin_dashboard.html?section=sections" class="btn btn-secondary btn-lg ms-2">
                                    <i class="bi bi-x-circle me-2"></i>Cancel
                                </a>
                            `
                                : ""
                            }
                        </form>
                    </div>
        `;

    if (sections.length === 0) {
      html += `
                <div class="info-card mt-3">
                    <div class="card-header-modern">
                        <i class="bi bi-collection"></i>
                        <h3>No Sections</h3>
                    </div>
                    <p class="text-muted mb-0">No sections have been created yet. Create one above to get started.</p>
                </div>
            `;
    } else {
      const years = ["1", "2", "3", "4"];
      years.forEach((yearNum) => {
        if (!sectionsByYear[yearNum] || sectionsByYear[yearNum].length === 0) {
          return;
        }

        const yearLabel =
          yearNum === "1"
            ? "1st Year"
            : yearNum === "2"
            ? "2nd Year"
            : yearNum === "3"
            ? "3rd Year"
            : "4th Year";

        html += `
                    <div class="info-card grade-year-card mt-3">
                        <div class="card-header-modern">
                            <i class="bi bi-calendar-year"></i>
                            <h3>${yearLabel}</h3>
                        </div>
                        <div class="grade-year-body">
                            <div class="grade-student-list">
                                ${sectionsByYear[yearNum]
                                  .map((section) => {
                                    const firstLetter =
                                      (section.name || "")
                                        .trim()
                                        .charAt(0)
                                        .toUpperCase() || "?";
                                    return `
                                        <div class="student-grade-card">
                                            <div class="student-grade-main">
                                                <div style="width: 56px; height: 56px; border-radius: 16px; background: linear-gradient(135deg, var(--color-flora), var(--color-sage)); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 700; color: white; flex-shrink: 0;">
                                                    ${firstLetter}
                                                </div>
                                                <div>
                                                    <span class="student-grade-name">${escapeHtml(
                                                      section.name || "N/A"
                                                    )}</span>
                                                    <span class="student-grade-summary">Section for ${yearLabel}</span>
                                                </div>
                                            </div>
                                            <div class="student-grade-meta">
                                                <div style="display: flex; gap: 8px; align-items: center;">
                                                    <a href="admin_dashboard.html?section=sections&edit_section_id=${
                                                      section.id
                                                    }" class="Btn Btn-edit">
                                                        <div class="svgWrapper">
                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 42 42" class="svgIcon">
                                                                <path stroke-width="5" stroke="#fff" d="M21 5L7 19L5 37L23 35L37 21L21 5Z"></path>
                                                                <path stroke-width="3" stroke="#fff" d="M21 5L37 21"></path>
                                                                <path stroke-width="3" stroke="#fff" d="M15 19L23 27"></path>
                                                            </svg>
                                                            <div class="text">Edit</div>
                                                        </div>
                                                    </a>
                                                    <button class="Btn Btn-delete" onclick="deleteSection(${
                                                      section.id
                                                    }, '${escapeHtml(
                                      section.name
                                    )}')">
                                                        <div class="svgWrapper">
                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 42 42" class="svgIcon">
                                                                <path stroke-width="5" stroke="#fff" d="M9.14073 2.5H32.8593C33.3608 2.5 33.8291 2.75065 34.1073 3.16795L39.0801 10.6271C39.3539 11.0378 39.5 11.5203 39.5 12.0139V21V37C39.5 38.3807 38.3807 39.5 37 39.5H5C3.61929 39.5 2.5 38.3807 2.5 37V21V12.0139C2.5 11.5203 2.6461 11.0378 2.91987 10.6271L7.89266 3.16795C8.17086 2.75065 8.63921 2.5 9.14073 2.5Z"></path>
                                                                <path stroke-width="5" stroke="#fff" d="M14 18L28 18M18 14V30M24 14V30"></path>
                                                            </svg>
                                                            <div class="text">Delete</div>
                                                        </div>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    `;
                                  })
                                  .join("")}
                            </div>
                        </div>
                    </div>
                `;
      });
    }

    html += `
                </div>
            </div>
        `;

    contentArea.innerHTML = html;
    const sectionForm = document.getElementById("sectionForm");
    if (sectionForm) {
      sectionForm.addEventListener("submit", (e) => {
        saveScrollPosition();
        handleSectionSubmit(e);
      });
    }
  } catch (error) {
    contentArea.innerHTML = `<div class="alert alert-danger">Error loading sections: ${error.message}</div>`;
  }
}

async function handleSectionSubmit(e) {
  e.preventDefault();
  try {
    const form = e.target;
    const action =
      form.querySelector('input[name="action"]')?.value || "create";
    const id = form.querySelector('input[name="id"]')?.value;

    const sectionData = {
      year: document.getElementById("sectionFormYear").value,
      name: document.getElementById("sectionFormName").value,
    };

    if (action === "update" && id) {
      await AdminAPI.updateSection(id, sectionData);
      window.location.href = `admin_dashboard.html?section=sections&success=updated&_t=${Date.now()}`;
    } else {
      await AdminAPI.createSection(sectionData);
      window.location.href = `admin_dashboard.html?section=sections&success=created&_t=${Date.now()}`;
    }
  } catch (error) {
    alert(
      `Error ${
        form.querySelector('input[name="action"]')?.value === "update"
          ? "updating"
          : "creating"
      } section: ${error.message}`
    );
  }
}

async function deleteSection(id, name) {
  if (
    !confirm(
      `Are you sure you want to delete the section "${name}"? This action cannot be undone.`
    )
  )
    return;
  saveScrollPosition();
  try {
    await AdminAPI.deleteSection(id);
    window.location.href = `admin_dashboard.html?section=sections&success=deleted&_t=${Date.now()}`;
  } catch (error) {
    alert(`Error deleting section: ${error.message}`);
  }
}

// ==================== SUBJECTS ====================
async function loadSubjectsSection() {
  const contentArea = document.getElementById("adminContentArea");

  try {
    const urlParams = new URLSearchParams(window.location.search);
    const editSubjectId = parseInt(urlParams.get("edit_subject_id")) || 0;

    const subjects = await AdminAPI.getSubjects();
    const editSubjectRow =
      editSubjectId > 0 ? subjects.find((s) => s.id === editSubjectId) : null;

    const semesterOptions = ["First Semester", "Second Semester"];

    // Format ordinal helper
    function formatOrdinal(number) {
      const num = parseInt(number);
      const ends = ["th", "st", "nd", "rd", "th", "th", "th", "th", "th", "th"];
      if (num % 100 >= 11 && num % 100 <= 13) {
        return num + "th";
      }
      return num + (ends[num % 10] || "th");
    }

    let html = `
      <div class="subject-catalog admin-card">
        <div class="subject-catalog-header d-flex align-items-center gap-3 mb-4">
          <div class="subject-catalog-icon p-3 rounded-xl bg-gradient-to-br border">
            <i class="bi bi-journal-text" style="font-size:1.25rem; color:var(--color-tech-blue)"></i>
          </div>
          <div>
            <h2 class="mb-0">Subject Catalog</h2>
            <p class="mb-0 text-muted">Centralize subject codes, titles, and units to avoid typos when building study loads.</p>
          </div>
        </div>

        <div class="row g-4">
          <div class="col-lg-6">
            <div class="card subject-card p-4">
              <div class="d-flex align-items-center mb-3 gap-2">
                <i class="bi bi-plus-circle" style="color:var(--color-sky-surge)"></i>
                <h4 class="mb-0">${
                  editSubjectRow ? "Edit Subject" : "Add New Subject"
                }</h4>
              </div>

              <form id="subjectForm" class="needs-validation" novalidate>
                <input type="hidden" name="action" value="${
                  editSubjectRow ? "update" : "create"
                }" />
                ${
                  editSubjectRow
                    ? `<input type="hidden" name="id" value="${editSubjectRow.id}" />`
                    : ""
                }
                <div class="mb-3">
                  <label class="form-label">Subject Code</label>
                  <div class="input-group">
                    <span class="input-group-text bg-transparent border-end-0"><i class="bi bi-upc-scan"></i></span>
                    <input id="subjectCodeInput" name="subject_code" class="form-control form-control-lg border-start-0" placeholder="e.g. IT101" value="${
                      editSubjectRow
                        ? escapeHtml(editSubjectRow.subject_code || "")
                        : ""
                    }" required />
                  </div>
                </div>

                <div class="mb-3">
                  <label class="form-label">Descriptive Title</label>
                  <div class="input-group">
                    <span class="input-group-text bg-transparent border-end-0"><i class="bi bi-journal-text"></i></span>
                    <input id="subjectTitleInput" name="title" class="form-control form-control-lg border-start-0" placeholder="Introduction to Computing" value="${
                      editSubjectRow
                        ? escapeHtml(editSubjectRow.title || "")
                        : ""
                    }" required />
                  </div>
                </div>

                <div class="row g-2">
                  <div class="col-4">
                    <label class="form-label">Units</label>
                    <input id="subjectUnitsInput" name="units" type="number" min="0" step="0.5" class="form-control" value="${
                      editSubjectRow
                        ? parseFloat(editSubjectRow.units) || ""
                        : ""
                    }" required />
                  </div>
                  <div class="col-8">
                    <label class="form-label">Course</label>
                    <select id="subjectCourseSelect" name="course" class="form-select" required data-course-select>
                      <option value="">Select course...</option>
                      <option value="All Courses">All Courses</option>
                      ${Object.keys(courseMajorConfig)
                        .map(
                          (courseKey) =>
                            `<option value="${escapeHtml(courseKey)}" ${
                              editSubjectRow &&
                              editSubjectRow.course === courseKey
                                ? "selected"
                                : ""
                            }>${escapeHtml(courseKey)}</option>`
                        )
                        .join("")}
                    </select>
                  </div>
                </div>

                <div class="row g-2 mt-2">
                  <div class="col-6">
                    <label class="form-label">Major</label>
                    <select id="subjectMajorSelect" name="major" class="form-select" data-major-select>
                      <option value="">Select major...</option>
                      ${Object.keys(courseMajorConfig)
                        .map((courseKey) =>
                          courseMajorConfig[courseKey]
                            .map(
                              (majorName) =>
                                `<option value="${escapeHtml(
                                  majorName
                                )}" data-course="${escapeHtml(courseKey)}" ${
                                  editSubjectRow &&
                                  editSubjectRow.major === majorName
                                    ? "selected"
                                    : ""
                                }>${escapeHtml(majorName)}</option>`
                            )
                            .join("")
                        )
                        .join("")}
                    </select>
                  </div>
                  <div class="col-3">
                    <label class="form-label">Year Level</label>
                    <select id="subjectYearSelect" name="year_level" class="form-select" required>
                      <option value="">Select year...</option>
                      ${[1, 2, 3, 4]
                        .map(
                          (y) =>
                            `<option value="${y}" ${
                              editSubjectRow &&
                              parseInt(editSubjectRow.year_level) === y
                                ? "selected"
                                : ""
                            }>${formatOrdinal(y)}</option>`
                        )
                        .join("")}
                    </select>
                  </div>
                  <div class="col-3">
                    <label class="form-label">Semester</label>
                    <select id="subjectSemesterSelect" name="semester" class="form-select" required>
                      <option value="All Semesters">All Semesters</option>
                      ${semesterOptions
                        .map(
                          (sem) =>
                            `<option value="${escapeHtml(sem)}" ${
                              editSubjectRow &&
                              (editSubjectRow.semester || "") === sem
                                ? "selected"
                                : !editSubjectRow && sem === "First Semester"
                                ? "selected"
                                : ""
                            }>${escapeHtml(sem)}</option>`
                        )
                        .join("")}
                    </select>
                  </div>
                </div>

                <div class="mt-3 d-flex gap-2">
                  <button class="btn backup-primary-btn w-100" type="submit">${
                    editSubjectRow ? "Save Changes" : "Add Subject"
                  }</button>
                  ${
                    editSubjectRow
                      ? `<a href="admin_dashboard.html?section=subjects" class="btn backup-outline-btn">Cancel</a>`
                      : ""
                  }
                </div>
              </form>
            </div>
          </div>

          <div class="col-lg-6">
            <div class="card subject-card p-4">
              <div class="d-flex align-items-center mb-3 gap-2">
                <i class="bi bi-list" style="color:var(--color-tech-blue)"></i>
                <h4 class="mb-0">Subject List <small class="text-muted">${
                  subjects.length
                } total</small></h4>
              </div>

              <div class="mb-3 row g-2">
                <div class="col-6">
                  <select id="filterCourse" class="form-select">
                    <option value="">All Courses</option>
                    ${Object.keys(courseMajorConfig)
                      .map(
                        (courseKey) =>
                          `<option value="${escapeHtml(
                            courseKey
                          )}">${escapeHtml(courseKey)}</option>`
                      )
                      .join("")}
                  </select>
                </div>
                <div class="col-6">
                  <select id="filterMajor" class="form-select">
                    <option value="">All Majors</option>
                  </select>
                </div>
              </div>

              <div class="subject-list" style="max-height:480px; overflow:auto">
                <table class="table table-hover align-middle">
                  <thead>
                    <tr><th>Code</th><th>Title</th><th>Units</th><th>Year</th><th>Semester</th><th>Actions</th></tr>
                  </thead>
                  <tbody id="subjectTableBody">
                    ${subjects
                      .map((subject) => {
                        const updatedDate = subject.updated_at
                          ? new Date(subject.updated_at).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              }
                            )
                          : "N/A";
                        return `
                        <tr>
                          <td><strong>${escapeHtml(
                            subject.subject_code || "N/A"
                          )}</strong></td>
                          <td>${escapeHtml(subject.title || "N/A")}</td>
                          <td>${parseFloat(subject.units) || 0}</td>
                          <td>${formatOrdinal(
                            parseInt(subject.year_level) || 1
                          )}</td>
                          <td>${escapeHtml(subject.semester || "N/A")}</td>
                          <td>
                            <div class="d-flex gap-2 action-group">
                              <a href="admin_dashboard.html?section=subjects&edit_subject_id=${
                                subject.id
                              }" class="action-pill edit" title="Edit Subject"><i class="bi bi-pencil"></i><span class="visually-hidden">Edit</span></a>
                              <button type="button" class="action-pill delete" title="Delete Subject" onclick="deleteSubject(${
                                subject.id
                              }, '${escapeHtml(
                          subject.subject_code || ""
                        )}')"><i class="bi bi-trash"></i><span class="visually-hidden">Delete</span></button>
                            </div>
                          </td>
                        </tr>
                      `;
                      })
                      .join("")}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    contentArea.innerHTML = html;

    // Store original subjects for filtering
    window.allSubjects = subjects;

    // Setup course/major dependency
    const courseSelect = document.getElementById("subjectCourseSelect");
    const majorSelect = document.getElementById("subjectMajorSelect");
    if (courseSelect && majorSelect) {
      // Filter majors based on selected course
      courseSelect.addEventListener("change", function () {
        refreshMajorOptions(courseSelect, majorSelect);
      });

      // Initial filter if editing
      if (editSubjectRow && editSubjectRow.course) {
        refreshMajorOptions(courseSelect, majorSelect);
      }
    }

    // Setup subject list filtering
    const filterCourse = document.getElementById("filterCourse");
    const filterMajor = document.getElementById("filterMajor");
    const filterYear = document.getElementById("filterYear");
    const filterSemester = document.getElementById("filterSemester");
    const clearFiltersBtn = document.getElementById("clearFilters");
    const subjectTableBody = document.getElementById("subjectTableBody");
    const subjectCountBadge = document.getElementById("subjectCountBadge");

    function updateMajorFilterOptions() {
      if (!filterMajor) return;
      const selectedCourse = filterCourse?.value || "";
      filterMajor.innerHTML = '<option value="">All Majors</option>';

      if (selectedCourse && courseMajorConfig[selectedCourse]) {
        courseMajorConfig[selectedCourse].forEach((major) => {
          filterMajor.innerHTML += `<option value="${escapeHtml(
            major
          )}">${escapeHtml(major)}</option>`;
        });
      } else if (!selectedCourse) {
        // Show all majors from all courses
        Object.values(courseMajorConfig)
          .flat()
          .forEach((major) => {
            if (
              !filterMajor.querySelector(`option[value="${escapeHtml(major)}"]`)
            ) {
              filterMajor.innerHTML += `<option value="${escapeHtml(
                major
              )}">${escapeHtml(major)}</option>`;
            }
          });
      }
    }

    function filterSubjects() {
      if (!subjectTableBody || !window.allSubjects) return;

      const courseFilter = filterCourse?.value || "";
      const majorFilter = filterMajor?.value || "";
      const yearFilter = filterYear?.value || "";
      const semesterFilter = filterSemester?.value || "";

      const filtered = window.allSubjects.filter((subject) => {
        if (courseFilter && subject.course !== courseFilter) return false;
        if (majorFilter && subject.major !== majorFilter) return false;
        if (yearFilter && parseInt(subject.year_level) !== parseInt(yearFilter))
          return false;
        if (semesterFilter && subject.semester !== semesterFilter) return false;
        return true;
      });

      // Update table
      subjectTableBody.innerHTML = filtered
        .map((subject) => {
          const updatedDate = subject.updated_at
            ? new Date(subject.updated_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : "N/A";
          return `
                    <tr>
                        <td><strong>${escapeHtml(
                          subject.subject_code || "N/A"
                        )}</strong></td>
                        <td>${escapeHtml(subject.title || "N/A")}</td>
                        <td>${parseFloat(subject.units) || 0}</td>
                        <td>${escapeHtml(subject.course || "N/A")}</td>
                        <td>${escapeHtml(subject.major || "N/A")}</td>
                        <td>${formatOrdinal(
                          parseInt(subject.year_level) || 1
                        )}</td>
                        <td>${escapeHtml(subject.semester || "N/A")}</td>
                        <td>${escapeHtml(updatedDate)}</td>
                        <td>
                            <div class="d-flex gap-2">
                                <a href="admin_dashboard.html?section=subjects&edit_subject_id=${
                                  subject.id
                                }" class="btn btn-sm btn-outline-primary" title="Edit Subject">
                                    <i class="bi bi-pencil"></i>
                                </a>
                                <button type="button" class="btn btn-sm btn-outline-danger" title="Delete Subject" onclick="deleteSubject(${
                                  subject.id
                                }, '${escapeHtml(
            subject.subject_code || ""
          )}')">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
        })
        .join("");

      // Update count
      if (subjectCountBadge) {
        subjectCountBadge.textContent = `${filtered.length} total`;
      }
    }

    if (filterCourse) {
      filterCourse.addEventListener("change", function () {
        updateMajorFilterOptions();
        filterSubjects();
      });
    }

    if (filterMajor) {
      filterMajor.addEventListener("change", filterSubjects);
    }

    if (filterYear) {
      filterYear.addEventListener("change", filterSubjects);
    }

    if (filterSemester) {
      filterSemester.addEventListener("change", filterSubjects);
    }

    if (clearFiltersBtn) {
      clearFiltersBtn.addEventListener("click", function () {
        if (filterCourse) filterCourse.value = "";
        if (filterMajor) filterMajor.value = "";
        if (filterYear) filterYear.value = "";
        if (filterSemester) filterSemester.value = "";
        updateMajorFilterOptions();
        filterSubjects();
      });
    }

    // Initialize major filter options
    updateMajorFilterOptions();

    // Setup form submission
    const subjectForm = document.getElementById("subjectForm");
    if (subjectForm) {
      subjectForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        saveScrollPosition();
        await handleSubjectSubmit(e, editSubjectRow);
      });
    }
  } catch (error) {
    contentArea.innerHTML = `<div class="alert alert-danger">Error loading subjects: ${error.message}</div>`;
  }
}

async function handleSubjectSubmit(e, editSubjectRow) {
  e.preventDefault();
  try {
    const formData = {
      subject_code: document.getElementById("subjectCodeInput").value,
      title: document.getElementById("subjectTitleInput").value,
      units: parseInt(document.getElementById("subjectUnitsInput").value) || 0,
      course: document.getElementById("subjectCourseSelect").value,
      major: document.getElementById("subjectMajorSelect").value,
      year_level: parseInt(document.getElementById("subjectYearSelect").value),
      semester: document.getElementById("subjectSemesterSelect").value,
    };

    if (editSubjectRow && editSubjectRow.id) {
      // Update existing subject
      await AdminAPI.updateSubject(editSubjectRow.id, formData);
    } else {
      // Create new subject
      await AdminAPI.createSubject(formData);
    }

    window.location.href = `admin_dashboard.html?section=subjects&_t=${Date.now()}`;
  } catch (error) {
    alert(
      `Error ${editSubjectRow ? "updating" : "creating"} subject: ${
        error.message
      }`
    );
  }
}

async function deleteSubject(id, subjectCode) {
  if (!confirm(`Delete subject ${subjectCode || id}?`)) return;
  try {
    await AdminAPI.deleteSubject(id);
    window.location.href = `admin_dashboard.html?section=subjects&_t=${Date.now()}`;
  } catch (error) {
    alert(`Error deleting subject: ${error.message}`);
  }
}

// ==================== ANNOUNCEMENTS ====================
async function loadAnnouncementsSection() {
  const contentArea = document.getElementById("adminContentArea");

  try {
    const announcements = await AdminAPI.getAnnouncements();

    // Ensure announcements is an array
    const announcementsList = Array.isArray(announcements)
      ? announcements
      : announcements
      ? [announcements]
      : [];

    let html = `
        <div class="records-container">
          <div class="records-header">
            <h2 class="records-title">
              <i class="bi bi-megaphone-fill"></i> Announcements
            </h2>
            <p class="records-subtitle">Compose fresh updates, pin urgent bulletins, and keep the campus informed with streamlined editing tools.</p>
          </div>
          <div class="records-main">
            <div class="subject-catalog">
              <div class="subject-card announcement-form-container">
                <div class="card-header-modern text-center">
                  <i class="bi bi-megaphone-fill"></i>
                  <h3>Create New Announcement</h3>
                </div>
                <form id="announcementForm" class="announcement-form-centered">
                  <div class="mb-3">
                    <label class="form-label" for="announcementTitle">
                      <i class="bi bi-type"></i> Title
                    </label>
                    <div class="input-icon-wrapper">
                      <i class="bi bi-type input-icon"></i>
                      <input type="text" id="announcementTitle" name="title" class="form-control form-control-lg" placeholder="Enter announcement title" required>
                    </div>
                  </div>
                  <div class="mb-3">
                    <label class="form-label" for="announcementContent">
                      <i class="bi bi-file-text"></i> Content
                    </label>
                    <div class="input-icon-wrapper">
                      <i class="bi bi-file-text input-icon textarea-icon"></i>
                      <textarea id="announcementContent" name="content" class="form-control form-control-lg" rows="5" placeholder="Enter announcement content" required></textarea>
                    </div>
                  </div>
                  <div class="row g-3 mb-3">
                    <div class="col-md-4">
                      <label class="form-label" for="announcementYear">
                        <i class="bi bi-calendar-year"></i> Year
                      </label>
                      <div class="input-icon-wrapper">
                        <i class="bi bi-calendar-year input-icon select-icon"></i>
                        <select name="year" id="announcementYear" class="form-select form-select-lg">
                          <option value="">All Years</option>
                          <option value="1">1st Year</option>
                          <option value="2">2nd Year</option>
                          <option value="3">3rd Year</option>
                          <option value="4">4th Year</option>
                        </select>
                      </div>
                    </div>
                    <div class="col-md-4">
                      <label class="form-label" for="announcementDepartment">
                        <i class="bi bi-building"></i> Department
                      </label>
                      <div class="input-icon-wrapper">
                        <i class="bi bi-building input-icon select-icon"></i>
                        <select name="department" id="announcementDepartment" class="form-select form-select-lg" data-course-select>
                          <option value="">All Departments</option>
                          <option value="IT">IT</option>
                          <option value="BEED">BEED</option>
                          <option value="BSED">BSED</option>
                          <option value="TOURISM">TOURISM</option>
                          <option value="HM">HM</option>
                        </select>
                      </div>
                    </div>
                    <div class="col-md-4">
                      <label class="form-label" for="announcementMajor">
                        <i class="bi bi-diagram-3"></i> Major
                      </label>
                      <div class="input-icon-wrapper">
                        <i class="bi bi-diagram-3 input-icon select-icon"></i>
                        <select name="major" id="announcementMajor" class="form-select form-select-lg" data-major-select>
                          <option value="">All Majors</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div class="text-center">
                    <button type="submit" class="backup-primary-btn btn-lg px-5">
                      <i class="bi bi-check-circle me-2"></i>Save Announcement
                    </button>
                  </div>
                </form>
              </div>
            </div>
      `;

    if (announcementsList.length === 0) {
      html += `
                <div class="info-card mt-3">
                    <div class="card-header-modern">
                        <i class="bi bi-megaphone"></i>
                        <h3>No Announcements</h3>
                    </div>
                    <p class="text-muted mb-0">No announcements have been created yet. Create one above to get started.</p>
                </div>
            `;
    } else {
      html += `<div class="announcements-grid mt-3">`;
      announcementsList.forEach((a) => {
        const yearNum = parseInt(a.year || 0);
        const yearLabel =
          yearNum > 0 ? formatOrdinal(yearNum) + " Year" : a.year || "";
        html += `
                    <div class="announcement-card-modern">
                        <div class="announcement-card-header">
                            <div class="announcement-title-section">
                                <h4 class="announcement-title">${escapeHtml(
                                  a.title || "N/A"
                                )}</h4>
                                <div class="announcement-meta">
                                    <span class="announcement-date">
                                        <i class="bi bi-calendar3"></i>
                                        ${formatAnnouncementDate(a.date)}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div class="announcement-content">
                            <p>${escapeHtml(a.content || "").replace(
                              /\n/g,
                              "<br>"
                            )}</p>
                        </div>
                        <div class="announcement-footer">
                            ${
                              a.year
                                ? `<span class="announcement-badge"><i class="bi bi-mortarboard"></i>${escapeHtml(
                                    yearLabel
                                  )}</span>`
                                : ""
                            }
                            ${
                              a.department
                                ? `<span class="announcement-badge"><i class="bi bi-building"></i>${escapeHtml(
                                    a.department
                                  )}</span>`
                                : ""
                            }
                            ${
                              a.major
                                ? `<span class="announcement-badge"><i class="bi bi-diagram-3"></i>${escapeHtml(
                                    a.major
                                  )}</span>`
                                : ""
                            }
                            <div class="announcement-actions" style="display: flex; gap: 8px;">
                                <a href="admin_dashboard.html?section=announcements&edit_id=${
                                  a.id
                                }" class="Btn Btn-edit">
                                    <div class="svgWrapper">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 42 42" class="svgIcon">
                                            <path stroke-width="5" stroke="#fff" d="M21 5L7 19L5 37L23 35L37 21L21 5Z"></path>
                                            <path stroke-width="3" stroke="#fff" d="M21 5L37 21"></path>
                                            <path stroke-width="3" stroke="#fff" d="M15 19L23 27"></path>
                                        </svg>
                                        <div class="text">Edit</div>
                                    </div>
                                </a>
                                <button class="Btn Btn-delete" onclick="deleteAnnouncement(${
                                  a.id
                                })" type="button">
                                    <div class="svgWrapper">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 42 42" class="svgIcon">
                                            <path stroke-width="5" stroke="#fff" d="M9.14073 2.5H32.8593C33.3608 2.5 33.8291 2.75065 34.1073 3.16795L39.0801 10.6271C39.3539 11.0378 39.5 11.5203 39.5 12.0139V21V37C39.5 38.3807 38.3807 39.5 37 39.5H5C3.61929 39.5 2.5 38.3807 2.5 37V21V12.0139C2.5 11.5203 2.6461 11.0378 2.91987 10.6271L7.89266 3.16795C8.17086 2.75065 8.63921 2.5 9.14073 2.5Z"></path>
                                            <path stroke-width="5" stroke="#fff" d="M14 18L28 18M18 14V30M24 14V30"></path>
                                        </svg>
                                        <div class="text">Delete</div>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
      });
      html += `</div>`;
    }

    html += `</div></div>`;

    contentArea.innerHTML = html;

    // Setup course/major dropdowns for announcement form
    const deptSelect = document.getElementById("announcementDepartment");
    const majorSelect = document.getElementById("announcementMajor");
    if (deptSelect && majorSelect) {
      // Use the global courseMajorConfig
      function updateMajorOptions() {
        const course = deptSelect.value;
        const majors = courseMajorConfig[course] || [];
        majorSelect.innerHTML = '<option value="">All Majors</option>';
        majors.forEach((major) => {
          const opt = document.createElement("option");
          opt.value = major;
          opt.textContent = major;
          majorSelect.appendChild(opt);
        });
        majorSelect.disabled = majors.length === 0;
      }
      deptSelect.addEventListener("change", updateMajorOptions);
      updateMajorOptions();
    }

    const announcementForm = document.getElementById("announcementForm");
    if (announcementForm) {
      announcementForm.addEventListener("submit", (e) => {
        saveScrollPosition();
        handleAnnouncementSubmit(e);
      });
    }


    // Handle edit mode from URL
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get("edit_id");
    if (editId) {
      const announcement = announcementsList.find((a) => a.id == editId);
      if (announcement) {
        document.getElementById("announcementTitle").value =
          announcement.title || "";
        document.getElementById("announcementContent").value =
          announcement.content || "";
        if (announcement.year)
          document.getElementById("announcementYear").value = announcement.year;
        if (announcement.department) {
          document.getElementById("announcementDepartment").value =
            announcement.department;
          deptSelect.dispatchEvent(new Event("change"));
          if (announcement.major) {
            setTimeout(() => {
              document.getElementById("announcementMajor").value =
                announcement.major;
            }, 100);
          }
        }
      }
    }
  } catch (error) {
    contentArea.innerHTML = `<div class="alert alert-danger">Error loading announcements: ${error.message}</div>`;
  }
}

async function handleAnnouncementSubmit(e) {
  e.preventDefault();
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get("edit_id");

    const announcementData = {
      title: document.getElementById("announcementTitle").value,
      content: document.getElementById("announcementContent").value,
      year: document.getElementById("announcementYear").value || null,
      department:
        document.getElementById("announcementDepartment").value || null,
      major: document.getElementById("announcementMajor").value || null,
    };

    if (editId) {
      await AdminAPI.updateAnnouncement(editId, announcementData);
      window.location.href = `admin_dashboard.html?section=announcements&success=updated&_t=${Date.now()}`;
    } else {
      await AdminAPI.createAnnouncement(announcementData);
      window.location.href = `admin_dashboard.html?section=announcements&success=created&_t=${Date.now()}`;
    }
  } catch (error) {
    const urlParams = new URLSearchParams(window.location.search);
    alert(
      `Error ${
        urlParams.get("edit_id") ? "updating" : "creating"
      } announcement: ${error.message}`
    );
  }
}

async function deleteAnnouncement(id) {
  if (!confirm("Are you sure?")) return;
  saveScrollPosition();
  try {
    await AdminAPI.deleteAnnouncement(id);
    window.location.href = `admin_dashboard.html?section=announcements&_t=${Date.now()}`;
  } catch (error) {
    alert(`Error deleting announcement: ${error.message}`);
  }
}

// ==================== PROJECTS ====================
async function loadProjectsSection() {
  const contentArea = document.getElementById("adminContentArea");

  try {
    const projects = await AdminAPI.getProjects();

    // Ensure projects is an array
    const projectsList = Array.isArray(projects)
      ? projects
      : projects
      ? [projects]
      : [];

    // Pagination
    const urlParams = new URLSearchParams(window.location.search);
    const projPerPage = 5;
    const projPage = parseInt(urlParams.get("proj_page")) || 1;
    const projTotal = projectsList.length;
    const projTotalPages = Math.max(1, Math.ceil(projTotal / projPerPage));
    const projectsPage = projectsList.slice(
      (projPage - 1) * projPerPage,
      projPage * projPerPage
    );

    let html = `
            <div class="records-container">
                <div class="records-header">
                    <h2 class="records-title">
                        <i class="bi bi-folder-fill"></i> Projects
                    </h2>
                    <p class="records-subtitle">Manage campus projects and track their progress</p>
                </div>
                <div class="records-main">
                    <div class="info-card">
                        <div class="card-header-modern">
                            <i class="bi bi-folder-fill"></i>
                            <h3>Create New Project</h3>
                        </div>
                        <form id="projectForm" class="form-small">
                            <div class="mb-2">
                                <label class="form-label" for="projectName">Project Name</label>
                                <input type="text" name="name" id="projectName" class="form-control" required autocomplete="organization"/>
                            </div>
                            <div class="mb-2 row g-2">
                                <div class="col">
                                    <label class="form-label" for="projectBudget">Budget</label>
                                    <input type="text" name="budget" id="projectBudget" class="form-control" required autocomplete="off"/>
                                </div>
                                <div class="col">
                                    <label class="form-label" for="projectStarted">Started</label>
                                    <input type="date" name="started" id="projectStarted" class="form-control" required autocomplete="off"/>
                                </div>
                            </div>
                            <div class="mb-2">
                                <label class="form-label" for="projectCompleted">Completed?</label>
                                <select name="completed" id="projectCompleted" class="form-select">
                                    <option value="no">No</option>
                                    <option value="yes">Yes</option>
                                </select>
                            </div>
                            <button type="submit" class="btn btn-primary">Save Project</button>
                        </form>
                    </div>
        `;

    if (projectsPage.length === 0) {
      html += `
                <div class="info-card mt-3">
                    <div class="card-header-modern">
                        <i class="bi bi-folder-x"></i>
                        <h3>No Projects</h3>
                    </div>
                    <p class="text-muted mb-0">No projects have been created yet. Create one above to get started.</p>
                </div>
            `;
    } else {
      html += `<div class="projects-grid mt-3">`;

      projectsPage.forEach((proj, index) => {
        const actualIndex = (projPage - 1) * projPerPage + index;
        const isCompleted =
          proj.completed && proj.completed.toLowerCase() === "yes";

        html += `
                    <div class="project-card-modern">
                        <div class="project-card-header">
                            <div class="project-title-section">
                                <h4 class="project-title">${escapeHtml(
                                  proj.name || "N/A"
                                )}</h4>
                                <div class="project-status-badge ${
                                  isCompleted
                                    ? "status-completed"
                                    : "status-ongoing"
                                }">
                                    <i class="bi ${
                                      isCompleted
                                        ? "bi-check-circle-fill"
                                        : "bi-clock-history"
                                    }"></i>
                                    <span>${
                                      isCompleted ? "Completed" : "Ongoing"
                                    }</span>
                                </div>
                            </div>
                        </div>
                        <div class="project-details">
                            <div class="project-detail-item">
                                <div class="project-detail-label">
                                    <i class="bi bi-cash-coin"></i>
                                    <span>Budget</span>
                                </div>
                                <div class="project-detail-value">${escapeHtml(
                                  proj.budget || "N/A"
                                )}</div>
                            </div>
                            <div class="project-detail-item">
                                <div class="project-detail-label">
                                    <i class="bi bi-calendar-event"></i>
                                    <span>Started</span>
                                </div>
                                <div class="project-detail-value">${formatProjectDate(
                                  proj.started
                                )}</div>
                            </div>
                        </div>
                        <div class="project-actions" style="margin-top: 12px; display: flex; gap: 8px; justify-content: flex-end;">
                            <button class="Btn Btn-delete" onclick="deleteProject(${
                              proj.id
                            })" type="button">
                                <div class="svgWrapper">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 42 42" class="svgIcon">
                                        <path stroke-width="5" stroke="#fff" d="M9.14073 2.5H32.8593C33.3608 2.5 33.8291 2.75065 34.1073 3.16795L39.0801 10.6271C39.3539 11.0378 39.5 11.5203 39.5 12.0139V21V37C39.5 38.3807 38.3807 39.5 37 39.5H5C3.61929 39.5 2.5 38.3807 2.5 37V21V12.0139C2.5 11.5203 2.6461 11.0378 2.91987 10.6271L7.89266 3.16795C8.17086 2.75065 8.63921 2.5 9.14073 2.5Z"></path>
                                        <path stroke-width="5" stroke="#fff" d="M14 18L28 18M18 14V30M24 14V30"></path>
                                    </svg>
                                    <div class="text">Delete</div>
                                </div>
                            </button>
                        </div>
                    </div>
                `;
      });

      html += `</div>`;

      // Pagination
      if (projTotalPages > 1) {
        html += `
                    <nav class="mt-3" aria-label="Projects pages">
                        <ul class="pagination pagination-sm justify-content-center">
                `;

        const baseParams = new URLSearchParams(window.location.search);
        baseParams.delete("proj_page");

        const prevPage = Math.max(1, projPage - 1);
        const nextPage = Math.min(projTotalPages, projPage + 1);
        const prevClass = projPage <= 1 ? "disabled" : "";
        const nextClass = projPage >= projTotalPages ? "disabled" : "";

        baseParams.set("proj_page", prevPage.toString());
        html += `<li class="page-item ${prevClass}"><a class="page-link" href="?${baseParams.toString()}" aria-label="Previous projects page">&lt;</a></li>`;

        const showPages = Math.min(5, projTotalPages);
        for (let p = 1; p <= showPages; p++) {
          baseParams.set("proj_page", p.toString());
          const isActive = p === projPage;
          const active = isActive ? " active" : "";
          const aria = isActive ? ' aria-current="page"' : "";
          html += `<li class="page-item${active}"><a class="page-link" href="?${baseParams.toString()}" aria-label="Projects page ${p}"${aria}>${p}</a></li>`;
        }

        baseParams.set("proj_page", nextPage.toString());
        html += `<li class="page-item ${nextClass}"><a class="page-link" href="?${baseParams.toString()}" aria-label="Next projects page">&gt;</a></li>`;

        html += `
                        </ul>
                    </nav>
                `;
      }
    }

    html += `
                </div>
            </div>
        `;

    contentArea.innerHTML = html;
    const projectForm = document.getElementById("projectForm");
    if (projectForm) {
      projectForm.addEventListener("submit", (e) => {
        saveScrollPosition();
        handleProjectSubmit(e);
      });
    }
  } catch (error) {
    contentArea.innerHTML = `<div class="alert alert-danger">Error loading projects: ${error.message}</div>`;
  }
}

async function handleProjectSubmit(e) {
  e.preventDefault();
  try {
    await AdminAPI.createProject({
      name: document.getElementById("projectName").value,
      budget: document.getElementById("projectBudget").value,
      started: document.getElementById("projectStarted").value,
      completed: document.getElementById("projectCompleted").value,
    });
    window.location.href = `admin_dashboard.html?section=projects&_t=${Date.now()}`;
  } catch (error) {
    alert(`Error creating project: ${error.message}`);
  }
}

async function deleteProject(id) {
  if (!confirm("Are you sure?")) return;
  saveScrollPosition();
  try {
    await AdminAPI.deleteProject(id);
    window.location.href = `admin_dashboard.html?section=projects&_t=${Date.now()}`;
  } catch (error) {
    alert(`Error deleting project: ${error.message}`);
  }
}

// ==================== STUDY LOAD ====================
async function loadStudyLoadSection() {
  const contentArea = document.getElementById("adminContentArea");

  try {
    const urlParams = new URLSearchParams(window.location.search);

    // Course/Major mapping
    const courseMajorMap = {
      IT: ["Computer Technology", "Electronics"],
      BSED: [
        "English",
        "Physical Education",
        "Math",
        "Filipino",
        "Social Science",
      ],
      HM: ["General"],
      BEED: ["General"],
      TOURISM: ["General"],
    };
    const semesterOptions = ["First Semester", "Second Semester"];

    // Get filter values from URL
    const courseKeys = Object.keys(courseMajorMap);
    let selectedCourse = (
      urlParams.get("filter_course") ||
      courseKeys[0] ||
      "IT"
    ).toUpperCase();
    if (!courseMajorMap[selectedCourse]) {
      selectedCourse = courseKeys[0] || "IT";
    }

    let selectedMajor = urlParams.get("filter_major") || "";
    if (
      !selectedMajor ||
      !courseMajorMap[selectedCourse].includes(selectedMajor)
    ) {
      selectedMajor = courseMajorMap[selectedCourse][0] || "";
    }

    let selectedYear = parseInt(urlParams.get("filter_year")) || 1;
    if (selectedYear < 1 || selectedYear > 4) {
      selectedYear = 1;
    }

    let selectedSemester =
      urlParams.get("filter_semester") || semesterOptions[0];
    if (!semesterOptions.includes(selectedSemester)) {
      selectedSemester = semesterOptions[0];
    }

    // Get all data needed
    const [sections, subjects, teacherAssignments, studyLoad] =
      await Promise.all([
        AdminAPI.getSections().catch(() => []),
        AdminAPI.getSubjects().catch(() => []),
        AdminAPI.getTeacherAssignments().catch(() => []),
        AdminAPI.getStudyLoad().catch(() => []),
      ]);

    // Get sections for selected year
    const sectionsForYear = Array.isArray(sections)
      ? sections
          .filter((s) => s.year === selectedYear.toString())
          .map((s) => s.name)
          .sort()
      : [];

    let selectedSection = urlParams.get("filter_section") || "";
    if (!selectedSection && sectionsForYear.length > 0) {
      selectedSection = sectionsForYear[0];
    }

    // Get available subjects based on filters
    const subjectsAvailable = Array.isArray(subjects)
      ? subjects.filter(
          (s) =>
            s.course === selectedCourse &&
            s.major === selectedMajor &&
            s.year_level === selectedYear &&
            s.semester === selectedSemester
        )
      : [];

    // Create teacher assignments map
    const teacherAssignmentsMap = {};
    (Array.isArray(teacherAssignments) ? teacherAssignments : []).forEach(
      (ta) => {
        const subjCode = (ta.subject_code || "").toUpperCase().trim();
        if (subjCode) {
          if (!teacherAssignmentsMap[subjCode]) {
            teacherAssignmentsMap[subjCode] = [];
          }
          teacherAssignmentsMap[subjCode].push(
            ta.full_name || ta.teacher_name || ""
          );
        }
      }
    );

    // Add teacher info to available subjects
    subjectsAvailable.forEach((subj) => {
      const subjCode = (subj.subject_code || "").toUpperCase().trim();
      subj.teacher =
        teacherAssignmentsMap[subjCode] &&
        teacherAssignmentsMap[subjCode].length > 0
          ? teacherAssignmentsMap[subjCode][0]
          : "";
    });

    // Get assigned subjects for selected section
    const assignedSubjects = Array.isArray(studyLoad)
      ? studyLoad.filter(
          (sl) =>
            sl.course === selectedCourse &&
            sl.major === selectedMajor &&
            sl.year_level === selectedYear &&
            sl.section === selectedSection &&
            sl.semester === selectedSemester
        )
      : [];

    const assignedTotals = {
      subjects: assignedSubjects.length,
      units: assignedSubjects.reduce(
        (sum, s) => sum + (parseInt(s.units) || 0),
        0
      ),
    };

    // Format ordinal - matches PHP version
    const formatOrdinal = (n) => {
      const num = parseInt(n);
      const ends = ["th", "st", "nd", "rd", "th", "th", "th", "th", "th", "th"];
      if (num % 100 >= 11 && num % 100 <= 13) {
        return num + "th";
      }
      return num + (ends[num % 10] || "th");
    };

    let html = `
            <div class="records-container">
                <div class="records-header">
                    <h2 class="records-title">
                        <i class="bi bi-journal-check"></i> Customize Study Load
                    </h2>
                    <p class="records-subtitle">Link curated subjects to sections using course, major, year level, section, and semester filters.</p>
                </div>
                <div class="records-main">
                    <div class="info-card">
                        <div class="card-header-modern">
                            <i class="bi bi-123"></i>
                            <h3>Step 1 — Select Filters</h3>
                        </div>
                        <form class="form-small" method="get" id="studyLoadFilterForm">
                            <input type="hidden" name="section" value="study_load" />
                            <div class="row g-3">
                                <div class="col-md-3">
                                    <label class="admin-form-label" for="studyCourseSelect">
                                        <i class="bi bi-mortarboard"></i> Course
                                    </label>
                                    <select id="studyCourseSelect" name="filter_course" class="form-select form-select-lg" data-course-select>
                                        ${courseKeys
                                          .map(
                                            (courseKey) => `
                                            <option value="${escapeHtml(
                                              courseKey
                                            )}" ${
                                              selectedCourse === courseKey
                                                ? "selected"
                                                : ""
                                            }>
                                                ${escapeHtml(courseKey)}
                                            </option>
                                        `
                                          )
                                          .join("")}
                                    </select>
                                </div>
                                <div class="col-md-3">
                                    <label class="admin-form-label" for="studyMajorSelect">
                                        <i class="bi bi-diagram-3"></i> Major
                                    </label>
                                    <select id="studyMajorSelect" name="filter_major" class="form-select form-select-lg" data-major-select>
                                        ${courseKeys
                                          .map((courseKey) =>
                                            courseMajorMap[courseKey]
                                              .map(
                                                (majorName) => `
                                                <option value="${escapeHtml(
                                                  majorName
                                                )}" data-course="${escapeHtml(
                                                  courseKey
                                                )}" ${
                                                  selectedCourse ===
                                                    courseKey &&
                                                  selectedMajor === majorName
                                                    ? "selected"
                                                    : ""
                                                }>
                                                    ${escapeHtml(majorName)}
                                                </option>
                                            `
                                              )
                                              .join("")
                                          )
                                          .join("")}
                                    </select>
                                </div>
                                <div class="col-md-2">
                                    <label class="admin-form-label" for="studyYearFilter">
                                        <i class="bi bi-calendar-year"></i> Year Level
                                    </label>
                                    <select id="studyYearFilter" name="filter_year" class="form-select form-select-lg">
                                        ${[1, 2, 3, 4]
                                          .map(
                                            (y) => `
                                            <option value="${y}" ${
                                              selectedYear === y
                                                ? "selected"
                                                : ""
                                            }>
                                                ${formatOrdinal(y)}
                                            </option>
                                        `
                                          )
                                          .join("")}
                                    </select>
                                </div>
                                <div class="col-md-3">
                                    <label class="admin-form-label" for="studySectionFilter">
                                        <i class="bi bi-collection-fill"></i> Section
                                    </label>
                                    <select id="studySectionFilter" name="filter_section" class="form-select form-select-lg" ${
                                      sectionsForYear.length === 0
                                        ? "disabled"
                                        : ""
                                    }>
                                        ${
                                          sectionsForYear.length === 0
                                            ? `
                                            <option value="">No sections available</option>
                                        `
                                            : sectionsForYear
                                                .map(
                                                  (sectionName) => `
                                            <option value="${escapeHtml(
                                              sectionName
                                            )}" ${
                                                    selectedSection ===
                                                    sectionName
                                                      ? "selected"
                                                      : ""
                                                  }>
                                                ${escapeHtml(sectionName)}
                                            </option>
                                        `
                                                )
                                                .join("")
                                        }
                                    </select>
                                </div>
                                <div class="col-md-2">
                                    <label class="admin-form-label" for="studySemesterFilter">
                                        <i class="bi bi-clock-history"></i> Semester
                                    </label>
                                    <select id="studySemesterFilter" name="filter_semester" class="form-select form-select-lg">
                                        ${semesterOptions
                                          .map(
                                            (semOption) => `
                                            <option value="${escapeHtml(
                                              semOption
                                            )}" ${
                                              selectedSemester === semOption
                                                ? "selected"
                                                : ""
                                            }>
                                                ${escapeHtml(semOption)}
                                            </option>
                                        `
                                          )
                                          .join("")}
                                    </select>
                                </div>
                                <div class="col-md-1 align-self-end">
                                    <button class="btn btn-primary btn-lg w-100" type="submit">
                                        <i class="bi bi-arrow-repeat"></i>
                                    </button>
                                </div>
                            </div>
                        </form>
                        ${
                          sectionsForYear.length === 0
                            ? `
                            <div class="alert alert-warning mt-3 mb-0" role="alert">
                                Create a section for ${formatOrdinal(
                                  selectedYear
                                )} Year before assigning subjects.
                            </div>
                        `
                            : ""
                        }
                    </div>

                    <div class="info-card">
                        <div class="card-header-modern">
                            <i class="bi bi-collection"></i>
                            <h3>Step 2 — Available Subjects</h3>
                            <span class="badge bg-secondary ms-auto">${
                              subjectsAvailable.length
                            } matches</span>
                        </div>
                        ${
                          subjectsAvailable.length === 0
                            ? `
                            <p class="text-muted mb-0">No subjects found for this course, major, year level, and semester. Add them under the Subject Catalog first.</p>
                        `
                            : `
                            <div class="table-responsive">
                                <table class="table table-sm align-middle">
                                    <thead>
                                        <tr>
                                            <th>Code</th>
                                            <th>Title</th>
                                            <th>Units</th>
                                            <th>Semester</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${subjectsAvailable
                                          .map(
                                            (subject) => `
                                            <tr>
                                                <td>${escapeHtml(
                                                  subject.subject_code || ""
                                                )}</td>
                                                <td>${escapeHtml(
                                                  subject.title || ""
                                                )}</td>
                                                <td>${
                                                  parseInt(subject.units) || 0
                                                }</td>
                                                <td>${escapeHtml(
                                                  selectedSemester
                                                )}</td>
                                            </tr>
                                        `
                                          )
                                          .join("")}
                                    </tbody>
                                </table>
                            </div>
                        `
                        }
                    </div>
        `;

    if (selectedSection !== "" && sectionsForYear.length > 0) {
      html += `
                    <div class="info-card">
                        <div class="card-header-modern">
                            <i class="bi bi-plus-square"></i>
                            <h3>Step 3 — Assign Subjects to ${escapeHtml(
                              selectedSection
                            )} • ${escapeHtml(selectedSemester)}</h3>
                        </div>
                        <form class="form-small" id="studyLoadAssignForm">
                            <input type="hidden" name="action" value="create_bulk" />
                            <input type="hidden" name="section" value="${escapeHtml(
                              selectedSection
                            )}" />
                            <input type="hidden" name="semester" value="${escapeHtml(
                              selectedSemester
                            )}" />
                            <div class="row g-3 align-items-end">
                                <div class="col-md-4">
                                    <label class="admin-form-label" for="step3CourseSelect">
                                        <i class="bi bi-mortarboard"></i> Course
                                    </label>
                                    <select id="step3CourseSelect" name="course" class="form-select form-select-lg" required>
                                        <option value="">Select course...</option>
                                        ${courseKeys
                                          .map(
                                            (courseKey) => `
                                            <option value="${escapeHtml(
                                              courseKey
                                            )}" ${
                                              selectedCourse === courseKey
                                                ? "selected"
                                                : ""
                                            }>
                                                ${escapeHtml(courseKey)}
                                            </option>
                                        `
                                          )
                                          .join("")}
                                    </select>
                                    </div>
                                <div class="col-md-4">
                                    <label class="admin-form-label" for="step3MajorSelect">
                                        <i class="bi bi-diagram-3"></i> Major
                                    </label>
                                    <select id="step3MajorSelect" name="major" class="form-select form-select-lg" required>
                                        <option value="">Select major...</option>
                                    </select>
                                </div>
                                <div class="col-md-4">
                                    <label class="admin-form-label" for="step3YearSelect">
                                        <i class="bi bi-calendar-year"></i> Year Level
                                    </label>
                                    <select id="step3YearSelect" name="year_level" class="form-select form-select-lg" required>
                                        <option value="">Select year...</option>
                                        ${[1, 2, 3, 4]
                                          .map(
                                            (y) => `
                                            <option value="${y}" ${
                                              selectedYear === y
                                                ? "selected"
                                                : ""
                                            }>
                                                ${formatOrdinal(y)}
                                            </option>
                                        `
                                          )
                                          .join("")}
                                    </select>
                                </div>
                            </div>
                            <div class="mt-3 d-flex gap-2">
                                <button class="btn btn-primary btn-lg" type="submit" id="assignAllSubjectsBtn" disabled>
                                    <i class="bi bi-check-circle me-2"></i>Assign All Matching Subjects
                                </button>
                                <button class="btn btn-outline-secondary btn-lg" type="reset">
                                    <i class="bi bi-arrow-counterclockwise me-2"></i>Reset
                                </button>
                            </div>
                            <div class="admin-hint mt-2">
                                <i class="bi bi-info-circle"></i>
                                <span>Select Course, Major, and Year Level to automatically assign all matching subjects to this section. Teachers will be automatically assigned based on subject codes from Teacher Management.</span>
                            </div>
                        </form>
                    </div>

                    <div class="info-card">
                        <div class="card-header-modern">
                            <i class="bi bi-list-check"></i>
                            <h3>Assigned Subjects • ${escapeHtml(
                              selectedSection
                            )}</h3>
                            <span class="badge bg-secondary ms-auto">${
                              assignedTotals.subjects
                            } subjects</span>
                        </div>
                        ${
                          assignedSubjects.length === 0
                            ? `
                            <p class="text-muted mb-0">No subjects assigned yet for this combination.</p>
                        `
                            : `
                            <div class="table-responsive">
                                <table class="table table-hover align-middle">
                                    <thead>
                                        <tr>
                                            <th>Code</th>
                                            <th>Title</th>
                                            <th>Units</th>
                                            <th>Semester</th>
                                            <th>Teacher</th>
                                            <th style="width: 140px;">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${assignedSubjects
                                          .map((assigned) => {
                                            return `
                                                <tr>
                                                    <td><strong>${escapeHtml(
                                                      assigned.subject_code ||
                                                        ""
                                                    )}</strong></td>
                                                    <td>${escapeHtml(
                                                      assigned.subject_title ||
                                                        ""
                                                    )}</td>
                                                    <td>${
                                                      parseInt(
                                                        assigned.units
                                                      ) || 0
                                                    }</td>
                                                    <td>${escapeHtml(
                                                      assigned.semester ||
                                                        selectedSemester
                                                    )}</td>
                                                    <td>${escapeHtml(
                                                      assigned.teacher || "—"
                                                    )}</td>
                                                    <td class="text-nowrap">
                                                        <button class="btn btn-sm btn-outline-danger" onclick="deleteStudyLoad(${
                                                          assigned.id
                                                        })" title="Delete Subject">
                                                            <i class="bi bi-trash"></i>
                                                        </button>
                                                    </td>
                                                </tr>
                                            `;
                                          })
                                          .join("")}
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <th colspan="3">Total Subjects: ${
                                              assignedTotals.subjects
                                            }</th>
                                            <th colspan="3">Total Units: ${
                                              assignedTotals.units
                                            }</th>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        `
                        }
                    </div>
            `;
    }

    html += `
                </div>
            </div>
        `;

    contentArea.innerHTML = html;

    // Setup filter form - auto-submit on change
    const filterForm = document.getElementById("studyLoadFilterForm");
    const courseSelect = document.getElementById("studyCourseSelect");
    const majorSelect = document.getElementById("studyMajorSelect");
    const yearSelect = document.getElementById("studyYearFilter");
    const sectionSelect = document.getElementById("studySectionFilter");
    const semesterSelect = document.getElementById("studySemesterFilter");

    if (filterForm) {
      // Filter major options based on course
      function filterMajorOptions() {
        if (!courseSelect || !majorSelect) return;
        const selectedCourseValue = courseSelect.value;
        const currentMajor = majorSelect.value;
        const majorsForCourse = courseMajorMap[selectedCourseValue] || [];

        // Clear and repopulate
        majorSelect.innerHTML = "";
        majorsForCourse.forEach((major) => {
          const option = document.createElement("option");
          option.value = major;
          option.textContent = major;
          option.setAttribute("data-course", selectedCourseValue);
          if (
            major === currentMajor &&
            selectedCourse === selectedCourseValue
          ) {
            option.selected = true;
          }
          majorSelect.appendChild(option);
        });

        // If current major not in new list, select first
        if (!majorsForCourse.includes(currentMajor)) {
          majorSelect.value = majorsForCourse[0] || "";
        }
      }

      if (courseSelect) {
        courseSelect.addEventListener("change", function () {
          filterMajorOptions();
          // Update sections when year changes
          if (yearSelect) {
            yearSelect.dispatchEvent(new Event("change"));
          }
        });
      }

      // Update sections when year changes
      if (yearSelect) {
        yearSelect.addEventListener("change", async function () {
          const year = this.value;
          try {
            const sections = await AdminAPI.getSections();
            const sectionsList = Array.isArray(sections) ? sections : [];
            const sectionsForYear = sectionsList
              .filter((s) => s.year === year)
              .map((s) => s.name)
              .sort();

            if (sectionSelect) {
              sectionSelect.innerHTML = "";
              if (sectionsForYear.length === 0) {
                sectionSelect.disabled = true;
                sectionSelect.innerHTML =
                  '<option value="">No sections available</option>';
              } else {
                sectionSelect.disabled = false;
                sectionsForYear.forEach((sec) => {
                  const option = document.createElement("option");
                  option.value = sec;
                  option.textContent = sec;
                  sectionSelect.appendChild(option);
                });
                if (sectionsForYear.length > 0) {
                  sectionSelect.value = sectionsForYear[0];
                }
              }
            }
          } catch (error) {
            console.error("Error loading sections:", error);
          }
        });
      }

      [
        courseSelect,
        majorSelect,
        yearSelect,
        sectionSelect,
        semesterSelect,
      ].forEach((select) => {
        if (select) {
          select.addEventListener("change", function () {
            filterForm.submit();
          });
        }
      });
    }

    // Setup Step 3 assign form
    const assignForm = document.getElementById("studyLoadAssignForm");
    const step3CourseSelect = document.getElementById("step3CourseSelect");
    const step3MajorSelect = document.getElementById("step3MajorSelect");
    const step3YearSelect = document.getElementById("step3YearSelect");
    const assignAllBtn = document.getElementById("assignAllSubjectsBtn");

    // Update major options when course changes in Step 3
    if (step3CourseSelect && step3MajorSelect) {
      function updateStep3MajorOptions() {
        const course = step3CourseSelect.value;
        const majors = courseMajorMap[course] || [];
        step3MajorSelect.innerHTML =
          '<option value="">Select major...</option>';
        majors.forEach((major) => {
          const option = document.createElement("option");
          option.value = major;
          option.textContent = major;
          step3MajorSelect.appendChild(option);
        });
        checkStep3FormValid();
      }

      step3CourseSelect.addEventListener("change", updateStep3MajorOptions);
      updateStep3MajorOptions(); // Initial load

      // Check if form is valid to enable submit button
      function checkStep3FormValid() {
        const course = step3CourseSelect.value;
        const major = step3MajorSelect.value;
        const year = step3YearSelect.value;
        if (assignAllBtn) {
          assignAllBtn.disabled = !course || !major || !year;
        }
      }

      [step3CourseSelect, step3MajorSelect, step3YearSelect].forEach(
        (select) => {
          if (select) {
            select.addEventListener("change", checkStep3FormValid);
          }
        }
      );
      checkStep3FormValid();
    }

    if (assignForm) {
      assignForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        try {
          const course = step3CourseSelect.value;
          const major = step3MajorSelect.value;
          const yearLevel = parseInt(step3YearSelect.value);
          const section = selectedSection;
          const semester = selectedSemester;

          if (!course || !major || !yearLevel) {
            alert("Please select Course, Major, and Year Level");
            return;
          }

          // Get all matching subjects
          const allSubjects = await AdminAPI.getSubjects();
          const matchingSubjects = allSubjects.filter(
            (subject) =>
              subject.course === course &&
              subject.major === major &&
              parseInt(subject.year_level) === yearLevel &&
              subject.semester === semester
          );

          if (matchingSubjects.length === 0) {
            alert(
              "No matching subjects found for the selected Course, Major, Year Level, and Semester."
            );
            return;
          }

          // Get teacher assignments
          const teacherAssignments = await AdminAPI.getTeacherAssignments();
          const teacherAssignmentsMap = {};
          (Array.isArray(teacherAssignments) ? teacherAssignments : []).forEach(
            (ta) => {
              const subjCode = (ta.subject_code || "").toUpperCase().trim();
              if (subjCode) {
                if (!teacherAssignmentsMap[subjCode]) {
                  teacherAssignmentsMap[subjCode] = [];
                }
                teacherAssignmentsMap[subjCode].push(
                  ta.full_name || ta.teacher_name || ""
                );
              }
            }
          );

          // Assign all matching subjects
          let successCount = 0;
          let errorCount = 0;

          for (const subject of matchingSubjects) {
            try {
              const subjCode = (subject.subject_code || "")
                .toUpperCase()
                .trim();
              const teacher =
                teacherAssignmentsMap[subjCode] &&
                teacherAssignmentsMap[subjCode].length > 0
                  ? teacherAssignmentsMap[subjCode][0]
                  : null;

              await AdminAPI.createStudyLoad({
                course: course,
                major: major,
                year_level: yearLevel,
                section: section,
                subject_code: subject.subject_code,
                subject_title: subject.title || "",
                units: parseFloat(subject.units) || 0,
                semester: semester,
                teacher: teacher,
              });
              successCount++;
            } catch (error) {
              console.error(
                `Error assigning subject ${subject.subject_code}:`,
                error
              );
              errorCount++;
            }
          }

          if (successCount > 0) {
            alert(
              `Successfully assigned ${successCount} subject(s)${
                errorCount > 0 ? `. ${errorCount} failed.` : "."
              }`
            );
            window.location.href = `admin_dashboard.html?section=study_load&filter_course=${encodeURIComponent(
              selectedCourse
            )}&filter_major=${encodeURIComponent(
              selectedMajor
            )}&filter_year=${selectedYear}&filter_section=${encodeURIComponent(
              selectedSection
            )}&filter_semester=${encodeURIComponent(
              selectedSemester
            )}&success=created&_t=${Date.now()}`;
          } else {
            alert(`Failed to assign subjects. ${errorCount} error(s).`);
          }
        } catch (error) {
          alert(`Error assigning subjects: ${error.message}`);
        }
      });
    }
  } catch (error) {
    contentArea.innerHTML = `<div class="alert alert-danger">Error loading study load: ${error.message}</div>`;
  }
}

async function updateStudyLoadTeacher(id, form) {
  try {
    const formData = new FormData(form);
    const data = {
      id: id,
      course: formData.get("course"),
      major: formData.get("major"),
      year_level: parseInt(formData.get("year_level")),
      section: formData.get("section"),
      subject_code: formData.get("subject_code"),
      semester: formData.get("semester"),
      teacher: formData.get("teacher") || null,
    };

    await AdminAPI.updateStudyLoad(id, data);
    window.location.reload();
  } catch (error) {
    alert(`Error updating teacher: ${error.message}`);
  }
}

async function handleStudyLoadSubmit(e) {
  e.preventDefault();
  try {
    const subjectCode = document.getElementById("studySubjectSelect").value;
    if (!subjectCode) {
      alert("Please select a subject code");
      return;
    }

    await AdminAPI.createStudyLoad({
      course: document.getElementById("studyLoadCourse").value,
      major: document.getElementById("studyLoadMajor").value,
      year_level: parseInt(document.getElementById("studyLoadYearLevel").value),
      section: document.getElementById("studyLoadSection").value,
      subject_code: subjectCode,
      subject_title: document.getElementById("studyLoadSubjectTitle").value,
      units: parseInt(document.getElementById("studyLoadUnits").value) || 0,
      semester: document.getElementById("studyLoadSemester").value,
    });
    window.location.href = `admin_dashboard.html?section=study_load&success=created&_t=${Date.now()}`;
  } catch (error) {
    alert(`Error creating study load: ${error.message}`);
  }
}

async function deleteStudyLoad(id) {
  if (!confirm("Are you sure?")) return;
  saveScrollPosition();
  try {
    await AdminAPI.deleteStudyLoad(id);
    window.location.href = `admin_dashboard.html?section=study_load&success=deleted&_t=${Date.now()}`;
  } catch (error) {
    alert(`Error deleting study load: ${error.message}`);
  }
}

// ==================== BUILDINGS ====================
async function loadBuildingsSection() {
  const contentArea = document.getElementById("adminContentArea");

  try {
    const [sections, sectionAssignments, buildings] = await Promise.all([
      AdminAPI.getSections().catch(() => []),
      AdminAPI.getSectionAssignments().catch(() => []),
      AdminAPI.getBuildings().catch(() => []),
    ]);

    // Ensure arrays are always arrays
    const sectionsList = Array.isArray(sections)
      ? sections
      : sections
      ? [sections]
      : [];
    const assignmentsList = Array.isArray(sectionAssignments)
      ? sectionAssignments
      : sectionAssignments
      ? [sectionAssignments]
      : [];
    const buildingsList = Array.isArray(buildings)
      ? buildings
      : buildings
      ? [buildings]
      : [];

    // Pagination for buildings
    const urlParams = new URLSearchParams(window.location.search);
    const bldPerPage = 5;
    const bldPage = Math.max(1, parseInt(urlParams.get("bld_page")) || 1);
    const bldTotal = buildingsList.length;
    const bldTotalPages = Math.max(1, Math.ceil(bldTotal / bldPerPage));
    const bldStart = (bldPage - 1) * bldPerPage;
    const bldSlice = buildingsList.slice(bldStart, bldStart + bldPerPage);

    // Group sections by year
    const sectionsByYear = {};
    sectionsList.forEach((s) => {
      if (s && s.year) {
        if (!sectionsByYear[s.year]) sectionsByYear[s.year] = [];
        sectionsByYear[s.year].push(s);
      }
    });

    // Create lookup for existing assignments
    const assignmentsMap = {};
    assignmentsList.forEach((a) => {
      if (a && a.year && a.section) {
        const key = `${a.year}|${a.section}`;
        assignmentsMap[key] = a;
      }
    });

    let html = `
            <div class="records-container">
                <div class="records-header">
                    <h2 class="records-title">
                        <i class="bi bi-building"></i> Buildings & Facilities
                    </h2>
                    <p class="records-subtitle">Manage buildings, rooms, and section assignments</p>
                </div>
                <div class="records-main">
                    <div class="info-card">
                        <div class="card-header-modern">
                            <i class="bi bi-building"></i>
                            <h3>Manage Buildings & Rooms</h3>
                        </div>
                        <div class="card-body p-3">
                            <form id="buildingForm" class="row g-3 align-items-end">
                                <div class="col-md-3">
                                    <label class="form-label fw-bold" for="buildingName">Building</label>
                                    <input name="building" id="buildingName" class="form-control" placeholder="A" required autocomplete="off"/>
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label fw-bold" for="buildingFloors">Floors</label>
                                    <input name="floors" id="buildingFloors" type="number" class="form-control" value="4" min="1" required autocomplete="off"/>
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label fw-bold" for="buildingRooms">Rooms per floor</label>
                                    <input name="rooms" id="buildingRooms" type="number" class="form-control" value="4" min="1" required autocomplete="off"/>
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label d-block">&nbsp;</label>
                                    <button type="submit" class="btn btn-primary w-100">Save Building</button>
                                </div>
                            </form>
                        </div>
                    </div>
                    
                    <div class="buildings-grid mt-3">
                        <div class="info-card buildings-card">
                            <div class="card-header-modern">
                                <i class="bi bi-building-check"></i>
                                <h3>Configured Buildings</h3>
                            </div>
                            <ul class="list-group">
                                ${
                                  bldTotal === 0
                                    ? '<li class="list-group-item text-muted">No buildings configured.</li>'
                                    : ""
                                }
                                ${bldSlice
                                  .map((ent) => {
                                    if (!ent || !ent.name) return "";
                                    return `
                                    <li class="list-group-item d-flex justify-content-between align-items-center">
                                        <div>
                                            <strong>Building ${escapeHtml(
                                              ent.name || ""
                                            )}</strong> — Floors: ${
                                      ent.floors || 4
                                    }, Rooms/floor: ${ent.rooms_per_floor || 4}
                                        </div>
                                        <button class="Btn Btn-delete" onclick="deleteBuilding('${escapeHtml(
                                          ent.name || ""
                                        )}')">
                                            <div class="svgWrapper">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 42 42" class="svgIcon">
                                                    <path stroke-width="5" stroke="#fff" d="M9.14073 2.5H32.8593C33.3608 2.5 33.8291 2.75065 34.1073 3.16795L39.0801 10.6271C39.3539 11.0378 39.5 11.5203 39.5 12.0139V21V37C39.5 38.3807 38.3807 39.5 37 39.5H5C3.61929 39.5 2.5 38.3807 2.5 37V21V12.0139C2.5 11.5203 2.6461 11.0378 2.91987 10.6271L7.89266 3.16795C8.17086 2.75065 8.63921 2.5 9.14073 2.5Z"></path>
                                                    <path stroke-width="5" stroke="#fff" d="M14 18L28 18M18 14V30M24 14V30"></path>
                                                </svg>
                                                <div class="text">Delete</div>
                                            </div>
                                        </button>
                                    </li>
                                `;
                                  })
                                  .filter(Boolean)
                                  .join("")}
                            </ul>
                            ${
                              bldTotalPages > 1
                                ? `
                                <nav class="mt-2" aria-label="Buildings pages">
                                    <ul class="pagination pagination-sm">
                                        ${(() => {
                                          const baseParams =
                                            new URLSearchParams(
                                              window.location.search
                                            );
                                          baseParams.delete("bld_page");
                                          const prevPage = Math.max(
                                            1,
                                            bldPage - 1
                                          );
                                          const nextPage = Math.min(
                                            bldTotalPages,
                                            bldPage + 1
                                          );
                                          const prevClass =
                                            bldPage <= 1 ? "disabled" : "";
                                          const nextClass =
                                            bldPage >= bldTotalPages
                                              ? "disabled"
                                              : "";
                                          const showPages = Math.min(
                                            5,
                                            bldTotalPages
                                          );

                                          let pagination = "";
                                          baseParams.set("bld_page", prevPage);
                                          pagination += `<li class="page-item ${prevClass}"><a class="page-link" href="?${baseParams.toString()}" aria-label="Previous buildings page">&lt;</a></li>`;

                                          for (let p = 1; p <= showPages; p++) {
                                            baseParams.set("bld_page", p);
                                            const isActive = p === bldPage;
                                            const active = isActive
                                              ? " active"
                                              : "";
                                            const aria = isActive
                                              ? ' aria-current="page"'
                                              : "";
                                            pagination += `<li class="page-item${active}"><a class="page-link" href="?${baseParams.toString()}" aria-label="Buildings page ${p}"${aria}>${p}</a></li>`;
                                          }

                                          baseParams.set("bld_page", nextPage);
                                          pagination += `<li class="page-item ${nextClass}"><a class="page-link" href="?${baseParams.toString()}" aria-label="Next buildings page">&gt;</a></li>`;
                                          return pagination;
                                        })()}
                                    </ul>
                                </nav>
                            `
                                : ""
                            }
                        </div>
                    </div>
                    
                    <div class="info-card mt-3">
                        <div class="card-header-modern">
                            <i class="bi bi-door-open"></i>
                            <h3>Setup Section Building & Room Assignment</h3>
                        </div>
                        <div class="admin-hint mb-3">
                            <i class="bi bi-info-circle"></i>
                            <span><strong>Note:</strong> When you assign a user to a year and section in User Management, their building and room will automatically display based on the section assignment below.</span>
                        </div>
                        <form id="sectionAssignmentForm" class="admin-user-assign-form">
                            <input type="hidden" name="action" value="create" />
                            <div class="row g-3">
                                <div class="col-md-3">
                                    <div class="admin-form-group">
                                        <label class="admin-form-label" for="sectionYear"><i class="bi bi-calendar-year"></i> Year</label>
                                        <select name="year" id="sectionYear" class="form-select form-select-lg" required>
                                            <option value="">Select Year...</option>
                                            <option value="1">1st Year</option>
                                            <option value="2">2nd Year</option>
                                            <option value="3">3rd Year</option>
                                            <option value="4">4th Year</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="admin-form-group">
                                        <label class="admin-form-label" for="sectionName"><i class="bi bi-people"></i> Section Name</label>
                                        <input name="section" id="sectionName" class="form-control form-control-lg" placeholder="e.g. Benevolence" required autocomplete="off"/>
                                    </div>
                                </div>
                                <div class="col-md-2">
                                    <div class="admin-form-group">
                                        <label class="admin-form-label" for="sectionBuilding"><i class="bi bi-building"></i> Building</label>
                                        <input name="building" id="sectionBuilding" class="form-control form-control-lg" placeholder="A" required autocomplete="off"/>
                                    </div>
                                </div>
                                <div class="col-md-2">
                                    <div class="admin-form-group">
                                        <label class="admin-form-label" for="sectionFloor"><i class="bi bi-layers"></i> Floor</label>
                                        <input name="floor" id="sectionFloor" type="number" class="form-control form-control-lg" value="1" min="1" required autocomplete="off"/>
                                    </div>
                                </div>
                                <div class="col-md-2">
                                    <div class="admin-form-group">
                                        <label class="admin-form-label" for="sectionRoom"><i class="bi bi-door-closed"></i> Room</label>
                                        <input name="room" id="sectionRoom" class="form-control form-control-lg" placeholder="301" required autocomplete="off"/>
                                    </div>
                                </div>
                            </div>
                            <div class="row g-3 mt-2">
                                <div class="col-md-12">
                                    <button type="submit" class="btn btn-primary btn-lg">
                                        <i class="bi bi-check-circle me-2"></i>Assign Section
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                    
                    <div class="info-card mt-3">
                        <div class="card-header-modern">
                            <i class="bi bi-list-check"></i>
                            <h3>Assign Building & Room to Available Sections</h3>
                        </div>
                        <div class="admin-hint mb-3">
                            <i class="bi bi-info-circle"></i>
                            <span><strong>Quick Assign:</strong> Select from available sections and assign them to buildings and rooms.</span>
                        </div>
        `;

    if (sectionsList.length === 0) {
      html += `
                <div class="alert alert-info">
                    <i class="bi bi-info-circle me-2"></i>No sections found. Please create sections in the Sections section first.
                </div>
            `;
    } else {
      html += `
                <div class="table-responsive">
                    <table class="table table-hover">
                        <thead>
                            <tr>
                                <th>Year</th>
                                <th>Section</th>
                                <th>Current Assignment</th>
                                <th>Building</th>
                                <th>Floor</th>
                                <th>Room</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

      sectionsList.forEach((sec) => {
        if (!sec || !sec.year || !sec.name) return;

        const key = `${sec.year}|${sec.name}`;
        const existing = assignmentsMap[key];
        const hasAssignment = existing !== null && existing !== undefined;

        html += `
                    <tr>
                        <td><strong>${escapeHtml(sec.year || "")}</strong></td>
                        <td>${escapeHtml(sec.name || "")}</td>
                        <td>
                            ${
                              hasAssignment &&
                              existing.building &&
                              existing.floor &&
                              existing.room
                                ? `
                                <span class="badge bg-success">
                                    <i class="bi bi-check-circle"></i> Building ${escapeHtml(
                                      existing.building || ""
                                    )}, 
                                    Floor ${existing.floor || ""}, 
                                    Room ${escapeHtml(existing.room || "")}
                                </span>
                            `
                                : `
                                <span class="badge bg-warning">
                                    <i class="bi bi-exclamation-triangle"></i> Not Assigned
                                </span>
                            `
                            }
                        </td>
                        <td>
                            <input type="text" class="form-control form-control-sm section-building-input" 
                                   data-key="${escapeHtml(key)}" 
                                   value="${
                                     hasAssignment && existing.building
                                       ? escapeHtml(existing.building)
                                       : ""
                                   }" 
                                   placeholder="A" />
                        </td>
                        <td>
                            <input type="number" class="form-control form-control-sm section-floor-input" 
                                   data-key="${escapeHtml(key)}" 
                                   value="${
                                     hasAssignment && existing.floor
                                       ? existing.floor
                                       : "1"
                                   }" 
                                   min="1" />
                        </td>
                        <td>
                            <input type="text" class="form-control form-control-sm section-room-input" 
                                   data-key="${escapeHtml(key)}" 
                                   value="${
                                     hasAssignment
                                       ? escapeHtml(existing.room)
                                       : ""
                                   }" 
                                   placeholder="301" />
                        </td>
                        <td>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <button class="Btn Btn-edit" onclick="updateSectionAssignment('${escapeHtml(
                                  key
                                )}', ${
          hasAssignment ? existing.id : "null"
        }, '${escapeHtml(sec.year)}', '${escapeHtml(sec.name)}')">
                                    <div class="svgWrapper">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 42 42" class="svgIcon">
                                            <path stroke-width="5" stroke="#fff" d="M21 5L7 19L5 37L23 35L37 21L21 5Z"></path>
                                            <path stroke-width="3" stroke="#fff" d="M21 5L37 21"></path>
                                            <path stroke-width="3" stroke="#fff" d="M15 19L23 27"></path>
                                        </svg>
                                        <div class="text">${
                                          hasAssignment ? "Update" : "Assign"
                                        }</div>
                                    </div>
                                </button>
                                ${
                                  hasAssignment && existing.id
                                    ? `
                                    <button class="Btn Btn-delete" onclick="deleteSectionAssignment(${
                                      existing.id
                                    }, '${escapeHtml(key)}')">
                                        <div class="svgWrapper">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 42 42" class="svgIcon">
                                                <path stroke-width="5" stroke="#fff" d="M9.14073 2.5H32.8593C33.3608 2.5 33.8291 2.75065 34.1073 3.16795L39.0801 10.6271C39.3539 11.0378 39.5 11.5203 39.5 12.0139V21V37C39.5 38.3807 38.3807 39.5 37 39.5H5C3.61929 39.5 2.5 38.3807 2.5 37V21V12.0139C2.5 11.5203 2.6461 11.0378 2.91987 10.6271L7.89266 3.16795C8.17086 2.75065 8.63921 2.5 9.14073 2.5Z"></path>
                                                <path stroke-width="5" stroke="#fff" d="M14 18L28 18M18 14V30M24 14V30"></path>
                                            </svg>
                                            <div class="text">Delete</div>
                                        </div>
                                    </button>
                                `
                                    : ""
                                }
                            </div>
                        </td>
                    </tr>
                `;
      });

      html += `
                        </tbody>
                    </table>
                </div>
            `;
    }

    html += `
                    </div>
                </div>
            </div>
        `;

    contentArea.innerHTML = html;

    // Setup building form handler
    const buildingForm = document.getElementById("buildingForm");
    if (buildingForm) {
      buildingForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        try {
          await AdminAPI.createBuilding({
            building: document.getElementById("buildingName").value,
            floors: parseInt(document.getElementById("buildingFloors").value),
            rooms: parseInt(document.getElementById("buildingRooms").value),
          });
          window.location.href = `admin_dashboard.html?section=buildings&success=created&_t=${Date.now()}`;
        } catch (error) {
          alert(`Error saving building: ${error.message}`);
        }
      });
    }

    // Setup section assignment form handler
    const form = document.getElementById("sectionAssignmentForm");
    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        try {
          await AdminAPI.createSectionAssignment({
            year: document.getElementById("sectionYear").value,
            section: document.getElementById("sectionName").value,
            building: document
              .getElementById("sectionBuilding")
              .value.toUpperCase(),
            floor: parseInt(document.getElementById("sectionFloor").value),
            room: document.getElementById("sectionRoom").value,
          });
          window.location.href = `admin_dashboard.html?section=buildings&success=created&_t=${Date.now()}`;
        } catch (error) {
          alert(`Error creating section assignment: ${error.message}`);
        }
      });
    }
  } catch (error) {
    contentArea.innerHTML = `<div class="alert alert-danger">Error loading buildings: ${error.message}</div>`;
  }
}

async function deleteBuilding(name) {
  if (
    !confirm(
      `Are you sure you want to delete Building ${name}? This action cannot be undone.`
    )
  )
    return;
  try {
    await AdminAPI.deleteBuilding(name);
    window.location.href = `admin_dashboard.html?section=buildings&success=deleted&_t=${Date.now()}`;
  } catch (error) {
    alert(`Error deleting building: ${error.message}`);
  }
}

async function updateSectionAssignment(key, id, year, section) {
  const building = document
    .querySelector(`.section-building-input[data-key="${key}"]`)
    .value.trim();
  const floor =
    parseInt(
      document.querySelector(`.section-floor-input[data-key="${key}"]`).value
    ) || 1;
  const room = document
    .querySelector(`.section-room-input[data-key="${key}"]`)
    .value.trim();

  if (!building || !room) {
    alert("Please fill in building and room");
    return;
  }

  try {
    if (id) {
      // Update existing
      await AdminAPI.updateSectionAssignment(id, {
        year,
        section,
        building: building.toUpperCase(),
        floor,
        room,
      });
    } else {
      // Create new
      await AdminAPI.createSectionAssignment({
        year,
        section,
        building: building.toUpperCase(),
        floor,
        room,
      });
    }
    window.location.href = `admin_dashboard.html?section=buildings&success=${
      id ? "updated" : "created"
    }&_t=${Date.now()}`;
  } catch (error) {
    alert(
      `Error ${id ? "updating" : "creating"} section assignment: ${
        error.message
      }`
    );
  }
}

async function deleteSectionAssignment(id, key) {
  if (
    !confirm(
      "Delete this section assignment? This will remove the building/room assignment for this section."
    )
  )
    return;
  try {
    await AdminAPI.deleteSectionAssignment(id);
    window.location.href = `admin_dashboard.html?section=buildings&success=deleted&_t=${Date.now()}`;
  } catch (error) {
    alert(`Error deleting section assignment: ${error.message}`);
  }
}

// ==================== MANAGE USER ====================
async function loadManageUserSection() {
  const contentArea = document.getElementById("adminContentArea");

  try {
    const users = await AdminAPI.getUsers();

    let html = `
            <div class="records-container">
                <div class="records-header">
                    <h2 class="records-title">
                        <i class="bi bi-person-gear"></i> Manage User Roles
                    </h2>
                    <p class="records-subtitle">Set user roles (Student, Admin, or Teacher) for all users in the system.</p>
                </div>
                <div class="records-main">
                    <div class="info-card">
                        <div class="card-header-modern">
                            <i class="bi bi-people"></i>
                            <h3>All Users</h3>
                            <span class="badge bg-secondary ms-auto">${users.length} total</span>
                        </div>
        `;

    if (users.length === 0) {
      html += `<p class="text-muted mb-0">No users found in the system.</p>`;
    } else {
      html += `
                <div class="table-responsive">
                    <table class="table table-hover align-middle">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Username</th>
                                <th>Full Name</th>
                                <th>School ID</th>
                                <th>Current Role</th>
                                <th>Change Role</th>
                                <th>Created</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

      users.forEach((user) => {
        const roleBadgeClass =
          user.role === "admin"
            ? "danger"
            : user.role === "teacher"
            ? "warning"
            : "info";
        const createdDate = user.created_at
          ? new Date(user.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : "—";

        html += `
                    <tr>
                        <td>${user.id}</td>
                        <td><strong>${escapeHtml(
                          user.username || "—"
                        )}</strong></td>
                        <td>${escapeHtml(user.full_name || "—")}</td>
                        <td>${escapeHtml(user.school_id || "—")}</td>
                        <td>
                            <span class="badge bg-${roleBadgeClass}">
                                ${escapeHtml(
                                  user.role
                                    ? user.role.charAt(0).toUpperCase() +
                                        user.role.slice(1)
                                    : "—"
                                )}
                            </span>
                        </td>
                        <td>
                            <form class="d-flex gap-2 align-items-center" onsubmit="updateUserRole(event, ${
                              user.id
                            })">
                                <select class="form-select form-select-sm" style="width: auto; min-width: 120px;" id="roleSelect_${
                                  user.id
                                }">
                                    <option value="student" ${
                                      user.role === "student" ? "selected" : ""
                                    }>Student</option>
                                    <option value="teacher" ${
                                      user.role === "teacher" ? "selected" : ""
                                    }>Teacher</option>
                                    <option value="admin" ${
                                      user.role === "admin" ? "selected" : ""
                                    }>Admin</option>
                                </select>
                                <button type="submit" class="btn btn-sm btn-primary" title="Update Role">
                                    <i class="bi bi-save"></i>
                                </button>
                            </form>
                        </td>
                        <td class="text-muted small">${createdDate}</td>
                    </tr>
                `;
      });

      html += `
                        </tbody>
                    </table>
                </div>
            `;
    }

    html += `
                    </div>
                </div>
            </div>
        `;

    contentArea.innerHTML = html;
  } catch (error) {
    contentArea.innerHTML = `<div class="alert alert-danger">Error loading users: ${error.message}</div>`;
  }
}

async function updateUserRole(e, userId) {
  e.preventDefault();
  const roleSelect = document.getElementById(`roleSelect_${userId}`);
  const newRole = roleSelect.value;

  try {
    await AdminAPI.updateUserRole(userId, newRole);
    window.location.href = `admin_dashboard.html?section=manage_user&success=updated&_t=${Date.now()}`;
  } catch (error) {
    alert(`Error updating user role: ${error.message}`);
  }
}

// ==================== EVALUATION ====================
async function loadEvaluationSection() {
  const contentArea = document.getElementById("adminContentArea");

  try {
    // Fetch evaluation settings and lowest rated teachers
    const [settings, teachers] = await Promise.all([
      fetch("/api/admin/evaluation-settings")
        .then((r) => r.json())
        .catch(() => ({ enabled: true })),
      fetch("/api/admin/evaluation/lowest-rated")
        .then((r) => r.json())
        .catch(() => ({ teachers: [] })),
    ]);

    const evaluationsEnabled = settings.enabled !== false;

    let html = `
            <div class="records-container">
                <div class="records-header">
                    <h2 class="records-title">
                        <i class="bi bi-clipboard-check"></i> Evaluation Management
                    </h2>
                    <p class="records-subtitle">Enable or disable teacher evaluations and view lowest rated teachers</p>
                </div>
                <div class="records-main">
                    <div class="info-card">
                        <div class="card-header-modern">
                            <i class="bi bi-toggle-on"></i>
                            <h3>Evaluation Settings</h3>
                        </div>
                        <div class="evaluation-toggle-section">
                            <div class="toggle-control">
                                <label class="toggle-label">
                                    <span class="toggle-text">Enable Teacher Evaluations</span>
                                    <span class="toggle-description">When enabled, students can evaluate their teachers. When disabled, students cannot access the evaluation form.</span>
                                </label>
                                <div class="toggle-switch-container">
                                    <label class="toggle-switch">
                                        <input type="checkbox" id="evaluationToggle" ${
                                          evaluationsEnabled ? "checked" : ""
                                        }>
                                        <span class="toggle-slider"></span>
                                    </label>
                                    <span class="toggle-status ${
                                      evaluationsEnabled
                                        ? "status-enabled"
                                        : "status-disabled"
                                    }" id="toggleStatus">
                                        ${
                                          evaluationsEnabled
                                            ? "Enabled"
                                            : "Disabled"
                                        }
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="info-card">
                        <div class="card-header-modern">
                            <i class="bi bi-exclamation-triangle"></i>
                            <h3>Lowest Rated Teachers</h3>
                        </div>
                        <div id="lowestRatedContainer">
        `;

    if (!teachers.teachers || teachers.teachers.length === 0) {
      html += `<p class="text-muted">No teacher evaluations available yet.</p>`;
    } else {
      html += `<div class="leaderboard-container">`;
      teachers.teachers.forEach((teacher, index) => {
        const ratingClass =
          teacher.percentage < 50
            ? "rating-low"
            : teacher.percentage < 70
            ? "rating-medium"
            : "rating-high";
        const rank = index + 1;
        const imagePath = teacher.image_path || "images/sample.jpg";
        html += `
                    <div class="leaderboard-item">
                        <div class="leaderboard-rank">${rank}</div>
                        <div class="leaderboard-avatar">
                            <img src="${escapeHtml(
                              imagePath
                            )}" alt="${escapeHtml(
          teacher.full_name
        )}" class="avatar-img" onerror="this.src='images/sample.jpg'">
                        </div>
                        <div class="leaderboard-info">
                            <h4 class="leaderboard-name">${escapeHtml(
                              teacher.full_name
                            )}</h4>
                            <div class="leaderboard-stats">
                                <span class="stat-badge">${
                                  teacher.total_evaluations
                                } evaluation${
          teacher.total_evaluations !== 1 ? "s" : ""
        }</span>
                                <span class="rating-badge ${ratingClass}">${parseFloat(
          teacher.average_rating || 0
        ).toFixed(2)} / 4.00</span>
                            </div>
                        </div>
                        <div class="leaderboard-rating">
                            <div class="rating-percentage-large ${ratingClass}">
                                ${parseFloat(teacher.percentage || 0).toFixed(
                                  1
                                )}%
                            </div>
                        </div>
                    </div>
                `;
      });
      html += `</div>`;
    }

    html += `
                        </div>
                    </div>
                </div>
            </div>
        `;

    contentArea.innerHTML = html;

    // Setup toggle handler
    const toggle = document.getElementById("evaluationToggle");
    const status = document.getElementById("toggleStatus");
    if (toggle && status) {
      toggle.addEventListener("change", async function () {
        const enabled = this.checked;
        try {
          const response = await fetch("/api/admin/evaluation-settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ enabled }),
          });
          const data = await response.json();
          if (data.success) {
            status.textContent = enabled ? "Enabled" : "Disabled";
            status.className =
              "toggle-status " +
              (enabled ? "status-enabled" : "status-disabled");
          } else {
            alert("Error: " + (data.message || "Failed to update setting"));
            this.checked = !enabled;
          }
        } catch (error) {
          console.error("Error:", error);
          alert("An error occurred while updating the setting");
          this.checked = !enabled;
        }
      });
    }
  } catch (error) {
    contentArea.innerHTML = `<div class="alert alert-danger">Error loading evaluation: ${error.message}</div>`;
  }
}

// ==================== SETTINGS ====================
async function loadSettingsSection() {
  const contentArea = document.getElementById("adminContentArea");

  try {
    // Format filesize helper
    const formatFilesize = (bytes) => {
      if (bytes === null || bytes === false || bytes === undefined) {
        return "Unknown size";
      }
      const units = ["B", "KB", "MB", "GB", "TB"];
      const power =
        bytes > 0 ? Math.floor(Math.log(bytes) / Math.log(1024)) : 0;
      const adjustedPower = Math.min(power, units.length - 1);
      const size = bytes / Math.pow(1024, adjustedPower);
      return parseFloat(size.toFixed(2)) + " " + units[adjustedPower];
    };

    // For now, use default values - API endpoints can be added later
    const scheduleEnabled = false;
    const scheduleTimeValue = "";
    const lastBackupAt = null;
    const lastBackupDownloadUrl = "";
    const lastScheduledRun = null;
    const availableBackups = [];

    let html = `
            <div class="records-container">
                <div class="records-header">
                    <h2 class="records-title">
                        <i class="bi bi-gear-fill"></i> Settings
                    </h2>
                    <p class="records-subtitle">Manage database cleanup and maintenance tasks.</p>
                </div>
                <div class="records-main">
                    <div class="info-card">
                        <div class="card-header-modern">
                            <i class="bi bi-trash3-fill"></i>
                            <h3>Database Cleanup</h3>
                            <p class="text-muted mb-0">Remove unused data and free up storage space.</p>
                        </div>
                        <div class="card-body">
                            <div class="d-flex flex-column flex-lg-row gap-4">
                                <div class="p-4 border rounded-4 bg-light flex-fill h-100">
                                    <div class="d-flex align-items-start justify-content-between mb-3">
                                        <div>
                                            <h4 class="mb-1 fs-5">Clean Up Unused Pictures</h4>
                                            <span class="text-muted small">Remove profile pictures that are no longer in use. When users change their profile picture, the old picture remains in the database folder. This tool will scan and delete any pictures that are not referenced by any user's profile.</span>
                                        </div>
                                        <i class="bi bi-image text-primary fs-4"></i>
                                    </div>
                                    <div class="alert alert-info alert-sm">
                                        <i class="bi bi-info-circle me-2"></i>
                                        <strong>Note:</strong> This will permanently delete unused picture files from the <code>database/pictures</code> folder. Only pictures that are not referenced by any user profile will be removed.
                                    </div>
                                    <form id="cleanupPicturesForm" class="d-grid gap-3 mt-3">
                                        <button type="submit" class="btn btn-primary btn-lg" id="cleanupPicturesBtn">
                                            <i class="bi bi-trash3 me-2"></i>Clean Up Unused Pictures
                                        </button>
                                    </form>
                                    <div id="cleanupPicturesResult" class="mt-4" style="display: none;"></div>
                                </div>
                                <div class="p-4 border rounded-4 bg-white flex-fill h-100">
                                    <div class="d-flex align-items-start justify-content-between mb-3">
                                        <div>
                                            <h4 class="mb-1 fs-5">Clean Up Codebase</h4>
                                            <span class="text-muted small">Remove empty folders and orphaned files that don't belong to the project. This tool scans the codebase for files with unrecognized extensions and empty directories, helping keep your project clean and organized.</span>
                                        </div>
                                        <i class="bi bi-folder-x text-primary fs-4"></i>
                                    </div>
                                    <div class="alert alert-warning alert-sm">
                                        <i class="bi bi-exclamation-triangle me-2"></i>
                                        <strong>Warning:</strong> This will permanently delete files and folders that don't match project file patterns. Only files in <code>public</code>, <code>BackEnd</code>, and <code>database</code> directories will be scanned. System directories like <code>node_modules</code> and <code>.git</code> are protected.
                                    </div>
                                    <form id="cleanupCodebaseForm" class="d-grid gap-3 mt-3">
                                        <button type="submit" class="btn btn-warning btn-lg" id="cleanupCodebaseBtn">
                                            <i class="bi bi-broom me-2"></i>Clean Up Codebase
                                        </button>
                                    </form>
                                    <div id="cleanupCodebaseResult" class="mt-4" style="display: none;"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

    contentArea.innerHTML = html;

    // Setup cleanup pictures form
    const cleanupPicturesForm = document.getElementById("cleanupPicturesForm");
    const cleanupPicturesBtn = document.getElementById("cleanupPicturesBtn");
    const cleanupPicturesResult = document.getElementById(
      "cleanupPicturesResult"
    );

    if (cleanupPicturesForm) {
      cleanupPicturesForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        if (
          !confirm(
            "Are you sure you want to clean up unused pictures? This action cannot be undone."
          )
        ) {
          return;
        }

        // Disable button and show loading state
        if (cleanupPicturesBtn) {
          cleanupPicturesBtn.disabled = true;
          cleanupPicturesBtn.innerHTML =
            '<span class="spinner-border spinner-border-sm me-2"></span>Cleaning up...';
        }

        cleanupPicturesResult.style.display = "none";

        try {
          const result = await AdminAPI.cleanupPictures();

          if (result.success) {
            const formatSize = (bytes) => {
              if (bytes === 0) return "0 B";
              const k = 1024;
              const sizes = ["B", "KB", "MB", "GB"];
              const i = Math.floor(Math.log(bytes) / Math.log(k));
              return (
                Math.round((bytes / Math.pow(k, i)) * 100) / 100 +
                " " +
                sizes[i]
              );
            };

            let resultHtml = "";

            if (result.totalDeleted > 0) {
              resultHtml = `
                                <div class="alert alert-success">
                                    <h5 class="alert-heading">
                                        <i class="bi bi-check-circle-fill me-2"></i>Cleanup Completed Successfully
                                    </h5>
                                    <p class="mb-2">
                                        <strong>${
                                          result.totalDeleted
                                        }</strong> unused picture(s) deleted, freeing up <strong>${formatSize(
                result.totalSize
              )}</strong> of storage space.
                                    </p>
                                    ${
                                      result.deleted &&
                                      result.deleted.length > 0
                                        ? `
                                        <details class="mt-3">
                                            <summary class="cursor-pointer">View deleted files (${
                                              result.deleted.length
                                            })</summary>
                                            <ul class="list-unstyled mt-2 mb-0 small">
                                                ${result.deleted
                                                  .map(
                                                    (filename) =>
                                                      `<li><code>${escapeHtml(
                                                        filename
                                                      )}</code></li>`
                                                  )
                                                  .join("")}
                                            </ul>
                                        </details>
                                    `
                                        : ""
                                    }
                                </div>
                            `;
            } else {
              resultHtml = `
                                <div class="alert alert-info">
                                    <h5 class="alert-heading">
                                        <i class="bi bi-info-circle-fill me-2"></i>No Unused Pictures Found
                                    </h5>
                                    <p class="mb-0">All pictures in the database folder are currently in use. No cleanup needed.</p>
                                </div>
                            `;
            }

            if (result.failed && result.failed.length > 0) {
              resultHtml += `
                                <div class="alert alert-warning mt-3">
                                    <h5 class="alert-heading">
                                        <i class="bi bi-exclamation-triangle-fill me-2"></i>Some Files Could Not Be Deleted
                                    </h5>
                                    <ul class="list-unstyled mb-0 small">
                                        ${result.failed
                                          .map(
                                            (f) =>
                                              `<li><code>${escapeHtml(
                                                f.filename
                                              )}</code>: ${escapeHtml(
                                                f.error
                                              )}</li>`
                                          )
                                          .join("")}
                                    </ul>
                                </div>
                            `;
            }

            cleanupPicturesResult.innerHTML = resultHtml;
            cleanupPicturesResult.style.display = "block";
          } else {
            throw new Error(result.error || "Cleanup failed");
          }
        } catch (error) {
          console.error("Cleanup pictures error:", error);
          cleanupPicturesResult.innerHTML = `
                        <div class="alert alert-danger">
                            <h5 class="alert-heading">
                                <i class="bi bi-exclamation-triangle-fill me-2"></i>Cleanup Failed
                            </h5>
                            <p class="mb-0">${escapeHtml(
                              error.message ||
                                "An error occurred while cleaning up pictures."
                            )}</p>
                        </div>
                    `;
          cleanupPicturesResult.style.display = "block";
        } finally {
          // Re-enable button
          if (cleanupPicturesBtn) {
            cleanupPicturesBtn.disabled = false;
            cleanupPicturesBtn.innerHTML =
              '<i class="bi bi-trash3 me-2"></i>Clean Up Unused Pictures';
          }
        }
      });
    }

    // Setup cleanup codebase form
    const cleanupCodebaseForm = document.getElementById("cleanupCodebaseForm");
    const cleanupCodebaseBtn = document.getElementById("cleanupCodebaseBtn");
    const cleanupCodebaseResult = document.getElementById(
      "cleanupCodebaseResult"
    );

    if (cleanupCodebaseForm) {
      cleanupCodebaseForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        if (
          !confirm(
            "Are you sure you want to clean up the codebase? This will delete empty folders and orphaned files that don't match project patterns. This action cannot be undone."
          )
        ) {
          return;
        }

        // Double confirmation for codebase cleanup
        if (
          !confirm(
            "WARNING: This will permanently delete files and folders. Are you absolutely sure?"
          )
        ) {
          return;
        }

        // Disable button and show loading state
        if (cleanupCodebaseBtn) {
          cleanupCodebaseBtn.disabled = true;
          cleanupCodebaseBtn.innerHTML =
            '<span class="spinner-border spinner-border-sm me-2"></span>Scanning codebase...';
        }

        cleanupCodebaseResult.style.display = "none";

        try {
          const result = await AdminAPI.cleanupCodebase();

          if (result.success) {
            const formatSize = (bytes) => {
              if (bytes === 0) return "0 B";
              const k = 1024;
              const sizes = ["B", "KB", "MB", "GB"];
              const i = Math.floor(Math.log(bytes) / Math.log(k));
              return (
                Math.round((bytes / Math.pow(k, i)) * 100) / 100 +
                " " +
                sizes[i]
              );
            };

            let resultHtml = "";

            const totalDeleted =
              result.totalFilesDeleted + result.totalFoldersDeleted;

            if (totalDeleted > 0) {
              resultHtml = `
                                <div class="alert alert-success">
                                    <h5 class="alert-heading">
                                        <i class="bi bi-check-circle-fill me-2"></i>Codebase Cleanup Completed
                                    </h5>
                                    <p class="mb-2">
                                        <strong>${
                                          result.totalFilesDeleted
                                        }</strong> orphaned file(s) and <strong>${
                result.totalFoldersDeleted
              }</strong> empty folder(s) deleted, freeing up <strong>${formatSize(
                result.totalSize
              )}</strong> of storage space.
                                    </p>
                                    ${
                                      (result.deletedFiles &&
                                        result.deletedFiles.length > 0) ||
                                      (result.deletedFolders &&
                                        result.deletedFolders.length > 0)
                                        ? `
                                        <details class="mt-3">
                                            <summary class="cursor-pointer">View deleted items</summary>
                                            ${
                                              result.deletedFiles &&
                                              result.deletedFiles.length > 0
                                                ? `
                                                <div class="mt-2">
                                                    <strong>Deleted Files (${
                                                      result.deletedFiles.length
                                                    }):</strong>
                                                    <ul class="list-unstyled mt-1 mb-0 small">
                                                        ${result.deletedFiles
                                                          .map(
                                                            (file) =>
                                                              `<li><code>${escapeHtml(
                                                                file
                                                              )}</code></li>`
                                                          )
                                                          .join("")}
                                                    </ul>
                                                </div>
                                            `
                                                : ""
                                            }
                                            ${
                                              result.deletedFolders &&
                                              result.deletedFolders.length > 0
                                                ? `
                                                <div class="mt-2">
                                                    <strong>Deleted Folders (${
                                                      result.deletedFolders
                                                        .length
                                                    }):</strong>
                                                    <ul class="list-unstyled mt-1 mb-0 small">
                                                        ${result.deletedFolders
                                                          .map(
                                                            (folder) =>
                                                              `<li><code>${escapeHtml(
                                                                folder
                                                              )}</code></li>`
                                                          )
                                                          .join("")}
                                                    </ul>
                                                </div>
                                            `
                                                : ""
                                            }
                                        </details>
                                    `
                                        : ""
                                    }
                                </div>
                            `;
            } else {
              resultHtml = `
                                <div class="alert alert-info">
                                    <h5 class="alert-heading">
                                        <i class="bi bi-info-circle-fill me-2"></i>No Cleanup Needed
                                    </h5>
                                    <p class="mb-0">No orphaned files or empty folders found. Your codebase is already clean!</p>
                                </div>
                            `;
            }

            if (result.failed && result.failed.length > 0) {
              resultHtml += `
                                <div class="alert alert-warning mt-3">
                                    <h5 class="alert-heading">
                                        <i class="bi bi-exclamation-triangle-fill me-2"></i>Some Items Could Not Be Processed
                                    </h5>
                                    <ul class="list-unstyled mb-0 small">
                                        ${result.failed
                                          .map(
                                            (f) =>
                                              `<li><code>${escapeHtml(
                                                f.path
                                              )}</code>: ${escapeHtml(
                                                f.error
                                              )}</li>`
                                          )
                                          .join("")}
                                    </ul>
                                </div>
                            `;
            }

            cleanupCodebaseResult.innerHTML = resultHtml;
            cleanupCodebaseResult.style.display = "block";
          } else {
            throw new Error(result.error || "Cleanup failed");
          }
        } catch (error) {
          console.error("Cleanup codebase error:", error);
          cleanupCodebaseResult.innerHTML = `
                        <div class="alert alert-danger">
                            <h5 class="alert-heading">
                                <i class="bi bi-exclamation-triangle-fill me-2"></i>Cleanup Failed
                            </h5>
                            <p class="mb-0">${escapeHtml(
                              error.message ||
                                "An error occurred while cleaning up the codebase."
                            )}</p>
                        </div>
                    `;
          cleanupCodebaseResult.style.display = "block";
        } finally {
          // Re-enable button
          if (cleanupCodebaseBtn) {
            cleanupCodebaseBtn.disabled = false;
            cleanupCodebaseBtn.innerHTML =
              '<i class="bi bi-broom me-2"></i>Clean Up Codebase';
          }
        }
      });
    }
  } catch (error) {
    contentArea.innerHTML = `<div class="alert alert-danger">Error loading settings: ${error.message}</div>`;
  }
}

// ==================== GRADE SYSTEM ====================
// ==================== GRADE SYSTEM ====================
async function loadGradeSystemSection() {
  const contentArea = document.getElementById("adminContentArea");

  try {
    const urlParams = new URLSearchParams(window.location.search);
    const editGradeId = parseInt(urlParams.get("edit_grade_id")) || 0;

    // Get all data needed
    const [
      grades,
      sections,
      students,
      userAssignments,
      subjects,
      teacherAssignments,
    ] = await Promise.all([
      AdminAPI.getGrades().catch(() => []),
      AdminAPI.getSections().catch(() => []),
      AdminAPI.getUsers()
        .then((users) => users.filter((u) => u.role === "student"))
        .catch(() => []),
      AdminAPI.getUserAssignments().catch(() => []),
      AdminAPI.getSubjects().catch(() => []),
      AdminAPI.getTeacherAssignments().catch(() => []),
    ]);

    const gradesList = Array.isArray(grades) ? grades : [];
    const sectionsList = Array.isArray(sections) ? sections : [];
    const studentsList = Array.isArray(students) ? students : [];
    const assignmentsList = Array.isArray(userAssignments)
      ? userAssignments
      : [];
    const subjectsList = Array.isArray(subjects) ? subjects : [];
    const teacherAssignmentsList = Array.isArray(teacherAssignments)
      ? teacherAssignments
      : [];

    // Create subject to teacher mapping
    const subjectTeacherMap = {};
    teacherAssignmentsList.forEach((ta) => {
      const subjCode = (ta.subject_code || "").toUpperCase().trim();
      if (subjCode) {
        subjectTeacherMap[subjCode] = ta.full_name || ta.teacher_name || "";
      }
    });

    // Find edit grade row
    let editGradeRow = null;
    let gradeStudentDisplay = "";
    let gradeStudentIdValue = "";

    if (editGradeId > 0) {
      editGradeRow = gradesList.find((g) => g.id === editGradeId);
      if (editGradeRow) {
        if (editGradeRow.user_id) {
          const student = studentsList.find(
            (s) => s.id === editGradeRow.user_id
          );
          if (student) {
            gradeStudentDisplay = (
              student.full_name ||
              student.username ||
              ""
            ).trim();
            gradeStudentIdValue = student.id.toString();
          }
        }
        if (!gradeStudentDisplay && editGradeRow.username) {
          gradeStudentDisplay = editGradeRow.username;
        }
      }
    }

    // Get available years and sections for filters
    const availableYears = [
      ...new Set(gradesList.map((g) => g.year).filter(Boolean)),
    ].sort();
    const availableSections = [
      ...new Set(sectionsList.map((s) => s.name).filter(Boolean)),
    ].sort();

    const selectedYearFilter = urlParams.get("grade_year") || "";
    const selectedSectionFilter = urlParams.get("grade_section") || "";

    // Format ordinal helper
    const formatOrdinal = (n) => {
      const num = parseInt(n);
      const ends = ["th", "st", "nd", "rd", "th", "th", "th", "th", "th", "th"];
      if (num % 100 >= 11 && num % 100 <= 13) {
        return num + "th";
      }
      return num + (ends[num % 10] || "th");
    };

    let html = `
            <div class="records-container">
                <div class="records-header">
                    <h2 class="records-title">
                        <i class="bi bi-journal-bookmark-fill"></i> Grade System
                    </h2>
                    <p class="records-subtitle">Manage student grades and academic records</p>
                </div>
                <div class="records-main">
                    <div class="info-card">
                        <div class="card-header-modern">
                            <i class="bi bi-journal-bookmark-fill"></i>
                            <h3>Grade System</h3>
                        </div>
                        <div class="p-3">
                            <div class="alert alert-info mb-0">
                                <i class="bi bi-info-circle me-2"></i>
                                Grade entry is managed in the teacher panel. Admin view is read-only here.
                            </div>
                        </div>
                    </div>
        `;

    // Filter section
    if (availableYears.length > 0 || availableSections.length > 0) {
      const filterBase = new URLSearchParams(window.location.search);
      filterBase.set("section", "grade_system");

      html += `
                    <div class="info-card mt-3 grade-filter-card">
                        <div class="grade-filter-inner">
                            <div class="grade-filter-head">
                                <div class="grade-filter-title">
                                    <span class="grade-filter-icon"><i class="bi bi-funnel-fill"></i></span>
                                    <div>
                                        <h3>Filter by Level & Section</h3>
                                        <p>Focus the overview by academic year or section.</p>
                                    </div>
                                </div>
                                ${
                                  selectedYearFilter || selectedSectionFilter
                                    ? `
                                    <a href="admin_dashboard.html?section=grade_system" class="grade-filter-reset">
                                        <i class="bi bi-arrow-counterclockwise"></i> Reset view
                                    </a>
                                `
                                    : ""
                                }
                            </div>
                            <div class="grade-filter-actions">
            `;

      if (availableYears.length > 0) {
        const yearBase = new URLSearchParams(filterBase);
        yearBase.delete("grade_year");
        const yearAllUrl = `admin_dashboard.html?${yearBase.toString()}`;

        html += `
                                <div class="grade-filter-group">
                                    <span class="grade-filter-label">Year Level</span>
                                    <a href="${yearAllUrl}" class="grade-chip ${
          !selectedYearFilter ? "active" : ""
        }">
                                        <i class="bi bi-layers"></i>
                                        <span>All Years</span>
                                    </a>
                `;

        availableYears.forEach((yearValue) => {
          const yearParams = new URLSearchParams(yearBase);
          yearParams.set("grade_year", yearValue);
          const yearUrl = `admin_dashboard.html?${yearParams.toString()}`;
          const yearLabel =
            yearValue === "1"
              ? "1st Year"
              : yearValue === "2"
              ? "2nd Year"
              : yearValue === "3"
              ? "3rd Year"
              : yearValue === "4"
              ? "4th Year"
              : yearValue + " Year";

          html += `
                                    <a href="${yearUrl}" class="grade-chip ${
            selectedYearFilter === yearValue ? "active" : ""
          }">
                                        <i class="bi bi-calendar-week"></i>
                                        <span>${escapeHtml(yearLabel)}</span>
                                    </a>
                    `;
        });

        html += `</div>`;
      }

      if (availableSections.length > 0) {
        const sectionBase = new URLSearchParams(filterBase);
        sectionBase.delete("grade_section");
        const sectionAllUrl = `admin_dashboard.html?${sectionBase.toString()}`;

        html += `
                                <div class="grade-filter-group">
                                    <span class="grade-filter-label">Section</span>
                                    <a href="${sectionAllUrl}" class="grade-chip ${
          !selectedSectionFilter ? "active" : ""
        }">
                                        <i class="bi bi-grid-1x2"></i>
                                        <span>All Sections</span>
                                    </a>
                `;

        availableSections.forEach((sectionValue) => {
          const sectionParams = new URLSearchParams(sectionBase);
          sectionParams.set("grade_section", sectionValue);
          const sectionUrl = `admin_dashboard.html?${sectionParams.toString()}`;

          html += `
                                    <a href="${sectionUrl}" class="grade-chip ${
            selectedSectionFilter === sectionValue ? "active" : ""
          }">
                                        <i class="bi bi-collection"></i>
                                        <span>${escapeHtml(sectionValue)}</span>
                                    </a>
                    `;
        });

        html += `</div>`;
      }

      html += `
                            </div>
                            ${
                              selectedYearFilter || selectedSectionFilter
                                ? `
                                <div class="grade-filter-note">
                                    <i class="bi bi-info-circle"></i>
                                    Showing grade records
                                    ${
                                      selectedYearFilter
                                        ? ` for <strong>${escapeHtml(
                                            selectedYearFilter === "1"
                                              ? "1st Year"
                                              : selectedYearFilter === "2"
                                              ? "2nd Year"
                                              : selectedYearFilter === "3"
                                              ? "3rd Year"
                                              : selectedYearFilter === "4"
                                              ? "4th Year"
                                              : selectedYearFilter + " Year"
                                          )}</strong>`
                                        : ""
                                    }
                                    ${
                                      selectedSectionFilter
                                        ? ` in section <strong>${escapeHtml(
                                            selectedSectionFilter
                                          )}</strong>`
                                        : ""
                                    }
                                    .
                                </div>
                            `
                                : ""
                            }
                        </div>
                    </div>
            `;
    }

    // Display grades by year
    html += `
                    <div class="grade-system-wrapper">
        `;

    const years = ["1", "2", "3", "4"];
    years.forEach((yearNum) => {
      if (selectedYearFilter && selectedYearFilter !== yearNum) {
        return;
      }

      // Filter grades by year and section
      let yearGrades = gradesList.filter((g) => g.year === yearNum);

      if (selectedSectionFilter) {
        // Match grades to students and their sections
        yearGrades = yearGrades.filter((grade) => {
          const student = studentsList.find(
            (s) =>
              (grade.user_id && s.id === grade.user_id) ||
              (grade.username && s.username === grade.username)
          );
          if (!student) return false;

          const assignment = assignmentsList.find(
            (a) =>
              (a.user_id && a.user_id === student.id) ||
              a.username === student.username ||
              a.username === student.full_name
          );

          return assignment && assignment.section === selectedSectionFilter;
        });
      }

      if (yearGrades.length === 0) {
        return;
      }

      // Group by student
      const studentGroups = {};
      yearGrades.forEach((grade) => {
        const studentId = grade.user_id || null;
        const studentIdentifier =
          studentId !== null
            ? "id_" + studentId
            : "name_" +
              (grade.username || grade.student_name || "").toLowerCase().trim();
        const displayName =
          grade.student_name || grade.username || "Unnamed Student";
        const student = studentsList.find(
          (s) =>
            (studentId && s.id === studentId) ||
            (grade.username && s.username === grade.username)
        );

        // Normalize image path
        let imagePath = "images/sample.jpg";
        if (student && student.image_path) {
          imagePath = student.image_path;
          if (imagePath.startsWith("/TCC/public/")) {
            imagePath = imagePath.replace("/TCC/public/", "");
          } else if (imagePath.startsWith("/TCC/database/pictures/")) {
            imagePath = imagePath.replace(
              "/TCC/database/pictures/",
              "database/pictures/"
            );
          }
        } else if (!imagePath || imagePath === "") {
          imagePath = "images/sample.jpg";
        }

        if (!studentGroups[studentIdentifier]) {
          studentGroups[studentIdentifier] = {
            user_id: studentId,
            display: displayName,
            image_path: imagePath,
            semesters: {
              "First Semester": [],
              "Second Semester": [],
            },
          };
        }

        const semesterKey =
          grade.semester === "Second Semester"
            ? "Second Semester"
            : "First Semester";
        studentGroups[studentIdentifier].semesters[semesterKey].push(grade);
      });

      if (Object.keys(studentGroups).length === 0) {
        return;
      }

      html += `
                        <div class="info-card grade-year-card">
                            <div class="card-header-modern">
                                <i class="bi bi-calendar-year"></i>
                                <h3>${yearNum}${
        yearNum === "1"
          ? "st"
          : yearNum === "2"
          ? "nd"
          : yearNum === "3"
          ? "rd"
          : "th"
      } Year</h3>
                            </div>
                            <div class="grade-year-body">
                                <div class="grade-student-list">
            `;

      Object.values(studentGroups).forEach((group) => {
        const displayName = group.display;
        const imagePath = group.image_path;
        const subjectCount = Object.values(group.semesters).flat().length;

        let scoredSubjects = 0;
        let totalScores = 0;
        const semesterSummaries = [];

        ["First Semester", "Second Semester"].forEach((semName) => {
          if (group.semesters[semName].length > 0) {
            let semScoreCount = 0;
            let semScoreTotal = 0;

            group.semesters[semName].forEach((grade) => {
              const gradeParts = [];
              ["prelim_grade", "midterm_grade", "finals_grade"].forEach(
                (field) => {
                  const val = grade[field];
                  if (val !== null && val !== "" && !isNaN(val)) {
                    gradeParts.push(parseFloat(val));
                  }
                }
              );

              if (gradeParts.length > 0) {
                scoredSubjects++;
                totalScores +=
                  gradeParts.reduce((a, b) => a + b, 0) / gradeParts.length;
                semScoreCount++;
                semScoreTotal +=
                  gradeParts.reduce((a, b) => a + b, 0) / gradeParts.length;
              }
            });

            const semAverage =
              semScoreCount > 0
                ? Math.round((semScoreTotal / semScoreCount) * 10) / 10
                : null;
            semesterSummaries.push({
              label: semName === "Second Semester" ? "2nd Sem" : "1st Sem",
              count: group.semesters[semName].length,
              average: semAverage,
            });
          }
        });

        const summaryText =
          subjectCount > 0
            ? subjectCount +
              " " +
              (subjectCount === 1 ? "subject" : "subjects") +
              " recorded"
            : "No grades yet";
        const averageScore =
          scoredSubjects > 0
            ? Math.round((totalScores / scoredSubjects) * 10) / 10
            : null;
        const yearLabel =
          yearNum === "1"
            ? "1st Year"
            : yearNum === "2"
            ? "2nd Year"
            : yearNum === "3"
            ? "3rd Year"
            : "4th Year";

        // Collect all grade IDs
        const allGradeIds = Object.values(group.semesters)
          .flat()
          .map((g) => g.id)
          .filter(Boolean);

        html += `
                                    <div class="student-grade-card">
                                        <div class="student-grade-main">
                                            <img src="${escapeHtml(
                                              imagePath
                                            )}" alt="${escapeHtml(
          displayName
        )}" class="student-profile-picture" onerror="this.src='images/sample.jpg'; this.onerror=null;">
                                            <div>
                                                <span class="student-grade-name">${escapeHtml(
                                                  displayName
                                                )}</span>
                                                <span class="student-grade-summary">${escapeHtml(
                                                  summaryText
                                                )}</span>
                                            </div>
                                        </div>
                                        <div class="student-grade-meta">
                `;

        semesterSummaries.forEach((semInfo) => {
          html += `
                                            <span class="meta-pill${
                                              semInfo.average !== null
                                                ? " meta-pill--has-avg"
                                                : ""
                                            }">
                                                ${escapeHtml(semInfo.label)}
                                                ${
                                                  semInfo.average !== null
                                                    ? `<small>${semInfo.average} avg</small>`
                                                    : ""
                                                }
                                            </span>
                    `;
        });

        if (averageScore !== null) {
          html += `
                                            <span class="meta-pill meta-pill-accent">${averageScore}<small>avg</small></span>
                    `;
        }

        if (allGradeIds.length > 0) {
          html += `
                                            <button type="button" class="meta-pill delete-pill" onclick="deleteAllStudentGrades([${allGradeIds.join(
                                              ","
                                            )}], '${escapeHtml(
            displayName
          )}')" title="Delete all grades">
                                                <i class="bi bi-trash"></i> Delete
                        </button>
                    `;
        }

        html += `
                                        </div>
                                    </div>
                `;
      });

      html += `
                    </div>
                </div>
            </div>
        `;
    });

    html += `
                    </div>
                </div>
            </div>
        `;

    contentArea.innerHTML = html;

    // Setup student search
    const studentSearchInput = document.getElementById(
      "gradeStudentSearchInput"
    );
    const studentSearchList = document.getElementById("gradeStudentSearchList");
    const studentIdHidden = document.getElementById("gradeStudentIdHidden");
    const gradeForm = document.getElementById("gradeForm");

    if (studentSearchInput && studentSearchList && studentIdHidden) {
      let searchTimeout;
      studentSearchInput.addEventListener("input", function (e) {
        const query = e.target.value.trim();
        clearTimeout(searchTimeout);

        if (query.length < 2) {
          studentSearchList.style.display = "none";
          studentSearchList.setAttribute("aria-hidden", "true");
          return;
        }

        searchTimeout = setTimeout(async () => {
          try {
            const suggestions = await AdminAPI.getUserSuggestions(
              query,
              "student"
            );
            if (suggestions.length === 0) {
              studentSearchList.style.display = "none";
              studentSearchList.setAttribute("aria-hidden", "true");
              return;
            }

            studentSearchList.innerHTML = suggestions
              .map((user) => {
                const displayName = user.full_name || user.username;
                const username = user.username;
                const label =
                  username && username !== displayName
                    ? `${displayName} (${username})`
                    : displayName;
                return `
                                <li role="option" class="list-group-item list-group-item-action" 
                                    onclick="selectGradeStudent(${
                                      user.id
                                    }, '${escapeHtml(
                  displayName
                )}'); return false;">
                                    ${escapeHtml(label)}
                                </li>
                            `;
              })
              .join("");
            studentSearchList.style.display = "block";
            studentSearchList.setAttribute("aria-hidden", "false");
          } catch (error) {
            console.error("Error fetching suggestions:", error);
          }
        }, 300);
      });

      // Hide suggestions when clicking outside
      document.addEventListener("click", (e) => {
        if (
          !studentSearchInput.contains(e.target) &&
          !studentSearchList.contains(e.target)
        ) {
          studentSearchList.style.display = "none";
          studentSearchList.setAttribute("aria-hidden", "true");
        }
      });

      window.selectGradeStudent = function (userId, name) {
        studentSearchInput.value = name;
        studentIdHidden.value = userId;
        studentSearchList.style.display = "none";
        studentSearchList.setAttribute("aria-hidden", "true");
      };
    }

    // Setup subject suggestions
    const gradeSubjectInput = document.getElementById("gradeSubjectInput");
    const gradeSubjectSuggestions = document.getElementById(
      "gradeSubjectSuggestions"
    );

    if (gradeSubjectInput && gradeSubjectSuggestions) {
      let subjectSearchTimeout;
      gradeSubjectInput.addEventListener("input", function (e) {
        const query = e.target.value.trim().toLowerCase();
        clearTimeout(subjectSearchTimeout);

        if (query.length < 1) {
          gradeSubjectSuggestions.style.display = "none";
          return;
        }

        subjectSearchTimeout = setTimeout(() => {
          // Filter subjects by code or title
          const filtered = subjectsList
            .filter((subj) => {
              const codeMatch = (subj.subject_code || "")
                .toLowerCase()
                .includes(query);
              const titleMatch = (subj.title || "")
                .toLowerCase()
                .includes(query);
              return codeMatch || titleMatch;
            })
            .slice(0, 10); // Limit to 10 results

          if (filtered.length === 0) {
            gradeSubjectSuggestions.style.display = "none";
            return;
          }

          gradeSubjectSuggestions.innerHTML = filtered
            .map((subj) => {
              const teacherName =
                subjectTeacherMap[
                  (subj.subject_code || "").toUpperCase().trim()
                ] || "";
              const teacherText = teacherName
                ? ` <span class="text-muted">(${escapeHtml(
                    teacherName
                  )})</span>`
                : "";
              return `
                            <a href="#" class="list-group-item list-group-item-action" 
                               onclick="selectGradeSubject('${escapeHtml(
                                 subj.subject_code || ""
                               )}', '${escapeHtml(
                subj.title || ""
              )}', '${escapeHtml(teacherName)}'); return false;">
                                <strong>${escapeHtml(
                                  subj.subject_code || ""
                                )}</strong> — ${escapeHtml(
                subj.title || ""
              )}${teacherText}
                            </a>
                        `;
            })
            .join("");
          gradeSubjectSuggestions.style.display = "block";
        }, 200);
      });

      // Hide suggestions when clicking outside
      document.addEventListener("click", (e) => {
        if (
          !gradeSubjectInput.contains(e.target) &&
          !gradeSubjectSuggestions.contains(e.target)
        ) {
          gradeSubjectSuggestions.style.display = "none";
        }
      });

      window.selectGradeSubject = function (
        subjectCode,
        subjectTitle,
        teacherName
      ) {
        // Use subject code as the subject value
        gradeSubjectInput.value = subjectCode;
        const instructorInput = document.querySelector('[name="instructor"]');
        if (instructorInput && teacherName) {
          instructorInput.value = teacherName;
        }
        gradeSubjectSuggestions.style.display = "none";
      };
    }

    // Setup form submission
    if (gradeForm) {
      gradeForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        try {
          // Get student assignment to determine year and semester
          const userId = parseInt(studentIdHidden.value) || null;
          let studentYear = null;
          let studentSemester = "First Semester"; // Default
          let username = "";

          if (userId) {
            // Get username from studentsList
            const student = studentsList.find((s) => s.id === userId);
            if (student) {
              username = student.username || student.full_name || "";
            }

            const studentAssignment = assignmentsList.find(
              (a) => a.user_id === userId
            );
            if (studentAssignment) {
              studentYear = studentAssignment.year || null;
              // Semester can be determined from subject or default to First Semester
              const subjectCode =
                gradeForm.querySelector('[name="subject"]').value;
              const subject = subjectsList.find(
                (s) => s.subject_code === subjectCode
              );
              if (subject && subject.semester) {
                studentSemester = subject.semester;
              }
            }
          }

          // If no username from studentsList, try to get from edit grade
          if (!username && editGradeRow && editGradeRow.username) {
            username = editGradeRow.username;
          }

          // If no year from assignment, try to get from edit grade or default
          if (!studentYear && editGradeRow && editGradeRow.year) {
            studentYear = editGradeRow.year;
          }
          if (!studentYear) {
            studentYear = "1"; // Default to 1st year
          }

          // Validate required fields
          if (!userId) {
            alert("Please select a student");
            return;
          }
          if (!username) {
            alert("Student username not found. Please select a student again.");
            return;
          }
          const subjectValue = gradeForm
            .querySelector('[name="subject"]')
            .value.trim();
          if (!subjectValue) {
            alert("Please select a subject");
            return;
          }

          const formData = {
            user_id: userId,
            username: username,
            year: studentYear,
            semester: studentSemester,
            subject: subjectValue,
            instructor:
              gradeForm.querySelector('[name="instructor"]').value || null,
            prelim_grade:
              gradeForm.querySelector('[name="prelim_grade"]').value || null,
            midterm_grade:
              gradeForm.querySelector('[name="midterm_grade"]').value || null,
            finals_grade:
              gradeForm.querySelector('[name="finals_grade"]').value || null,
          };

          if (editGradeRow && editGradeRow.id) {
            await AdminAPI.updateGrade(editGradeRow.id, formData);
          } else {
            await AdminAPI.createGrade(formData);
          }

          window.location.href = `admin_dashboard.html?section=grade_system&_t=${Date.now()}`;
        } catch (error) {
          alert(
            `Error ${editGradeRow ? "updating" : "creating"} grade: ${
              error.message
            }`
          );
        }
      });
    }
  } catch (error) {
    contentArea.innerHTML = `<div class="alert alert-danger">Error loading grade system: ${error.message}</div>`;
  }
}

async function deleteAllStudentGrades(gradeIds, studentName) {
  if (
    !confirm(
      `Are you sure you want to delete all grades for ${studentName}? This action cannot be undone.`
    )
  )
    return;
  try {
    // Delete each grade
    for (const id of gradeIds) {
      await AdminAPI.deleteGrade(id);
    }
    window.location.href = `admin_dashboard.html?section=grade_system&_t=${Date.now()}`;
  } catch (error) {
    alert(`Error deleting grades: ${error.message}`);
  }
}
