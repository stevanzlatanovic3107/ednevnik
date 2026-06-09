// ===== RODITELJSKI DASHBOARD =====
const user = API.getUser();
let skolaId = user?.skolaId;
let deteId = user?.deteId;

// Provera da li je roditelj
if (!user || user.uloga !== 'roditelj') {
  window.location.href = 'login.html';
}

let detePodaci = null;
let sveOcene = [];
let sviIzostanci = [];
let sviPredmeti = [];

// ===== INICIJALIZACIJA =====
document.addEventListener('DOMContentLoaded', async () => {
  // Postavi ime roditelja
  document.getElementById('userName').innerText = `${user.ime} ${user.prezime}`;
  document.getElementById('userRole').innerText = 'Roditelj';

  // Učitaj podatke o detetu
  await loadDetePodaci();
  await loadSveOcene();
  await loadSveIzostanke();
  await loadPredmeti();

  // Prikaži podatke
  renderPregled();
  renderOcene();
  renderIzostanke();

  // Event listeneri za tabove
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const tab = item.dataset.tab;
      showTab(tab);
    });
  });

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
  });
});

// ===== PRIKAZ TABOVA =====
function showTab(tabName) {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
    if (item.dataset.tab === tabName) {
      item.classList.add('active');
    }
  });

  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });

  document.getElementById(`${tabName}Tab`).classList.add('active');

  const titles = {
    pregled: 'Pregled deteta',
    ocene: 'Sve ocene',
    izostanci: 'Izostanci'
  };
  document.getElementById('pageTitle').innerText = titles[tabName] || tabName;
}

// ===== UČITAVANJE PODATAKA =====
async function loadDetePodaci() {
  try {
    // Dohvati sve učenike škole pa filtriraj
    const sviUcenici = await API.getUcenici(skolaId);
    detePodaci = sviUcenici.find(u => u.id == deteId);
    
    if (detePodaci) {
      // Dohvati naziv odeljenja
      const razredi = await API.getRazredi(skolaId);
      const razred = razredi.find(r => r.id == detePodaci.razredId);
      detePodaci.razredNaziv = razred ? razred.naziv : '—';
    }
  } catch (err) {
    console.error(err);
    showToast('Greška pri učitavanju podataka o detetu', 'error');
  }
}

async function loadSveOcene() {
  try {
    sveOcene = await API.getOceneUcenika(deteId);
  } catch (err) {
    console.error(err);
    sveOcene = [];
  }
}

async function loadSveIzostanke() {
  try {
    sviIzostanci = await API.getIzostanciUcenika(deteId);
  } catch (err) {
    console.error(err);
    sviIzostanci = [];
  }
}

async function loadPredmeti() {
  try {
    sviPredmeti = await API.getPredmeti(skolaId);
  } catch (err) {
    console.error(err);
    sviPredmeti = [];
  }
}

// ===== RENDER PREGLED =====
function renderPregled() {
  if (!detePodaci) {
    document.getElementById('deteImePrezime').innerText = 'Nije pronađeno dete';
    return;
  }

  // Ime i prezime deteta
  document.getElementById('deteImePrezime').innerHTML = `
    ${detePodaci.ime} ${detePodaci.prezime}
    <small style="font-size:0.8rem; opacity:0.7;"> (JMBG: ${detePodaci.jmbg})</small>
  `;
  document.getElementById('deteOdeljenje').innerHTML = `
    <i class="ti ti-school"></i> Odeljenje: ${detePodaci.razredNaziv}
    ${detePodaci.datumRodjenja ? `| 🎂 ${detePodaci.datumRodjenja}` : ''}
  `;

  // Statistika
  const ukupanProsek = izracunajUkupanProsek();
  const brojOcena = sveOcene.length;
  const brojIzostanaka = sviIzostanci.length;
  const brojOpravdanih = sviIzostanci.filter(i => i.opravdan == 1).length;

  document.getElementById('ukupanProsek').innerHTML = ukupanProsek ? ukupanProsek.toFixed(2) : '—';
  document.getElementById('brojOcena').innerHTML = brojOcena;
  document.getElementById('brojIzostanaka').innerHTML = brojIzostanaka;
  document.getElementById('brojOpravdanih').innerHTML = brojOpravdanih;

  // Proseci po predmetima
  renderProseciPoPredmetima();
}

