# skogai-rpg

Pixel hacker party RPG: the TV shows the quest, phones are controllers.

    bun run dev        # tv at http://localhost:3000/, phones join via the LAN url it prints
    bun test
    bun run archive    # optional: rebuild data/events.sqlite from data/events.jsonl

- `src/game.ts`: pure reducer, room state = fold over events
- `src/server.ts`: Bun HTTP + WebSocket, rooms in memory, JSON `{type, ...}` messages
- `src/store.ts`: `data/events.jsonl`, append-only source of truth
- `quests/*.json`: steps are `choice` (answer index) or `text` (regex match), checked on the server
- `public/`: `tv.html`, `play.html`, styled with `design/`
