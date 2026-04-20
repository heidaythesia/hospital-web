const ui = {
    updateNavbar: () => {
        if (auth.isLoggedIn()) {
            // Replace the entire top-bar quick-links to remove duplicates
            const quickLinks = document.querySelector('.quick-links');
            if (quickLinks) {
                quickLinks.innerHTML = `
                    <a href="admin.html"><i class="fas fa-columns"></i> Dashboard</a>
                    <a href="#" id="logoutBtn" onclick="event.preventDefault(); auth.logout();"><i class="fas fa-sign-out-alt"></i> Logout</a>
                `;
            }

            // Adjust header buttons & hero buttons
            const primaryBtns = document.querySelectorAll('.header-actions .btn-primary, .hero-buttons .btn-primary');
            primaryBtns.forEach(btn => {
                if (auth.getRole() === "3") { // Patient
                    btn.textContent = 'Book Appointment';
                    btn.onclick = (e) => { e.preventDefault(); ui.openBookingModal(); };
                } else {
                    btn.textContent = 'My Dashboard';
                    btn.href = 'admin.html';
                    btn.onclick = null;
                }
            });

            // Hide the lower "Login to Patient Portal" CTA section if already logged in
            const portalCta = document.querySelector('.portal-cta');
            if (portalCta) {
                portalCta.style.display = 'none';
            }
        } else {
            // Not logged in, force primary buttons to go to login
            document.querySelectorAll('.header-actions .btn-primary, .hero-buttons .btn-primary').forEach(btn => {
                btn.onclick = (e) => { e.preventDefault(); window.location.href = 'login.html'; };
            });

            // Ensure CTA is visible if logged out
            const portalCta = document.querySelector('.portal-cta');
            if (portalCta) {
                portalCta.style.display = '';
            }
        }
    },
    openBookingModal: async () => {
        const modal = document.getElementById('bookingModal');
        if (modal) modal.style.display = 'flex';

        // Dynamically load doctors!
        try {
            const doctors = await api.getDoctors();
            const select = document.getElementById('doctorId');
            if (select) {
                select.innerHTML = '<option value="" disabled selected>Select a Doctor...</option>';
                doctors.forEach(doc => {
                    const option = document.createElement('option');
                    option.value = doc.doctorID;
                    option.textContent = `${doc.doctorName} (${doc.specialization})`;
                    select.appendChild(option);
                });
            }
        } catch (e) {
            console.error("Could not load doctors", e);
        }
    },
    closeBookingModal: () => {
        const modal = document.getElementById('bookingModal');
        if (modal) modal.style.display = 'none';
    },
    handleBookingSubmit: async (e) => {
        e.preventDefault();
        const doctorId = document.getElementById('doctorId').value;
        const apptDate = document.getElementById('appointmentDate').value;
        const btn = e.target.querySelector('button[type="submit"]');

        btn.textContent = 'Booking...';
        btn.disabled = true;

        try {
            await api.bookAppointment(doctorId, apptDate);
            alert('Appointment booked successfully! See you soon.');
            ui.closeBookingModal();
            window.location.href = 'admin.html'; // redirect to dashboard to see it
        } catch (error) {
            alert(error.message);
        } finally {
            btn.textContent = 'Confirm Booking';
            btn.disabled = false;
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    ui.updateNavbar();
    document.getElementById('bookingForm')?.addEventListener('submit', ui.handleBookingSubmit);
});
