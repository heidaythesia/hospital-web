const API_BASE_URL = 'https://uninstall-palpitate-reprint.ngrok-free.dev/api';

const api = {
    login: async (email, password) => {
        const res = await fetch(`${API_BASE_URL}/Auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || err.title || 'Invalid credentials');
        }
        return await res.json();
    },
    bookAppointment: async (doctorId, date) => {
        const res = await fetch(`${API_BASE_URL}/Patient/book`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${auth.getToken()}`
            },
            body: JSON.stringify({ doctorId: parseInt(doctorId), appointmentDate: date })
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || err.title || 'Failed to book appointment');
        }
        return await res.json();
    },
    getDoctors: async () => {
        const res = await fetch(`${API_BASE_URL}/Patient/doctors`);
        if (!res.ok) throw new Error('Failed to fetch doctors');
        return await res.json();
    },
    getDoctorAppointments: async () => {
        const res = await fetch(`${API_BASE_URL}/Doctor/appointments`, {
            headers: { 'Authorization': `Bearer ${auth.getToken()}` }
        });
        if (!res.ok) throw new Error('Unauthorized');
        return await res.json();
    },
    getPatientPrescriptions: async () => {
        const res = await fetch(`${API_BASE_URL}/Prescription/my-prescriptions`, {
            headers: { 'Authorization': `Bearer ${auth.getToken()}` }
        });
        if (!res.ok) throw new Error('Unauthorized');
        return await res.json();
    },
    issuePrescription: async (payload) => {
        const res = await fetch(`${API_BASE_URL}/Prescription/issue`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${auth.getToken()}`
            },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Failed to issue prescription');
        return await res.json();
    }
};
