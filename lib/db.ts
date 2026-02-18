import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "data", "turnero.db");

export const db = new Database(dbPath);

// Activamos foreign keys
db.pragma("foreign_keys = ON");

// Creamos tablas si no existen
db.exec(`
CREATE TABLE IF NOT EXISTS clients (
  dni TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_dni TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  service TEXT NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'Pendiente',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (client_dni) REFERENCES clients(dni) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_appointments_client_dni ON appointments(client_dni);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
`);


