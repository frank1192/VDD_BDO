const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', '..', 'data', 'vdd.db');

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Database wrapper to provide a similar API to better-sqlite3
let dbInstance = null;
let SQL = null;

// Wrapper class to provide better-sqlite3 compatible API
class DatabaseWrapper {
  constructor(sqlDb) {
    this._db = sqlDb;
  }

  exec(sql) {
    this._db.run(sql);
    this._save();
  }

  prepare(sql) {
    const self = this;
    return {
      run(...params) {
        self._db.run(sql, params);
        // Return lastInsertRowid for INSERT operations - get this BEFORE save
        const lastId = self._db.exec('SELECT last_insert_rowid() as id')[0];
        const changes = self._db.getRowsModified();
        self._save();
        return {
          lastInsertRowid: lastId ? lastId.values[0][0] : 0,
          changes: changes
        };
      },
      get(...params) {
        const stmt = self._db.prepare(sql);
        stmt.bind(params);
        if (stmt.step()) {
          const columns = stmt.getColumnNames();
          const values = stmt.get();
          stmt.free();
          const result = {};
          columns.forEach((col, i) => {
            result[col] = values[i];
          });
          return result;
        }
        stmt.free();
        return undefined;
      },
      all(...params) {
        const results = [];
        const stmt = self._db.prepare(sql);
        stmt.bind(params);
        while (stmt.step()) {
          const columns = stmt.getColumnNames();
          const values = stmt.get();
          const row = {};
          columns.forEach((col, i) => {
            row[col] = values[i];
          });
          results.push(row);
        }
        stmt.free();
        return results;
      }
    };
  }

  pragma(pragmaStr) {
    // sql.js doesn't support WAL mode, just ignore it
  }

  _save() {
    // Save to disk if we're not in a serverless environment
    // In Vercel, we keep it in memory only
    if (process.env.VERCEL !== '1') {
      try {
        const data = this._db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(dbPath, buffer);
      } catch (err) {
        console.error('Error saving database:', err.message);
      }
    }
  }
}

// Load or create database
function loadDatabase() {
  if (dbInstance) return dbInstance;
  
  if (!SQL) {
    throw new Error('SQL.js not initialized. Call initializeAsync() first.');
  }
  
  try {
    // Try to load existing database
    if (fs.existsSync(dbPath) && process.env.VERCEL !== '1') {
      const fileBuffer = fs.readFileSync(dbPath);
      dbInstance = new DatabaseWrapper(new SQL.Database(fileBuffer));
    } else {
      // Create new in-memory database
      dbInstance = new DatabaseWrapper(new SQL.Database());
    }
    return dbInstance;
  } catch (err) {
    console.error('Error loading database:', err.message);
    dbInstance = new DatabaseWrapper(new SQL.Database());
    return dbInstance;
  }
}

// Async initialization function
async function initializeAsync() {
  if (!SQL) {
    SQL = await initSqlJs();
  }
  loadDatabase();
  initializeTables();
}

// Synchronous initialize for backward compatibility
function initialize() {
  if (!SQL) {
    // If SQL.js not ready yet, initialize it synchronously
    // This is for backward compatibility with existing code
    console.log('Initializing SQL.js synchronously...');
    initSqlJs().then((sql) => {
      SQL = sql;
      loadDatabase();
      initializeTables();
    });
    return;
  }
  loadDatabase();
  initializeTables();
}

function initializeTables() {
  const db = loadDatabase();
  
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'analyst', 'coordinator', 'leader')),
      team_leader_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (team_leader_id) REFERENCES users(id)
    )
  `);

  // Indicators table
  db.exec(`
    CREATE TABLE IF NOT EXISTS indicators (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      roles TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // User indicator configuration (percentages per user per indicator)
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_indicator_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      indicator_id INTEGER NOT NULL,
      percentage REAL NOT NULL DEFAULT 0,
      global_value REAL,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (indicator_id) REFERENCES indicators(id),
      UNIQUE(user_id, indicator_id)
    )
  `);

  // Notes table (user scores per indicator)
  db.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      indicator_id INTEGER NOT NULL,
      value REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (indicator_id) REFERENCES indicators(id),
      UNIQUE(user_id, indicator_id)
    )
  `);

  // Calculation results cache
  db.exec(`
    CREATE TABLE IF NOT EXISTS calculation_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      final_score REAL,
      calculation_details TEXT,
      calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Insert default admin user if not exists
  const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!adminExists) {
    db.prepare(`
      INSERT INTO users (username, password, name, role)
      VALUES (?, ?, ?, ?)
    `).run('admin', 'admin123', 'Administrador', 'admin');
  }

  console.log('Base de datos inicializada correctamente');
}

// Getter for db that ensures it's loaded
const db = {
  get prepare() {
    return loadDatabase().prepare.bind(loadDatabase());
  },
  get exec() {
    return loadDatabase().exec.bind(loadDatabase());
  }
};

module.exports = {
  db,
  initialize,
  initializeAsync
};
