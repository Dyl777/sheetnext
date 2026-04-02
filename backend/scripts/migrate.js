/**
 * SheetNext has no versioned migration history yet; schema is applied via apply-schema.mjs.
 * This script runs the same step so `npm run db:migrate` works as documented.
 */
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaScript = path.join(__dirname, 'apply-schema.mjs');
const backendRoot = path.join(__dirname, '..');

const result = spawnSync(process.execPath, [schemaScript], {
  cwd: backendRoot,
  stdio: 'inherit',
  env: process.env,
});

process.exit(result.status === 0 ? 0 : 1);
