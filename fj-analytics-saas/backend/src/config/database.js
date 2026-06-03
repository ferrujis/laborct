const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DB_PATH = process.env.DB_PATH || './data/fj-analytics.db';

let db = null;

function getDb() {
  if (!db) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    db = new sqlite3.Database(DB_PATH);
  }
  return db;
}

async function initializeDatabase() {
  const database = getDb();

  return new Promise((resolve, reject) => {
    database.serialize(() => {
      // Enable foreign keys
      database.run('PRAGMA foreign_keys = ON');

      // Create tenants table for multi-tenancy
      database.run(`
        CREATE TABLE IF NOT EXISTS tenants (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          domain TEXT UNIQUE,
          plan TEXT DEFAULT 'starter',
          settings TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) console.error('Error creating tenants table:', err);
      });

      // Create users table
      database.run(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          username TEXT NOT NULL,
          email TEXT,
          password TEXT NOT NULL,
          role TEXT DEFAULT 'viewer',
          is_active INTEGER DEFAULT 1,
          last_login DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (tenant_id) REFERENCES tenants(id),
          UNIQUE(tenant_id, username)
        )
      `, (err) => {
        if (err) console.error('Error creating users table:', err);
      });

      // Create sessions table for token management
      database.run(`
        CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          token TEXT NOT NULL,
          expires_at DATETIME NOT NULL,
          ip_address TEXT,
          user_agent TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `, (err) => {
        if (err) console.error('Error creating sessions table:', err);
      });

      // Create data_base table (production data)
      database.run(`
        CREATE TABLE IF NOT EXISTS data_base (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tenant_id TEXT NOT NULL,
          vet TEXT NOT NULL,
          prod REAL DEFAULT 0,
          rawProd REAL DEFAULT 0,
          valFixo REAL DEFAULT 0,
          valVar REAL DEFAULT 0,
          valTotal REAL DEFAULT 0,
          sem TEXT,
          data TEXT,
          mes TEXT,
          horas REAL DEFAULT 0,
          hNorm REAL DEFAULT 0,
          hNot REAL DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (tenant_id) REFERENCES tenants(id)
        )
      `, (err) => {
        if (err) console.error('Error creating data_base table:', err);
      });

      // Create data_anal table
      database.run(`
        CREATE TABLE IF NOT EXISTS data_anal (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tenant_id TEXT NOT NULL,
          category TEXT NOT NULL,
          vet TEXT,
          proc TEXT,
          pet TEXT,
          valL REAL DEFAULT 0,
          valT REAL DEFAULT 0,
          data TEXT,
          mes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (tenant_id) REFERENCES tenants(id)
        )
      `, (err) => {
        if (err) console.error('Error creating data_anal table:', err);
      });

      // Create data_cogs table
      database.run(`
        CREATE TABLE IF NOT EXISTS data_cogs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tenant_id TEXT NOT NULL,
          data TEXT,
          mes TEXT,
          cat TEXT,
          forn TEXT,
          val REAL DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (tenant_id) REFERENCES tenants(id)
        )
      `, (err) => {
        if (err) console.error('Error creating data_cogs table:', err);
      });

      // Create escala mapping table
      database.run(`
        CREATE TABLE IF NOT EXISTS escala_mappings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tenant_id TEXT NOT NULL,
          escala_name TEXT NOT NULL,
          vet_login TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(tenant_id, escala_name),
          FOREIGN KEY (tenant_id) REFERENCES tenants(id)
        )
      `, (err) => {
        if (err) console.error('Error creating escala_mappings table:', err);
      });

      // Create access_logs table for audit trail
      database.run(`
        CREATE TABLE IF NOT EXISTS access_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tenant_id TEXT NOT NULL,
          user_id TEXT,
          user TEXT,
          action TEXT NOT NULL,
          details TEXT,
          ip_address TEXT,
          user_agent TEXT,
          location TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (tenant_id) REFERENCES tenants(id)
        )
      `, (err) => {
        if (err) console.error('Error creating access_logs table:', err);
      });

      // Create meta table for storing file metadata
      database.run(`
        CREATE TABLE IF NOT EXISTS meta (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tenant_id TEXT NOT NULL,
          key TEXT NOT NULL,
          value TEXT,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(tenant_id, key),
          FOREIGN KEY (tenant_id) REFERENCES tenants(id)
        )
      `, (err) => {
        if (err) console.log('Error creating meta table:', err);
      });

      // Create indexes for better query performance
      database.run('CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id)');
      database.run('CREATE INDEX IF NOT EXISTS idx_data_base_tenant ON data_base(tenant_id)');
      database.run('CREATE INDEX IF NOT EXISTS idx_data_anal_tenant ON data_anal(tenant_id)');
      database.run('CREATE INDEX IF NOT EXISTS idx_data_cogs_tenant ON data_cogs(tenant_id)');
      database.run('CREATE INDEX IF NOT EXISTS idx_logs_tenant ON access_logs(tenant_id)');
      database.run('CREATE INDEX IF NOT EXISTS idx_data_base_mes ON data_base(mes)');
      database.run('CREATE INDEX IF NOT EXISTS idx_data_base_vet ON data_base(vet)');
      database.run('CREATE INDEX IF NOT EXISTS idx_data_anal_mes ON data_anal(mes)');
      database.run('CREATE INDEX IF NOT EXISTS idx_data_cogs_mes ON data_cogs(mes)');

      // Create default tenant if not exists
      database.get('SELECT id FROM tenants WHERE id = ?', ['default'], (err, row) => {
        if (!row) {
          const { v4: uuidv4 } = require('uuid');
          const defaultTenantId = 'default';
          database.run(
            'INSERT INTO tenants (id, name, domain, plan) VALUES (?, ?, ?, ?)',
            [defaultTenantId, 'Default Organization', 'localhost', 'starter'],
            (err) => {
              if (err) console.log('Error creating default tenant:', err);
              else console.log('✓ Default tenant created');
            }
          );

          // Create admin user if not exists
          const tenantId = defaultTenantId;
          database.get(
            'SELECT id FROM users WHERE tenant_id = ? AND role = ?',
            [tenantId, 'admin'],
            (err, adminRow) => {
              if (!adminRow) {
                const adminId = require('uuid').v4();
                const hashedPassword = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'Admin123!ChangeMe', 10);
                database.run(
                  'INSERT INTO users (id, tenant_id, username, email, password, role) VALUES (?, ?, ?, ?, ?, ?)',
                  [adminId, tenantId, 'admin', process.env.ADMIN_EMAIL || 'admin@fj-analytics.com', hashedPassword, 'admin'],
                  (err) => {
                    if (err) console.error('Error creating admin user:', err);
                    else console.log('✓ Admin user created');
                  }
                );
              }
            }
          );
        }
      });

      resolve(database);
    });
  });
}

function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = {
  getDb,
  initializeDatabase,
  closeDatabase
};
