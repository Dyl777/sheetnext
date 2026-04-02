/**
 * Optional DB seed — register a demo user via the running API (not raw SQL),
 * so passwords are hashed correctly. Requires backend on PORT and existing schema.
 *
 * Usage:
 *   SHEETNEXT_SEED_EMAIL=test@example.com SHEETNEXT_SEED_PASSWORD=password123 node scripts/seed.js
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const base = process.env.SEED_API_URL || `http://127.0.0.1:${process.env.PORT || 3000}`;
const email = process.env.SHEETNEXT_SEED_EMAIL || 'test@example.com';
const password = process.env.SHEETNEXT_SEED_PASSWORD || 'password123';
const name = process.env.SHEETNEXT_SEED_NAME || 'Demo User';

try {
  const res = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name }),
  });
  const data = await res.json();
  if (!res.ok) {
    if (res.status === 400 && String(data.error || '').toLowerCase().includes('already')) {
      console.log('Seed skipped: user already exists:', email);
      process.exit(0);
    }
    console.error('Seed failed:', data.error || res.statusText);
    process.exit(1);
  }
  console.log('Seeded user:', email);
  process.exit(0);
} catch (e) {
  console.error('Seed failed (is the API running?):', e.message);
  process.exit(1);
}
