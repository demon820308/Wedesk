-- Wedesk Cloudflare D1 Database Schema
CREATE TABLE IF NOT EXISTS desk_user (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  remark TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_desk_user_uuid ON desk_user (uuid);
