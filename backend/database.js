const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// SQLite baza (lokalno)
const dbPath = path.join(__dirname, '../ednevnik.db');
const db = new sqlite3.Database(dbPath);

// Kreiranje svih tabela
db.serialize(() => {
  // ŠKOLE
  db.run(`CREATE TABLE IF NOT EXISTS skole (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    naziv TEXT NOT NULL,
    mesto TEXT,
    adresa TEXT,
    telefon TEXT,
    email TEXT,
    aktivan INTEGER DEFAULT 1,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  // KORISNICI (za login)
  db.run(`CREATE TABLE IF NOT EXISTS korisnici (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    ime TEXT NOT NULL,
    prezime TEXT NOT NULL,
    jmbg TEXT UNIQUE NOT NULL,
    uloga TEXT NOT NULL,
    skolaId INTEGER,
    deteId INTEGER,
    nastavnikId INTEGER,
    email TEXT,
    FOREIGN KEY (skolaId) REFERENCES skole(id) ON DELETE CASCADE
  )`);

  // NASTAVNICI
  db.run(`CREATE TABLE IF NOT EXISTS nastavnici (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    skolaId INTEGER NOT NULL,
    ime TEXT NOT NULL,
    prezime TEXT NOT NULL,
    jmbg TEXT UNIQUE NOT NULL,
    email TEXT,
    telefon TEXT,
    predmetId INTEGER,
    FOREIGN KEY (skolaId) REFERENCES skole(id) ON DELETE CASCADE,
    FOREIGN KEY (predmetId) REFERENCES predmeti(id) ON DELETE SET NULL
  )`);

  // UČENICI
  db.run(`CREATE TABLE IF NOT EXISTS ucenici (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    skolaId INTEGER NOT NULL,
    ime TEXT NOT NULL,
    prezime TEXT NOT NULL,
    jmbg TEXT UNIQUE NOT NULL,
    datumRodjenja TEXT,
    razredId INTEGER,
    FOREIGN KEY (skolaId) REFERENCES skole(id) ON DELETE CASCADE
  )`);

  // RAZREDI (odeljenja)
  db.run(`CREATE TABLE IF NOT EXISTS razredi (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    skolaId INTEGER NOT NULL,
    naziv TEXT NOT NULL,
    razredniStaresinaId INTEGER,
    skolskaGodina TEXT,
    FOREIGN KEY (skolaId) REFERENCES skole(id) ON DELETE CASCADE,
    FOREIGN KEY (razredniStaresinaId) REFERENCES nastavnici(id) ON DELETE SET NULL
  )`);

  // PREDMETI
  db.run(`CREATE TABLE IF NOT EXISTS predmeti (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    skolaId INTEGER NOT NULL,
    naziv TEXT NOT NULL,
    opis TEXT,
    FOREIGN KEY (skolaId) REFERENCES skole(id) ON DELETE CASCADE
  )`);

  // RAZRED_PREDMETI (raspored)
  db.run(`CREATE TABLE IF NOT EXISTS razred_predmeti (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    razredId INTEGER NOT NULL,
    predmetId INTEGER NOT NULL,
    nastavnikId INTEGER NOT NULL,
    FOREIGN KEY (razredId) REFERENCES razredi(id) ON DELETE CASCADE,
    FOREIGN KEY (predmetId) REFERENCES predmeti(id) ON DELETE CASCADE,
    FOREIGN KEY (nastavnikId) REFERENCES nastavnici(id) ON DELETE CASCADE
  )`);

  // OCENE
  db.run(`CREATE TABLE IF NOT EXISTS ocene (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ucenikId INTEGER NOT NULL,
    predmetId INTEGER NOT NULL,
    vrednost INTEGER NOT NULL,
    datum TEXT NOT NULL,
    nastavnikId INTEGER NOT NULL,
    polugodiste INTEGER DEFAULT 1,
    napomena TEXT,
    FOREIGN KEY (ucenikId) REFERENCES ucenici(id) ON DELETE CASCADE,
    FOREIGN KEY (predmetId) REFERENCES predmeti(id) ON DELETE CASCADE,
    FOREIGN KEY (nastavnikId) REFERENCES nastavnici(id) ON DELETE CASCADE
  )`);

  // IZOSTANCI
  db.run(`CREATE TABLE IF NOT EXISTS izostanci (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ucenikId INTEGER NOT NULL,
    datum TEXT NOT NULL,
    cas INTEGER NOT NULL,
    predmetId INTEGER NOT NULL,
    opravdan INTEGER DEFAULT 0,
    napomena TEXT,
    FOREIGN KEY (ucenikId) REFERENCES ucenici(id) ON DELETE CASCADE,
    FOREIGN KEY (predmetId) REFERENCES predmeti(id) ON DELETE CASCADE
  )`);

  console.log('✅ Baza podataka inicijalizovana');
});

module.exports = db;