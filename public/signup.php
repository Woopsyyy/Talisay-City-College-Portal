    <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="css/bootstrap.min.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css">
    <link rel="stylesheet" href="css/signup.css">
    <title>Create an Account</title>
</head>
<body>
    <div class="main-container">
        <div class="user-card-preview" id="userCardPreview">
            <div class="profile-circle">
                <div class="profile-image" id="cardImage"></div>
            </div>
            <h2 id="cardName">Your Name</h2>
        </div>

        <div class="signup-container">
            <h2 style="color: var(--color-ethereal) !important;">Create Your Account</h2>
        <form action="/TCC/BackEnd/auth/signup.php" method="POST" enctype="multipart/form-data">
                <div class="form-group">
                    <input type="text" id="name" class="form-control" name="name" placeholder="Full Name" required style="color: var(--color-ethereal) !important;">
                    <div class="field-feedback" id="nameFeedback" style="color:#f8d7da;margin-top:6px;display:none;font-size:0.9rem"></div>
                </div>
            
            <div class="form-group">
                <input type="text" id="username" class="form-control" name="username" placeholder="Username" required style="color: var(--color-ethereal) !important;">
                <div class="field-feedback" id="usernameFeedback" style="color:#f8d7da;margin-top:6px;display:none;font-size:0.9rem"></div>
            </div>
            
            <div class="form-group">
                <input type="password" id="password" class="form-control" name="password" placeholder="Password" required style="color: var(--color-ethereal) !important;">
                <div class="field-feedback" id="passwordFeedback" style="color:#f8d7da;margin-top:6px;display:none;font-size:0.9rem"></div>
            </div>
            
            <div class="file-input-wrapper">
                <label for="profileImage" class="file-input-label">Choose Profile Picture</label>
                <input type="file" id="profileImage" name="profileImage" accept="image/*" style="display: none;">
            </div>
            
            <button type="submit" class="submit-btn">Create Account</button>
        </form>
        
        <div class="login-link">
            <p>Already have an account? <a href="/TCC/public/index.html">Login here</a></p>
        </div>
    </div>

        <script>
        const nameInput = document.getElementById('name');
        const profileImage = document.getElementById('profileImage');
        const profileCircle = document.querySelector('.profile-circle');
        const cardImage = document.getElementById('cardImage');
        const cardName = document.getElementById('cardName');
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        const submitBtn = document.querySelector('.submit-btn');

        const usernameFeedback = document.getElementById('usernameFeedback');
        const nameFeedback = document.getElementById('nameFeedback');
        const passwordFeedback = document.getElementById('passwordFeedback');

        let usernameAvailable = false;
        let nameAvailable = false;

        // Debounce helper
        function debounce(fn, delay) {
            let t;
            return function(...args) {
                clearTimeout(t);
                t = setTimeout(() => fn.apply(this, args), delay);
            }
        }

    function setFieldFeedback(el, msg, ok) {
            // ok === null -> pending (spinner)
            // ok === true -> success (check)
            // ok === false -> error (cross)
            if (!msg) {
                el.style.display = 'none';
                el.innerHTML = '';
                el.classList.remove('ok', 'err', 'text-success', 'text-danger');
            } else {
                el.style.display = 'flex';
                el.style.alignItems = 'center';
                let iconHtml = '';
                if (ok === null) {
                    // Bootstrap small spinner
                    iconHtml = '<span class="icon"><div class="spinner-border spinner-border-sm text-light" role="status" aria-hidden="true"></div></span>';
                    el.classList.remove('ok', 'err', 'text-success', 'text-danger');
                } else if (ok === true) {
                    // bootstrap icon
                    iconHtml = '<span class="icon"><i class="bi bi-check-circle-fill text-success" aria-hidden="true"></i></span>';
                    el.classList.add('ok'); el.classList.remove('err');
                    el.classList.add('text-success'); el.classList.remove('text-danger');
                } else {
                    iconHtml = '<span class="icon"><i class="bi bi-x-circle-fill text-danger" aria-hidden="true"></i></span>';
                    el.classList.add('err'); el.classList.remove('ok');
                    el.classList.add('text-danger'); el.classList.remove('text-success');
                }
                el.innerHTML = iconHtml + '<span class="msg">' + msg + '</span>';
            }
        }

        // Update preview when name changes
        nameInput.addEventListener('input', function(e) {
            const value = e.target.value.trim();
            cardName.textContent = value || 'Your Name';
            if (value) {
                cardName.classList.add('visible');
            } else {
                cardName.classList.remove('visible');
            }
            checkNameAvailabilityDebounced(value);
        });

        // Preview image before upload
        profileImage.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const imageUrl = e.target.result;

                    // Update card preview
                    profileCircle.classList.add('has-image');
                    cardImage.style.backgroundImage = `url(${imageUrl})`;
                    cardImage.classList.add('visible');
                }
                reader.readAsDataURL(file);
            }
        });

        // Username availability check
        const checkUsernameAvailability = async (value) => {
            if (!value || value.length < 3) {
                usernameAvailable = false;
                setFieldFeedback(usernameFeedback, 'Username must be at least 3 characters and contain only letters, numbers, ., _, -', false);
                updateSubmitState();
                return;
            }
            // show spinner
            setFieldFeedback(usernameFeedback, 'Checking username...', null);
            const resp = await fetch('/TCC/BackEnd/auth/check_availability.php', {
                method: 'POST',
                headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                body: new URLSearchParams({type: 'username', value})
            });
            const data = await resp.json();
            if (data.success) {
                usernameAvailable = data.available;
                setFieldFeedback(usernameFeedback, data.available ? 'Username available' : 'Username already taken', data.available);
            } else {
                setFieldFeedback(usernameFeedback, 'Could not check username', false);
                usernameAvailable = false;
            }
            updateSubmitState();
        }

        const checkNameAvailability = async (value) => {
            if (!value || value.length < 2) {
                nameAvailable = false;
                setFieldFeedback(nameFeedback, 'Full name must be at least 2 characters', false);
                updateSubmitState();
                return;
            }
            setFieldFeedback(nameFeedback, 'Checking name...', null);
            const resp = await fetch('/TCC/BackEnd/auth/check_availability.php', {
                method: 'POST',
                headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                body: new URLSearchParams({type: 'full_name', value})
            });
            const data = await resp.json();
            if (data.success) {
                nameAvailable = data.available;
                setFieldFeedback(nameFeedback, data.available ? 'Name available' : 'Full name already in use', data.available);
            } else {
                setFieldFeedback(nameFeedback, 'Could not check full name', false);
                nameAvailable = false;
            }
            updateSubmitState();
        }

    const checkUsernameAvailabilityDebounced = debounce(checkUsernameAvailability, 450);
    const checkNameAvailabilityDebounced = debounce(checkNameAvailability, 450);

        // wire username input
        usernameInput.addEventListener('input', (e) => {
            checkUsernameAvailabilityDebounced(e.target.value.trim());
        });

        // wire name input
        nameInput.addEventListener('input', (e) => {
            checkNameAvailabilityDebounced(e.target.value.trim());
        });

        // Password strength check
        passwordInput.addEventListener('input', (e) => {
            const v = e.target.value;
            let msg = '';
            let ok = true;
            if (v.length < 8) { msg = 'Password must be at least 8 characters'; ok = false; }
            else if (!/[A-Z]/.test(v)) { msg = 'Include at least one uppercase letter'; ok = false; }
            else if (!/[a-z]/.test(v)) { msg = 'Include at least one lowercase letter'; ok = false; }
            else if (!/[0-9]/.test(v)) { msg = 'Include at least one digit'; ok = false; }
            setFieldFeedback(passwordFeedback, msg, ok);
            updateSubmitState();
        });

        function updateSubmitState() {
            // require availability and no password feedback errors
            const pw = passwordInput.value;
            const pwOk = pw.length >= 8 && /[A-Z]/.test(pw) && /[a-z]/.test(pw) && /[0-9]/.test(pw);
            if (usernameAvailable && nameAvailable && pwOk) {
                submitBtn.disabled = false;
            } else {
                submitBtn.disabled = true;
            }
        }

        // Initialize submit state
        submitBtn.disabled = true;

        // Show error messages from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get("error") === "usernametaken") {
            const errorDiv = document.createElement("div");
            errorDiv.className = "alert alert-danger mb-3";
            errorDiv.textContent = "Username already taken. Please choose a different username.";
            document.querySelector(".signup-container").prepend(errorDiv);
        } else if (urlParams.get("error") === "nametaken") {
            const errorDiv = document.createElement("div");
            errorDiv.className = "alert alert-danger mb-3";
            errorDiv.textContent = "Full name already exists. Please use a different name.";
            document.querySelector(".signup-container").prepend(errorDiv);
        } else if (urlParams.get("error") === "duplicate") {
            const errorDiv = document.createElement("div");
            errorDiv.className = "alert alert-danger mb-3";
            errorDiv.textContent = "Username or full name already exists. Please choose different values.";
            document.querySelector(".signup-container").prepend(errorDiv);
        } else if (urlParams.get("error") === "dberror") {
            const errorDiv = document.createElement("div");
            errorDiv.className = "alert alert-danger mb-3";
            errorDiv.textContent = "Database error occurred. Please try again.";
            document.querySelector(".signup-container").prepend(errorDiv);
        } else if (urlParams.get("error") === "weakpassword") {
            const errorDiv = document.createElement("div");
            errorDiv.className = "alert alert-danger mb-3";
            errorDiv.textContent = "Password does not meet the required strength.";
            document.querySelector(".signup-container").prepend(errorDiv);
        } else if (urlParams.get("error") === "invalidusername") {
            const errorDiv = document.createElement("div");
            errorDiv.className = "alert alert-danger mb-3";
            errorDiv.textContent = "Username contains invalid characters or length.";
            document.querySelector(".signup-container").prepend(errorDiv);
        } else if (urlParams.get("error") === "invalidname") {
            const errorDiv = document.createElement("div");
            errorDiv.className = "alert alert-danger mb-3";
            errorDiv.textContent = "Full name is invalid or too short.";
            document.querySelector(".signup-container").prepend(errorDiv);
        } else if (urlParams.get("error") === "missing") {
            const errorDiv = document.createElement("div");
            errorDiv.className = "alert alert-danger mb-3";
            errorDiv.textContent = "Please fill out all required fields.";
            document.querySelector(".signup-container").prepend(errorDiv);
        }
    </script>
</body>
</html>