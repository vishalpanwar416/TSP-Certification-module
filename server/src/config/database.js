import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbDir = join(__dirname, '../../database');
const dbPath = join(dbDir, 'certificates.db');

// Ensure database directory exists
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Initialize database schema
const initDB = () => {
    db.exec(`
    CREATE TABLE IF NOT EXISTS certificates (
      id TEXT PRIMARY KEY,
      recipient_name TEXT NOT NULL,
      certificate_number TEXT UNIQUE NOT NULL,
      award_rera_number TEXT,
      description TEXT,
      phone_number TEXT,
      email TEXT,
      pdf_path TEXT,
      whatsapp_sent BOOLEAN DEFAULT 0,
      whatsapp_sent_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_certificate_number ON certificates(certificate_number);
    CREATE INDEX IF NOT EXISTS idx_created_at ON certificates(created_at);
    CREATE INDEX IF NOT EXISTS idx_whatsapp_sent ON certificates(whatsapp_sent);
  `);

    console.log('✅ Database initialized successfully');
};

// Initialize on import
initDB();

export default db;
