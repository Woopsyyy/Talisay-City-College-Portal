// Profile Settings Module - Vanilla HTML/JS/CSS Implementation

const ProfileSettings = {
  // Generate HTML for the profile settings view
  renderHTML: (user) => {
    return `
      <div class="profile-settings-container">
        <div class="profile-settings-header">
          <h1>Profile Settings</h1>
          <p>Manage your account information and security</p>
        </div>

        <div id="alertContainer"></div>

        <form id="profileSettingsForm">
          <!-- Profile Picture Section -->
          <div class="profile-card">
            <div class="profile-picture-section">
              <div class="profile-picture-wrapper">
                <div class="profile-image-circle">
                  <img id="profilePreview" src="images/sample.jpg" alt="Profile" />
                </div>
                <div class="profile-overlay">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                    <circle cx="12" cy="13" r="4"></circle>
                  </svg>
                </div>
                <input type="file" id="profileImageInput" name="profile_image" class="profile-picture-input" accept="image/*" />
              </div>
              <div class="profile-info-text">
                <h3>Profile Picture</h3>
                <p>Click on the image to upload a new photo</p>
                <button type="button" class="btn-upload" id="uploadPhotoBtn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                    <circle cx="12" cy="13" r="4"></circle>
                  </svg>
                  Upload Photo
                </button>
              </div>
            </div>
          </div>

          <!-- Personal Information Section -->
          <div class="profile-card">
            <div class="form-section-header">
              <div class="form-section-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
              <h2>Personal Information</h2>
            </div>

            <div class="form-fields">
              <div class="form-field">
                <label class="form-label" for="username">Username</label>
                <div class="form-input-wrapper">
                  <svg class="form-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M@M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  <input type="text" id="username" name="username" class="form-input" placeholder="Enter your username" value="${escapeHtml(
                    user?.username || ""
                  )}" required />
                </div>
              </div>

              <div class="form-field">
                <label class="form-label" for="fullName">Full Name</label>
                <div class="form-input-wrapper">
                  <svg class="form-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  <input type="text" id="fullName" name="full_name" class="form-input" placeholder="Enter your full name" value="${escapeHtml(
                    user?.full_name || ""
                  )}" required />
                </div>
              </div>
            </div>
          </div>

          <!-- Security Section -->
          <div class="profile-card">
            <div class="form-section-header">
              <div class="form-section-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
              </div>
              <h2>Security</h2>
            </div>

            <div class="form-fields">
              <div class="form-field">
                <label class="form-label" for="newPassword">New Password</label>
                <div class="form-input-wrapper">
                  <svg class="form-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                  <input type="password" id="newPassword" name="password" class="form-input" placeholder="Enter new password" />
                </div>
                <p class="form-hint">Leave blank if you don't want to change your password</p>
              </div>

              <div class="form-field">
                <label class="form-label" for="confirmPassword">Confirm New Password</label>
                <div class="form-input-wrapper">
                  <svg class="form-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                  </svg>
                  <input type="password" id="confirmPassword" name="confirm_password" class="form-input" placeholder="Confirm new password" />
                  <div class="form-input-validation" id="passwordValidation" style="display: none;"></div>
                </div>
                <p class="form-error" id="passwordError" style="display: none;">Passwords do not match</p>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" id="cancelBtn">
              Cancel
            </button>
            <button type="submit" class="btn btn-primary" id="saveBtn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              Save Changes
            </button>
          </div>
        </form>
      </div>
    `;
  },

  // Initialize event listeners and handlers
  init: (currentUser, onProfileUpdate) => {
    // Profile image upload
    const profileImageInput = document.getElementById("profileImageInput");
    const profilePreview = document.getElementById("profilePreview");
    const uploadPhotoBtn = document.getElementById("uploadPhotoBtn");

    if (uploadPhotoBtn) {
      uploadPhotoBtn.addEventListener("click", (e) => {
        e.preventDefault();
        profileImageInput?.click();
      });
    }

    // Preview image on select
    if (profileImageInput) {
      profileImageInput.addEventListener("change", (e) => {
        const file = e.target.files?.[0];
        if (file && profilePreview) {
          const reader = new FileReader();
          reader.onload = (evt) => {
            profilePreview.src = evt.target?.result || "images/sample.jpg";
          };
          reader.readAsDataURL(file);
        }
      });
    }

    // Profile picture wrapper click
    const profileWrapper = document.querySelector(".profile-picture-wrapper");
    if (profileWrapper) {
      profileWrapper.addEventListener("click", () => {
        profileImageInput?.click();
      });
    }

    // Password validation
    const newPasswordInput = document.getElementById("newPassword");
    const confirmPasswordInput = document.getElementById("confirmPassword");
    const passwordValidation = document.getElementById("passwordValidation");
    const passwordError = document.getElementById("passwordError");

    const validatePasswords = () => {
      const newPwd = newPasswordInput?.value || "";
      const confirmPwd = confirmPasswordInput?.value || "";

      if (!confirmPwd) {
        if (passwordValidation) passwordValidation.style.display = "none";
        if (passwordError) passwordError.style.display = "none";
        return;
      }

      const match = newPwd === confirmPwd && newPwd !== "";
      if (passwordValidation) {
        passwordValidation.style.display = match ? "block" : "block";
        passwordValidation.className =
          "form-input-validation " + (match ? "success" : "error");
        if (match) {
          passwordValidation.innerHTML =
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>';
        } else {
          passwordValidation.innerHTML =
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
        }
      }
      if (passwordError) {
        passwordError.style.display = match ? "none" : "block";
      }
    };

    if (confirmPasswordInput) {
      confirmPasswordInput.addEventListener("input", validatePasswords);
    }
    if (newPasswordInput) {
      newPasswordInput.addEventListener("input", validatePasswords);
    }

    // Form submission
    const form = document.getElementById("profileSettingsForm");
    const saveBtn = document.getElementById("saveBtn");
    const cancelBtn = document.getElementById("cancelBtn");

    if (cancelBtn) {
      cancelBtn.addEventListener("click", (e) => {
        e.preventDefault();
        if (window.loadView) {
          window.loadView("records");
        }
      });
    }

    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const formData = new FormData(form);
        const password = formData.get("password");
        const confirmPassword = formData.get("confirm_password");

        // Validate password match
        if (password && password.trim() !== "") {
          if (password !== confirmPassword) {
            ProfileSettings.showAlert("Passwords do not match", "error");
            return;
          }
        } else {
          formData.delete("password");
        }
        formData.delete("confirm_password");

        // Disable submit button
        if (saveBtn) {
          saveBtn.disabled = true;
          saveBtn.innerHTML = '<span class="spinner"></span> Saving...';
        }

        try {
          const result = await AuthAPI.updateProfile(formData);
          if (result.success) {
            ProfileSettings.showAlert(
              "Profile updated successfully!",
              "success"
            );
            // Update current user via callback
            if (onProfileUpdate) {
              onProfileUpdate(result.user);
            }

            // Also proactively update the sidebar image (best-effort)
            try {
              const sidebarImage = document.getElementById("sidebarUserImage");
              if (sidebarImage && result.user) {
                (async () => {
                  let src =
                    result.user.avatar_url || result.user.image_path || "";
                  if (
                    src &&
                    !src.startsWith("http") &&
                    !src.startsWith("images/") &&
                    !src.startsWith("/TCC/public/")
                  ) {
                    // Request signed URL from backend
                    try {
                      src = await window.getAvatarUrl(
                        result.user.id,
                        result.user.image_path
                      );
                    } catch (e) {
                      console.error("Could not get avatar URL", e);
                      src = "images/sample.jpg";
                    }
                  } else if (src && src.startsWith("/TCC/public/")) {
                    src = src.replace("/TCC/public/", "");
                  }
                  if (!src) src = "images/sample.jpg";
                  sidebarImage.src = src;
                })();
              }
            } catch (e) {
              console.error("Sidebar update after profile save failed", e);
            }
          } else {
            ProfileSettings.showAlert(
              result.error || "Failed to update profile",
              "error"
            );
          }
        } catch (error) {
          ProfileSettings.showAlert(
            "An error occurred: " + error.message,
            "error"
          );
        } finally {
          if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML =
              '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Save Changes';
          }
        }
      });
    }

    // Initialize preview with current avatar
    (async () => {
      if (!profilePreview) return;
      try {
        if (currentUser?.avatar_url) {
          profilePreview.src = currentUser.avatar_url;
        } else if (currentUser?.image_path) {
          const imgPath = currentUser.image_path;
          if (
            imgPath &&
            !imgPath.startsWith("http") &&
            !imgPath.startsWith("images/") &&
            !imgPath.startsWith("/TCC/public/")
          ) {
            // Storage object - get signed URL
            const url = await getAvatarUrl(currentUser.id, imgPath);
            profilePreview.src = url || "images/sample.jpg";
          } else if (imgPath?.startsWith("/TCC/public/")) {
            profilePreview.src = imgPath.replace("/TCC/public/", "");
          } else {
            profilePreview.src = imgPath || "images/sample.jpg";
          }
        }
      } catch (err) {
        console.error("Error loading profile preview", err);
      }
    })();
  },

  // Show alert message
  showAlert: (message, type = "info") => {
    const container = document.getElementById("alertContainer");
    if (!container) return;

    const alertHTML = `
      <div class="alert alert-${type}">
        ${
          type === "success"
            ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>'
            : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>'
        }
        <span>${escapeHtml(message)}</span>
        <button type="button" class="alert-close">&times;</button>
      </div>
    `;

    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = alertHTML;
    const alert = tempDiv.firstElementChild;
    container.appendChild(alert);

    const closeBtn = alert?.querySelector(".alert-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        alert?.remove();
      });
    }

    // Auto-remove after 5 seconds
    setTimeout(() => {
      alert?.remove();
    }, 5000);
  },
};

// Utility function to escape HTML
function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
