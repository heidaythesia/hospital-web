document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const errorMessage = document.getElementById('errorMessage');
    const loginBtn = document.getElementById('loginBtn');

    // ✅ Get the intended role from the URL (staff or patient)
    const urlParams = new URLSearchParams(window.location.search);
    const intendedRole = urlParams.get('role'); // 'staff' or 'patient'

    // ✅ Use the ngrok backend URL
    const API_URL = `https://uninstall-palpitate-reprint.ngrok-free.dev/api/Auth/login`;

    function isEmailValid(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()); }
    function isRequired(value) { return value !== null && value !== undefined && String(value).trim().length > 0; }
    
    function showFieldError(el, msg) {
        clearFieldError(el);
        el.classList.add('input-error');
        const span = document.createElement('span');
        span.className = 'field-error-msg';
        span.textContent = msg;
        el.insertAdjacentElement('afterend', span);
    }

    function clearFieldError(el) {
        el.classList.remove('input-error');
        const s = el.nextElementSibling;
        if (s && s.classList.contains('field-error-msg')) s.remove();
    }

    emailInput.addEventListener('input', () => clearFieldError(emailInput));
    passwordInput.addEventListener('input', () => clearFieldError(passwordInput));

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        let ok = true;
        clearFieldError(emailInput); clearFieldError(passwordInput);
        if (!isEmailValid(emailInput.value)) { showFieldError(emailInput, 'Please enter a valid email address.'); ok = false; }
        if (!isRequired(passwordInput.value))    { showFieldError(passwordInput,  'Password cannot be empty.'); ok = false; }
        if (!ok) return;

        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Authenticating...';
        loginBtn.disabled = true;
        errorMessage.style.display = 'none';

        const payload = {
            email: emailInput.value.trim(),
            password: passwordInput.value
        };

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error('Invalid credentials');
            }

            const data = await response.json();
            
            const token = data.token;
            const roleId = data.roleId; // 1=Admin, 2=Doctor, 3=Patient
            
            // 🔥 ROLE-BASED RESTRICTION (Security Check)
            if (intendedRole === 'staff' && roleId === 3) {
                throw new Error('Access Denied: Patients cannot log in through the Staff portal.');
            }
            if (intendedRole === 'patient' && (roleId === 1 || roleId === 2)) {
                throw new Error('Access Denied: Staff members must use the Staff Login portal.');
            }

            // Save session
            localStorage.setItem('hospital_jwt', token);
            localStorage.setItem('hospital_role', roleId);
            
            // Redirect based on role
            if (roleId === 3) {
                window.location.href = 'admin.html'; // Patient Dashboard
            } else {
                window.location.href = 'admin.html'; // Admin/Doc Dashboard (logic handles it there)
            }

        } catch (error) {
            console.error('Login Error:', error);
            errorMessage.textContent = error.message || 'Invalid email or password.';
            errorMessage.style.display = 'block';
        } finally {
            loginBtn.innerHTML = 'Sign In';
            loginBtn.disabled = false;
        }
    });
});
