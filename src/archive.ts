// Optional long-term storage: rebuild a SQLite archive from events.jsonl.
// The archive is derived, so every run replaces it wholesale.
import { Database } from "bun:sqlite";
import { readAll, LOG_PATH } from "./store";

const dbPath = process.argv[2] ?? LOG_PATH.replace(/\.jsonl$/, ".sqlite");
const events = readAll();
const db = new Database(dbPath, { create: true });

db.transaction(() => {
  db.run("DROP VIEW IF EXISTS profiles");
  db.run("DROP TABLE IF EXISTS events");
  db.run("CREATE TABLE events (seq INTEGER PRIMARY KEY, at TEXT, room TEXT, type TEXT, json TEXT)");
  const insert = db.prepare("INSERT INTO events (at, room, type, json) VALUES (?, ?, ?, ?)");
  for (const e of events) insert.run(e.at, e.room, e.type, JSON.stringify(e));
  db.run(`CREATE VIEW profiles AS
    SELECT json ->> 'player' AS player,
           (SELECT j.json ->> 'name' FROM events j
             WHERE j.type = 'player_joined' AND j.json ->> 'player' = e.json ->> 'player'
             ORDER BY j.seq DESC LIMIT 1) AS name,
           SUM(json ->> 'xp') AS xp
      FROM events e WHERE type = 'xp_awarded' GROUP BY player`);
})();

console.log(`archived ${events.length} events -> ${dbPath}`);
