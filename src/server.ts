// Room server: serves the TV and phone pages, holds rooms in memory,
// and speaks JSON over one WebSocket at /ws.
import type { ServerWebSocket } from "bun";
import { readdirSync, readFileSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { join, normalize } from "node:path";
import {
  allAnswered, emptyRoom, reduce, reduceProfiles, score, view,
  type Event, type Profile, type Quest, type Room,
} from "./game";
import { append, readAll } from "./store";

const ROOT = join(import.meta.dir, "..");
const PORT = Number(process.env.PORT ?? 3000);

const quests: Record<string, Quest> = Object.fromEntries(
  readdirSync(join(ROOT, "quests"))
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(ROOT, "quests", f), "utf8")) as Quest)
    .map((q) => [q.id, q]),
);

let profiles: Record<string, Profile> = readAll().reduce(reduceProfiles, {});
const rooms = new Map<string, Room>();
// Latest socket per room+player, so a stale socket closing after a rejoin is ignored.
const sockets = new Map<string, Ws>();

type Data = { room?: string; player?: string; host?: boolean };
type Ws = ServerWebSocket<Data>;

const send = (ws: Ws, msg: object) => ws.send(JSON.stringify(msg));

function emit(e: Event) {
  append(e);
  profiles = reduceProfiles(profiles, e);
  rooms.set(e.room, reduce(rooms.get(e.room) ?? emptyRoom(e.room), e));
}

function broadcast(code: string) {
  const room = rooms.get(code);
  if (room) server.publish(code, JSON.stringify({ type: "state", state: view(room, quests, profiles) }));
}

function newCode(): string {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  let code: string;
  do code = Array.from({ length: 4 }, () => letters[Math.floor(Math.random() * letters.length)]).join("");
  while (rooms.has(code));
  return code;
}

// Public player id derived from the secret rejoin token kept on the phone.
const playerId = (token: string) => new Bun.CryptoHasher("sha256").update(token).digest("hex").slice(0, 12);

function lanUrl(): string {
  const ip = Object.values(networkInterfaces()).flat()
    .find((i) => i && i.family === "IPv4" && !i.internal)?.address ?? "localhost";
  return `http://${ip}:${PORT}/play`;
}

function reveal(code: string) {
  emit({ type: "step_revealed", room: code });
  const room = rooms.get(code)!;
  for (const e of score(room, quests[room.quest!])) emit(e);
}

function handle(ws: Ws, msg: any) {
  const code = ws.data.room;
  const room = code ? rooms.get(code) : undefined;

  switch (msg.type) {
    case "host": {
      const reclaim = typeof msg.room === "string" && rooms.has(msg.room);
      const c = reclaim ? msg.room : newCode();
      if (!reclaim) emit({ type: "room_opened", room: c });
      ws.data = { room: c, host: true };
      ws.subscribe(c);
      send(ws, { type: "hosted", room: c, joinUrl: lanUrl() });
      return broadcast(c);
    }
    case "join": {
      const c = String(msg.room ?? "").toUpperCase();
      const name = String(msg.name ?? "").trim().slice(0, 16);
      if (!rooms.has(c)) return send(ws, { type: "error", message: "no such room" });
      if (!name || typeof msg.token !== "string") return send(ws, { type: "error", message: "name required" });
      const player = playerId(msg.token);
      emit({ type: "player_joined", room: c, player, name });
      ws.data = { room: c, player };
      sockets.set(`${c}:${player}`, ws);
      ws.subscribe(c);
      send(ws, { type: "joined", room: c, player });
      return broadcast(c);
    }
  }

  if (!room || !code) return send(ws, { type: "error", message: "not in a room" });

  if (ws.data.host) {
    switch (msg.type) {
      case "start":
        if (!quests[msg.quest] || (room.phase !== "lobby" && room.phase !== "done")) return;
        emit({ type: "quest_started", room: code, quest: msg.quest });
        return broadcast(code);
      case "reveal":
        if (room.phase !== "step") return;
        reveal(code);
        return broadcast(code);
      case "next":
        if (room.phase !== "reveal") return;
        emit({ type: "step_advanced", room: code, done: room.step + 1 >= quests[room.quest!].steps.length });
        return broadcast(code);
    }
  }

  if (ws.data.player && msg.type === "answer") {
    if (room.phase !== "step" || room.players[ws.data.player]?.answer !== null) return;
    if (typeof msg.value !== "string" && typeof msg.value !== "number") return;
    emit({ type: "answered", room: code, player: ws.data.player, value: msg.value });
    if (allAnswered(rooms.get(code)!)) reveal(code);
    return broadcast(code);
  }
}

const pages: Record<string, string> = { "/": "public/tv.html", "/play": "public/play.html" };

const server = Bun.serve({
  port: PORT,
  async fetch(req, server) {
    const { pathname } = new URL(req.url);
    if (pathname === "/ws") {
      return server.upgrade(req, { data: {} as Data }) ? undefined : new Response("upgrade failed", { status: 400 });
    }
    const rel = pages[pathname] ?? normalize(pathname.slice(1));
    if (!/^(public|design)\//.test(rel)) return new Response("not found", { status: 404 });
    const file = Bun.file(join(ROOT, rel));
    return (await file.exists()) ? new Response(file) : new Response("not found", { status: 404 });
  },
  websocket: {
    data: {} as Data,
    message(ws: Ws, raw) {
      let msg;
      try { msg = JSON.parse(String(raw)); } catch { return send(ws, { type: "error", message: "bad json" }); }
      handle(ws, msg);
    },
    close(ws: Ws) {
      const { room, player } = ws.data;
      if (!room || !player || sockets.get(`${room}:${player}`) !== ws) return;
      sockets.delete(`${room}:${player}`);
      emit({ type: "player_left", room, player });
      broadcast(room);
    },
  },
});

console.log(`tv:    http://localhost:${server.port}/\nphone: ${lanUrl()}`);
