// Home Dashboard JavaScript
// All functionality from old PHP version converted to JavaScript

// Utility functions
function escapeHtml(text) {
  if (text == null) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function formatOrdinal(number) {
  number = parseInt(number);
  if (number <= 0) return "";
  const suffixes = ["th", "st", "nd", "rd", "th", "th", "th", "th", "th", "th"];
  const value = number % 100;
  if (value >= 11 && value <= 13) {
    return number + "th";
  }
  return number + (suffixes[number % 10] || "th");
}

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

// Hero spotlights configuration
const heroSpotlights = {
  records: {
    hero_copy:
      "Review building assignments, finances, and grades in a single, refreshed timeline built for clarity.",
    spotlight_eyebrow: "Records overview",
    spotlight_title: "My Records",
    spotlight_copy:
      "Check building assignments, sanctions, financial status, and detailed grades in one cohesive space.",
  },
  announcements: {
    hero_copy:
      "Catch up on campus headlines, filter by year or department, and keep every announcement at your fingertips.",
    spotlight_eyebrow: "Latest broadcasts",
    spotlight_title: "Announcements",
    spotlight_copy:
      "Browse targeted updates, stay informed on school activities, and never miss important campus news.",
  },
  grades: {
    hero_copy:
      "Review your academic progress, semester summaries, and detailed subject grades in one comprehensive view.",
    spotlight_eyebrow: "Academic records",
    spotlight_title: "My Grades",
    spotlight_copy:
      "View all your subject grades organized by semester, track your academic performance, and monitor your progress throughout the year.",
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
      "Evaluate your teachers and provide feedback to help improve the learning experience for everyone.",
    spotlight_eyebrow: "Teacher evaluation",
    spotlight_title: "Teacher Evaluation",
    spotlight_copy:
      "Share your thoughts about your teachers and help improve the quality of education through constructive feedback.",
  },
  settings: {
    hero_copy:
      "Update your profile details, keep your Gmail linked for secure password reset, and keep your account aligned with your current information.",
    spotlight_eyebrow: "Account controls",
    spotlight_title: "Settings",
    spotlight_copy:
      "Update your username, display name, Gmail link (for password reset), and profile picture to keep your account up to date.",
  },
};

const departmentMajors = {
  IT: ["Computer Technology", "Electronics"],
  BSED: ["English", "Physical Education", "Math", "Filipino", "Social Science"],
  HM: ["General"],
  BEED: ["General"],
  TOURISM: ["General"],
};

// Current state
let currentView = "records";
let currentUser = null;
let currentSession = null;

// Initialize dashboard
document.addEventListener("DOMContentLoaded", async () => {
  try {
    // Check authentication
    currentSession = await AuthAPI.checkSession();
    if (!currentSession.authenticated) {
      window.location.href = "index.html";
      return;
    }

    currentUser = currentSession.user;

    // Update sidebar
    updateSidebar();

    // Setup navigation
    setupNavigation();

    // Setup logout
    document
      .getElementById("logoutBtn")
      .addEventListener("click", async (e) => {
        e.preventDefault();
        await AuthAPI.logout();
        window.location.href = "index.html";
      });

    // Get view from URL
    const urlParams = new URLSearchParams(window.location.search);
    const view = urlParams.get("view") || "records";

    // Load view
    await loadView(view);

    // Start clock
    startClock();

    // Initialize tooltips
    if (window.bootstrap && window.bootstrap.Tooltip) {
      const tooltipTriggerList = [].slice.call(
        document.querySelectorAll('[data-bs-toggle="tooltip"]')
      );
      tooltipTriggerList.forEach(function (el) {
        new window.bootstrap.Tooltip(el);
      });
    }
  } catch (error) {
    console.error("Init error:", error);
    window.location.href = "index.html";
  }
});

// Update sidebar with user info
function updateSidebar() {
  if (currentUser) {
    const sidebarImage = document.getElementById("sidebarUserImage");
    const sidebarSchoolId = document.getElementById("sidebarSchoolId");
    const sidebarRole = document.getElementById("sidebarRole");
    const adminViewLink = document.getElementById("adminViewLink");

    if (sidebarImage) {
      // Normalize image path - remove /TCC/public prefix if present
      let imagePath = currentUser.image_path || "images/sample.jpg";
      console.log("updateSidebar - original image_path:", imagePath);

      // If backend provided a signed avatar URL, use it directly
      if (currentUser.avatar_url) {
        sidebarImage.src = currentUser.avatar_url;
      } else if (imagePath && imagePath.startsWith("/TCC/public/")) {
        imagePath = imagePath.replace("/TCC/public/", "");
        sidebarImage.src = imagePath;
      } else if (
        imagePath &&
        (imagePath.startsWith("/TCC/database/pictures/") ||
          (!imagePath.startsWith("images/") && !imagePath.startsWith("http")))
      ) {
        // request signed URL from backend for storage-stored avatars or filenames
        sidebarImage.src = "images/sample.jpg";
        getAvatarUrl(currentUser.id, imagePath)
          .then((url) => {
            sidebarImage.src = url;
          })
          .catch(() => {});
      } else {
        if (!imagePath || imagePath === "") imagePath = "images/sample.jpg";
        sidebarImage.src = imagePath;
      }

      // Add error handler to fallback to sample.jpg if image fails to load
      sidebarImage.onerror = function () {
        console.error(
          "Failed to load image:",
          imagePath,
          "falling back to sample.jpg"
        );
        this.src = "images/sample.jpg";
        this.onerror = null; // Prevent infinite loop
      };

      // Add load handler to confirm image loaded
      sidebarImage.onload = function () {
        console.log("Image loaded successfully:", imagePath);
      };
    }

    if (sidebarSchoolId) {
      // Only show school ID for students (not admin/teacher) and if it's not a placeholder
      const isStudent = currentUser.role === "student";
      const isValidSchoolId =
        currentUser.school_id &&
        currentUser.school_id !== "ADMIN - 0000" &&
        !currentUser.school_id.includes("ADMIN") &&
        currentUser.school_id.trim() !== "";

      if (isStudent && isValidSchoolId) {
        sidebarSchoolId.textContent = currentUser.school_id;
        sidebarSchoolId.style.display = "inline";
      } else {
        sidebarSchoolId.style.display = "none";
      }
    }

    if (currentUser.role && sidebarRole) {
      sidebarRole.textContent =
        currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1);
      sidebarRole.style.display = "inline";
    }

    if (currentUser.role === "admin" && adminViewLink) {
      adminViewLink.style.display = "block";
    } else if (adminViewLink) {
      adminViewLink.style.display = "none";
    }
  }
}

