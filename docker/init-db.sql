-- Create least-privilege application role
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'studyroom_app') THEN
    CREATE ROLE studyroom_app LOGIN PASSWORD 'localdev_app';
  END IF;
END $$;

GRANT CONNECT ON DATABASE studyroom TO studyroom_app;
GRANT USAGE ON SCHEMA public TO studyroom_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO studyroom_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO studyroom_app;

-- Test database for integration tests
CREATE DATABASE studyroom_test OWNER studyroom_admin;
\connect studyroom_test
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'studyroom_app') THEN
    CREATE ROLE studyroom_app LOGIN PASSWORD 'localdev_app';
  END IF;
END $$;
GRANT CONNECT ON DATABASE studyroom_test TO studyroom_app;
GRANT USAGE ON SCHEMA public TO studyroom_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO studyroom_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO studyroom_app;
