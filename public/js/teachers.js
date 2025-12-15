// Teacher Dashboard JavaScript
// All patches from conversation applied

// Utility function to escape HTML
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Friendly date formatter for transparency cards
function formatFriendlyDate(dateString) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return escapeHtml(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// View configurations
const viewConfigs = {
  grade_system: { title: "Grade System", icon: "bi-clipboard-data" },
};

// Hero spotlights configuration
const heroSpotlights = {
  schedule: {
    hero_copy:
      "View your teaching schedule, class times, and room assignments in one organized view.",
    spotlight_eyebrow: "Teaching schedule",
    spotlight_title: "My Schedule",
    spotlight_copy:
      "Check your weekly schedule, see which classes you teach, and manage your time effectively.",
  },
  announcements: {
    hero_copy:
      "Catch up on campus headlines, filter by year or department, and keep every announcement at your fingertips.",
    spotlight_eyebrow: "Latest broadcasts",
    spotlight_title: "Announcements",
    spotlight_copy:
      "Browse targeted updates, stay informed on school activities, and never miss important campus news.",
  },
  transparency: {
    hero_copy:
      "See where resources go, review project milestones, and keep the community informed with transparent reporting.",
    spotlight_eyebrow: "Project insights",
    spotlight_title: "Transparency",
    spotlight_copy:
      "Explore school project budgets, completion status, and milestones through an accessible transparency log.",
  },
  evaluation: {
    hero_copy:
      "View your evaluation statistics and feedback from students to improve your teaching.",
    spotlight_eyebrow: "Performance insights",
    spotlight_title: "Evaluation Statistics",
    spotlight_copy:
      "Review detailed evaluation statistics, student feedback, and recommendations to enhance your teaching effectiveness.",
  },
  settings: {
    hero_copy:
      "Personalize your profile, update your login details, and keep your account aligned with your current information.",
    spotlight_eyebrow: "Account controls",
    spotlight_title: "Settings",
    spotlight_copy:
      "Update your username, display name, password, and profile picture to keep your account up to date.",
  },
  grade_system: {
    hero_copy:
      "Input and manage student grades for your assigned subjects efficiently.",
    spotlight_eyebrow: "Grade management",
    spotlight_title: "Grade System",
    spotlight_copy:
      "Manage student grades, track academic progress, and maintain accurate records for all your classes.",
  },
};

// Current view
let currentView = "schedule";

// Initialize dashboard
document.addEventListener("DOMContentLoaded", async () => {
  // Check authentication
  try {
    const session = await AuthAPI.checkSession();
    if (!session.authenticated || session.user.role !== "teacher") {
      window.location.href = "index.html";
      return;
    }

    // Update sidebar with user info
    const imgEl = document.getElementById("teacherUserImage");
    if (imgEl) {
      // Normalize image path - remove /TCC/public prefix if present
      let imagePath = session.user.image_path || "images/sample.jpg";
      if (imagePath && imagePath.startsWith("/TCC/public/")) {
        imagePath = imagePath.replace("/TCC/public/", "");
        imgEl.src = imagePath;
      } else if (
        imagePath &&
        (imagePath.startsWith("/TCC/database/pictures/") ||
          (!imagePath.startsWith("images/") && !imagePath.startsWith("http")))
      ) {
        // request signed URL from backend for storage-stored avatars or filenames
        imgEl.src = "images/sample.jpg";
        getAvatarUrl(session.user.id, imagePath)
          .then((url) => {
            imgEl.src = url;
          })
          .catch(() => {});
      } else {
        if (!imagePath || imagePath === "") imagePath = "images/sample.jpg";
        imgEl.src = imagePath;
      }
    }
    if (session.user.school_id) {
      const schoolIdEl = document.getElementById("teacherSchoolId");
      if (schoolIdEl) {
        schoolIdEl.textContent = session.user.school_id;
        schoolIdEl.style.display = "inline";
      }
    }
    const roleEl = document.getElementById("teacherRole");
    if (roleEl) {
      roleEl.textContent = session.user.role
        ? session.user.role.charAt(0).toUpperCase() + session.user.role.slice(1)
        : "Teacher";
      roleEl.style.display = "inline";
    }
    const userNameEl = document.getElementById("teacherUserName");
    if (userNameEl)
      userNameEl.textContent = session.user.full_name || session.user.username;

    // Setup logout
    const logoutBtn = document.getElementById("teacherLogoutBtn");
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
  } catch (error) {
    window.location.href = "index.html";
    return;
  }

  // Setup navigation
  setupNavigation();

  // Update hero content based on URL or default view
  const urlParams = new URLSearchParams(window.location.search);
  const viewParam = urlParams.get("view");
  if (viewParam) {
    currentView = viewParam;
  }
  updateHeroContent(currentView);

  // Load initial view
  await loadView(currentView);
});

// Setup navigation
function setupNavigation() {
  // Setup sidebar navigation
  document.querySelectorAll(".sidebar-nav .nav-link").forEach((item) => {
    item.addEventListener("click", async (e) => {
      e.preventDefault();
      const view = item.getAttribute("data-view");
      if (view) {
        await loadView(view);
      }
    });
  });

  // Setup hero action buttons
  document.querySelectorAll(".hero-action").forEach((item) => {
    item.addEventListener("click", async (e) => {
      e.preventDefault();
      const view = item.getAttribute("data-view");
      if (view) {
        await loadView(view);
      }
    });
  });
}

// Load view
async function loadView(view) {
  currentView = view;
  const contentArea = document.getElementById("teacherContentArea");
  contentArea.innerHTML = '<div class="loading">Loading...</div>';

  // Update active nav link in sidebar
  document.querySelectorAll(".sidebar-nav .nav-link").forEach((item) => {
    item.classList.remove("active");
    if (item.getAttribute("data-view") === view) {
      item.classList.add("active");
    }
  });

  // Update active hero action button
  document.querySelectorAll(".hero-action").forEach((item) => {
    item.classList.remove("active");
    if (item.getAttribute("data-view") === view) {
      item.classList.add("active");
    }
  });

  // Update hero content
  updateHeroContent(view);

  try {
    switch (view) {
      case "schedule":
        await loadScheduleView();
        break;
      case "announcements":
        await loadAnnouncementsView();
        break;
      case "transparency":
        await loadTransparencyView();
        break;
      case "evaluation":
        await loadEvaluationView();
        break;
      case "settings":
        await loadSettingsView();
        break;
      case "grade_system":
        await loadGradeSystemView();
        break;
      default:
        contentArea.innerHTML =
          '<div class="alert alert-danger">View not found</div>';
    }
  } catch (error) {
    console.error("Error loading view:", error);
    contentArea.innerHTML = `<div class="alert alert-danger">Error loading view: ${error.message}</div>`;
  }
}

// Update hero content based on view
function updateHeroContent(view) {
  const spotlight = heroSpotlights[view] || heroSpotlights.schedule;
  const heroCopyEl = document.getElementById("teacherHeroCopy");
  const spotlightEyebrowEl = document.getElementById("teacherSpotlightEyebrow");
  const spotlightTitleEl = document.getElementById("teacherSpotlightTitle");
  const spotlightCopyEl = document.getElementById("teacherSpotlightCopy");

  if (heroCopyEl) heroCopyEl.textContent = spotlight.hero_copy;
  if (spotlightEyebrowEl)
    spotlightEyebrowEl.textContent = spotlight.spotlight_eyebrow;
  if (spotlightTitleEl)
    spotlightTitleEl.textContent = spotlight.spotlight_title;
  if (spotlightCopyEl) spotlightCopyEl.textContent = spotlight.spotlight_copy;
}

// ==================== SCHEDULE VIEW ====================
async function loadScheduleView() {
  const contentArea = document.getElementById("teacherContentArea");

  try {
    const schedules = await TeacherAPI.getSchedule().catch(() => []);

    // Group schedules by day
    const schedulesByDay = {};
    const dayOrder = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];

    (Array.isArray(schedules) ? schedules : []).forEach((schedule) => {
      const day = schedule.day || "Unknown";
      if (!schedulesByDay[day]) {
        schedulesByDay[day] = [];
      }
      schedulesByDay[day].push(schedule);
    });

    // Sort schedules within each day by time
    Object.keys(schedulesByDay).forEach((day) => {
      schedulesByDay[day].sort((a, b) => {
        const timeA = a.time_start || "";
        const timeB = b.time_start || "";
        return timeA.localeCompare(timeB);
      });
    });

    let html = `
            <div class="records-container">
                <div class="records-header">
                    <h2 class="records-title">
                        <i class="bi bi-calendar-week"></i> My Schedule
                    </h2>
                    <p class="records-subtitle">Manage your teaching schedule and class assignments</p>
                </div>
                <div class="records-main">
        `;

    if (Object.keys(schedulesByDay).length === 0) {
      html += `
                <div class="info-card mt-3">
                    <div class="card-header-modern">
                        <i class="bi bi-calendar-x"></i>
                        <h3>No Schedule Found</h3>
                    </div>
                    <p class="text-muted mb-0">You don't have any scheduled classes yet.</p>
                </div>
            `;
    } else {
      // Sort days according to dayOrder
      const sortedDays = Object.keys(schedulesByDay).sort((a, b) => {
        const posA = dayOrder.indexOf(a);
        const posB = dayOrder.indexOf(b);
        if (posA === -1) return 1;
        if (posB === -1) return -1;
        return posA - posB;
      });

      sortedDays.forEach((day) => {
        const daySchedules = schedulesByDay[day];
        html += `
                    <div class="info-card mt-3">
                        <div class="card-header-modern">
                            <i class="bi bi-calendar-day"></i>
                            <h3>${escapeHtml(day)}</h3>
                        </div>
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
                `;

        daySchedules.forEach((schedule) => {
          const timeStart = schedule.time_start
            ? new Date("1970-01-01T" + schedule.time_start).toLocaleTimeString(
                "en-US",
                { hour: "numeric", minute: "2-digit", hour12: true }
              )
            : "N/A";
          const timeEnd = schedule.time_end
            ? new Date("1970-01-01T" + schedule.time_end).toLocaleTimeString(
                "en-US",
                { hour: "numeric", minute: "2-digit", hour12: true }
              )
            : "N/A";
          const timeRange =
            timeStart !== "N/A" && timeEnd !== "N/A"
              ? `${timeStart} - ${timeEnd}`
              : "N/A";
          const classType = schedule.class_type || "day";

          html += `
                        <tr>
                            <td><strong>${escapeHtml(
                              schedule.subject || "N/A"
                            )}</strong></td>
                            <td>${escapeHtml(schedule.year || "N/A")}</td>
                            <td>${escapeHtml(schedule.section || "—")}</td>
                            <td>${escapeHtml(timeRange)}</td>
                            <td>
                                <span class="badge bg-${
                                  classType === "night" ? "dark" : "warning"
                                }">
                                    ${escapeHtml(
                                      classType.charAt(0).toUpperCase() +
                                        classType.slice(1)
                                    )}
                                </span>
                            </td>
                            <td>${escapeHtml(schedule.room || "—")}</td>
                            <td>${escapeHtml(schedule.building || "—")}</td>
                        </tr>
                    `;
        });

        html += `
                                </tbody>
                            </table>
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
  } catch (error) {
    contentArea.innerHTML = `<div class="alert alert-danger">Error loading schedule: ${error.message}</div>`;
  }
}

// ==================== ANNOUNCEMENTS VIEW ====================
async function loadAnnouncementsView() {
  const contentArea = document.getElementById("teacherContentArea");

  try {
    const urlParams = new URLSearchParams(window.location.search);
    const filterYear = urlParams.get("year_filter") || "";
    const filterDept = urlParams.get("dept_filter") || "";
    const filterMajor = urlParams.get("major_filter") || "";

    let announcements = [];
    try {
      announcements = await TeacherAPI.getAnnouncements();
    } catch (apiError) {
      console.error("Error fetching announcements:", apiError);
      contentArea.innerHTML = `<div class="alert alert-danger">Error loading announcements: ${escapeHtml(
        apiError.message || "Unknown error"
      )}</div>`;
      return;
    }

    // Filter announcements
    let filteredAnnouncements = Array.isArray(announcements)
      ? announcements
      : [];
    if (filterYear) {
      filteredAnnouncements = filteredAnnouncements.filter(
        (a) => a.year == filterYear
      );
    }
    if (filterDept) {
      filteredAnnouncements = filteredAnnouncements.filter((a) => {
        const dept = (a.department || "").replace("BSEED", "BSED");
        return dept === filterDept;
      });
    }
    if (filterMajor) {
      filteredAnnouncements = filteredAnnouncements.filter(
        (a) => a.major === filterMajor
      );
    }

    const departmentMajors = {
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
    const majorsForDept =
      filterDept && departmentMajors[filterDept]
        ? departmentMajors[filterDept]
        : [];

    function formatOrdinal(number) {
      number = parseInt(number);
      if (number <= 0) return "";
      const suffixes = [
        "th",
        "st",
        "nd",
        "rd",
        "th",
        "th",
        "th",
        "th",
        "th",
        "th",
      ];
      const value = number % 100;
      if (value >= 11 && value <= 13) {
        return number + "th";
      }
      return number + (suffixes[number % 10] || "th");
    }

    let html = `
            <div class="records-container">
                <div class="records-header">
                    <h2 class="records-title">Announcements</h2>
                    <p class="records-subtitle">Stay updated with the latest news and information</p>
                </div>
                <div class="records-main">
                    <div class="info-card">
                        <div class="card-header-modern">
                            <i class="bi bi-funnel"></i>
                            <h3>Filter Announcements</h3>
                        </div>
                        <form method="get" class="announcements-filter-form" id="announcementsFilterForm">
                            <input type="hidden" name="view" value="announcements" />
                            <div class="filter-group">
                                <label for="year_filter" class="filter-label">
                                    <i class="bi bi-calendar-year"></i>
                                    Year Level
                                </label>
                                <select id="year_filter" name="year_filter" class="filter-select">
                                    <option value="">All Years</option>
                                    <option value="1" ${
                                      filterYear === "1" ? "selected" : ""
                                    }>1st Year</option>
                                    <option value="2" ${
                                      filterYear === "2" ? "selected" : ""
                                    }>2nd Year</option>
                                    <option value="3" ${
                                      filterYear === "3" ? "selected" : ""
                                    }>3rd Year</option>
                                    <option value="4" ${
                                      filterYear === "4" ? "selected" : ""
                                    }>4th Year</option>
                                </select>
                            </div>
                            <div class="filter-group">
                                <label for="dept_filter" class="filter-label">
                                    <i class="bi bi-building"></i>
                                    Department
                                </label>
                                <select id="dept_filter" name="dept_filter" class="filter-select">
                                    <option value="">All Departments</option>
                                    <option value="IT" ${
                                      filterDept === "IT" ? "selected" : ""
                                    }>IT</option>
                                    <option value="HM" ${
                                      filterDept === "HM" ? "selected" : ""
                                    }>HM</option>
                                    <option value="BSED" ${
                                      filterDept === "BSED" ? "selected" : ""
                                    }>BSED</option>
                                    <option value="BEED" ${
                                      filterDept === "BEED" ? "selected" : ""
                                    }>BEED</option>
                                    <option value="TOURISM" ${
                                      filterDept === "TOURISM" ? "selected" : ""
                                    }>TOURISM</option>
                                </select>
                            </div>
                            <div class="filter-group">
                                <label for="major_filter" class="filter-label">
                                    <i class="bi bi-diagram-3"></i>
                                    Major
                                </label>
                                <select id="major_filter" name="major_filter" class="filter-select" ${
                                  majorsForDept.length === 0 ? "disabled" : ""
                                }>
                                    <option value="">All Majors</option>
                                    ${majorsForDept
                                      .map(
                                        (major) =>
                                          `<option value="${escapeHtml(
                                            major
                                          )}" ${
                                            filterMajor === major
                                              ? "selected"
                                              : ""
                                          }>${escapeHtml(major)}</option>`
                                      )
                                      .join("")}
                                </select>
                            </div>
                            <button type="submit" class="filter-btn">
                                <i class="bi bi-search"></i>
                                Apply Filters
                            </button>
                        </form>
                    </div>
        `;

    if (filteredAnnouncements.length === 0) {
      html += `
                <div class="info-card">
                    <div class="card-header-modern">
                        <i class="bi bi-megaphone"></i>
                        <h3>No Announcements</h3>
                    </div>
                    <p class="text-muted mb-0">No announcements match your current filters. Check back later for updates.</p>
                </div>
            `;
    } else {
      html += '<div class="announcements-grid">';
      filteredAnnouncements.forEach((a) => {
        const deptLabel = (a.department || "").replace("BSEED", "BSED");
        const yearNum = parseInt(a.year);
        const formattedDate = a.date
          ? new Date(a.date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })
          : "Date not specified";

        html += `
                    <div class="announcement-card-modern">
                        <div class="announcement-card-header">
                            <div class="announcement-title-section">
                                <h4 class="announcement-title">${escapeHtml(
                                  a.title || "Untitled"
                                )}</h4>
                                <div class="announcement-meta">
                                    <span class="announcement-date">
                                        <i class="bi bi-calendar3"></i>
                                        ${escapeHtml(formattedDate)}
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
                                ? `<span class="announcement-badge"><i class="bi bi-mortarboard"></i> ${
                                    yearNum > 0
                                      ? formatOrdinal(yearNum) + " Year"
                                      : escapeHtml(a.year)
                                  }</span>`
                                : ""
                            }
                            ${
                              deptLabel
                                ? `<span class="announcement-badge"><i class="bi bi-building"></i> ${escapeHtml(
                                    deptLabel
                                  )}</span>`
                                : ""
                            }
                            ${
                              a.major
                                ? `<span class="announcement-badge"><i class="bi bi-diagram-3"></i> ${escapeHtml(
                                    a.major
                                  )}</span>`
                                : ""
                            }
                        </div>
                    </div>
                `;
      });
      html += "</div>";
    }

    html += `
                </div>
            </div>
        `;

    contentArea.innerHTML = html;

    // Setup filter form
    const filterForm = document.getElementById("announcementsFilterForm");
    if (filterForm) {
      filterForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const params = new URLSearchParams(formData);
        window.location.search = params.toString();
      });
    }

    // Update major filter when department changes
    const deptFilter = document.getElementById("dept_filter");
    if (deptFilter) {
      deptFilter.addEventListener("change", (e) => {
        const dept = e.target.value;
        const majorSelect = document.getElementById("major_filter");
        const majors =
          dept && departmentMajors[dept] ? departmentMajors[dept] : [];

        if (majorSelect) {
          majorSelect.innerHTML = '<option value="">All Majors</option>';
          majors.forEach((major) => {
            majorSelect.innerHTML += `<option value="${escapeHtml(
              major
            )}">${escapeHtml(major)}</option>`;
          });
          majorSelect.disabled = majors.length === 0;
        }
      });
    }
  } catch (error) {
    console.error("Load announcements error:", error);
    contentArea.innerHTML =
      '<div class="alert alert-danger">Error loading announcements: ' +
      escapeHtml(error.message) +
      "</div>";
  }
}