// Setup navigation
function setupNavigation() {
  // Sidebar nav links
  document.querySelectorAll(".sidebar-nav .nav-link").forEach((link) => {
    link.addEventListener("click", async (e) => {
      e.preventDefault();
      const view = link.getAttribute("data-view");
      if (view) {
        await loadView(view);
        // Update URL without reload
        window.history.pushState({ view }, "", `?view=${view}`);
      }
    });
  });

  // Hero action links
  document.querySelectorAll(".hero-action").forEach((link) => {
    link.addEventListener("click", async (e) => {
      e.preventDefault();
      const view = link.getAttribute("data-view");
      if (view) {
        await loadView(view);
        window.history.pushState({ view }, "", `?view=${view}`);
      }
    });
  });

  // Handle browser back/forward
  window.addEventListener("popstate", (e) => {
    const view =
      e.state?.view ||
      new URLSearchParams(window.location.search).get("view") ||
      "records";
    loadView(view);
  });
}

// Load view
async function loadView(view) {
  currentView = view;
  const contentArea = document.getElementById("contentArea");
  contentArea.innerHTML =
    '<div class="text-center p-5"><div class="spinner-border" role="status"><span class="visually-hidden">Loading...</span></div></div>';

  // Update active nav items
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.classList.remove("active");
    if (link.getAttribute("data-view") === view) {
      link.classList.add("active");
    }
  });

  document.querySelectorAll(".hero-action").forEach((link) => {
    link.classList.remove("active");
    if (link.getAttribute("data-view") === view) {
      link.classList.add("active");
    }
  });

  // Update hero content
  updateHeroContent(view);

  try {
    switch (view) {
      case "records":
        await loadRecordsView();
        break;
      case "announcements":
        await loadAnnouncementsView();
        break;
      case "grades":
        await loadGradesView();
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
      default:
        contentArea.innerHTML =
          '<div class="alert alert-danger">View not found</div>';
    }
  } catch (error) {
    console.error("Error loading view:", error);
    contentArea.innerHTML = `<div class="alert alert-danger">Error loading view: ${error.message}</div>`;
  }
}

// Update hero content
function updateHeroContent(view) {
  const spotlight = heroSpotlights[view] || heroSpotlights.records;

  document.getElementById("heroUserName").textContent =
    currentUser?.full_name || currentUser?.username || "User";
  document.getElementById("heroCopy").textContent = spotlight.hero_copy;
  document.getElementById("spotlightEyebrow").textContent =
    spotlight.spotlight_eyebrow;
  document.getElementById("spotlightTitle").textContent =
    spotlight.spotlight_title;
  document.getElementById("spotlightCopy").textContent =
    spotlight.spotlight_copy;
}

