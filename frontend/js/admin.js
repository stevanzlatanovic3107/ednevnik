// ===== ADMIN DASHBOARD =====
const user = API.getUser();
let skolaId = user?.skolaId;

// Provera da li je admin
if (!user || user.uloga !== 'admin_skole') {
  window.location.href = 'login.html';
}

// ===== DOM ELEMENTI =====
let nastavniciData = [];
let predmetiData = [];
let razrediData = [];
let uceniciData = [];

// ===== INICIJALIZACIJA =====
document.addEventListener('DOMContentLoaded', () => {
  // Postavi ime korisnika
  document.getElementById('userName').innerText = `${user.ime} ${user.prezime}`;
  document.getElementById('userRole').innerText = 'Direktor';

  // Učitaj podatke
  loadNastavnici();
  loadPredmeti();
  loadRazredi();
  loadUcenici();

  // Event listeneri za dugmad
  document.getElementById('showNastavnici').addEventListener('click', () => showSection('nastavnici'));
  document.getElementById('showPredmeti').addEventListener('click', () => showSection('predmeti'));
  document.getElementById('showRazredi').addEventListener('click', () => showSection('razredi'));
  document.getElementById('showUcenici').addEventListener('click', () => showSection('ucenici'));

  document.getElementById('addNastavnikBtn').addEventListener('click', () => openModal('nastavnikModal'));
  document.getElementById('addPredmetBtn').addEventListener('click', () => openModal('predmetModal'));
  document.getElementById('addRazredBtn').addEventListener('click', () => openModal('razredModal'));
  document.getElementById('addUcenikBtn').addEventListener('click', () => openModal('ucenikModal'));

  document.getElementById('saveNastavnik').addEventListener('click', saveNastavnik);
  document.getElementById('savePredmet').addEventListener('click', savePredmet);
  document.getElementById('saveRazred').addEventListener('click', saveRazred);
  document.getElementById('saveUcenik').addEventListener('click', saveUcenik);

  document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
  });
});

// ===== PRIKAZ SEKCIJA =====
function showSection(section) {
  document.querySelectorAll('.page-section').forEach(s => s.classList.add('hidden'));
  document.getElementById(`${section}Section`).classList.remove('hidden');
}

function openModal(modalId) {
  document.getElementById(modalId).classList.add('open');
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('open');
}

// ===== NASTAVNICI =====
async function loadNastavnici() {
  try {
    nastavniciData = await API.getNastavnici(skolaId);
    renderNastavnici();
  } catch (err) {
    showError('Greška pri učitavanju nastavnika');
  }
}

function renderNastavnici() {
  const tbody = document.getElementById('nastavniciTable');
  if (!nastavniciData.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">Nema nastavnika</td></tr>';
    return;
  }
  tbody.innerHTML = nastavniciData.map(n => `
    <tr>
      <td>${n.ime}</td>
      <td>${n.prezime}</td>
      <td>${n.jmbg}</td>
      <td>${n.email || '-'}</td>
      <td>${n.telefon || '-'}</td>
    </tr>
  `).join('');
}

async function saveNastavnik() {
  const data = {
    skolaId,
    ime: document.getElementById('nastavnikIme').value,
    prezime: document.getElementById('nastavnikPrezime').value,
    jmbg: document.getElementById('nastavnikJmbg').value,
    email: document.getElementById('nastavnikEmail').value,
    telefon: document.getElementById('nastavnikTelefon').value
  };

  if (!data.ime || !data.prezime || !data.jmbg) {
    alert('Popunite obavezna polja');
    return;
  }
  if (!/^\d{13}$/.test(data.jmbg)) {
    alert('JMBG mora imati 13 cifara');
    return;
  }

  const result = await API.addNastavnik(data);
  if (result.id) {
    closeModal('nastavnikModal');
    document.getElementById('nastavnikIme').value = '';
    document.getElementById('nastavnikPrezime').value = '';
    document.getElementById('nastavnikJmbg').value = '';
    document.getElementById('nastavnikEmail').value = '';
    document.getElementById('nastavnikTelefon').value = '';
    loadNastavnici();
    showToast('Nastavnik dodat', 'success');
  } else {
    alert(result.error || 'Greška');
  }
}

// ===== PREDMETI =====
async function loadPredmeti() {
  try {
    predmetiData = await API.getPredmeti(skolaId);
    renderPredmeti();
  } catch (err) {
    showError('Greška pri učitavanju predmeta');
  }
}

function renderPredmeti() {
  const tbody = document.getElementById('predmetiTable');
  if (!predmetiData.length) {
    tbody.innerHTML = '<tr><td colspan="3" class="text-center">Nema predmeta</td></tr>';
    return;
  }
  tbody.innerHTML = predmetiData.map(p => `
    <tr>
      <td>${p.naziv}</td>
      <td>${p.opis || '-'}</td>
      <td>${p.id}</td>
    </tr>
  `).join('');
}

