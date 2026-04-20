const auth = {
    setSession: (token, roleId) => {
        localStorage.setItem('hospital_jwt', token);
        localStorage.setItem('hospital_role', roleId);
    },
    getToken: () => localStorage.getItem('hospital_jwt'),
    getRole: () => localStorage.getItem('hospital_role'),
    isLoggedIn: () => !!localStorage.getItem('hospital_jwt'),
    logout: () => {
        localStorage.removeItem('hospital_jwt');
        localStorage.removeItem('hospital_role');
        window.location.href = 'login.html';
    }
};