// ==================== RECORDS VIEW ====================
async function loadRecordsView() {
  const contentArea = document.getElementById("contentArea");

  try {
    const assignment = await StudentAPI.getAssignment();
    const sectionAssignments = await AdminAPI.getSectionAssignments().catch(
      () => []
    );

    let buildingText = "Unassigned";
    let floorText = "";
    let roomText = "";
    let yearText = "N/A";
    let sectionText = "N/A";
    let paymentStatus = "paid";
    let owingAmount = null;
    let sanctions = null;

    if (assignment) {
      yearText = assignment.year || "N/A";
      sectionText = assignment.section || "N/A";
      paymentStatus = assignment.payment || "paid";
      owingAmount = assignment.owing_amount || null;
      sanctions = assignment.sanctions || null;

      // Find section assignment
      if (assignment.year && assignment.section) {
        const sectionAssignment = (
          Array.isArray(sectionAssignments) ? sectionAssignments : []
        ).find(
          (sa) =>
            sa.year === assignment.year && sa.section === assignment.section
        );

        if (sectionAssignment) {
          if (sectionAssignment.building) {
            buildingText = "Building " + sectionAssignment.building;
          }
          if (
            sectionAssignment.floor &&
            parseInt(sectionAssignment.floor) > 0
          ) {
            floorText = formatOrdinal(sectionAssignment.floor) + " Floor";
          }
          if (sectionAssignment.room) {
            roomText = "Room " + sectionAssignment.room;
          }
        }
      }
    }

    // Parse sanctions
    let sanctionText = "No";
    let sanctionDays = null;
    let sanctionNote = "";
    if (sanctions) {
      const dateMatch = sanctions.match(/(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) {
        const sanctionDate = new Date(dateMatch[1]);
        const now = new Date();
        if (sanctionDate > now) {
          const diff = Math.floor((sanctionDate - now) / (1000 * 60 * 60 * 24));
          sanctionDays = diff;
          sanctionText = diff + " days";
        } else {
          sanctionText = "Expired";
        }
      } else if (!isNaN(sanctions)) {
        sanctionDays = parseInt(sanctions);
        sanctionText = sanctionDays + " days";
      } else {
        sanctionText = "Yes";
        sanctionNote = sanctions.trim();
      }
    }

    let html = `
            <div class="records-container">
                <div class="records-header">
                    <h2 class="records-title">My Records</h2>
                    <p class="records-subtitle">View your academic and financial information</p>
                </div>
                
                <div class="records-grid">
                    <div class="records-main">
                        <div class="info-card assignment-card">
                            <div class="card-header-modern">
                                <i class="bi bi-building"></i>
                                <h3>Assignment Details</h3>
                            </div>
                            <div class="info-grid">
                                <div class="info-item">
                                    <div class="info-icon">
                                        <i class="bi bi-building"></i>
                                    </div>
                                    <div class="info-content">
                                        <span class="info-label">Building</span>
                                        <span class="info-value">${escapeHtml(
                                          buildingText
                                        )}</span>
                                    </div>
                                </div>
                                
                                <div class="info-item">
                                    <div class="info-icon">
                                        <i class="bi bi-layers"></i>
                                    </div>
                                    <div class="info-content">
                                        <span class="info-label">Floor / Room</span>
                                        <span class="info-value">${escapeHtml(
                                          floorText && roomText
                                            ? floorText + " / " + roomText
                                            : floorText || roomText || "N/A"
                                        )}</span>
                                    </div>
                                </div>
                                
                                <div class="info-item">
                                    <div class="info-icon">
                                        <i class="bi bi-calendar-year"></i>
                                    </div>
                                    <div class="info-content">
                                        <span class="info-label">Year</span>
                                        <span class="info-value">${escapeHtml(
                                          yearText
                                        )}</span>
                                    </div>
                                </div>
                                
                                <div class="info-item">
                                    <div class="info-icon">
                                        <i class="bi bi-people"></i>
                                    </div>
                                    <div class="info-content">
                                        <span class="info-label">Section</span>
                                        <span class="info-value">${escapeHtml(
                                          sectionText
                                        )}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="info-card financial-card">
                            <div class="card-header-modern">
                                <i class="bi bi-wallet2"></i>
                                <h3>Financial Status</h3>
                            </div>
                            <div class="financial-grid">
                                <div class="financial-item ${
                                  paymentStatus === "owing"
                                    ? "status-warning"
                                    : "status-success"
                                }">
                                    <div class="financial-icon">
                                        <i class="bi ${
                                          paymentStatus === "owing"
                                            ? "bi-exclamation-triangle"
                                            : "bi-check-circle"
                                        }"></i>
                                    </div>
                                    <div class="financial-content">
                                        <span class="financial-label">Outstanding Balance</span>
                                        <span class="financial-value">
                                            ${
                                              paymentStatus === "owing" &&
                                              owingAmount
                                                ? "₱" +
                                                  parseFloat(
                                                    owingAmount
                                                  ).toFixed(2)
                                                : paymentStatus === "owing"
                                                ? "Amount pending"
                                                : "₱0.00"
                                            }
                                        </span>
                                    </div>
                                </div>
                                ${
                                  sanctions ||
                                  (sanctionDays !== null && sanctionDays > 0) ||
                                  sanctionText.includes("days") ||
                                  sanctionText === "Yes" ||
                                  sanctionText === "Expired"
                                    ? `
                                <div class="financial-item status-warning">
                                    <div class="financial-icon">
                                        <i class="bi bi-exclamation-triangle"></i>
                                    </div>
                                    <div class="financial-content">
                                        <span class="financial-label">Sanctioned</span>
                                        <span class="financial-value">
                                            ${
                                              sanctionDays !== null &&
                                              sanctionDays > 0
                                                ? `<span class="days-remaining">${sanctionDays}</span> days remaining`
                                                : sanctionText.includes("days")
                                                ? `<span class="days-remaining">${escapeHtml(
                                                    sanctionText
                                                  )}</span>`
                                                : sanctionText === "Expired"
                                                ? '<span class="text-muted">Sanction expired</span>'
                                                : sanctionText === "Yes"
                                                ? `<span class="text-warning">${escapeHtml(
                                                    sanctionText
                                                  )}</span>`
                                                : `<span class="days-remaining">${escapeHtml(
                                                    sanctionText
                                                  )}</span>`
                                            }
                                        </span>
                                        ${
                                          sanctionNote
                                            ? `<span class="sanction-note">Note: ${escapeHtml(
                                                sanctionNote
                                              )}</span>`
                                            : ""
                                        }
                                    </div>
                                </div>
                                `
                                    : ""
                                }
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

    contentArea.innerHTML = html;
  } catch (error) {
    console.error("Load records error:", error);
    contentArea.innerHTML =
      '<div class="alert alert-danger">Error loading records: ' +
      escapeHtml(error.message) +
      "</div>";
  }
}

// ==================== ANNOUNCEMENTS VIEW ====================
async function loadAnnouncementsView() {
  const contentArea = document.getElementById("contentArea");

  try {
    const urlParams = new URLSearchParams(window.location.search);
    const filterYear = urlParams.get("year_filter") || "";
    const filterDept = urlParams.get("dept_filter") || "";
    const filterMajor = urlParams.get("major_filter") || "";

    console.log("Loading announcements...");
    let announcements = [];
    try {
      announcements = await StudentAPI.getAnnouncements();
      console.log("Announcements received:", announcements);
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

    const majorsForDept =
      filterDept && departmentMajors[filterDept]
        ? departmentMajors[filterDept]
        : [];

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

        // Format date - handle both string and Date object
        let dateDisplay = "Date not specified";
        if (a.date) {
          if (a.date instanceof Date) {
            dateDisplay = a.date.toLocaleString();
          } else if (typeof a.date === "string") {
            // Try to format the date string
            try {
              const dateObj = new Date(a.date);
              if (!isNaN(dateObj.getTime())) {
                dateDisplay = dateObj.toLocaleString();
              } else {
                dateDisplay = a.date;
              }
            } catch (e) {
              dateDisplay = a.date;
            }
          } else {
            dateDisplay = String(a.date);
          }
        }

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
                                        ${escapeHtml(dateDisplay)}
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
    document
      .getElementById("announcementsFilterForm")
      .addEventListener("submit", (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const params = new URLSearchParams(formData);
        window.location.search = params.toString();
      });

    // Update major filter when department changes
    document.getElementById("dept_filter").addEventListener("change", (e) => {
      const dept = e.target.value;
      const majorSelect = document.getElementById("major_filter");
      const majors =
        dept && departmentMajors[dept] ? departmentMajors[dept] : [];

      majorSelect.innerHTML = '<option value="">All Majors</option>';
      majors.forEach((major) => {
        majorSelect.innerHTML += `<option value="${escapeHtml(
          major
        )}">${escapeHtml(major)}</option>`;
      });
      majorSelect.disabled = majors.length === 0;
    });
  } catch (error) {
    console.error("Load announcements error:", error);
    contentArea.innerHTML =
      '<div class="alert alert-danger">Error loading announcements: ' +
      escapeHtml(error.message) +
      "</div>";
  }
}

