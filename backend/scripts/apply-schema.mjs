/**
 * Apply database/schema.sql using credentials from backend/.env.
 * Requires `psql` on PATH (PostgreSQL client).
 *
 * If you see "permission denied for schema public", run as superuser first:
 *   psql -U postgres -d sheetnext -v ON_ERROR_STOP=1 -f database/grant-public-to-app-user.sql
 */
import dotenv from 'dotenv';
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const schemaPath = path.join(__dirname, '../database/schema.sql');

function findPsql() {
  if (process.platform === 'win32') {
    const bases = [18, 17, 16, 15]
      .map((v) => `C:\\Program Files\\PostgreSQL\\${v}\\bin\\psql.exe`)
      .filter((p) => fs.existsSync(p));
    if (bases.length) return bases[0];
  }
  return 'psql';
}

const psqlBin = findPsql();
const args = [
  '-h', process.env.DB_HOST || 'localhost',
  '-p', String(process.env.DB_PORT || 5432),
  '-U', process.env.DB_USER || 'sheetnext',
  '-d', process.env.DB_NAME || 'sheetnext',
  '-v', 'ON_ERROR_STOP=1',
  '-f', schemaPath,
];

const result = spawnSync(psqlBin, args, {
  env: { ...process.env, PGPASSWORD: process.env.DB_PASSWORD ?? '' },
  stdio: 'inherit',
});

if (result.error) {
  console.error(result.error.message);
  console.error('Install PostgreSQL client tools or add psql to PATH.');
  process.exit(1);
}

process.exit(result.status === 0 ? 0 : 1);
