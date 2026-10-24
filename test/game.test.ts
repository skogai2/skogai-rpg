import { expect, test } from "bun:test";
import { allAnswered, check, emptyRoom, reduce, reduceProfiles, score, view, type Event, type Quest } from "../src/game";

const quest: Quest = {
  id: "q",
  title: "Q",
  steps: [
    { kind: "choice", prompt: "pick", choices: ["a", "b"], answer: 1, xp: 10 },
    { kind: "text", prompt: "type", match: "^30 7 \\* \\* \\*$", hint: "30 7 * * *", xp: 20 },
  ],
};

const run = (events: Event[]) => events.reduce(reduce, emptyRoom("ABCD"));

test("join, answer, score, advance", () => {
  let room = run([
    { type: "room_opened", room: "ABCD" },
    { type: "player_joined", room: "ABCD", player: "p1", name: "ada" },
    { type: "player_joined", room: "ABCD", player: "p2", name: "bob" },
    { type: "quest_started", room: "ABCD", quest: "q" },
    { type: "answered", room: "ABCD", player: "p1", value: 1 },
  ]);
  expect(allAnswered(room)).toBe(false);
  room = reduce(room, { type: "answered", room: "ABCD", player: "p2", value: 0 });
  expect(allAnswered(room)).toBe(true);

  const awards = score(room, quest);
  expect(awards).toEqual([{ type: "xp_awarded", room: "ABCD", player: "p1", xp: 10 }]);
  room = [{ type: "step_revealed", room: "ABCD" } as Event, ...awards].reduce(reduce, room);
  room = reduce(room, { type: "step_advanced", room: "ABCD", done: false });

  expect(room.phase).toBe("step");
  expect(room.step).toBe(1);
  expect(room.players.p1).toMatchObject({ xp: 10, answer: null });
});

test("text steps match by regex, trimmed", () => {
  expect(check(quest.steps[1], "  30 7 * * * ")).toBe(true);
  expect(check(quest.steps[1], "7 30 * * *")).toBe(false);
});

test("view hides the answer until reveal", () => {
  const room = run([
    { type: "player_joined", room: "ABCD", player: "p1", name: "ada" },
    { type: "quest_started", room: "ABCD", quest: "q" },
  ]);
  expect(view(room, { q: quest }, {}).step?.answer).toBeUndefined();
  expect(view(reduce(room, { type: "step_revealed", room: "ABCD" }), { q: quest }, {}).step?.answer).toBe(1);
});

test("disconnected players do not block allAnswered", () => {
  const room = run([
    { type: "player_joined", room: "ABCD", player: "p1", name: "ada" },
    { type: "player_joined", room: "ABCD", player: "p2", name: "bob" },
    { type: "quest_started", room: "ABCD", quest: "q" },
    { type: "player_left", room: "ABCD", player: "p2" },
    { type: "answered", room: "ABCD", player: "p1", value: 0 },
  ]);
  expect(allAnswered(room)).toBe(true);
});

test("profiles fold lifetime xp across rooms", () => {
  const events: Event[] = [
    { type: "player_joined", room: "A", player: "p1", name: "ada" },
    { type: "xp_awarded", room: "A", player: "p1", xp: 10 },
    { type: "player_joined", room: "B", player: "p1", name: "ada2" },
    { type: "xp_awarded", room: "B", player: "p1", xp: 5 },
  ];
  expect(events.reduce(reduceProfiles, {})).toEqual({ p1: { name: "ada2", xp: 15 } });
});