// ==================== EVALUATION VIEW ====================
async function loadEvaluationView() {
  const contentArea = document.getElementById("contentArea");

  try {
    // Check URL params for teacher evaluation
    const urlParams = new URLSearchParams(window.location.search);
    const teacherId = urlParams.get("teacher_id");
    const teacherName = urlParams.get("teacher_name");
    const subject = urlParams.get("subject");

    if (teacherId && teacherName) {
      // Show evaluation form
      await loadEvaluationForm(
        parseInt(teacherId),
        decodeURIComponent(teacherName),
        decodeURIComponent(subject || "")
      );
      return;
    }

    // Check if evaluations are enabled
    const settings = await StudentAPI.getEvaluationSettings().catch(() => ({
      enabled: true,
    }));
    const evaluationsEnabled = settings.enabled !== false;

    if (!evaluationsEnabled) {
      contentArea.innerHTML = `
                <div class="records-container">
                    <div class="records-header">
                        <h2 class="records-title">
                            <i class="bi bi-clipboard-check"></i> Teacher Evaluation
                        </h2>
                        <p class="records-subtitle">Select a teacher to evaluate</p>
                    </div>
                    <div class="alert alert-warning">
                        <i class="bi bi-exclamation-triangle"></i>
                        Teacher evaluations are currently disabled by the administrator.
                    </div>
                </div>
            `;
      return;
    }

    // Get student assignment to find section
    const assignment = await StudentAPI.getAssignment().catch(() => null);
    const studentSection = assignment?.section || "";

    if (!studentSection) {
      contentArea.innerHTML = `
                <div class="records-container">
                    <div class="records-header">
                        <h2 class="records-title">
                            <i class="bi bi-clipboard-check"></i> Teacher Evaluation
                        </h2>
                        <p class="records-subtitle">Select a teacher to evaluate</p>
                    </div>
                    <div class="alert alert-info">
                        <i class="bi bi-info-circle"></i>
                        Your section information is not available. Please contact the administrator to update your assignment.
                    </div>
                </div>
            `;
      return;
    }

    // Get teachers for student's section
    let teachersData;
    try {
      teachersData = await StudentAPI.getEvaluationTeachers();
      console.log("Teachers data received:", teachersData);
    } catch (error) {
      console.error("Error fetching teachers:", error);
      teachersData = { teachers: [] };
    }
    const teachers = Array.isArray(teachersData.teachers)
      ? teachersData.teachers
      : [];
    console.log("Teachers array:", teachers);

    let html = `
            <div class="records-container">
                <div class="records-header">
                    <h2 class="records-title">
                        <i class="bi bi-clipboard-check"></i> Teacher Evaluation
                    </h2>
                    <p class="records-subtitle">Select a teacher to evaluate</p>
                </div>
                <div class="records-main">
                    <div class="info-card">
                        <div class="card-header-modern">
                            <i class="bi bi-people"></i>
                            <h3>Teachers in Section: ${escapeHtml(
                              studentSection
                            )}</h3>
                        </div>
        `;

    if (teachers.length === 0) {
      html += `<p class="text-muted">No teachers found for your section. Please contact the administrator.</p>`;
    } else {
      html += `<div class="teachers-grid">`;
      teachers.forEach((teacher) => {
        html += `
                    <div class="teacher-card-modern">
                        <div class="teacher-card-header">
                            <h4 class="teacher-name">${escapeHtml(
                              teacher.name
                            )}</h4>
                            ${
                              teacher.evaluated
                                ? `
                                <span class="evaluation-badge evaluated">
                                    <i class="bi bi-check-circle-fill"></i>
                                    Evaluated
                                </span>
                            `
                                : `
                                <span class="evaluation-badge pending">
                                    <i class="bi bi-clock"></i>
                                    Pending
                                </span>
                            `
                            }
                        </div>
                        <div class="teacher-subjects">
                            <strong>Subjects:</strong>
                            <ul>
                                ${teacher.subjects
                                  .map((s) => `<li>${escapeHtml(s)}</li>`)
                                  .join("")}
                            </ul>
                        </div>
                        ${
                          !teacher.evaluated
                            ? `
                            <div class="teacher-card-actions">
                                <a href="?view=evaluation&teacher_id=${
                                  teacher.id
                                }&teacher_name=${encodeURIComponent(
                                teacher.name
                              )}&subject=${encodeURIComponent(
                                teacher.subjects.join(", ")
                              )}" class="btn btn-primary evaluation-btn">
                                    <i class="bi bi-clipboard-check"></i>
                                    Evaluate Teacher
                                </a>
                            </div>
                        `
                            : `
                            <div class="teacher-card-actions">
                                <span class="text-muted">
                                    <i class="bi bi-check-circle"></i>
                                    You have already evaluated this teacher
                                </span>
                            </div>
                        `
                        }
                    </div>
                `;
      });
      html += `</div>`;
    }

    html += `
                    </div>
                </div>
            </div>
        `;

    contentArea.innerHTML = html;
  } catch (error) {
    console.error("Load evaluation error:", error);
    contentArea.innerHTML =
      '<div class="alert alert-danger">Error loading evaluation: ' +
      escapeHtml(error.message) +
      "</div>";
  }
}

