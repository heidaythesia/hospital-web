document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    const messageDiv = document.getElementById('message');
    const regBtn = document.getElementById('regBtn');

    // ✅ Use your ngrok backend URL
    const API_URL = `https://uninstall-palpitate-reprint.ngrok-free.dev/api/Auth/register`;

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Prepare UI state
        const password = document.getElementById('password').value;
        
        // 🔥 VALIDATION: Password must be at least 6 characters
        if (password.length < 6) {
            messageDiv.textContent = '❌ Password must be at least 6 digits or characters long.';
            messageDiv.className = 'msg-error';
            messageDiv.style.display = 'block';
            regBtn.innerHTML = 'Create Account';
            regBtn.disabled = false;
            document.getElementById('password').style.borderColor = '#ef4444';
            return; // Stop here
        } else {
            document.getElementById('password').style.borderColor = '#e2e8f0';
        }

        // Collect form data
        const payload = {
            userName: document.getElementById('userName').value.trim(),
            email: document.getElementById('email').value.trim(),
            password: password,
            roleId: 3, // Enforced as Patient
            firstName: document.getElementById('firstName').value.trim(),
            lastName: document.getElementById('lastName').value.trim(),
            DOB: document.getElementById('dateOfBirth').value, // 🔥 Fixed: Backend expects 'DOB'
            gender: document.getElementById('gender').value
        };

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Registration failed. Please try again.');
            }

            // Success!
            messageDiv.textContent = 'Registration successful! Redirecting to login...';
            messageDiv.className = 'msg-success';
            messageDiv.style.display = 'block';

            // Wait 2 seconds then redirect to login
            setTimeout(() => {
                window.location.href = 'login.html?role=patient';
            }, 2000);

        } catch (error) {
            console.error('Registration Error:', error);
            messageDiv.textContent = error.message;
            messageDiv.className = 'msg-error';
            messageDiv.style.display = 'block';
        } finally {
            regBtn.innerHTML = 'Create Account';
            regBtn.disabled = false;
        }
    });
});
