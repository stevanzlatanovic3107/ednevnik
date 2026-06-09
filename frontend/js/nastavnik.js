// ===== NASTAVNIČKI DASHBOARD =====
const API_URL = 'http://localhost:3000/api';
let user = null;
let skolaId = null;
let nastavnikId = null;
let mojiPredmeti = [];

// ===== INICIJALIZACIJA =====
document.addEventListener('DOMContentLoaded', async () => {
  const userStr = localStorage.getItem('user');
  if (!userStr) {
    window.location.href = 'login.html';
    return;
  }
  user = JSON.parse(userStr);
  skolaId = user.skolaId;
  
  // ⚠️ BITNO: Koristi nastavnikId, ne id!
  nastavnikId = user.nastavnikId;
  
  console.log('========== NASTAVNIK LOGIN ==========');
  console.log('Korisnik ID (tabela korisnici):', user.id);
  console.log('Nastavnik ID (tabela nastavnici):', nastavnikId);
  console.log('Škola ID:', skolaId);
  
  document.getElementById('userName').innerText = `${user.ime} ${user.prezime}`;
  document.getElementById('userAvatar').innerText = (user.ime[0] + user.prezime[0]).toUpperCase();
  
  // Event listeneri
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      const tab = item.getAttribute('data-tab');
      showTab(tab);
    });
  });
  
  document.getElementById('logoutBtn').addEventListener('click', logout);
  document.getElementById('nazadNaPredmeteBtn').addEventListener('click', showPredmeti);
  
  document.getElementById('ucitajUcenikeBtn').addEventListener('click', loadUceniciZaOcene);
  document.getElementById('ucitajIzostankeBtn').addEventListener('click', loadUceniciZaIzostanke);
  document.getElementById('dodajIzostanakBtn').addEventListener('click', dodajIzostanak);
  
  document.querySelectorAll('.close-modal-btn').forEach(btn => {
    btn.addEventListener('click', () => closeModal('ocenaModal'));
  });
  document.getElementById('saveOcenaModalBtn').addEventListener('click', saveOcenaModal);
  
  // Učitaj podatke
  await loadMojiPredmeti();
  await loadRazrediSelects();
});

async function loadMojiPredmeti() {
  try {
    console.log('📡 Pozivam API: /razred-predmeti/nastavnik/' + nastavnikId);
    const res = await fetch(`${API_URL}/razred-predmeti/nastavnik/${nastavnikId}`);
    const dodeljeni = await res.json();
    console.log('📦 Odgovor iz baze:', dodeljeni);
    
    if (!dodeljeni.length) {
      console.log('❌ Nema dodeljenih predmeta za nastavnika ID:', nastavnikId);
      document.getElementById('predmetiGrid').innerHTML = `
        <div class="card" style="text-align: center; padding: 40px;">
          <i class="ti ti-alert-circle" style="font-size: 48px; color: var(--accent);"></i>
          <h3>Nemate dodeljenih predmeta</h3>
          <p class="text-muted">Direktor škole vam mora dodeliti predmete kroz "Raspored" sekciju.</p>
          <p class="text-muted">Proverite da li ste povezani sa nastavnikom ID: ${nastavnikId}</p>
          <button class="btn-primary" onclick="location.reload()">Osveži</button>
        </div>
      `;
      return;
    }
    
    // Grupisi po razredu
    const razrediMap = new Map();
    dodeljeni.forEach(item => {
      if (!razrediMap.has(item.razredId)) {
        razrediMap.set(item.razredId, {
          id: item.razredId,
          naziv: item.razredNaziv,
          predmeti: []
        });
      }
      razrediMap.get(item.razredId).predmeti.push({
        id: item.predmetId,
        naziv: item.predmetNaziv
      });
    });
    
    mojiPredmeti = Array.from(razrediMap.values());
    renderPredmeti();
    
  } catch(err) {
    console.error('❌ Greška:', err);
    showToast('Greška pri učitavanju predmeta', 'error');
  }
}