// ==================== TRANSPARENCY VIEW ====================
async function loadTransparencyView() {
  const contentArea = document.getElementById("teacherContentArea");

  try {
    const projects = await TeacherAPI.getProjects().catch(() => []);
    const projectsList = Array.isArray(projects) ? projects : [];

    let html = `
            <div class="records-container">
                <div class="records-header">
                    <h2 class="records-title">Transparency / Projects</h2>
                    <p class="records-subtitle">View project budgets and completion status</p>
                </div>
                <div class="records-main">
        `;

    if (projectsList.length === 0) {
      html += `
                <div class="info-card">
                    <div class="card-header-modern">
                        <i class="bi bi-folder-x"></i>
                        <h3>No Projects</h3>
                    </div>
                    <p class="text-muted mb-0">No project information available at this time.</p>
                </div>
            `;
    } else {
      html += '<div class="projects-grid">';
      projectsList.forEach((proj) => {
        const isCompleted =
          proj.completed && String(proj.completed).toLowerCase() === "yes";
        html += `
                    <div class="project-card-modern">
                        <div class="project-card-header">
                            <div class="project-title-section">
                                <h4 class="project-title">${escapeHtml(
                                  proj.name || "Untitled"
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
                                <div class="project-detail-value">${formatFriendlyDate(
                                  proj.started
                                )}</div>
                            </div>
                        </div>
                    </div>
                `;
      });
      html += "</div>";
    }

    html += `
                </div>
            </div>
        `;

    contentArea.innerHTML = html;
  } catch (error) {
    contentArea.innerHTML = `<div class="alert alert-danger">Error loading transparency: ${error.message}</div>`;
  }
}