async function loadEvaluationForm(teacherId, teacherName, subject) {
  const contentArea = document.getElementById("contentArea");

  try {
    const assignment = await StudentAPI.getAssignment().catch(() => null);
    const studentSection = assignment?.section || "";

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

    let html = `
            <div class="records-container">
                <div class="records-header">
                    <h2 class="records-title">
                        <i class="bi bi-clipboard-check"></i> Teacher Evaluation Form
                    </h2>
                    <p class="records-subtitle">Evaluate ${escapeHtml(
                      teacherName
                    )}</p>
                </div>
                <div class="records-main">
                    <div class="info-card">
                        <div class="card-header-modern">
                            <i class="bi bi-info-circle"></i>
                            <h3>Evaluation Information</h3>
                        </div>
                        <p><strong>This Evaluation Form will be part of your REQUIREMENTS for CLEARANCE for the 1st Semester of S.Y. 2025-2026.</strong></p>
                        <p><strong>Directions:</strong> The following are statements about your SUBJECT TEACHER for the <strong>1st Semester of S.Y. 2025-2026</strong>. Please indicate the extent to which each statement characterizes the competence of your teacher by choosing the specific numerical rating based on the following:</p>
                        <div class="evaluation-rating-scale">
                            <div class="rating-scale-item">
                                <span class="rating-label"><strong>O (4)</strong> = Outstanding</span>
                            </div>
                            <div class="rating-scale-item">
                                <span class="rating-label"><strong>VS (3)</strong> = Very Satisfactory</span>
                            </div>
                            <div class="rating-scale-item">
                                <span class="rating-label"><strong>S (2)</strong> = Satisfactory</span>
                            </div>
                            <div class="rating-scale-item">
                                <span class="rating-label"><strong>NI (1)</strong> = Needs Improvement</span>
                            </div>
                        </div>
                    </div>
                    
                    <form id="evaluationForm">
                        <input type="hidden" name="teacher_id" value="${teacherId}">
                        <input type="hidden" name="teacher_name" value="${escapeHtml(
                          teacherName
                        )}">
                        <input type="hidden" name="subject" value="${escapeHtml(
                          subject
                        )}">
                        <input type="hidden" name="student_section" value="${escapeHtml(
                          studentSection
                        )}">
                        
                        <!-- PART I: My Teacher -->
                        <div class="info-card">
                            <div class="card-header-modern">
                                <i class="bi bi-person-check"></i>
                                <h3>PART I: My Teacher</h3>
                            </div>
        `;

    part1Questions.forEach((question, index) => {
      const qNum = index + 1;
      html += `
                <div class="evaluation-question">
                    <label class="evaluation-question-label">
                        <span class="question-number">${qNum}.</span>
                        <span class="question-text">${escapeHtml(
                          question
                        )}</span>
                    </label>
                    <div class="evaluation-ratings">
                        <label class="rating-option">
                            <input type="radio" name="part1_q${qNum}" value="4" required>
                            <span class="rating-value">O (4)</span>
                        </label>
                        <label class="rating-option">
                            <input type="radio" name="part1_q${qNum}" value="3" required>
                            <span class="rating-value">VS (3)</span>
                        </label>
                        <label class="rating-option">
                            <input type="radio" name="part1_q${qNum}" value="2" required>
                            <span class="rating-value">S (2)</span>
                        </label>
                        <label class="rating-option">
                            <input type="radio" name="part1_q${qNum}" value="1" required>
                            <span class="rating-value">NI (1)</span>
                        </label>
                    </div>
                </div>
            `;
    });

    html += `
                        </div>
                        
                        <!-- PART II: As a Student -->
                        <div class="info-card">
                            <div class="card-header-modern">
                                <i class="bi bi-mortarboard"></i>
                                <h3>PART II: As a Student</h3>
                            </div>
        `;

    part2Questions.forEach((question, index) => {
      const qNum = index + 1;
      html += `
                <div class="evaluation-question">
                    <label class="evaluation-question-label">
                        <span class="question-number">${qNum}.</span>
                        <span class="question-text">${escapeHtml(
                          question
                        )}</span>
                    </label>
                    <div class="evaluation-ratings">
                        <label class="rating-option">
                            <input type="radio" name="part2_q${qNum}" value="4" required>
                            <span class="rating-value">O (4)</span>
                        </label>
                        <label class="rating-option">
                            <input type="radio" name="part2_q${qNum}" value="3" required>
                            <span class="rating-value">VS (3)</span>
                        </label>
                        <label class="rating-option">
                            <input type="radio" name="part2_q${qNum}" value="2" required>
                            <span class="rating-value">S (2)</span>
                        </label>
                        <label class="rating-option">
                            <input type="radio" name="part2_q${qNum}" value="1" required>
                            <span class="rating-value">NI (1)</span>
                        </label>
                    </div>
                </div>
            `;
    });

    html += `
                        </div>
                        
                        <!-- Additional Questions -->
                        <div class="info-card">
                            <div class="card-header-modern">
                                <i class="bi bi-question-circle"></i>
                                <h3>Additional Questions</h3>
                            </div>
                            
                            <div class="evaluation-question">
                                <label class="evaluation-question-label">
                                    In a scale of 1 (not satisfied) to 10 (very satisfied), how satisfied are you with your learning experiences in this subject?
                                </label>
                                <div class="satisfaction-scale">
        `;

    for (let i = 1; i <= 10; i++) {
      html += `
                                    <label class="satisfaction-option">
                                        <input type="radio" name="satisfaction_rating" value="${i}" required>
                                        <span class="satisfaction-value">${i}</span>
                                    </label>
            `;
    }

    html += `
                                </div>
                                <div class="satisfaction-labels">
                                    <span class="satisfaction-label-left">NOT SATISFIED</span>
                                    <span class="satisfaction-label-right">VERY SATISFIED</span>
                                </div>
                            </div>
                            
                            <div class="evaluation-question">
                                <label class="evaluation-question-label">
                                    Will you recommend the subject/s under the present teacher?
                                </label>
                                <div class="evaluation-ratings">
                                    <label class="rating-option">
                                        <input type="radio" name="recommend_teacher" value="YES" required>
                                        <span class="rating-value">YES</span>
                                    </label>
                                    <label class="rating-option">
                                        <input type="radio" name="recommend_teacher" value="NO" required>
                                        <span class="rating-value">NO</span>
                                    </label>
                                </div>
                            </div>
                            
                            <div class="evaluation-question">
                                <label class="evaluation-question-label" for="comments">
                                    COMMENTS
                                    <small>(This may include a message of gratitude or pointing out aspects which you want your teacher to consider for further improvement.)</small>
                                </label>
                                <textarea id="comments" name="comments" class="evaluation-comments" rows="5" placeholder="Enter your comments here..."></textarea>
                            </div>
                        </div>
                        
                        <div class="evaluation-actions">
                            <button type="submit" class="btn btn-primary evaluation-submit-btn">
                                <i class="bi bi-check-circle"></i>
                                Submit Evaluation
                            </button>
                            <a href="?view=evaluation" class="btn btn-outline-secondary">
                                <i class="bi bi-arrow-left"></i>
                                Cancel
                            </a>
                        </div>
                    </form>
                </div>
            </div>
        `;

    contentArea.innerHTML = html;

    // Setup form submission
    document
      .getElementById("evaluationForm")
      .addEventListener("submit", async function (e) {
        e.preventDefault();

        const formData = new FormData(this);
        const data = {};
        formData.forEach((value, key) => {
          data[key] = value;
        });

        const submitBtn = this.querySelector(".evaluation-submit-btn");
        const originalText = submitBtn.innerHTML;

        submitBtn.disabled = true;
        submitBtn.innerHTML =
          '<i class="bi bi-hourglass-split"></i> Submitting...';

        try {
          const result = await StudentAPI.submitEvaluation(data);
          if (result.success) {
            alert("Evaluation submitted successfully!");
            window.location.href = "?view=evaluation";
          } else {
            alert(
              "Error: " + (result.message || "Failed to submit evaluation")
            );
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
          }
        } catch (error) {
          console.error("Error:", error);
          alert(
            "An error occurred while submitting the evaluation. Please try again."
          );
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalText;
        }
      });
  } catch (error) {
    console.error("Load evaluation form error:", error);
    contentArea.innerHTML =
      '<div class="alert alert-danger">Error loading evaluation form: ' +
      escapeHtml(error.message) +
      "</div>";
  }
}

