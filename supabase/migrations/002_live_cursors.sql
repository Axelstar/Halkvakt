-- Livemotorns minne: senaste changeid per flöde (körs via Management API vid driftsättning)
CREATE TABLE IF NOT EXISTS live_cursors (
  feed text PRIMARY KEY,
  changeid text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