// ==================== EVALUATION VIEW ====================
async function loadEvaluationView() {
  const contentArea = document.getElementById("teacherContentArea");

  try {
    // Fetch evaluation statistics plus current schedule (for context)
    const [stats, schedules] = await Promise.all([
      TeacherAPI.getEvaluationStatistics().catch(() => ({
        success: false,
        total: 0,
      })),
      TeacherAPI.getSchedule().catch(() => []),
    ]);

    let html = `
            <div class="records-container">
                <div class="records-header">
                    <h2 class="records-title">
                        <i class="bi bi-clipboard-check"></i> Evaluation Statistics
                    </h2>
                    <p class="records-subtitle">View your evaluation statistics from students</p>
                </div>
                <div class="records-main">
        `;

    if (!stats.success || stats.total === 0) {
      html += `
                <div class="info-card">
                    <div class="card-header-modern">
                        <i class="bi bi-info-circle"></i>
                        <h3>No Evaluations Yet</h3>
                    </div>
                    <p class="text-muted">You haven't received any evaluations from students yet.</p>
                </div>
            `;
    } else {
      const part1Questions = [
        "Knows his/her subject matter well and organizes presentation of subject matter with clarity and coherence",
        "Is proficient in English/Filipino/Japanese",
        "Employs appropriate teaching methods/strategies whether in-person or online",
        "Makes good use of visual aids/instructional materials to facilitate learning whether in-person or online and share them without difficulty (audio, video, etc.)",
        "Manages the class well and commands respect from students while on discussion both in-person and online",
        "Utilizes class period productively and sustains students' interest in lesson and class discussion",
        "Engages us with questions to deepen our understanding",
        "Gives subject requirements that are relevant to the program outcomes of my degree",
        "Gives learning tasks that are well-paced to give us adequate time to work on them",
        "Behaves professionally through words and actions",
      ];

      const part2Questions = [
        "With my teacher's guidance, I can demonstrate the intended knowledge and skills with competence.",
        "With my teacher's guidance, I can connect theory and practical knowledge of this subject.",
        "With my teacher's guidance, I have improved my problem-solving, critical thinking, and decision-making skills through this subject.",
        "I am happy that he/she is my teacher.",
        "I can feel the teacher's concern for us, his/her students.",
        "I look up to my teacher as a role model.",
        "I like to be in his/her class again.",
        "I notice that my teacher extends help to his/her students who are struggling academically.",
      ];

      html += `
                <div class="info-card">
                    <div class="card-header-modern">
                        <i class="bi bi-bar-chart"></i>
                        <h3>Evaluation Statistics</h3>
                    </div>
                    <div class="evaluation-overview">
                        <div class="overview-stat highlight">
                            <div class="stat-label">Average Rating (0-4)</div>
                            <div class="stat-value">${(
                              stats.overall?.average || 0
                            ).toFixed(2)}</div>
                            <div class="stat-subtext">${(
                              stats.overall?.percentage || 0
                            ).toFixed(1)}% overall</div>
                        </div>
                        <div class="overview-stat">
                            <div class="stat-label">Total Evaluations</div>
                            <div class="stat-value">${stats.total || 0}</div>
                        </div>
                    </div>
                    
                    <div class="evaluation-section">
                        <h4 class="section-title">PART I: My Teacher</h4>
                        <div class="statistics-list">
            `;

      part1Questions.forEach((question, index) => {
        const qKey = `part1_q${index + 1}`;
        const stat = stats.statistics?.[qKey] || {
          average: 0,
          percentage: 0,
          responses: 0,
        };
        html += `
                    <div class="stat-item">
                        <div class="stat-question">
                            <span class="question-num">${index + 1}.</span>
                            <span class="question-text">${escapeHtml(
                              question
                            )}</span>
                        </div>
                        <div class="stat-metrics">
                            <div class="metric">
                                <span class="metric-label">Average:</span>
                                <span class="metric-value">${stat.average.toFixed(
                                  2
                                )}</span>
                            </div>
                            <div class="metric">
                                <span class="metric-label">Percentage:</span>
                                <span class="metric-value">${stat.percentage.toFixed(
                                  1
                                )}%</span>
                            </div>
                            <div class="metric">
                                <span class="metric-label">Responses:</span>
                                <span class="metric-value">${
                                  stat.responses || 0
                                }</span>
                            </div>
                        </div>
                        <div class="stat-bar">
                            <div class="stat-bar-fill" style="width: ${
                              stat.percentage
                            }%"></div>
                        </div>
                    </div>
                `;
      });

      html += `
                        </div>
                    </div>
                    
                    <div class="evaluation-section">
                        <h4 class="section-title">PART II: As a Student</h4>
                        <div class="statistics-list">
            `;

      part2Questions.forEach((question, index) => {
        const qKey = `part2_q${index + 1}`;
        const stat = stats.statistics?.[qKey] || {
          average: 0,
          percentage: 0,
          responses: 0,
        };
        html += `
                    <div class="stat-item">
                        <div class="stat-question">
                            <span class="question-num">${index + 1}.</span>
                            <span class="question-text">${escapeHtml(
                              question
                            )}</span>
                        </div>
                        <div class="stat-metrics">
                            <div class="metric">
                                <span class="metric-label">Average:</span>
                                <span class="metric-value">${stat.average.toFixed(
                                  2
                                )}</span>
                            </div>
                            <div class="metric">
                                <span class="metric-label">Percentage:</span>
                                <span class="metric-value">${stat.percentage.toFixed(
                                  1
                                )}%</span>
                            </div>
                            <div class="metric">
                                <span class="metric-label">Responses:</span>
                                <span class="metric-value">${
                                  stat.responses || 0
                                }</span>
                            </div>
                        </div>
                        <div class="stat-bar">
                            <div class="stat-bar-fill" style="width: ${
                              stat.percentage
                            }%"></div>
                        </div>
                    </div>
                `;
      });

      const satisfaction = stats.statistics?.satisfaction || {
        average: 0,
        percentage: 0,
        responses: 0,
      };
      const recommendation = stats.statistics?.recommendation || {
        yes: 0,
        no: 0,
        percentage: 0,
        total: 0,
      };

      html += `
                        </div>
                    </div>
                    
                    <div class="evaluation-section">
                        <h4 class="section-title">Additional Metrics</h4>
                        <div class="stat-item">
                            <div class="stat-question">
                                <span class="question-text">Satisfaction Rating (1-10 scale)</span>
                            </div>
                            <div class="stat-metrics">
                                <div class="metric">
                                    <span class="metric-label">Average:</span>
                                    <span class="metric-value">${satisfaction.average.toFixed(
                                      2
                                    )}</span>
                                </div>
                                <div class="metric">
                                    <span class="metric-label">Percentage:</span>
                                    <span class="metric-value">${satisfaction.percentage.toFixed(
                                      1
                                    )}%</span>
                                </div>
                            </div>
                            <div class="stat-bar">
                                <div class="stat-bar-fill" style="width: ${
                                  satisfaction.percentage
                                }%"></div>
                            </div>
                        </div>
                        
                        <div class="stat-item">
                            <div class="stat-question">
                                <span class="question-text">Recommendation Rate</span>
                            </div>
                            <div class="stat-metrics">
                                <div class="metric">
                                    <span class="metric-label">Yes:</span>
                                    <span class="metric-value">${
                                      recommendation.yes || 0
                                    }</span>
                                </div>
                                <div class="metric">
                                    <span class="metric-label">No:</span>
                                    <span class="metric-value">${
                                      recommendation.no || 0
                                    }</span>
                                </div>
                                <div class="metric">
                                    <span class="metric-label">Recommendation Rate:</span>
                                    <span class="metric-value">${recommendation.percentage.toFixed(
                                      1
                                    )}%</span>
                                </div>
                            </div>
                            <div class="stat-bar">
                                <div class="stat-bar-fill" style="width: ${
                                  recommendation.percentage
                                }%"></div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="evaluation-section">
                        <h4 class="section-title">My Current Schedule (context)</h4>
                        <div class="table-responsive">
                            <table class="table table-striped align-middle">
                                <thead>
                                    <tr>
                                        <th>Day</th>
                                        <th>Time</th>
                                        <th>Subject</th>
                                        <th>Section</th>
                                        <th>Room</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${
                                      (Array.isArray(schedules) &&
                                      schedules.length > 0
                                        ? schedules
                                        : []
                                      )
                                        .map((s) => {
                                          const timeStart = s.time_start
                                            ? new Date(
                                                "1970-01-01T" + s.time_start
                                              ).toLocaleTimeString("en-US", {
                                                hour: "numeric",
                                                minute: "2-digit",
                                                hour12: true,
                                              })
                                            : "N/A";
                                          const timeEnd = s.time_end
                                            ? new Date(
                                                "1970-01-01T" + s.time_end
                                              ).toLocaleTimeString("en-US", {
                                                hour: "numeric",
                                                minute: "2-digit",
                                                hour12: true,
                                              })
                                            : "N/A";
                                          const timeRange =
                                            timeStart !== "N/A" &&
                                            timeEnd !== "N/A"
                                              ? `${timeStart} - ${timeEnd}`
                                              : "N/A";
                                          return `
                                            <tr>
                                                <td>${escapeHtml(
                                                  s.day || "—"
                                                )}</td>
                                                <td>${escapeHtml(
                                                  timeRange
                                                )}</td>
                                                <td>${escapeHtml(
                                                  s.subject || "—"
                                                )}</td>
                                                <td>${escapeHtml(
                                                  s.section || "—"
                                                )}</td>
                                                <td>${escapeHtml(
                                                  s.room || "—"
                                                )}</td>
                                            </tr>
                                        `;
                                        })
                                        .join("") ||
                                      '<tr><td colspan="5" class="text-muted">No schedule found.</td></tr>'
                                    }
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
    }

    html += `
                </div>
            </div>
        `;

    contentArea.innerHTML = html;
  } catch (error) {
    contentArea.innerHTML = `<div class="alert alert-danger">Error loading evaluation: ${error.message}</div>`;
  }
}

// ==================== SETTINGS VIEW ====================
async function loadSettingsView() {
  const contentArea = document.getElementById("teacherContentArea");

  try {
    const session = await AuthAPI.checkSession();
    const currentUser = session.user || {};

    contentArea.innerHTML = ProfileSettings.renderHTML(currentUser);

    ProfileSettings.init(currentUser, (updatedUser) => {
      currentUser.username = updatedUser.username;
      currentUser.full_name = updatedUser.full_name;
      currentUser.image_path = updatedUser.image_path;
      currentUser.avatar_url = updatedUser.avatar_url;
    });
  } catch (error) {
    contentArea.innerHTML = `<div class="alert alert-danger">Error loading settings: ${error.message}</div>`;
  }
}

// ==================== GRADE SYSTEM ====================
async function loadGradeSystemView() {
  const contentArea = document.getElementById("teacherContentArea");

  try {
    // Ensure custom styles for grade cards/pills/buttons
    if (!document.getElementById("teacher-grade-styles")) {
      const style = document.createElement("style");
      style.id = "teacher-grade-styles";
      style.textContent = `
                .pill-chip { display:inline-flex; align-items:center; gap:6px; padding:8px 14px; border-radius:14px; background: #e7e2db; color:#222; font-weight:600; box-shadow: inset 0 1px 0 rgba(255,255,255,0.5); }
                .pill-chip--sem1 { background: linear-gradient(135deg, #d9d0c6, #c9beb1); color:#1f1f1f; }
                .pill-chip--sem2 { background: linear-gradient(135deg, #d9e7ff, #c5d8ff); color:#0f2f5f; }
                .pill-chip--accent { background: linear-gradient(135deg, #3c8dde, #2269b3); color:#fff; }
                .pill-chip small { font-weight:500; }
                .button2 { display:inline-block; transition: all 0.2s ease-in; position: relative; overflow: hidden; z-index: 1; color: #090909; padding: 0.5em 1.2em; cursor: pointer; font-size: 14px; border-radius: 0.5em; background: #e8e8e8; border: 1px solid #e8e8e8; box-shadow: 6px 6px 12px #c5c5c5, -6px -6px 12px #ffffff; }
                .button2:active { color:#666; box-shadow: inset 4px 4px 12px #c5c5c5, inset -4px -4px 12px #ffffff; }
                .button2:before { content:""; position:absolute; left:50%; transform:translateX(-50%) scaleY(1) scaleX(1.25); top:100%; width:140%; height:180%; background-color:rgba(0,0,0,0.05); border-radius:50%; display:block; transition:all .5s .1s cubic-bezier(0.55,0,0.1,1); z-index:-1; }
                .button2:after { content:""; position:absolute; left:55%; transform:translateX(-50%) scaleY(1) scaleX(1.45); top:180%; width:160%; height:190%; background-color:#009087; border-radius:50%; display:block; transition:all .5s .1s cubic-bezier(0.55,0,0.1,1); z-index:-1; }
                .button2:hover { color:#fff; border:1px solid #009087; }
                .button2:hover:before { top:-35%; background-color:#009087; transform:translateX(-50%) scaleY(1.3) scaleX(0.8); }
                .button2:hover:after { top:-45%; background-color:#009087; transform:translateX(-50%) scaleY(1.3) scaleX(0.8); }
                .btn-edit2 { background:#e8e8e8; color:#0d6efd; }
                .btn-add2 { background:#e8e8e8; color:#198754; }
                .btn-del2 { background:#e8e8e8; color:#dc3545; }
                .btn-edit2:hover { border-color:#0d6efd; }
                .btn-add2:hover { border-color:#198754; }
                .btn-del2:hover { border-color:#dc3545; }
                .student-grade-card { padding:14px 16px; }
                .student-grade-name { font-weight:700; }
                .student-grade-summary { color:#555; }
            `;
      document.head.appendChild(style);
    }

    const [grades, subjects, sectionsResp] = await Promise.all([
      TeacherAPI.getGrades(),
      TeacherAPI.getTeacherSubjects(),
      TeacherAPI.getSections().catch(() => ({ sections: [] })),
    ]);
    const availableSections = Array.isArray(sectionsResp?.sections)
      ? sectionsResp.sections
      : [];

    // Filters state
    let selectedSubject = "";
    let selectedSection = "";

    let html = `
            <div class="records-container">
                <div class="records-header">
                    <h2 class="records-title">
                        <i class="bi bi-journal-bookmark-fill"></i> Grade System
                    </h2>
                    <p class="records-subtitle">Input and manage student grades for your assigned subjects.</p>
                </div>
                <div class="records-main">
                    <div class="info-card">
                        <div class="card-header-modern">
                            <i class="bi bi-clipboard-data"></i>
                            <h3>Student Grades</h3>
                        </div>
                        <div class="grade-filter-card p-3 bg-light rounded-4 border mb-3">
                            <div class="d-flex justify-content-between align-items-center mb-3">
                                <div>
                                    <h5 class="mb-1"><i class="bi bi-funnel-fill me-2"></i>Filter Grades</h5>
                                    <p class="text-muted mb-0">Pick a subject, then narrow by section.</p>
                                </div>
                                <button id="resetFilters" class="btn btn-link text-decoration-none">
                                    <i class="bi bi-arrow-counterclockwise"></i> Reset
                                </button>
                            </div>
                            <div class="row g-3">
                                <div class="col-md-6">
                                    <label class="form-label fw-semibold">Subject</label>
                                    <select id="subjectFilter" class="form-select form-select-lg">
                                        <option value="">All Subjects</option>
                                        ${subjects
                                          .map(
                                            (s) =>
                                              `<option value="${escapeHtml(
                                                s.subject_code
                                              )}">${escapeHtml(
                                                s.subject_code
                                              )} - ${escapeHtml(
                                                s.title
                                              )}</option>`
                                          )
                                          .join("")}
                                    </select>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label fw-semibold">Section</label>
                                    <select id="sectionFilter" class="form-select form-select-lg">
                                        <option value="">All Sections</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div id="gradesContainer">
                            ${renderStudentGradeCardsMerged([], "", "")}
                        </div>
                    </div>
                </div>
            </div>
        `;

    contentArea.innerHTML = html;

    const subjectSelect = document.getElementById("subjectFilter");
    const sectionSelect = document.getElementById("sectionFilter");
    const gradesContainer = document.getElementById("gradesContainer");
    const resetBtn = document.getElementById("resetFilters");

    const studentsCache = {};
    async function fetchStudentsBySection(section) {
      if (!section) return [];
      if (studentsCache[section]) return studentsCache[section];
      const res = await TeacherAPI.getStudentsBySection(section).catch(
        () => []
      );
      studentsCache[section] = Array.isArray(res) ? res : [];
      return studentsCache[section];
    }

    function matchesSubject(gSubject, subjCode, subjTitle) {
      const gs = (gSubject || "").toLowerCase().trim();
      const code = (subjCode || "").toLowerCase().trim();
      const title = (subjTitle || "").toLowerCase().trim();
      if (!gs) return false;
      if (!code && !title) return false;
      if (code && (gs === code || gs.startsWith(code) || gs.includes(code)))
        return true;
      if (title && (gs === title || gs.includes(title))) return true;
      return false;
    }

    function getSectionsForSubject(subjCode) {
      const allGrades = Array.isArray(grades) ? grades : [];
      // Start with available sections from API
      const baseSet = new Set(availableSections);
      // Add from grades for this subject
      const subj = subjects.find((s) => s.subject_code === subjCode);
      const subjTitle = subj ? subj.title : null;
      allGrades.forEach((g) => {
        if (!g.section) return;
        if (!subjCode || matchesSubject(g.subject, subjCode, subjTitle)) {
          baseSet.add(g.section);
        }
      });
      return Array.from(baseSet).sort();
    }

    function populateSections() {
      const sectionsForSubj = getSectionsForSubject(selectedSubject);
      sectionSelect.innerHTML =
        '<option value="">All Sections</option>' +
        sectionsForSubj
          .map(
            (sec) =>
              `<option value="${escapeHtml(sec)}">${escapeHtml(sec)}</option>`
          )
          .join("");
      if (sectionsForSubj.includes(selectedSection)) {
        sectionSelect.value = selectedSection;
      } else {
        selectedSection = "";
        sectionSelect.value = "";
      }
    }

    async function applyFilters() {
      const subj = subjects.find((s) => s.subject_code === selectedSubject);
      const subjTitle = subj ? subj.title : null;

      // Filter grades by subject/section
      const filteredGrades = (grades || []).filter((g) => {
        if (
          selectedSubject &&
          !matchesSubject(g.subject, selectedSubject, subjTitle)
        )
          return false;
        if (selectedSection && g.section !== selectedSection) return false;
        return true;
      });

      // Fetch students for the selected section (if any)
      let students = [];
      if (selectedSection) {
        gradesContainer.innerHTML =
          '<p class="text-muted">Loading students...</p>';
        students = await fetchStudentsBySection(selectedSection);
      }

      // Merge: for each student, attach their grade (if any) for this subject/section
      const cards = [];
      const gradesCopy = [...filteredGrades];
      students.forEach((stu) => {
        const match = gradesCopy.find(
          (g) =>
            (g.user_id && stu.id && g.user_id === stu.id) ||
            (g.username && stu.username && g.username === stu.username)
        );
        cards.push({
          student: stu,
          grade: match || null,
        });
        if (match) {
          const idx = gradesCopy.indexOf(match);
          if (idx >= 0) gradesCopy.splice(idx, 1);
        }
      });
      // Add remaining grades without student info
      gradesCopy.forEach((g) => cards.push({ student: null, grade: g }));

      gradesContainer.innerHTML = renderStudentGradeCardsMerged(
        cards,
        selectedSubject,
        selectedSection
      );
    }

    subjectSelect.addEventListener("change", () => {
      selectedSubject = subjectSelect.value;
      populateSections();
      applyFilters();
    });
    sectionSelect.addEventListener("change", () => {
      selectedSection = sectionSelect.value;
      applyFilters();
    });
    resetBtn.addEventListener("click", (e) => {
      e.preventDefault();
      selectedSubject = "";
      selectedSection = "";
      subjectSelect.value = "";
      populateSections();
      applyFilters();
    });

    populateSections();
    applyFilters();
  } catch (error) {
    contentArea.innerHTML = `<div class="alert alert-danger">Error loading grade system: ${error.message}</div>`;
  }
}

function renderStudentGradeCardsMerged(
  items,
  selectedSubject,
  selectedSection
) {
  if (!items || items.length === 0) {
    return '<p class="text-muted">No students found for the current filters.</p>';
  }

  // Group by year -> student, then summarize semesters (admin grade_system style)
  const byYear = {};
  items.forEach((item) => {
    const g = item.grade || {};
    const s = item.student || {};
    const year = (g.year || s.year || "N/A").toString();
    if (!byYear[year]) byYear[year] = [];
    byYear[year].push({ grade: g, student: s });
  });

  const orderedYears = Object.keys(byYear).sort(
    (a, b) => parseInt(a) - parseInt(b)
  );
  if (orderedYears.length === 0) {
    return '<p class="text-muted">No students found for the current filters.</p>';
  }

  let html = "";

  orderedYears.forEach((yearNum) => {
    const groups = {};

    byYear[yearNum].forEach(({ grade, student }) => {
      const key =
        grade.user_id ||
        student.id ||
        (grade.username || student.username || "").toLowerCase();
      if (!key) return;
      if (!groups[key]) {
        const displayName =
          grade.student_name ||
          student.full_name ||
          student.username ||
          student.school_id ||
          "Student";
        const imagePath =
          (grade.image_path || student.image_path || "")
            .replace("/TCC/public/", "")
            .replace("/TCC/", "") || "images/sample.jpg";
        groups[key] = {
          display: displayName,
          image_path: imagePath,
          semesters: {
            "First Semester": [],
            "Second Semester": [],
          },
        };
      }
      const semKey =
        grade.semester === "Second Semester"
          ? "Second Semester"
          : "First Semester";
      groups[key].semesters[semKey].push(grade);
    });

    if (Object.keys(groups).length === 0) {
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

    Object.values(groups).forEach((group) => {
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
            const parts = [];
            ["prelim_grade", "midterm_grade", "finals_grade"].forEach(
              (field) => {
                const val = grade[field];
                if (val !== null && val !== "" && !isNaN(val)) {
                  parts.push(parseFloat(val));
                }
              }
            );
            if (parts.length > 0) {
              const avg = parts.reduce((a, b) => a + b, 0) / parts.length;
              scoredSubjects++;
              totalScores += avg;
              semScoreCount++;
              semScoreTotal += avg;
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
          ? `${subjectCount} ${
              subjectCount === 1 ? "subject" : "subjects"
            } recorded`
          : "No grades yet";
      const averageScore =
        scoredSubjects > 0
          ? Math.round((totalScores / scoredSubjects) * 10) / 10
          : null;

      const sem1 = semesterSummaries.find((s) =>
        s.label.toLowerCase().includes("1st")
      ) || { average: null };
      const sem2 = semesterSummaries.find((s) =>
        s.label.toLowerCase().includes("2nd")
      ) || { average: null };
      const allGradeIds = Object.values(group.semesters)
        .flat()
        .map((g) => g.id)
        .filter(Boolean);
      const anyGradeId = allGradeIds[0] || "";

      html += `
                <div class="student-grade-card d-flex align-items-center justify-content-between" style="background:#fff; border-radius:14px; box-shadow: 0 6px 16px rgba(0,0,0,0.08); padding:14px 16px; border:1px solid #f1f1f1;">
                    <div class="d-flex align-items-center gap-3">
                        <div class="avatar flex-shrink-0" style="width:48px;height:48px;border-radius:12px;overflow:hidden;">
                            <img src="${escapeHtml(
                              imagePath
                            )}" alt="${escapeHtml(
        displayName
      )}" style="width:100%;height:100%;object-fit:cover;" onerror="this.src='images/sample.jpg'; this.onerror=null;">
                        </div>
                        <div class="d-flex flex-column">
                            <span class="student-grade-name">${escapeHtml(
                              displayName
                            )}</span>
                            <span class="student-grade-summary">${escapeHtml(
                              summaryText
                            )}</span>
                        </div>
                    </div>
                    <div class="d-flex align-items-center gap-2 flex-wrap justify-content-end">
                        <span class="pill-chip pill-chip--sem1" title="1st Semester average">
                            1st Sem ${
                              sem1.average !== null
                                ? `<small>${sem1.average} avg</small>`
                                : "<small>—</small>"
                            }
                        </span>
                        <span class="pill-chip pill-chip--sem2" title="2nd Semester average">
                            2nd Sem ${
                              sem2.average !== null
                                ? `<small>${sem2.average} avg</small>`
                                : "<small>—</small>"
                            }
                        </span>
                        ${
                          averageScore !== null
                            ? `<span class="pill-chip pill-chip--accent">${averageScore}<small>avg</small></span>`
                            : ""
                        }
                        <button class="button2 btn-edit2" onclick="editGradeTeacher(${
                          anyGradeId || '""'
                        })"><i class="bi bi-pencil-square me-1"></i>Edit</button>
                        <button class="button2 btn-add2" onclick="openAddGradeModal({ username: '${escapeHtml(
                          displayName
                        )}', subject: '', section: '', year: '${escapeHtml(
        yearNum
      )}', semester: 'First Semester' })"><i class="bi bi-plus-lg me-1"></i>Add</button>
                        <button class="button2 btn-del2" onclick="deleteAllStudentGrades([${allGradeIds.join(
                          ","
                        )}], '${escapeHtml(
        displayName
      )}')"><i class="bi bi-trash me-1"></i>Delete</button>
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

  return html;
}

async function editGradeTeacher(id) {
  try {
    const grades = await TeacherAPI.getGrades();
    const grade = grades.find((g) => g.id === id);
    if (!grade) {
      alert("Grade not found");
      return;
    }

    // Create modal and move to body for proper z-index
    const modal = document.createElement("div");
    modal.className = "modal fade";
    modal.id = "editGradeModal";
    modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header" style="background: linear-gradient(135deg, #eaf2ff, #f8fbff); border-bottom: 1px solid #e5e9f0;">
                        <h5 class="modal-title"><i class="bi bi-pencil-square me-2 text-primary"></i>Edit Grade</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body" style="background:#fdfdfd;">
                        <form id="editGradeForm">
                            <div class="alert alert-info d-flex align-items-center gap-2 py-2">
                                <i class="bi bi-info-circle text-primary fs-5"></i>
                                <div>
                                    <div class="fw-semibold mb-0">${escapeHtml(
                                      grade.student_name ||
                                        grade.username ||
                                        "Student"
                                    )}</div>
                                    <div class="text-muted small mb-0">${escapeHtml(
                                      grade.subject || "Subject"
                                    )} • ${escapeHtml(
      grade.section || "Section"
    )}</div>
                                </div>
                            </div>
                            <input type="hidden" id="editGradeId" value="${
                              grade.id
                            }">
                            <div class="mb-3">
                                <label class="form-label"><i class="bi bi-person me-1 text-primary"></i>Student</label>
                                <input type="text" class="form-control" value="${escapeHtml(
                                  grade.student_name || grade.username || ""
                                )}" disabled>
                            </div>
                            <div class="mb-3">
                                <label class="form-label"><i class="bi bi-book me-1 text-primary"></i>Subject</label>
                                <input type="text" class="form-control" value="${escapeHtml(
                                  grade.subject || ""
                                )}" disabled>
                            </div>
                            <div class="row g-3">
                                <div class="col-md-6">
                                    <label class="form-label"><i class="bi bi-calendar-week me-1 text-primary"></i>Year</label>
                                    <div class="form-control-plaintext fw-semibold">${escapeHtml(
                                      grade.year || "N/A"
                                    )}</div>
                                    <input type="hidden" id="editGradeYear" value="${escapeHtml(
                                      grade.year || ""
                                    )}">
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label"><i class="bi bi-calendar-range me-1 text-primary"></i>Semester</label>
                                    <div class="form-control-plaintext fw-semibold">${escapeHtml(
                                      grade.semester || "First Semester"
                                    )}</div>
                                    <input type="hidden" id="editGradeSemester" value="${escapeHtml(
                                      grade.semester || "First Semester"
                                    )}">
                                </div>
                            </div>
                            <div class="row g-3 mt-1">
                                <div class="col-md-4">
                                    <label class="form-label"><i class="bi bi-123 me-1 text-primary"></i>Prelim Grade</label>
                                    <input type="number" step="0.01" id="editGradePrelim" class="form-control" value="${
                                      grade.prelim_grade || ""
                                    }">
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label"><i class="bi bi-123 me-1 text-primary"></i>Midterm Grade</label>
                                    <input type="number" step="0.01" id="editGradeMidterm" class="form-control" value="${
                                      grade.midterm_grade || ""
                                    }">
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label"><i class="bi bi-123 me-1 text-primary"></i>Finals Grade</label>
                                    <input type="number" step="0.01" id="editGradeFinals" class="form-control" value="${
                                      grade.finals_grade || ""
                                    }">
                                </div>
                            </div>
                            <div class="mt-3 p-2 rounded-3" style="background: linear-gradient(135deg, #f8fafc, #eef4ff); border:1px solid #e5e9f0;">
                                <div class="d-flex align-items-center gap-2 text-muted small">
                                    <i class="bi bi-lightbulb"></i>
                                    <span>Enter numeric scores; leave blank if not yet graded.</span>
                                </div>
                            </div>
                            <div class="d-flex justify-content-end gap-2 mt-3">
                                <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal"><i class="bi bi-x-circle me-1"></i>Cancel</button>
                                <button type="submit" class="button2 btn-edit2"><i class="bi bi-check2-circle me-1"></i>Update Grade</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
    document.body.appendChild(modal);
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();

    document
      .getElementById("editGradeForm")
      .addEventListener("submit", async (e) => {
        e.preventDefault();
        try {
          await TeacherAPI.updateGrade(grade.id, {
            user_id: grade.user_id,
            username: grade.username,
            year: document.getElementById("editGradeYear").value,
            semester: document.getElementById("editGradeSemester").value,
            subject: grade.subject,
            instructor: grade.instructor || null,
            prelim_grade:
              parseFloat(document.getElementById("editGradePrelim").value) ||
              null,
            midterm_grade:
              parseFloat(document.getElementById("editGradeMidterm").value) ||
              null,
            finals_grade:
              parseFloat(document.getElementById("editGradeFinals").value) ||
              null,
          });
          bsModal.hide();
          modal.remove();
          await loadGradeSystemView();
        } catch (error) {
          alert(`Error updating grade: ${error.message}`);
        }
      });

    modal.addEventListener("hidden.bs.modal", () => modal.remove());
  } catch (error) {
    alert(`Error loading grade: ${error.message}`);
  }
}