function renderPredmeti() {
  const grid = document.getElementById('predmetiGrid');
  let html = '';
  for (const razred of mojiPredmeti) {
    html += `
      <div class="card" style="margin-bottom: 20px;">
        <div class="card-header">
          <h3><i class="ti ti-school"></i> ${razred.naziv}</h3>
        </div>
        <div class="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));">
    `;
    for (const predmet of razred.predmeti) {
      html += `
        <div class="predmet-card" data-razred-id="${razred.id}" data-razred-naziv="${razred.naziv}" data-predmet-id="${predmet.id}" data-predmet-naziv="${predmet.naziv}">
          <i class="ti ti-book"></i>
          <div style="font-weight: bold; margin-top: 8px;">${predmet.naziv}</div>
          <small>Unesi ocene</small>
        </div>
      `;
    }
    html += `</div></div>`;
  }
  grid.innerHTML = html;
  
  document.querySelectorAll('.predmet-card').forEach(card => {
    card.addEventListener('click', () => {
      showUcenici(
        card.dataset.razredId, 
        card.dataset.razredNaziv, 
        card.dataset.predmetId, 
        card.dataset.predmetNaziv
      );
    });
  });
}

function showTab(tabName) {
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  document.querySelector(`.nav-item[data-tab="${tabName}"]`).classList.add('active');
  
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
  document.getElementById(`${tabName}Tab`).classList.add('active');
  
  const titles = {
    mojiRazredi: 'Moja odeljenja',
    ocene: 'Unos ocena',
    izostanci: 'Izostanci'
  };
  document.getElementById('pageTitle').innerText = titles[tabName];
  
  if (tabName === 'ocene') loadOceneSelects();
  if (tabName === 'izostanci') loadIzostanciSelects();
}

async function showUcenici(razredId, razredNaziv, predmetId, predmetNaziv) {
  document.getElementById('trenutniPredmetNaslov').innerText = `${razredNaziv} - ${predmetNaziv}`;
  document.getElementById('predmetiContainer').style.display = 'none';
  document.getElementById('uceniciContainer').style.display = 'block';
  
  try {
    const res = await fetch(`${API_URL}/ucenici/${skolaId}?razredId=${razredId}`);
    const ucenici = await res.json();
    renderUceniciLista(ucenici, predmetId);
  } catch(err) {
    showToast('Greška pri učitavanju učenika', 'error');
  }
}

function showPredmeti() {
  document.getElementById('predmetiContainer').style.display = 'block';
  document.getElementById('uceniciContainer').style.display = 'none';
}

async function renderUceniciLista(ucenici, predmetId) {
  const tbody = document.getElementById('uceniciLista');
  if (!ucenici.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center">Nema učenika u odeljenju</td></tr>';
    return;
  }
  
  let html = '';
  for (const u of ucenici) {
    const oceneRes = await fetch(`${API_URL}/ocene/ucenik/${u.id}`);
    const ocene = await oceneRes.json();
    const predmetOcene = ocene.filter(o => o.predmetId == predmetId);
    const prosek = predmetOcene.length > 0 
      ? (predmetOcene.reduce((s, o) => s + o.vrednost, 0) / predmetOcene.length).toFixed(2)
      : '—';
    const poslednje = predmetOcene.slice(-3).map(o => o.vrednost).join(', ');
    
    html += `
      <tr>
        <td>${u.ime} ${u.prezime}</td>
        <td><span class="badge badge-blue">${prosek}</span></td>
        <td>${poslednje || '—'}</td>
        <td>
          <button class="btn-primary btn-sm open-ocena-modal" data-ucenik-id="${u.id}" data-ucenik-ime="${u.ime} ${u.prezime}" data-predmet-id="${predmetId}">
            <i class="ti ti-plus"></i> Ocena
          </button>
          <button class="btn-secondary btn-sm open-izostanak" data-ucenik-id="${u.id}" data-ucenik-ime="${u.ime} ${u.prezime}" data-predmet-id="${predmetId}">
            <i class="ti ti-calendar-off"></i> Izostanak
          </button>
        </td>
      </tr>
    `;
  }
  tbody.innerHTML = html;
  
  document.querySelectorAll('.open-ocena-modal').forEach(btn => {
    btn.addEventListener('click', () => openOcenaModal(btn.dataset.ucenikId, btn.dataset.ucenikIme, btn.dataset.predmetId));
  });
  document.querySelectorAll('.open-izostanak').forEach(btn => {
    btn.addEventListener('click', () => otvoriIzostanak(btn.dataset.ucenikId, btn.dataset.ucenikIme, btn.dataset.predmetId));
  });
}

