/**
 * JWT secret for signing and verifying tokens.
 * In production, JWT_SECRET must be set. In development, a fixed default avoids
 * cryptic "Failed to create user" errors when .env is missing that variable.
 */
export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (secret && String(secret).trim().length > 0) {
    return String(secret).trim();
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'JWT_SECRET is required in production. Set it in backend/.env (see .env.example).'
    );
  }
  console.warn(
    '[sheetnext] JWT_SECRET is unset; using a development-only default. Set JWT_SECRET in backend/.env.'
  );
  return '__sheetnext_dev_jwt_secret_change_me__';
}
