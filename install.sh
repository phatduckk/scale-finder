#!/usr/bin/env bash
set -e

echo ""
echo "=== Scale Finder — Install ==="
echo ""

# ── Node deps ──────────────────────────────────────────────────────────────────
echo "Installing Node.js dependencies..."
npm install
echo "Done."

# ── DB credentials ─────────────────────────────────────────────────────────────
echo ""
echo "MySQL setup (press Enter to use defaults)"
read -rp "  Host     [localhost]: " DB_HOST
read -rp "  User     [root]:      " DB_USER
read -rsp "  Password [blank]:     " DB_PASS
echo ""

DB_HOST="${DB_HOST:-localhost}"
DB_USER="${DB_USER:-root}"

MY=( mysql -h "$DB_HOST" -u "$DB_USER" )
[ -n "$DB_PASS" ] && MY+=( "-p${DB_PASS}" )

# ── Test connection ─────────────────────────────────────────────────────────────
echo ""
echo "Testing connection..."
if ! "${MY[@]}" -e "SELECT 1;" &>/dev/null; then
  echo "  ERROR: Could not connect to MySQL. Check credentials and try again."
  exit 1
fi
echo "  OK."

# ── Schema (idempotent — never drops existing data) ────────────────────────────
echo "Setting up database and schema..."

"${MY[@]}" <<'SQL'
CREATE DATABASE IF NOT EXISTS scales
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'scales'@'localhost' IDENTIFIED BY '';
GRANT ALL PRIVILEGES ON scales.* TO 'scales'@'localhost';
FLUSH PRIVILEGES;

USE scales;

CREATE TABLE IF NOT EXISTS songs (
  id         INT          NOT NULL AUTO_INCREMENT,
  name       VARCHAR(255) NOT NULL,
  notes      JSON         NOT NULL,
  scales     JSON         NULL,
  created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_name (name)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS settings (
  key_name   VARCHAR(64)  NOT NULL,
  value      VARCHAR(255) NOT NULL,
  PRIMARY KEY (key_name)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;
SQL

# If the table already existed, make sure charset/collation and unique key are applied.
# These are no-ops if already correct; errors are silenced so existing data is never lost.
"${MY[@]}" scales -e \
  "ALTER TABLE songs CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" \
  2>/dev/null || true

"${MY[@]}" scales -e \
  "ALTER TABLE songs ADD UNIQUE KEY uq_name (name);" \
  2>/dev/null || true

echo "  Done."
echo ""
echo "Start the server:  npm start"
echo "Then open:         http://localhost:3001"
echo ""