// ==================== GRADES VIEW ====================
async function loadGradesView() {
  const contentArea = document.getElementById("contentArea");

  try {
    const [grades, studyLoad] = await Promise.all([
      StudentAPI.getGrades().catch(() => []),
      StudentAPI.getStudyLoad().catch(() => []),
    ]);

    // Group grades by year and semester
    const gradesByYear = {};
    (Array.isArray(grades) ? grades : []).forEach((grade) => {
      const year = grade.year || "unknown";
      const semester = normalizeSemester(grade.semester || "");

      if (!gradesByYear[year]) {
        gradesByYear[year] = {
          label: normalizeYear(year),
          semesters: {},
        };
      }

      if (!gradesByYear[year].semesters[semester]) {
        gradesByYear[year].semesters[semester] = [];
      }

      gradesByYear[year].semesters[semester].push(grade);
    });

    // Sort years
    const preferredYearOrder = ["1", "2", "3", "4"];
    const orderedYears = {};
    preferredYearOrder.forEach((yearKey) => {
      if (gradesByYear[yearKey]) {
        orderedYears[yearKey] = gradesByYear[yearKey];
      }
    });
    Object.keys(gradesByYear).forEach((yearKey) => {
      if (!preferredYearOrder.includes(yearKey)) {
        orderedYears[yearKey] = gradesByYear[yearKey];
      }
    });

    let html = `
            <div class="records-container">
                <div class="records-header">
                    <h2 class="records-title">My Grades</h2>
                    <p class="records-subtitle">View your academic progress and subject grades</p>
                </div>
                <div class="records-main">
        `;

    if (Object.keys(orderedYears).length === 0) {
      html += `
                    <div class="info-card">
                        <div class="card-header-modern">
                            <i class="bi bi-journal-x"></i>
                            <h3>My Grades</h3>
                        </div>
                        <p class="text-muted mb-0">No grade records are available yet. Please check back later.</p>
                    </div>
            `;
    } else {
      Object.values(orderedYears).forEach((yearData) => {
        const semesters = yearData.semesters;
        const preferredSemesters = ["First Semester", "Second Semester"];
        const orderedSemesters = {};
        preferredSemesters.forEach((semName) => {
          if (semesters[semName]) {
            orderedSemesters[semName] = semesters[semName];
          }
        });
        Object.keys(semesters).forEach((semName) => {
          if (!preferredSemesters.includes(semName)) {
            orderedSemesters[semName] = semesters[semName];
          }
        });

        html += `
                    <div class="info-card grades-year-card">
                        <div class="card-header-modern">
                            <i class="bi bi-calendar-year"></i>
                            <h3>${escapeHtml(yearData.label)}</h3>
                        </div>
                `;

        Object.entries(orderedSemesters).forEach(([semName, gradesList]) => {
          if (gradesList.length > 0) {
            html += `
                            <div class="grades-semester-section">
                                <div class="semester-header">
                                    <i class="bi bi-journal-bookmark"></i>
                                    <h4>${escapeHtml(semName)}</h4>
                                    <span class="semester-badge">${
                                      gradesList.length
                                    } ${
              gradesList.length === 1 ? "subject" : "subjects"
            }</span>
                                </div>
                                <div class="grades-grid">
                        `;

            gradesList.forEach((grade) => {
              const grades = [
                grade.prelim_grade,
                grade.midterm_grade,
                grade.finals_grade,
              ].filter((g) => g != null && g !== "");
              const average =
                grades.length > 0
                  ? (
                      grades.reduce(
                        (a, b) => parseFloat(a) + parseFloat(b),
                        0
                      ) / grades.length
                    ).toFixed(2)
                  : null;

              html += `
                                <div class="grade-card-modern">
                                    <div class="grade-card-header-modern">
                                        <div class="grade-subject-info">
                                            <h5 class="grade-subject-name">${escapeHtml(
                                              grade.subject || "Unknown"
                                            )}</h5>
                                            ${
                                              grade.instructor
                                                ? `
                                            <p class="grade-instructor">
                                                <i class="bi bi-person-badge"></i>
                                                <span>${escapeHtml(
                                                  grade.instructor
                                                )}</span>
                                            </p>
                                            `
                                                : ""
                                            }
                                        </div>
                                        ${
                                          average !== null
                                            ? `
                                        <div class="grade-average-badge">
                                            <i class="bi bi-graph-up"></i>
                                            <span>${average}</span>
                                        </div>
                                        `
                                            : ""
                                        }
                                    </div>
                                    <div class="grade-details-modern">
                                        <div class="grade-detail-item">
                                            <span class="grade-period">
                                                <i class="bi bi-circle-fill"></i>
                                                Prelim
                                            </span>
                                            <span class="grade-number">${
                                              grade.prelim_grade != null
                                                ? parseFloat(
                                                    grade.prelim_grade
                                                  ).toFixed(2)
                                                : "—"
                                            }</span>
                                        </div>
                                        <div class="grade-detail-item">
                                            <span class="grade-period">
                                                <i class="bi bi-circle-fill"></i>
                                                Midterm
                                            </span>
                                            <span class="grade-number">${
                                              grade.midterm_grade != null
                                                ? parseFloat(
                                                    grade.midterm_grade
                                                  ).toFixed(2)
                                                : "—"
                                            }</span>
                                        </div>
                                        <div class="grade-detail-item">
                                            <span class="grade-period">
                                                <i class="bi bi-circle-fill"></i>
                                                Finals
                                            </span>
                                            <span class="grade-number">${
                                              grade.finals_grade != null
                                                ? parseFloat(
                                                    grade.finals_grade
                                                  ).toFixed(2)
                                                : "—"
                                            }</span>
                                        </div>
                                    </div>
                                </div>
                            `;
            });

            html += `
                                </div>
                            </div>
                        `;
          }
        });

        html += `
                    </div>
                `;
      });
    }

    // Study Load section - always show
    console.log("Study load data:", studyLoad);
    const studyLoadArray = Array.isArray(studyLoad)
      ? studyLoad
      : studyLoad
      ? [studyLoad]
      : [];
    const assignment = await StudentAPI.getAssignment().catch(() => null);

    if (studyLoadArray.length > 0) {
      const yearLabel = assignment?.year
        ? isNaN(assignment.year)
          ? assignment.year
          : formatOrdinal(parseInt(assignment.year)) + " Year"
        : "Not assigned";
      const sectionLabel = assignment?.section || "Not assigned";
      const courseLabel = assignment?.department || "Not set";
      const majorLabel = assignment?.major || "Not set";

      // Format semester to ordinal (1st, 2nd, etc.)
      const formatSemester = (semester) => {
        if (!semester) return "";
        const sem = String(semester).toLowerCase().trim();
        if (sem.includes("first") || sem.includes("1")) {
          return "1st";
        } else if (sem.includes("second") || sem.includes("2")) {
          return "2nd";
        } else if (sem.includes("third") || sem.includes("3")) {
          return "3rd";
        } else if (sem.includes("fourth") || sem.includes("4")) {
          return "4th";
        }
        // Try to extract number
        const numMatch = sem.match(/\d+/);
        if (numMatch) {
          return formatOrdinal(parseInt(numMatch[0]));
        }
        return sem;
      };

      // Collect unique semesters from study load and format them
      const semesters = [
        ...new Set(
          studyLoadArray
            .map((s) => s.semester)
            .filter((s) => s && s.trim() !== "")
        ),
      ];
      const formattedSemesters = semesters.map(formatSemester);
      const semesterLabel =
        formattedSemesters.length > 0
          ? formattedSemesters.join(", ")
          : "Not set";

      console.log("Study load data for display:", studyLoadArray);

      let totalSubjects = 0;
      let totalUnits = 0;

      html += `
                <div class="info-card study-load-card">
                    <div class="card-header-modern">
                        <i class="bi bi-mortarboard-fill"></i>
                        <h3>Study Load</h3>
                    </div>
                    <div class="table-responsive study-load-table-wrapper">
                        <table class="table table-bordered align-middle study-load-table">
                            <tbody>
                                <tr>
                                    <th colspan="4" class="text-center text-uppercase study-load-title">Study Load</th>
                                </tr>
                                <tr>
                                    <td colspan="4">
                                        <div class="row g-2">
                                            <div class="col-md-6">
                                                <strong>Student ID:</strong>
                                                <span>${escapeHtml(
                                                  currentUser?.school_id ||
                                                    "Not set"
                                                )}</span>
                                            </div>
                                            <div class="col-md-6">
                                                <strong>Full Name:</strong>
                                                <span>${escapeHtml(
                                                  currentUser?.full_name ||
                                                    currentUser?.username ||
                                                    "Not set"
                                                )}</span>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td colspan="4">
                                        <div class="row g-0">
                                            <div class="col-md-3">
                                                <strong>Course:</strong> <span>${escapeHtml(
                                                  courseLabel
                                                )}</span>
                                            </div>
                                            <div class="col-md-3">
                                                <strong>Major:</strong> <span>${escapeHtml(
                                                  majorLabel
                                                )}</span>
                                            </div>
                                            <div class="col-md-3">
                                                <strong>Year Level:</strong> <span>${escapeHtml(
                                                  yearLabel
                                                )}</span>
                                            </div>
                                            <div class="col-md-3">
                                                <strong>Section:</strong> <span>${escapeHtml(
                                                  sectionLabel
                                                )}</span> <strong class="ms-1">Semester:</strong> <span>${escapeHtml(
        semesterLabel
      )}</span>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <th colspan="4" class="text-center study-load-subheader">Subject Enrolled</th>
                                </tr>
                                <tr>
                                    <th scope="col">Subject Code</th>
                                    <th scope="col">Subject Name</th>
                                    <th scope="col" style="width: 110px;">Units</th>
                                    <th scope="col">Subject Teacher</th>
                                </tr>
            `;

      studyLoadArray.forEach((subject) => {
        totalSubjects++;
        totalUnits += parseInt(subject.units || 0);

        // Debug teacher field
        console.log(
          "Subject:",
          subject.subject_code,
          "Teacher field:",
          subject.teacher,
          "Type:",
          typeof subject.teacher
        );

        const teacherDisplay =
          subject.teacher && subject.teacher.trim() !== ""
            ? escapeHtml(subject.teacher.trim())
            : '<span class="text-muted">TBA</span>';

        html += `
                    <tr>
                        <td>${escapeHtml(subject.subject_code || "—")}</td>
                        <td>${escapeHtml(subject.subject_title || "—")}</td>
                        <td>${parseInt(subject.units || 0)}</td>
                        <td>${teacherDisplay}</td>
                    </tr>
                `;
      });

      html += `
                                <tr class="study-load-total-row">
                                    <td colspan="2">
                                        <strong>Total Subjects:</strong>
                                        <span>${totalSubjects}</span>
                                    </td>
                                    <td colspan="2">
                                        <strong>Total Units:</strong>
                                        <span>${totalUnits}</span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
    } else {
      // Show empty study load message
      html += `
                <div class="info-card study-load-card">
                    <div class="card-header-modern">
                        <i class="bi bi-mortarboard-fill"></i>
                        <h3>Study Load</h3>
                    </div>
                    <div class="alert alert-info">
                        <i class="bi bi-info-circle me-2"></i>No study load records found. Please ensure you have been assigned to a year, section, and department in the Manage Students section.
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
    console.error("Load grades error:", error);
    contentArea.innerHTML =
      '<div class="alert alert-danger">Error loading grades: ' +
      escapeHtml(error.message) +
      "</div>";
  }
}

function normalizeYear(value) {
  const raw = String(value || "").trim();
  if (raw === "") {
    return "Year N/A";
  }
  if (!isNaN(raw)) {
    const num = parseInt(raw);
    if (num > 0) {
      const ordinal = formatOrdinal(num);
      if (ordinal) {
        return ordinal + " Year";
      }
    }
    return raw + " Year";
  }
  if (/\d+/.test(raw)) {
    const match = raw.match(/(\d+)/);
    if (match) {
      const num = parseInt(match[1]);
      if (num > 0) {
        const ordinal = formatOrdinal(num);
        if (ordinal) {
          return ordinal + " Year";
        }
      }
    }
  }
  const lower = raw.toLowerCase();
  const wordMap = {
    first: 1,
    second: 2,
    third: 3,
    fourth: 4,
    "1st": 1,
    "2nd": 2,
    "3rd": 3,
    "4th": 4,
  };
  for (const [needle, num] of Object.entries(wordMap)) {
    if (lower.includes(needle)) {
      const ordinal = formatOrdinal(num);
      if (ordinal) {
        return ordinal + " Year";
      }
    }
  }
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function normalizeSemester(value) {
  const raw = String(value || "").trim();
  if (raw === "") {
    return "Other Semester";
  }
  const lower = raw.toLowerCase();
  const firstAliases = [
    "1",
    "1st",
    "first",
    "first semester",
    "sem 1",
    "semester 1",
    "1st semester",
  ];
  for (const alias of firstAliases) {
    if (lower === alias) {
      return "First Semester";
    }
  }
  if (
    lower.includes("first") ||
    lower.includes("1st") ||
    lower.includes("sem 1")
  ) {
    return "First Semester";
  }
  const secondAliases = [
    "2",
    "2nd",
    "second",
    "second semester",
    "sem 2",
    "semester 2",
    "2nd semester",
  ];
  for (const alias of secondAliases) {
    if (lower === alias) {
      return "Second Semester";
    }
  }
  if (
    lower.includes("second") ||
    lower.includes("2nd") ||
    lower.includes("sem 2")
  ) {
    return "Second Semester";
  }
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

// ==================== TRANSPARENCY VIEW ====================
async function loadTransparencyView() {
  const contentArea = document.getElementById("contentArea");

  try {
    const projects = await StudentAPI.getProjects().catch(() => []);

    let html = `
            <div class="records-container">
                <div class="records-header">
                    <h2 class="records-title">Transparency / Projects</h2>
                    <p class="records-subtitle">View project budgets and completion status</p>
                </div>
                <div class="records-main">
        `;

    if (!projects || !Array.isArray(projects) || projects.length === 0) {
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
      projects.forEach((proj) => {
        const isCompleted =
          proj.completed && proj.completed.toLowerCase() === "yes";
        html += `
                    <div class="project-card-modern">
                        <div class="project-card-header">
                            <div class="project-title-section">
                                <h4 class="project-title">${escapeHtml(
                                  proj.name || "Unnamed Project"
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
    console.error("Load transparency error:", error);
    contentArea.innerHTML =
      '<div class="alert alert-danger">Error loading projects: ' +
      escapeHtml(error.message) +
      "</div>";
  }
}

// ==================== SETTINGS VIEW ====================
async function loadSettingsView() {
  const contentArea = document.getElementById("contentArea");

  try {
    // Render new profile settings form
    contentArea.innerHTML = ProfileSettings.renderHTML(currentUser);

    // Initialize profile settings with callback to update sidebar
    ProfileSettings.init(currentUser, (updatedUser) => {
      if (updatedUser) {
        currentUser = { ...currentUser, ...updatedUser };
        updateSidebar();

        // Refresh session to get latest avatar_url
        AuthAPI.checkSession()
          .then((session) => {
            if (session.authenticated && session.user) {
              currentUser = session.user;
              updateSidebar();
            }
          })
          .catch((err) => console.error("Error refreshing session:", err));
      }
    });
  } catch (error) {
    console.error("Load settings error:", error);
    contentArea.innerHTML =
      '<div class="alert alert-danger">Error loading settings: ' +
      escapeHtml(error.message) +
      "</div>";
  }
}

// ==================== CLOCK ====================
function startClock() {
  function ordinal(n) {
    const s = ["th", "st", "nd", "rd", "th", "th", "th", "th", "th", "th"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  function updateClock() {
    const timeEl = document.getElementById("homeClockTime");
    const subEl = document.getElementById("homeClockSub");
    const dayEl = document.getElementById("homeClockDay");

    if (!timeEl || !subEl || !dayEl) return;

    const now = new Date();
    const hours24 = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    const ampm = hours24 >= 12 ? "PM" : "AM";
    let displayHour = hours24 % 12;
    if (displayHour === 0) displayHour = 12;

    const hourText = displayHour < 10 ? "0" + displayHour : String(displayHour);
    const minuteText = minutes < 10 ? "0" + minutes : String(minutes);
    const secondText = seconds < 10 ? "0" + seconds : String(seconds);

    timeEl.textContent = hourText + ":" + minuteText + ":" + secondText;
    subEl.textContent = ampm;

    const weekday = now.toLocaleDateString(undefined, { weekday: "long" });
    const month = now.toLocaleDateString(undefined, { month: "long" });
    const day = ordinal(now.getDate());
    dayEl.textContent = weekday + ", " + month + " " + day;
  }

  updateClock();
  if (window.__homeClockTimer) {
    clearInterval(window.__homeClockTimer);
  }
  window.__homeClockTimer = setInterval(updateClock, 1000);

  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) {
      updateClock();
    }
  });
}