async function savePredmet() {
  const data = {
    skolaId,
    naziv: document.getElementById('predmetNaziv').value,
    opis: document.getElementById('predmetOpis').value
  };

  if (!data.naziv) {
    alert('Unesite naziv predmeta');
    return;
  }

  const result = await API.addPredmet(data);
  if (result.id) {
    closeModal('predmetModal');
    document.getElementById('predmetNaziv').value = '';
    document.getElementById('predmetOpis').value = '';
    loadPredmeti();
    showToast('Predmet dodat', 'success');
  } else {
    alert(result.error || 'Greška');
  }
}

// ===== RAZREDI =====
async function loadRazredi() {
  try {
    razrediData = await API.getRazredi(skolaId);
    renderRazredi();
    populateRazredSelect();
  } catch (err) {
    showError('Greška pri učitavanju razreda');
  }
}

function renderRazredi() {
  const tbody = document.getElementById('razrediTable');
  if (!razrediData.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center">Nema odeljenja</td></tr>';
    return;
  }
  tbody.innerHTML = razrediData.map(r => `
    <tr>
      <td>${r.naziv}</td>
      <td>${r.staresinaIme || '-'} ${r.staresinaPrezime || ''}</td>
      <td>${r.skolskaGodina || '2024/25'}</td>
      <td><button class="btn-secondary btn-sm" onclick="showRaspored('${r.id}')">Raspored</button></td>
    </tr>
  `).join('');
}

function populateRazredSelect() {
  const select = document.getElementById('ucenikRazred');
  select.innerHTML = '<option value="">Izaberite odeljenje</option>' +
    razrediData.map(r => `<option value="${r.id}">${r.naziv}</option>`).join('');
}

async function saveRazred() {
  const data = {
    skolaId,
    naziv: document.getElementById('razredNaziv').value,
    razredniStaresinaId: document.getElementById('razredStaresina').value || null,
    skolskaGodina: document.getElementById('razredGodina').value
  };

  if (!data.naziv) {
    alert('Unesite naziv odeljenja');
    return;
  }

  const result = await API.addRazred(data);
  if (result.id) {
    closeModal('razredModal');
    document.getElementById('razredNaziv').value = '';
    document.getElementById('razredStaresina').value = '';
    loadRazredi();
    showToast('Odeljenje dodato', 'success');
  } else {
    alert(result.error || 'Greška');
  }
}

// ===== UČENICI =====
async function loadUcenici() {
  try {
    uceniciData = await API.getUcenici(skolaId);
    renderUcenici();
  } catch (err) {
    showError('Greška pri učitavanju učenika');
  }
}

function renderUcenici() {
  const tbody = document.getElementById('uceniciTable');
  if (!uceniciData.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">Nema učenika</td></tr>';
    return;
  }
  tbody.innerHTML = uceniciData.map(u => `
    <tr>
      <td>${u.ime}</td>
      <td>${u.prezime}</td>
      <td>${u.jmbg}</td>
      <td>${u.datumRodjenja || '-'}</td>
      <td>${razrediData.find(r => r.id === u.razredId)?.naziv || '-'}</td>
    </tr>
  `).join('');
}

async function saveUcenik() {
  const data = {
    skolaId,
    ime: document.getElementById('ucenikIme').value,
    prezime: document.getElementById('ucenikPrezime').value,
    jmbg: document.getElementById('ucenikJmbg').value,
    datumRodjenja: document.getElementById('ucenikDatum').value,
    razredId: document.getElementById('ucenikRazred').value || null
  };

  if (!data.ime || !data.prezime || !data.jmbg) {
    alert('Popunite obavezna polja');
    return;
  }
  if (!/^\d{13}$/.test(data.jmbg)) {
    alert('JMBG mora imati 13 cifara');
    return;
  }

  const result = await API.addUcenik(data);
  if (result.id) {
    closeModal('ucenikModal');
    document.getElementById('ucenikIme').value = '';
    document.getElementById('ucenikPrezime').value = '';
    document.getElementById('ucenikJmbg').value = '';
    document.getElementById('ucenikDatum').value = '';
    document.getElementById('ucenikRazred').value = '';
    loadUcenici();
    showToast('Učenik dodat', 'success');
  } else {
    alert(result.error || 'Greška');
  }
}

// ===== UTILS =====
function showToast(msg, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `alert alert-${type}`;
  toast.style.position = 'fixed';
  toast.style.bottom = '20px';
  toast.style.right = '20px';
  toast.style.zIndex = '9999';
  toast.style.maxWidth = '300px';
  toast.innerHTML = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function showError(msg) {
  console.error(msg);
}