require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./database');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'moj_tajni_kljuc_2024';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// ============ AUTH RUTE ============

// Registracija nove škole
app.post('/api/register', async (req, res) => {
  const { skola, direktor } = req.body;
  
  db.get('SELECT id FROM skole WHERE email = ?', [skola.email], async (err, existing) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (existing) {
      return res.status(400).json({ error: 'Škola sa ovim emailom već postoji' });
    }
    
    db.run(`INSERT INTO skole (naziv, mesto, adresa, telefon, email) 
            VALUES (?, ?, ?, ?, ?)`,
      [skola.naziv, skola.mesto, skola.adresa, skola.telefon, skola.email],
      function(err) {
        if (err) {
          return res.status(400).json({ error: err.message });
        }
        const skolaId = this.lastID;
        const hashedPassword = bcrypt.hashSync(direktor.password, 10);
        
        db.run(`INSERT INTO korisnici (username, password, ime, prezime, jmbg, uloga, skolaId) 
                VALUES (?, ?, ?, ?, ?, 'admin_skole', ?)`,
          [direktor.username, hashedPassword, direktor.ime, direktor.prezime, direktor.jmbg, skolaId],
          function(err2) {
            if (err2) {
              return res.status(400).json({ error: err2.message });
            }
            res.json({ success: true, skolaId, direktorId: this.lastID });
          });
      });
  });
});

