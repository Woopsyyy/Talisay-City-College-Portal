<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="stylesheet" href="css/bootstrap.min.css" />
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" />
    <link rel="stylesheet" href="css/login.css" />
    <title>Forgot Password - Talisay City College</title>
  </head>

  <body>
    <img src="images/background.jpg" alt="Logo" class="logo" />
    <div class="login-card">
      <h2 class="mb-4">Talisay City College</h2>
      <h3 class="mb-3">Forgot Password</h3>
      <p class="text-muted mb-4">Enter your username to generate a new password</p>
      
      <?php if (isset($_GET['error'])): ?>
        <div class="alert alert-danger mb-3" id="error-message">
          <?php 
            if ($_GET['error'] === 'notfound'): 
              echo 'Username not found. Please check and try again.';
            elseif ($_GET['error'] === 'missing'):
              echo 'Please enter your username.';
            else:
              echo 'An error occurred. Please try again.';
            endif;
          ?>
        </div>
      <?php endif; ?>
      
      <form
        method="POST"
        action="/TCC/BackEnd/auth/reset_password.php"
        class="w-100"
      >
        <div class="form-group mb-3">
          <label for="username" class="form-label <?php if (isset($_GET['success'])): ?>text-center<?php endif; ?>">
            <?php if (isset($_GET['success'])): ?>
              Your New Password
            <?php else: ?>
              Username
            <?php endif; ?>
          </label>
          <?php if (isset($_GET['success'])): ?>
            <div 
              id="newPassword" 
              class="form-control password-display-clickable password-centered" 
              onclick="copyPassword()"
              title="Click to copy password"
            >
              <?php echo htmlspecialchars($_GET['password'] ?? ''); ?>
            </div>
            <small class="text-muted d-block mt-2 text-center">
              <i class="bi bi-cursor"></i> Click the password to copy it
            </small>
          <?php else: ?>
            <input
              type="text"
              class="form-control"
              id="username"
              name="username"
              placeholder="Enter your username"
              required
              autofocus
            />
          <?php endif; ?>
        </div>
        <?php if (isset($_GET['success'])): ?>
          <a href="index.html" class="btn btn-primary w-100 mb-3">
            <i class="bi bi-box-arrow-in-right"></i> Go to Login
          </a>
        <?php else: ?>
          <button type="submit" class="btn btn-primary w-100 mb-3">
            <i class="bi bi-key"></i> Generate New Password
          </button>
        <?php endif; ?>
      </form>
    </div>
    <script src="js/bootstrap.bundle.min.js"></script>
    <script>
      function copyPassword() {
        const passwordElement = document.getElementById('newPassword');
        const passwordText = passwordElement.textContent.trim();
        
        // Try modern clipboard API first
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(passwordText).then(function() {
            showCopyFeedback(passwordElement);
          }).catch(function(err) {
            fallbackCopy(passwordText, passwordElement);
          });
        } else {
          // Fallback for browsers that don't support clipboard API
          fallbackCopy(passwordText, passwordElement);
        }
      }
      
      function fallbackCopy(text, element) {
        // Create a temporary textarea element
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-999999px';
        textarea.style.top = '-999999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        
        try {
          const successful = document.execCommand('copy');
          if (successful) {
            showCopyFeedback(element);
          } else {
            alert('Please select and copy the password manually: ' + text);
          }
        } catch (err) {
          alert('Please select and copy the password manually: ' + text);
        } finally {
          document.body.removeChild(textarea);
        }
      }
      
      function showCopyFeedback(element) {
        const originalText = element.textContent;
        const originalBg = element.style.backgroundColor;
        element.textContent = 'Copied!';
        element.style.backgroundColor = 'rgba(40, 167, 69, 0.2)';
        element.style.color = '#28a745';
        
        setTimeout(function() {
          element.textContent = originalText;
          element.style.backgroundColor = originalBg;
          element.style.color = '';
        }, 2000);
      }
    </script>
  </body>
</html>

