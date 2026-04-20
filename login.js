document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const errorMessage = document.getElementById('errorMessage');
    const loginBtn = document.getElementById('loginBtn');

    const IS_PROD = false; // Toggle to true before deploying to Vercel/Netlify
    const API_BASE = IS_PROD ? 'https://nexushealth-api.azurewebsites.net' : 'http://localhost:5034';
    const API_URL = `${API_BASE}/api/Auth/login`;

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

        // UI Loading State - adding spinner makes it psychologically feel faster
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
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error('Invalid credentials');
            }

            const data = await response.json();
            
            // Extract token and role from the response
            const token = data.token;
            const roleId = data.roleId;
            
            // Save to localStorage so admin.html can use it!
            localStorage.setItem('hospital_jwt', token);
            localStorage.setItem('hospital_role', roleId);
            
            // Redirect to the Dashboard
            window.location.href = 'admin.html';

        } catch (error) {
            console.error('Login Error:', error);
            errorMessage.textContent = 'Invalid email or password. Please try again.';
            errorMessage.style.display = 'block';
        } finally {
            loginBtn.innerHTML = 'Sign In';
            loginBtn.disabled = false;
        }
    });
});
