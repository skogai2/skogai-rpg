# handover

where the last turn left off, written for whoever takes the next one. rewrite it when the state changes; an outdated handover is a wrong route.

## state

- the stack holds: immutable json events -> `events.jsonl` (append-only, the truth) -> folds for room state and lifetime xp -> optional sqlite archive. bun serves http and websockets. see README.md for the file map.
- the quiz runs end to end: tv hosts a room, phones join, two sample quests in `quests/`.
- the stack is treated as settled. nothing so far needs a bus, a backend or a framework beyond it.

## current turn

planning with skogix, not building. the focus is the one in SKOGAI.md: structure that guides agents to the next step. the game is where that gets practised.

directions raised, none chosen yet:

- quests as the unit of "next step": a prompt says where to go, a check says how we know, nothing says how.
- players (human or agent) as plain websocket clients, so writing a client is itself a quest.
- the path from "quiz with friends" toward a realtime game as the learning track.

## next step

wait for skogix's next thought. do not start code from the list above.