function izracunajUkupanProsek() {
  if (!sveOcene.length) return null;
  const suma = sveOcene.reduce((acc, o) => acc + o.vrednost, 0);
  return suma / sveOcene.length;
}

function renderProseciPoPredmetima() {
  const container = document.getElementById('proseciPoPredmetima');
  
  // Grupisi ocene po predmetu
  const predmetOcene = {};
  sveOcene.forEach(ocena => {
    if (!predmetOcene[ocena.predmetId]) {
      predmetOcene[ocena.predmetId] = [];
    }
    predmetOcene[ocena.predmetId].push(ocena.vrednost);
  });

  if (Object.keys(predmetOcene).length === 0) {
    container.innerHTML = '<div class="text-muted">Nema evidentiranih ocena</div>';
    return;
  }

  // Izračunaj prosek za svaki predmet
  const proseci = [];
  for (const [predmetId, ocene] of Object.entries(predmetOcene)) {
    const predmet = sviPredmeti.find(p => p.id == predmetId);
    const prosek = ocene.reduce((a, b) => a + b, 0) / ocene.length;
    proseci.push({
      naziv: predmet ? predmet.naziv : 'Nepoznat',
      prosek: prosek,
      brojOcena: ocene.length
    });
  }

  // Sortiraj po proseku opadajuće
  proseci.sort((a, b) => b.prosek - a.prosek);

  container.innerHTML = proseci.map(p => `
    <div class="predmet-card">
      <div class="prosek">${p.prosek.toFixed(2)}</div>
      <div class="stat-label">${p.naziv}</div>
      <small class="text-muted">${p.brojOcena} ocena</small>
    </div>
  `).join('');
}

// ===== RENDER SVE OCENE =====
function renderOcene() {
  const tbody = document.getElementById('sveOceneLista');
  
  if (!sveOcene.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">Nema evidentiranih ocena</td></tr>';
    return;
  }

  // Sortiraj po datumu opadajuće (najnovije prvo)
  const sortedOcene = [...sveOcene].sort((a, b) => new Date(b.datum) - new Date(a.datum));

  tbody.innerHTML = sortedOcene.map(o => {
    const predmet = sviPredmeti.find(p => p.id == o.predmetId);
    const ocenaKlasa = `ocena-${o.vrednost}`;
    return `
      <tr>
        <td>${predmet ? predmet.naziv : '—'}</td>
        <td><span class="ocena-badge ${ocenaKlasa}">${o.vrednost}</span></td>
        <td>${formatDatum(o.datum)}</td>
        <td>${o.nastavnikId ? 'Nastavnik' : '—'}</td>
        <td>${o.napomena || '—'}</td>
      </tr>
    `;
  }).join('');
}

// ===== RENDER IZOSTANCI =====
function renderIzostanke() {
  const tbody = document.getElementById('sviIzostanciLista');
  
  if (!sviIzostanci.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">Nema evidentiranih izostanaka</td></tr>';
    return;
  }

  // Sortiraj po datumu opadajuće
  const sortedIzostanci = [...sviIzostanci].sort((a, b) => new Date(b.datum) - new Date(a.datum));

  tbody.innerHTML = sortedIzostanci.map(i => {
    const predmet = sviPredmeti.find(p => p.id == i.predmetId);
    return `
      <tr>
        <td>${predmet ? predmet.naziv : '—'}</td>
        <td>${formatDatum(i.datum)}</td>
        <td>${i.cas}. čas</td>
        <td>
          <span class="badge ${i.opravdan ? 'badge-green' : 'badge-red'}">
            ${i.opravdan ? 'Opravdan' : 'Neopravdan'}
          </span>
        </td>
        <td>${i.napomena || '—'}</td>
      </tr>
    `;
  }).join('');
}

// ===== HELPER FUNKCIJE =====
function formatDatum(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function showToast(msg, type) {
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