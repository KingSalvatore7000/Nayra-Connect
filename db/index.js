const fs = require('fs');
const path = require('path');
const config = require('../src/config');

let dbInstance = null;

function getDb() {
  if (dbInstance) return dbInstance;

  if (config.dbClient === 'mysql') {
    // Modular support for mysql2 if swapped in
    try {
      const mysql = require('mysql2/promise');
      const pool = mysql.createPool({
        host: config.mysql.host,
        user: config.mysql.user,
        password: config.mysql.password,
        database: config.mysql.database,
        port: config.mysql.port,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      });

      dbInstance = {
        type: 'mysql',
        all: async (sql, params = []) => {
          const [rows] = await pool.execute(sql, params);
          return rows;
        },
        get: async (sql, params = []) => {
          const [rows] = await pool.execute(sql, params);
          return rows[0] || null;
        },
        run: async (sql, params = []) => {
          const [result] = await pool.execute(sql, params);
          return {
            changes: result.affectedRows,
            lastInsertRowid: result.insertId
          };
        },
        exec: async (sql) => {
          const statements = sql.split(';').map(s => s.trim()).filter(Boolean);
          for (const stmt of statements) {
            await pool.query(stmt);
          }
        },
        close: async () => {
          await pool.end();
          dbInstance = null;
        }
      };
      return dbInstance;
    } catch (err) {
      console.error('MySQL client requested but mysql2 module not available or connection failed:', err);
      throw err;
    }
  }

  // Default: SQLite via better-sqlite3 (synchronous, reliable, zero setup)
  const Database = require('better-sqlite3');
  const dbPath = path.isAbsolute(config.dbPath)
    ? config.dbPath
    : path.join(__dirname, '..', config.dbPath);

  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  dbInstance = {
    type: 'sqlite',
    all: (sql, params = []) => {
      const stmt = sqlite.prepare(sql);
      return stmt.all(params);
    },
    get: (sql, params = []) => {
      const stmt = sqlite.prepare(sql);
      return stmt.get(params);
    },
    run: (sql, params = []) => {
      const stmt = sqlite.prepare(sql);
      const info = stmt.run(params);
      return {
        changes: info.changes,
        lastInsertRowid: info.lastInsertRowid
      };
    },
    exec: (sql) => {
      return sqlite.exec(sql);
    },
    close: () => {
      sqlite.close();
      dbInstance = null;
    }
  };

  return dbInstance;
}

function initDb() {
  const db = getDb();
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schemaSql);
  return db;
}

module.exports = {
  getDb,
  initDb
};
