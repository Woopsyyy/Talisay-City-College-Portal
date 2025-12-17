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
                <label class="form-label">Gmail (Google-linked)</label>
                <div class="form-input-wrapper">
                  <button type="button" id="googleLinkBtn" class="icon-btn" title="${
                    user?.google_linked
                      ? "Connected to Google"
                      : "Connect your Google account"
                  }">
                    <!-- Google icon -->
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21.35 11.1h-9.2v2.84h5.26c-.23 1.33-1.13 2.46-2.4 3.17v2.64h3.88c2.27-2.09 3.58-5.17 3.58-8.65 0-.6-.05-1.18-.17-1.74z"></path>
                      <path d="M12.15 21.99c2.67 0 4.9-.88 6.53-2.4l-3.88-2.64c-1.08.73-2.47 1.16-3.99 1.16-3.06 0-5.65-2.06-6.58-4.83H1.45v3.03c1.66 3.3 5.08 5.68 9.2 5.68z"></path>
                      <path d="M5.57 13.07a6.01 6.01 0 010-3.98V6.06H1.45a10.96 10.96 0 000 11.88l4.12-3.03z"></path>
                      <path d="M12.15 4.84c1.44 0 2.73.5 3.76 1.48l2.82-2.82C16.98 2.03 14.65 1 12.15 1 8.03 1 4.61 3.39 2.95 6.69l4.12 3.03c.93-2.77 3.52-4.88 5.08-4.88z"></path>
                    </svg>
                  </button>
                  <span id="googleLinkStatus" class="google-status">${
                    user?.google_linked ? "Connected" : "Not connected"
                  }</span>
                </div>
                <p class="form-hint">Click the Google icon to link your Gmail for password resets.</p>
              </div>
              <div class="form-field">
                <label class="form-label" for="profilePassword">New Password</label>
                <div class="form-input-wrapper">
                  <svg class="form-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 17a2 2 0 0 0 2-2v-3a4 4 0 1 0-8 0v3a2 2 0 0 0 2 2h4z"></path>
                    <path d="M8 11a4 4 0 0 1 8 0v3"></path>
                  </svg>
                  <input type="password" id="profilePassword" name="password" class="form-input" placeholder="Enter new password (leave blank to keep current)" />
                </div>
                <p class="form-hint">Leave empty to keep your current password.</p>
              </div>
              <div class="form-field">
                <label class="form-label" for="profileConfirmPassword">Confirm New Password</label>
                <div class="form-input-wrapper">
                  <svg class="form-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 6L9 17l-5-5"></path>
                  </svg>
                  <input type="password" id="profileConfirmPassword" class="form-input" placeholder="Confirm new password" />
                </div>
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

        // Validate password confirmation client-side if provided
        const passwordEl = document.getElementById("profilePassword");
        const confirmEl = document.getElementById("profileConfirmPassword");
        const password = passwordEl?.value || "";
        const confirm = confirmEl?.value || "";

        if (password || confirm) {
          if (password !== confirm) {
            ProfileSettings.showAlert("Passwords do not match", "error");
            return;
          }
          if (password.length > 0 && password.length < 8) {
            ProfileSettings.showAlert(
              "Password must be at least 8 characters",
              "error"
            );
            return;
          }
        }

        const formData = new FormData(form);

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
            // Clear password fields after successful update
            try {
              if (passwordEl) passwordEl.value = "";
              if (confirmEl) confirmEl.value = "";
            } catch (e) {
              // ignore
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

        // Google link button behavior (open OAuth in popup and refresh session)
        const googleBtn = document.getElementById("googleLinkBtn");
        const googleStatus = document.getElementById("googleLinkStatus");
        if (googleBtn) {
          googleBtn.addEventListener("click", (e) => {
            e.preventDefault();
            const popup = window.open(
              "/api/auth/google",
              "google_oauth",
              "width=600,height=700"
            );
            if (!popup) {
              ProfileSettings.showAlert(
                "Popup blocked. Please allow popups for this site.",
                "error"
              );
              return;
            }

            const poll = setInterval(async () => {
              try {
                if (popup.closed) {
                  clearInterval(poll);
                  try {
                    const session = await AuthAPI.checkSession();
                    if (session && session.user) {
                      const linked = !!session.user.google_linked;
                      if (googleStatus)
                        googleStatus.textContent = linked
                          ? "Connected"
                          : "Not connected";
                      if (onProfileUpdate) onProfileUpdate(session.user);
                      ProfileSettings.showAlert(
                        linked
                          ? "Google account linked."
                          : "Google account not linked.",
                        "success"
                      );
                    }
                  } catch (err) {
                    console.error("Error refreshing session after OAuth", err);
                    ProfileSettings.showAlert(
                      "Could not verify link status.",
                      "error"
                    );
                  }
                }
              } catch (err) {
                clearInterval(poll);
                console.error("OAuth popup monitor error", err);
              }
            }, 500);
          });
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
