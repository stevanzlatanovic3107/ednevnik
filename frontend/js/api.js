// ===== API KONSTANTE =====
const API_URL = '/api';

// ===== API FUNKCIJE =====
const API = {
  // Dohvati token iz localStorage
  getToken() {
    return localStorage.getItem('token');
  },

  // Dohvati korisnika iz localStorage
  getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  // Generiši headers sa tokenom
  getHeaders() {
    const token = this.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  },

  // ===== NASTAVNICI =====
  async getNastavnici(skolaId) {
    const res = await fetch(`${API_URL}/nastavnici/${skolaId}`, {
      headers: this.getHeaders()
    });
    return res.json();
  },

  async addNastavnik(data) {
    const res = await fetch(`${API_URL}/nastavnici`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // ===== PREDMETI =====
  async getPredmeti(skolaId) {
    const res = await fetch(`${API_URL}/predmeti/${skolaId}`, {
      headers: this.getHeaders()
    });
    return res.json();
  },

  async addPredmet(data) {
    const res = await fetch(`${API_URL}/predmeti`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // ===== RAZREDI =====
  async getRazredi(skolaId) {
    const res = await fetch(`${API_URL}/razredi/${skolaId}`, {
      headers: this.getHeaders()
    });
    return res.json();
  },

  async addRazred(data) {
    const res = await fetch(`${API_URL}/razredi`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // ===== UČENICI =====
  async getUcenici(skolaId, razredId = null) {
    let url = `${API_URL}/ucenici/${skolaId}`;
    if (razredId) url += `?razredId=${razredId}`;
    const res = await fetch(url, { headers: this.getHeaders() });
    return res.json();
  },

  async addUcenik(data) {
    const res = await fetch(`${API_URL}/ucenici`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // ===== RASPORED (razred-predmeti) =====
  async getRazredPredmeti(razredId) {
    const res = await fetch(`${API_URL}/razred-predmeti/${razredId}`, {
      headers: this.getHeaders()
    });
    return res.json();
  },

  async addRazredPredmet(data) {
    const res = await fetch(`${API_URL}/razred-predmeti`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // ===== OCENE =====
  async getOceneUcenika(ucenikId) {
    const res = await fetch(`${API_URL}/ocene/ucenik/${ucenikId}`, {
      headers: this.getHeaders()
    });
    return res.json();
  },

  async addOcena(data) {
    const res = await fetch(`${API_URL}/ocene`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // ===== IZOSTANCI =====
  async getIzostanciUcenika(ucenikId) {
    const res = await fetch(`${API_URL}/izostanci/ucenik/${ucenikId}`, {
      headers: this.getHeaders()
    });
    return res.json();
  },

  async addIzostanak(data) {
    const res = await fetch(`${API_URL}/izostanci`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  }
};