function openAddGradeModal(prefill = {}) {
  const modal = document.createElement("div");
  modal.className = "modal fade";
  modal.id = "addGradeModal";
  modal.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header" style="background: linear-gradient(135deg, #eaf2ff, #f8fbff); border-bottom: 1px solid #e5e9f0;">
                    <h5 class="modal-title"><i class="bi bi-journal-plus me-2 text-primary"></i>Add Grade</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body" style="background:#fdfdfd;">
                    <form id="addGradeForm">
                        <input type="hidden" id="addGradeUsername" value="${escapeHtml(
                          prefill.username || ""
                        )}">
                        <input type="hidden" id="addGradeYear" value="${escapeHtml(
                          prefill.year || ""
                        )}">
                        <input type="hidden" id="addGradeSubject" value="${escapeHtml(
                          prefill.subject || ""
                        )}">
                        <input type="hidden" id="addGradeSection" value="${escapeHtml(
                          prefill.section || ""
                        )}">
                        <input type="hidden" id="addGradeInstructor" value="${escapeHtml(
                          prefill.instructor || ""
                        )}">

                        <div class="mb-3">
                            <div class="alert alert-info d-flex align-items-center gap-2 py-2">
                                <i class="bi bi-info-circle text-primary fs-5"></i>
                                <div class="d-flex flex-column gap-1 small mb-0">
                                    <div><strong>Student:</strong> ${escapeHtml(
                                      prefill.username || "N/A"
                                    )}</div>
                                    <div><strong>Subject:</strong> ${escapeHtml(
                                      prefill.subject || "N/A"
                                    )}</div>
                                    <div><strong>Section:</strong> ${escapeHtml(
                                      prefill.section || "N/A"
                                    )}</div>
                                    <div><strong>Semester:</strong> ${escapeHtml(
                                      prefill.semester || "First Semester"
                                    )}</div>
                                </div>
                            </div>
                            <input type="hidden" id="addGradeSemester" value="${escapeHtml(
                              prefill.semester || "First Semester"
                            )}">
                        </div>
                        <div class="row g-3">
                            <div class="col-md-4">
                                <label class="form-label"><i class="bi bi-123 me-1 text-primary"></i>Prelim</label>
                                <input type="number" step="0.01" id="addGradePrelim" class="form-control">
                            </div>
                            <div class="col-md-4">
                                <label class="form-label"><i class="bi bi-123 me-1 text-primary"></i>Midterm</label>
                                <input type="number" step="0.01" id="addGradeMidterm" class="form-control">
                            </div>
                            <div class="col-md-4">
                                <label class="form-label"><i class="bi bi-123 me-1 text-primary"></i>Finals</label>
                                <input type="number" step="0.01" id="addGradeFinals" class="form-control">
                            </div>
                        </div>
                        <div class="mt-3 p-2 rounded-3" style="background: linear-gradient(135deg, #f8fafc, #eef4ff); border:1px solid #e5e9f0;">
                            <div class="d-flex align-items-center gap-2 text-muted small">
                                <i class="bi bi-lightbulb"></i>
                                <span>Enter numeric scores; leave blank if not yet graded.</span>
                            </div>
                        </div>
                        <div class="d-flex justify-content-end gap-2 mt-3">
                            <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal"><i class="bi bi-x-circle me-1"></i>Cancel</button>
                            <button type="submit" class="button2 btn-add2"><i class="bi bi-check2-circle me-1"></i>Save Grade</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
  document.body.appendChild(modal);
  const bsModal = new bootstrap.Modal(modal);
  bsModal.show();

  document
    .getElementById("addGradeForm")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        await TeacherAPI.createGrade({
          user_id: null,
          username: document.getElementById("addGradeUsername").value,
          year: document.getElementById("addGradeYear").value,
          semester: document.getElementById("addGradeSemester").value,
          subject: document.getElementById("addGradeSubject").value,
          instructor:
            document.getElementById("addGradeInstructor").value || null,
          prelim_grade:
            parseFloat(document.getElementById("addGradePrelim").value) || null,
          midterm_grade:
            parseFloat(document.getElementById("addGradeMidterm").value) ||
            null,
          finals_grade:
            parseFloat(document.getElementById("addGradeFinals").value) || null,
        });
        bsModal.hide();
        modal.remove();
        await loadGradeSystemView();
      } catch (error) {
        alert(`Error adding grade: ${error.message}`);
      }
    });

  modal.addEventListener("hidden.bs.modal", () => modal.remove());
}

async function deleteGradeTeacher(id) {
  if (!confirm("Are you sure you want to delete this grade?")) return;
  try {
    await TeacherAPI.deleteGrade(id);
    await loadGradeSystemView();
  } catch (error) {
    alert(`Error deleting grade: ${error.message}`);
  }
}

async function deleteAllStudentGrades(ids = [], name = "this student") {
  if (!ids || ids.length === 0) return;
  if (
    !confirm(
      `Delete ${ids.length} grade(s) for ${name}? This cannot be undone.`
    )
  )
    return;
  try {
    for (const id of ids) {
      if (id) {
        await TeacherAPI.deleteGrade(id);
      }
    }
    await loadGradeSystemView();
  } catch (error) {
    alert(`Error deleting grades: ${error.message}`);
  }
}