// ===== OSTALE FUNKCIJE =====
async function loadRazrediSelects() {
  const razredi = [...new Map(mojiPredmeti.map(r => [r.id, r.naziv])).entries()];
  const options = '<option value="">Izaberite odeljenje</option>' + razredi.map(([id, naziv]) => `<option value="${id}">${naziv}</option>`).join('');
  document.getElementById('oceneRazred').innerHTML = options;
  document.getElementById('izostanciRazred').innerHTML = options;
}

async function loadOceneSelects() {
  const predmetiSet = new Set();
  mojiPredmeti.forEach(razred => razred.predmeti.forEach(p => predmetiSet.add(JSON.stringify({ id: p.id, naziv: p.naziv }))));
  const predmeti = Array.from(predmetiSet).map(p => JSON.parse(p));
  const options = '<option value="">Izaberite predmet</option>' + predmeti.map(p => `<option value="${p.id}">${p.naziv}</option>`).join('');
  document.getElementById('ocenePredmet').innerHTML = options;
}

async function loadIzostanciSelects() {
  const predmetiSet = new Set();
  mojiPredmeti.forEach(razred => razred.predmeti.forEach(p => predmetiSet.add(JSON.stringify({ id: p.id, naziv: p.naziv }))));
  const predmeti = Array.from(predmetiSet).map(p => JSON.parse(p));
  const options = '<option value="">Izaberite predmet</option>' + predmeti.map(p => `<option value="${p.id}">${p.naziv}</option>`).join('');
  document.getElementById('izostanciPredmet').innerHTML = options;
}

async function loadUceniciZaOcene() {
  const razredId = document.getElementById('oceneRazred').value;
  const predmetId = document.getElementById('ocenePredmet').value;
  if (!razredId || !predmetId) { showToast('Izaberite odeljenje i predmet', 'error'); return; }
  try {
    const res = await fetch(`${API_URL}/ucenici/${skolaId}?razredId=${razredId}`);
    const ucenici = await res.json();
    renderOceneUceniciLista(ucenici, predmetId);
  } catch(err) { showToast('Greška', 'error'); }
}

async function renderOceneUceniciLista(ucenici, predmetId) {
  const tbody = document.getElementById('oceneUceniciLista');
  let html = '';
  for (const u of ucenici) {
    const oceneRes = await fetch(`${API_URL}/ocene/ucenik/${u.id}`);
    const ocene = await oceneRes.json();
    const prethodne = ocene.filter(o => o.predmetId == predmetId).slice(-3).map(o => o.vrednost).join(', ');
    html += `
      <tr>
        <td>${u.ime} ${u.prezime}</td>
        <td>${prethodne || '—'}</td>
        <td><select id="ocena_${u.id}" class="ocena-input"><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5" selected>5</option></select></td>
        <td><input type="date" id="datum_${u.id}" class="input-plain" value="${new Date().toISOString().split('T')[0]}" style="width:120px"></td>
        <td><button class="btn-primary btn-sm dodaj-ocenu-btn" data-ucenik-id="${u.id}" data-predmet-id="${predmetId}">Dodaj</button></td>
      </tr>
    `;
  }
  tbody.innerHTML = html;
  document.querySelectorAll('.dodaj-ocenu-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const ucenikId = btn.dataset.ucenikId;
      const predmetId = btn.dataset.predmetId;
      const ocena = document.getElementById(`ocena_${ucenikId}`).value;
      const datum = document.getElementById(`datum_${ucenikId}`).value;
      try {
        const res = await fetch(`${API_URL}/ocene`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ucenikId, predmetId, vrednost: parseInt(ocena), datum, nastavnikId: user.nastavnikId, napomena: '' })
        });
        if (res.ok) { showToast('Ocena dodata', 'success'); loadUceniciZaOcene(); }
        else showToast('Greška', 'error');
      } catch(err) { showToast('Greška', 'error'); }
    });
  });
}

