// Pure game logic: every state is a fold over events. No I/O here.

export type ChoiceStep = { kind: "choice"; prompt: string; choices: string[]; answer: number; xp: number };
export type TextStep = { kind: "text"; prompt: string; match: string; hint?: string; xp: number };
export type Step = ChoiceStep | TextStep;
export type Cabinet = "sudo-hero" | "wifi-wizards" | "honkers-hackers" | "skognet-syndicate";
export type Quest = { id: string; title: string; cabinet?: Cabinet; steps: Step[] };

export type Player = { name: string; connected: boolean; answer: string | number | null; xp: number };
export type Phase = "lobby" | "step" | "reveal" | "done";
export type Room = { code: string; phase: Phase; quest: string | null; step: number; players: Record<string, Player> };

export type Event =
  | { type: "room_opened"; room: string }
  | { type: "player_joined"; room: string; player: string; name: string }
  | { type: "player_left"; room: string; player: string }
  | { type: "quest_started"; room: string; quest: string }
  | { type: "answered"; room: string; player: string; value: string | number }
  | { type: "step_revealed"; room: string }
  | { type: "xp_awarded"; room: string; player: string; xp: number }
  | { type: "step_advanced"; room: string; done: boolean };

export type Profile = { name: string; xp: number };

export const emptyRoom = (code: string): Room => ({ code, phase: "lobby", quest: null, step: 0, players: {} });

const mapPlayers = (room: Room, f: (p: Player) => Player): Record<string, Player> =>
  Object.fromEntries(Object.entries(room.players).map(([id, p]) => [id, f(p)]));

const clearAnswers = (room: Room) => mapPlayers(room, (p) => ({ ...p, answer: null }));

export function reduce(room: Room, e: Event): Room {
  switch (e.type) {
    case "room_opened":
      return emptyRoom(e.room);
    case "player_joined": {
      const prev = room.players[e.player] ?? { name: e.name, connected: true, answer: null, xp: 0 };
      return { ...room, players: { ...room.players, [e.player]: { ...prev, name: e.name, connected: true } } };
    }
    case "player_left": {
      const prev = room.players[e.player];
      if (!prev) return room;
      return { ...room, players: { ...room.players, [e.player]: { ...prev, connected: false } } };
    }
    case "quest_started":
      return { ...room, phase: "step", quest: e.quest, step: 0, players: clearAnswers(room) };
    case "answered": {
      const prev = room.players[e.player];
      if (room.phase !== "step" || !prev) return room;
      return { ...room, players: { ...room.players, [e.player]: { ...prev, answer: e.value } } };
    }
    case "step_revealed":
      return { ...room, phase: "reveal" };
    case "xp_awarded": {
      const prev = room.players[e.player];
      if (!prev) return room;
      return { ...room, players: { ...room.players, [e.player]: { ...prev, xp: prev.xp + e.xp } } };
    }
    case "step_advanced":
      return e.done
        ? { ...room, phase: "done" }
        : { ...room, phase: "step", step: room.step + 1, players: clearAnswers(room) };
  }
}

// Lifetime profiles, folded from the whole event log.
export function reduceProfiles(profiles: Record<string, Profile>, e: Event): Record<string, Profile> {
  if (e.type === "player_joined") {
    const prev = profiles[e.player] ?? { name: e.name, xp: 0 };
    return { ...profiles, [e.player]: { ...prev, name: e.name } };
  }
  if (e.type === "xp_awarded") {
    const prev = profiles[e.player] ?? { name: "?", xp: 0 };
    return { ...profiles, [e.player]: { ...prev, xp: prev.xp + e.xp } };
  }
  return profiles;
}

export function check(step: Step, value: string | number | null): boolean {
  if (value === null) return false;
  if (step.kind === "choice") return Number(value) === step.answer;
  return new RegExp(step.match).test(String(value).trim());
}

export function score(room: Room, quest: Quest): Event[] {
  const step = quest.steps[room.step];
  if (!step) return [];
  return Object.entries(room.players)
    .filter(([, p]) => check(step, p.answer))
    .map(([player]) => ({ type: "xp_awarded", room: room.code, player, xp: step.xp }));
}

export const allAnswered = (room: Room) => {
  const live = Object.values(room.players).filter((p) => p.connected);
  return live.length > 0 && live.every((p) => p.answer !== null);
};

const summary = (q: Quest) => ({
  id: q.id,
  title: q.title,
  cabinet: q.cabinet ?? "sudo-hero",
  steps: q.steps.map((s) => ({ kind: s.kind, xp: s.xp })),
  maxXp: q.steps.reduce((n, s) => n + s.xp, 0),
});

// What clients see. Answers stay hidden until reveal.
export function view(room: Room, quests: Record<string, Quest>, profiles: Record<string, Profile>) {
  const quest = room.quest ? quests[room.quest] : undefined;
  const step = quest?.steps[room.step];
  const revealed = room.phase === "reveal" || room.phase === "done";
  return {
    code: room.code,
    phase: room.phase,
    quests: Object.values(quests).map(summary),
    quest: quest ? summary(quest) : null,
    step: step && {
      index: room.step,
      kind: step.kind,
      prompt: step.prompt,
      xp: step.xp,
      choices: step.kind === "choice" ? step.choices : undefined,
      hint: step.kind === "text" ? step.hint : undefined,
      answer: revealed ? (step.kind === "choice" ? step.answer : step.hint ?? step.match) : undefined,
    },
    players: Object.entries(room.players).map(([id, p]) => ({
      id,
      name: p.name,
      connected: p.connected,
      answered: p.answer !== null,
      correct: revealed && step ? check(step, p.answer) : undefined,
      xp: p.xp,
      lifetime: profiles[id]?.xp ?? 0,
    })),
  };
}
