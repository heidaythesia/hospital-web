document.addEventListener('DOMContentLoaded', () => {
    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            
            // Handle Home link (empty hash)
            if (targetId === '#') {
                e.preventDefault();
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
                return;
            }
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                e.preventDefault();
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Header sticky effect on scroll
    const header = document.querySelector('.header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.style.boxShadow = '0 4px 10px rgba(0,0,0,0.1)';
        } else {
            header.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
        }
    });

    // Simple animation for service cards on scroll
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.service-card').forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'all 0.5s ease-out';
        observer.observe(card);
    });

    // Run Auth UI Update
    updateAuthUI();
});

// Authentication UI Logic
function updateAuthUI() {
    const token = localStorage.getItem('hospital_jwt');
    const roleId = localStorage.getItem('hospital_role');
    const topbarLinks = document.getElementById('topbarLinks');
    const headerActions = document.getElementById('headerActions');
    
    if (token && roleId) {
        let dashboardName = "Dashboard";
        if (roleId === "1") dashboardName = "Admin Dashboard";
        if (roleId === "2") dashboardName = "Doctor Portal";
        if (roleId === "3") dashboardName = "Patient Portal";
        
        if (topbarLinks) {
            topbarLinks.innerHTML = `
                <a href="admin.html"><i class="fas fa-columns"></i> ${dashboardName}</a>
                <a href="#" onclick="logout(event)"><i class="fas fa-sign-out-alt"></i> Logout</a>
            `;
        }
    }
}

window.logout = function(e) {
    if(e) e.preventDefault();
    localStorage.clear();
    window.location.href = 'login.html';
};

window.handleError = async function(response) {
    if (response.status === 401 || response.status === 403) {
        localStorage.clear();
        window.location.href = 'login.html';
        return 'Session expired. Please log in again.';
    }
    
    if (response.status === 400) {
        try {
            const err = await response.json();
            return err.error || err.message || 'Validation failed. Please check your inputs.';
        } catch {
            return 'Invalid request parameters.';
        }
    }
    
    if (response.status >= 500) {
        return 'Internal Server Error. Please try again later.';
    }
    
    return 'An unexpected error occurred.';
};

window.handleBookAppointment = function() {
    const token = localStorage.getItem('hospital_jwt');
    const roleId = localStorage.getItem('hospital_role');
    
    if (!token) {
        window.location.href = 'login.html';
    } else if (roleId === "3") {
        window.location.href = 'admin.html'; // Patient Dashboard where they can book
    } else {
        alert("Only patients can book appointments. Please login as a patient.");
    }
};