function openOcenaModal(ucenikId, ucenikIme, predmetId) {
  document.getElementById('modalUcenikIme').value = ucenikIme;
  document.getElementById('modalOcenaDatum').value = new Date().toISOString().split('T')[0];
  document.getElementById('modalOcenaVrednost').value = '5';
  document.getElementById('modalOcenaNapomena').value = '';
  document.getElementById('ocenaModal').dataset.ucenikId = ucenikId;
  document.getElementById('ocenaModal').dataset.predmetId = predmetId;
  document.getElementById('ocenaModal').classList.add('open');
}

async function saveOcenaModal() {
  const ucenikId = document.getElementById('ocenaModal').dataset.ucenikId;
  const predmetId = document.getElementById('ocenaModal').dataset.predmetId;
  const vrednost = document.getElementById('modalOcenaVrednost').value;
  const datum = document.getElementById('modalOcenaDatum').value;
  const napomena = document.getElementById('modalOcenaNapomena').value;
  try {
    const res = await fetch(`${API_URL}/ocene`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ucenikId, predmetId, vrednost: parseInt(vrednost), datum, nastavnikId: user.nastavnikId, napomena })
    });
    if (res.ok) {
      closeModal('ocenaModal');
      showToast('Ocena dodata', 'success');
      loadUceniciZaOcene();
    }
  } catch(err) { showToast('Greška', 'error'); }
}

async function loadUceniciZaIzostanke() {
  const razredId = document.getElementById('izostanciRazred').value;
  const predmetId = document.getElementById('izostanciPredmet').value;
  if (!razredId || !predmetId) { showToast('Izaberite odeljenje i predmet', 'error'); return; }
  try {
    const res = await fetch(`${API_URL}/ucenici/${skolaId}?razredId=${razredId}`);
    const ucenici = await res.json();
    const select = document.getElementById('noviIzostanakUcenik');
    select.innerHTML = ucenici.map(u => `<option value="${u.id}">${u.ime} ${u.prezime}</option>`).join('');
    let izostanciHtml = '';
    for (const u of ucenici) {
      const izRes = await fetch(`${API_URL}/izostanci/ucenik/${u.id}`);
      const izostanci = await izRes.json();
      izostanci.filter(i => i.predmetId == predmetId).forEach(i => {
        izostanciHtml += `<tr><td>${u.ime} ${u.prezime}</td><td>${i.datum}</td><td>${i.cas}. čas</td><td><span class="badge ${i.opravdan ? 'badge-green' : 'badge-red'}">${i.opravdan ? 'Opravdan' : 'Neopravdan'}</span></td><td>${i.napomena || '—'}</td></tr>`;
      });
    }
    document.getElementById('izostanciLista').innerHTML = izostanciHtml || '<tr><td colspan="5" class="text-center">Nema izostanaka</td></tr>';
  } catch(err) { showToast('Greška', 'error'); }
}

async function dodajIzostanak() {
  const ucenikId = document.getElementById('noviIzostanakUcenik').value;
  const datum = document.getElementById('noviIzostanakDatum').value;
  const cas = document.getElementById('noviIzostanakCas').value;
  const opravdan = document.getElementById('noviIzostanakOpravdan').value;
  const predmetId = document.getElementById('izostanciPredmet').value;
  if (!ucenikId || !datum) { showToast('Popunite polja', 'error'); return; }
  try {
    const res = await fetch(`${API_URL}/izostanci`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ucenikId, datum, cas: parseInt(cas), predmetId, opravdan: parseInt(opravdan), napomena: '' })
    });
    if (res.ok) { showToast('Izostanak dodat', 'success'); loadUceniciZaIzostanke(); }
  } catch(err) { showToast('Greška', 'error'); }
}

function otvoriIzostanak(ucenikId, ucenikIme, predmetId) {
  showTab('izostanci');
  setTimeout(() => {
    document.getElementById('izostanciPredmet').value = predmetId;
    loadUceniciZaIzostanke();
  }, 100);
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('open');
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'index.html';
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