// events.jsonl is the source of truth: append-only, one event per line.
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import type { Event } from "./game";

export type Logged = Event & { at: string };

export const LOG_PATH = process.env.SKOGAI_RPG_LOG ?? `${import.meta.dir}/../data/events.jsonl`;

export function append(e: Event, path = LOG_PATH): Logged {
  const logged = { at: new Date().toISOString(), ...e };
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, JSON.stringify(logged) + "\n");
  return logged;
}

export function readAll(path = LOG_PATH): Logged[] {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}
