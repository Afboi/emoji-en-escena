import type { GameState, PublicState, Question, Team, TimerState } from "./types";

export const uid = () => Math.random().toString(36).slice(2, 10);

export function makeRoomCode(): string {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  let c = "";
  for (let i = 0; i < 4; i++) c += letters[Math.floor(Math.random() * letters.length)];
  return c;
}

export function timerRemaining(t: TimerState, now: number): number {
  if (t.running && t.endsAt !== null) return Math.max(0, t.endsAt - now);
  return t.remainingMs;
}

export function startTimer(t: TimerState, now: number): TimerState {
  if (t.running) return t;
  const rem = t.remainingMs > 0 ? t.remainingMs : t.duration * 1000;
  return { ...t, running: true, endsAt: now + rem, remainingMs: rem };
}

export function pauseTimer(t: TimerState, now: number): TimerState {
  if (!t.running) return t;
  return { ...t, running: false, endsAt: null, remainingMs: timerRemaining(t, now) };
}

export function resetTimer(t: TimerState): TimerState {
  return { ...t, running: false, endsAt: null, remainingMs: t.duration * 1000 };
}

export function roundInfo(index: number, total: number, rounds: number) {
  const per = Math.max(1, Math.min(20, Math.floor(rounds) || 10));
  return { round: Math.floor(index / per) + 1, per, inRound: (index % per) + 1 };
}

export function goTo(s: GameState, index: number): GameState {
  const i = Math.max(0, Math.min(index, s.playlist.length - 1));
  return { ...s, index: i, cluesShown: 0, answerShown: false, showScoreboard: false, scoreTitle: null, timer: resetTimer(s.timer) };
}

export function newGame(room: string, playlist: Question[] = []): GameState {
  return {
    room,
    title: "Emoji en Escena",
    status: "idle",
    rounds: 10,
    playlist,
    index: 0,
    cluesShown: 0,
    answerShown: false,
    showScoreboard: false,
    scoreTitle: null,
    teams: [],
    timer: { enabled: true, duration: 45, running: false, endsAt: null, remainingMs: 45000 },
    resumeTimer: false,
    updatedAt: Date.now(),
    theatreJoinOpen: false,\n    theatreMode: false,
  };
}

export function adjustScore(teams: Team[], id: string, delta: number): Team[] {
  return teams.map((t) => (t.id === id ? { ...t, score: t.score + delta } : t));
}

export function leaders(teams: Team[]): Team[] {
  if (teams.length === 0) return [];
  const max = Math.max(...teams.map((t) => t.score));
  return teams.filter((t) => t.score === max);
}

function str(v: unknown, d = ""): string {
  return typeof v === "string" ? v : d;
}

export function normalizeQuestion(raw: unknown): Question | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const emojis = str(r["emojis"]).trim();
  const answer = str(r["answer"]).trim();
  if (!emojis || !answer) return null;
  const diff = str(r["difficulty"]);
  return {
    id: str(r["id"]) || uid(),
    emojis,
    answer,
    category: str(r["category"], "General"),
    difficulty: diff === "fácil" || diff === "difícil" ? diff : "media",
    kind: str(r["kind"]) === "serie" ? "serie" : "película",
    clues: Array.isArray(r["clues"]) ? r["clues"].filter((c): c is string => typeof c === "string" && c.trim() !== "") : [],
    solution: str(r["solution"]),
    notes: str(r["notes"]),
  };
}

export function parseBank(text: string): Question[] {
  const data: unknown = JSON.parse(text);
  const list = Array.isArray(data) ? data : (data as Record<string, unknown>)?.["questions"];
  if (!Array.isArray(list)) throw new Error("El archivo no contiene una lista de preguntas.");
  const out = list.map(normalizeQuestion).filter((q): q is Question => q !== null);
  if (out.length === 0) throw new Error("No se encontraron preguntas válidas.");
  return out;
}

export function nextStep(s: GameState): GameState {
  if (s.playlist.length === 0) return s;
  if (s.showScoreboard && s.scoreTitle) return goTo(s, s.index + 1);
  if (s.index >= s.playlist.length - 1) return { ...s, status: "finished", timer: pauseTimer(s.timer, Date.now()) };
  const info = roundInfo(s.index, s.playlist.length, s.rounds);
  if (info.inRound === info.per) {
    return { ...s, showScoreboard: true, scoreTitle: `Fin de la ronda ${info.round}`, timer: pauseTimer(s.timer, Date.now()) };
  }
  return goTo(s, s.index + 1);
}

export function restartRound(s: GameState): GameState {
  const info = roundInfo(s.index, s.playlist.length, s.rounds);
  return goTo(s, (info.round - 1) * info.per);
}

/** Recorta el estado privado a lo que puede ver el público. `offset` = reloj servidor − reloj local. */
export function toPublic(s: GameState, offset: number): PublicState {
  const q = s.playlist[s.index];
  const total = s.playlist.length;
  const info = roundInfo(s.index, total, s.rounds);
  const showQ = s.status === "playing" || s.status === "paused";
  return {
    room: s.room,
    title: s.title,
    status: s.status,
    index: s.index,
    total,
    round: info.round,
    totalRounds: Math.max(1, Math.ceil(total / info.per)),
    inRound: info.inRound,
    roundSize: Math.min(info.per, total - (info.round - 1) * info.per),
    current:
      q && showQ
        ? {
            emojis: q.emojis,
            kind: q.kind,
            category: q.category,
            clues: q.clues.slice(0, s.cluesShown),
            cluesTotal: q.clues.length,
            answer: s.answerShown ? q.answer : null,
            solution: s.answerShown ? q.solution || null : null,
          }
        : null,
    answerShown: s.answerShown,
    showScoreboard: s.showScoreboard,
    scoreTitle: s.scoreTitle,
    teams: s.teams,
    timer: { ...s.timer, endsAt: s.timer.endsAt === null ? null : s.timer.endsAt + offset },
    updatedAt: s.updatedAt,
    theatreJoinOpen: s.theatreJoinOpen === true,\n    theatreMode: s.theatreMode === true,
  };
}