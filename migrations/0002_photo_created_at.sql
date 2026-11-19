-- Wanneer een foto is geüpload, zodat losse foto's na een dag kunnen worden opgeruimd.
ALTER TABLE photos ADD COLUMN created_at TEXT NOT NULL DEFAULT '1970-01-01T00:00:00.000Z';
