-- Fix "permission denied for schema public" for the app user.
-- Run once as a superuser (e.g. postgres), after CREATE DATABASE / CREATE USER:
--
--   psql -U postgres -d sheetnext -v ON_ERROR_STOP=1 -f database/grant-public-to-app-user.sql
--
-- Default app user name matches .env.example (change if yours differs).

GRANT USAGE ON SCHEMA public TO sheetnext;
GRANT CREATE ON SCHEMA public TO sheetnext;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO sheetnext;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO sheetnext;
