// ===== AUTH HELPER =====
const Auth = {
  getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  getToken() {
    return localStorage.getItem('token');
  },

  isLoggedIn() {
    return !!this.getToken();
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
  },

  requireRole(roles) {
    const user = this.getUser();
    if (!user || !roles.includes(user.uloga)) {
      window.location.href = 'login.html';
      return false;
    }
    return true;
  }
};