// Login
app.post('/api/login', (req, res) => {
  const { username, password, skolaId } = req.body;
  
  db.get(`SELECT * FROM korisnici WHERE username = ? AND skolaId = ?`, 
    [username, skolaId], (err, user) => {
      if (err || !user) {
        return res.status(401).json({ error: 'Pogrešno korisničko ime ili lozinka' });
      }
      
      const valid = bcrypt.compareSync(password, user.password);
      if (!valid) {
        return res.status(401).json({ error: 'Pogrešno korisničko ime ili lozinka' });
      }
      
      const token = jwt.sign(
        { id: user.id, uloga: user.uloga, skolaId: user.skolaId },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      res.json({
        token,
        user: {
          id: user.id,
          ime: user.ime,
          prezime: user.prezime,
          uloga: user.uloga,
          skolaId: user.skolaId,
          deteId: user.deteId,
          nastavnikId: user.nastavnikId
        }
      });
    });
});

// ============ NASTAVNICI ============

// Dohvati sve nastavnike škole
app.get('/api/nastavnici/:skolaId', (req, res) => {
  db.all(`SELECT * FROM nastavnici WHERE skolaId = ? ORDER BY prezime`, 
    [req.params.skolaId], (err, rows) => {
      if (err) {
        res.status(400).json({ error: err.message });
      } else {
        res.json(rows);
      }
    });
});

// Dohvati jednog nastavnika
app.get('/api/nastavnik/:id', (req, res) => {
  db.get(`SELECT * FROM nastavnici WHERE id = ?`, [req.params.id], (err, row) => {
    if (err) return res.status(400).json({ error: err.message });
    res.json(row);
  });
});

// Dodaj nastavnika (sa automatskim kreiranjem naloga)
app.post('/api/nastavnici', (req, res) => {
  const { skolaId, ime, prezime, jmbg, email, telefon, username, password, predmetId } = req.body;
  
  console.log('📥 Podaci za nastavnika:', { skolaId, ime, prezime, jmbg, email, telefon, username, predmetId });
  
  if (!jmbg || jmbg.length !== 13 || !/^\d+$/.test(jmbg)) {
    return res.status(400).json({ error: 'JMBG mora imati 13 cifara' });
  }
  if (!username || !password) {
    return res.status(400).json({ error: 'Morate uneti korisničko ime i lozinku' });
  }
  
  db.get(`SELECT id FROM korisnici WHERE username = ?`, [username], (err, existingUser) => {
    if (existingUser) {
      return res.status(400).json({ error: 'Korisničko ime već postoji' });
    }
    
    db.get(`SELECT id FROM nastavnici WHERE jmbg = ? AND skolaId = ?`, [jmbg, skolaId], (err2, existingNastavnik) => {
      if (existingNastavnik) {
        return res.status(400).json({ error: 'Nastavnik sa ovim JMBG-om već postoji' });
      }
      
      // Dodaj nastavnika u tabelu nastavnici (sa predmetId)
      db.run(`INSERT INTO nastavnici (skolaId, ime, prezime, jmbg, email, telefon, predmetId) 
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [skolaId, ime, prezime, jmbg, email || null, telefon || null, predmetId || null],
        function(err3) {
          if (err3) {
            console.error('❌ Greška pri insert u nastavnici:', err3);
            return res.status(400).json({ error: err3.message });
          }
          
          const nastavnikId = this.lastID;
          const hashedPassword = bcrypt.hashSync(password, 10);
          
          db.run(`INSERT INTO korisnici (username, password, ime, prezime, jmbg, uloga, skolaId, nastavnikId) 
                  VALUES (?, ?, ?, ?, ?, 'nastavnik', ?, ?)`,
            [username, hashedPassword, ime, prezime, jmbg, skolaId, nastavnikId],
            function(err4) {
              if (err4) {
                console.error('❌ Greška pri insert u korisnici:', err4);
                return res.status(400).json({ error: err4.message });
              }
              console.log('✅ Nastavnik dodat, ID:', nastavnikId);
              res.json({ id: nastavnikId, korisnikId: this.lastID });
            });
        });
    });
  });
});

// Izmeni nastavnika
app.put('/api/nastavnici/:id', (req, res) => {
  const { ime, prezime, jmbg, email, telefon, predmetId } = req.body;
  db.run(`UPDATE nastavnici SET ime = ?, prezime = ?, jmbg = ?, email = ?, telefon = ?, predmetId = ? WHERE id = ?`,
    [ime, prezime, jmbg, email, telefon, predmetId || null, req.params.id],
    function(err) {
      if (err) return res.status(400).json({ error: err.message });
      res.json({ updated: this.changes });
    });
});

// Obriši nastavnika
app.delete('/api/nastavnici/:id', (req, res) => {
  db.run(`DELETE FROM nastavnici WHERE id = ?`, [req.params.id], function(err) {
    if (err) return res.status(400).json({ error: err.message });
    db.run(`DELETE FROM korisnici WHERE nastavnikId = ?`, [req.params.id]);
    res.json({ deleted: this.changes });
  });
});

// ============ PREDMETI ============

app.get('/api/predmeti/:skolaId', (req, res) => {
  db.all(`SELECT * FROM predmeti WHERE skolaId = ? ORDER BY naziv`, 
    [req.params.skolaId], (err, rows) => {
      if (err) {
        res.status(400).json({ error: err.message });
      } else {
        res.json(rows);
      }
    });
});

app.post('/api/predmeti', (req, res) => {
  const { skolaId, naziv, opis } = req.body;
  db.run(`INSERT INTO predmeti (skolaId, naziv, opis) VALUES (?, ?, ?)`,
    [skolaId, naziv, opis],
    function(err) {
      if (err) return res.status(400).json({ error: err.message });
      res.json({ id: this.lastID });
    });
});

app.delete('/api/predmeti/:id', (req, res) => {
  db.run(`DELETE FROM predmeti WHERE id = ?`, [req.params.id], function(err) {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

// ============ RAZREDI ============

app.get('/api/razredi/:skolaId', (req, res) => {
  db.all(`SELECT r.*, n.ime as staresinaIme, n.prezime as staresinaPrezime 
          FROM razredi r
          LEFT JOIN nastavnici n ON r.razredniStaresinaId = n.id
          WHERE r.skolaId = ? 
          ORDER BY r.naziv`, 
    [req.params.skolaId], (err, rows) => {
      if (err) {
        res.status(400).json({ error: err.message });
      } else {
        res.json(rows);
      }
    });
});

app.post('/api/razredi', (req, res) => {
  const { skolaId, naziv, razredniStaresinaId, skolskaGodina } = req.body;
  db.run(`INSERT INTO razredi (skolaId, naziv, razredniStaresinaId, skolskaGodina) 
          VALUES (?, ?, ?, ?)`,
    [skolaId, naziv, razredniStaresinaId || null, skolskaGodina || '2024/25'],
    function(err) {
      if (err) return res.status(400).json({ error: err.message });
      res.json({ id: this.lastID });
    });
});

app.put('/api/razredi/:id', (req, res) => {
  const { naziv, razredniStaresinaId, skolskaGodina } = req.body;
  db.run(`UPDATE razredi SET naziv = ?, razredniStaresinaId = ?, skolskaGodina = ? WHERE id = ?`,
    [naziv, razredniStaresinaId || null, skolskaGodina, req.params.id],
    function(err) {
      if (err) return res.status(400).json({ error: err.message });
      res.json({ updated: this.changes });
    });
});

app.delete('/api/razredi/:id', (req, res) => {
  db.run(`DELETE FROM razredi WHERE id = ?`, [req.params.id], function(err) {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

// ============ UČENICI ============

app.get('/api/ucenici/:skolaId', (req, res) => {
  const { razredId } = req.query;
  let query = `SELECT * FROM ucenici WHERE skolaId = ?`;
  let params = [req.params.skolaId];
  
  if (razredId) {
    query += ` AND razredId = ?`;
    params.push(razredId);
  }
  query += ` ORDER BY prezime`;
  
  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(400).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

app.get('/api/ucenik/:id', (req, res) => {
  db.get(`SELECT * FROM ucenici WHERE id = ?`, [req.params.id], (err, row) => {
    if (err) return res.status(400).json({ error: err.message });
    res.json(row);
  });
});

app.post('/api/ucenici', (req, res) => {
  const { skolaId, ime, prezime, jmbg, datumRodjenja, razredId } = req.body;
  
  if (!jmbg || jmbg.length !== 13 || !/^\d+$/.test(jmbg)) {
    return res.status(400).json({ error: 'JMBG mora imati 13 cifara' });
  }
  
  db.run(`INSERT INTO ucenici (skolaId, ime, prezime, jmbg, datumRodjenja, razredId) 
          VALUES (?, ?, ?, ?, ?, ?)`,
    [skolaId, ime, prezime, jmbg, datumRodjenja, razredId],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ error: 'Učenik sa ovim JMBG-om već postoji' });
        }
        return res.status(400).json({ error: err.message });
      }
      res.json({ id: this.lastID });
    });
});

app.put('/api/ucenici/:id', (req, res) => {
  const { ime, prezime, jmbg, datumRodjenja, razredId } = req.body;
  db.run(`UPDATE ucenici SET ime = ?, prezime = ?, jmbg = ?, datumRodjenja = ?, razredId = ? WHERE id = ?`,
    [ime, prezime, jmbg, datumRodjenja, razredId, req.params.id],
    function(err) {
      if (err) return res.status(400).json({ error: err.message });
      res.json({ updated: this.changes });
    });
});

app.delete('/api/ucenici/:id', (req, res) => {
  db.run(`DELETE FROM ucenici WHERE id = ?`, [req.params.id], function(err) {
    if (err) return res.status(400).json({ error: err.message });
    db.run(`DELETE FROM korisnici WHERE deteId = ?`, [req.params.id]);
    res.json({ deleted: this.changes });
  });
});

// ============ RASPORED (razred-predmeti) ============

app.get('/api/razred-predmeti/:skolaId', (req, res) => {
  db.all(`SELECT 
            rp.*, 
            r.naziv as razredNaziv, 
            p.naziv as predmetNaziv,
            n.ime as nastavnikIme,
            n.prezime as nastavnikPrezime
          FROM razred_predmeti rp
          JOIN razredi r ON rp.razredId = r.id
          JOIN predmeti p ON rp.predmetId = p.id
          JOIN nastavnici n ON rp.nastavnikId = n.id
          WHERE r.skolaId = ?`, 
    [req.params.skolaId], (err, rows) => {
      if (err) {
        res.status(400).json({ error: err.message });
      } else {
        res.json(rows);
      }
    });
});

app.get('/api/razred-predmeti/nastavnik/:nastavnikId', (req, res) => {
  db.all(`SELECT 
            rp.*, 
            r.naziv as razredNaziv, 
            p.naziv as predmetNaziv,
            r.id as razredId
          FROM razred_predmeti rp
          JOIN razredi r ON rp.razredId = r.id
          JOIN predmeti p ON rp.predmetId = p.id
          WHERE rp.nastavnikId = ?`, 
    [req.params.nastavnikId], (err, rows) => {
      if (err) {
        console.error(err);
        res.status(400).json({ error: err.message });
      } else {
        console.log(`Nastavnik ${req.params.nastavnikId} ima ${rows.length} dodeljenih predmeta`);
        res.json(rows);
      }
    });
});

app.post('/api/razred-predmeti', (req, res) => {
  const { razredId, predmetId, nastavnikId } = req.body;
  db.run(`INSERT INTO razred_predmeti (razredId, predmetId, nastavnikId) 
          VALUES (?, ?, ?)`,
    [razredId, predmetId, nastavnikId],
    function(err) {
      if (err) return res.status(400).json({ error: err.message });
      res.json({ id: this.lastID });
    });
});

app.delete('/api/razred-predmeti/:id', (req, res) => {
  db.run(`DELETE FROM razred_predmeti WHERE id = ?`, [req.params.id], function(err) {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

// ============ OCENE ============

app.get('/api/ocene/ucenik/:ucenikId', (req, res) => {
  db.all(`SELECT o.*, p.naziv as predmetNaziv 
          FROM ocene o
          JOIN predmeti p ON o.predmetId = p.id
          WHERE o.ucenikId = ?
          ORDER BY o.datum DESC`, 
    [req.params.ucenikId], (err, rows) => {
      if (err) {
        res.status(400).json({ error: err.message });
      } else {
        res.json(rows);
      }
    });
});

app.post('/api/ocene', (req, res) => {
  const { ucenikId, predmetId, vrednost, datum, nastavnikId, napomena } = req.body;
  db.run(`INSERT INTO ocene (ucenikId, predmetId, vrednost, datum, nastavnikId, napomena) 
          VALUES (?, ?, ?, ?, ?, ?)`,
    [ucenikId, predmetId, vrednost, datum, nastavnikId, napomena || ''],
    function(err) {
      if (err) return res.status(400).json({ error: err.message });
      res.json({ id: this.lastID });
    });
});

// ============ IZOSTANCI ============

app.get('/api/izostanci/ucenik/:ucenikId', (req, res) => {
  db.all(`SELECT i.*, p.naziv as predmetNaziv 
          FROM izostanci i
          JOIN predmeti p ON i.predmetId = p.id
          WHERE i.ucenikId = ?
          ORDER BY i.datum DESC`, 
    [req.params.ucenikId], (err, rows) => {
      if (err) {
        res.status(400).json({ error: err.message });
      } else {
        res.json(rows);
      }
    });
});

app.post('/api/izostanci', (req, res) => {
  const { ucenikId, datum, cas, predmetId, opravdan, napomena } = req.body;
  db.run(`INSERT INTO izostanci (ucenikId, datum, cas, predmetId, opravdan, napomena) 
          VALUES (?, ?, ?, ?, ?, ?)`,
    [ucenikId, datum, cas, predmetId, opravdan || 0, napomena || ''],
    function(err) {
      if (err) return res.status(400).json({ error: err.message });
      res.json({ id: this.lastID });
    });
});

// ============ RODITELJI ============

app.get('/api/roditelji/:skolaId', (req, res) => {
  db.all(`SELECT * FROM korisnici WHERE skolaId = ? AND uloga = 'roditelj' ORDER BY prezime`, 
    [req.params.skolaId], (err, rows) => {
      if (err) {
        res.status(400).json({ error: err.message });
      } else {
        res.json(rows);
      }
    });
});

app.post('/api/roditelji', (req, res) => {
  const { skolaId, ime, prezime, jmbg, username, password, email, telefon, deteId } = req.body;
  
  if (!jmbg || jmbg.length !== 13 || !/^\d+$/.test(jmbg)) {
    return res.status(400).json({ error: 'JMBG mora imati 13 cifara' });
  }
  
  const hashedPassword = bcrypt.hashSync(password, 10);
  
  db.run(`INSERT INTO korisnici (username, password, ime, prezime, jmbg, uloga, skolaId, deteId, email) 
          VALUES (?, ?, ?, ?, ?, 'roditelj', ?, ?, ?)`,
    [username, hashedPassword, ime, prezime, jmbg, skolaId, deteId, email],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ error: 'Korisničko ime ili JMBG već postoji' });
        }
        return res.status(400).json({ error: err.message });
      }
      res.json({ id: this.lastID });
    });
});

app.put('/api/korisnici/:id/password', (req, res) => {
  const { password } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 10);
  db.run(`UPDATE korisnici SET password = ? WHERE id = ?`,
    [hashedPassword, req.params.id],
    function(err) {
      if (err) return res.status(400).json({ error: err.message });
      res.json({ updated: this.changes });
    });
});

// Dohvati korisničke podatke za nastavnika
app.get('/api/korisnik/nastavnik/:nastavnikId', (req, res) => {
  db.get(`SELECT id, username FROM korisnici WHERE nastavnikId = ? AND uloga = 'nastavnik'`,
    [req.params.nastavnikId], (err, row) => {
      if (err) return res.status(400).json({ error: err.message });
      res.json(row || {});
    });
});

// Dohvati korisnike nastavnike za prikaz username
app.get('/api/korisnici/:skolaId/nastavnici', (req, res) => {
  db.all(`SELECT id, username, nastavnikId FROM korisnici WHERE skolaId = ? AND uloga = 'nastavnik'`, 
    [req.params.skolaId], (err, rows) => {
      if (err) {
        res.status(400).json({ error: err.message });
      } else {
        res.json(rows);
      }
    });
});

// ============ POKRETANJE SERVERA ============
app.listen(PORT, () => {
  console.log(`🚀 Server radi na http://localhost:${PORT}`);
  console.log(`📁 Frontend folder: ${path.join(__dirname, '../frontend')}`);
  console.log(`🔐 JWT_SECRET: ${JWT_SECRET ? 'Postavljen' : 'Nije postavljen!'}`);
});