CREATE TABLE IF NOT EXISTS stories (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL CHECK(length(text) BETWEEN 5 AND 1500),
  category TEXT NOT NULL,
  created_at TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  reports INTEGER NOT NULL DEFAULT 0,
  hidden INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_stories_created_at ON stories(created_at);
CREATE INDEX IF NOT EXISTS idx_stories_ip_created ON stories(ip_hash, created_at);
