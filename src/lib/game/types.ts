export type Difficulty = "fácil" | "media" | "difícil";
export type Kind = "película" | "serie";

export interface Question {
  id: string;
  emojis: string;
  answer: string;
  category: string;
  difficulty: Difficulty;
  kind: Kind;
  clues: string[];
  solution: string;
  notes: string; // solo para el MC, nunca llega a la pantalla
}

export interface Team {
  id: string;
  name: string;
  score: number;
}

export interface TimerState {
  enabled: boolean;
  duration: number; // segundos
  running: boolean;
  endsAt: number | null;
  remainingMs: number;
}

export type GameStatus = "idle" | "ready" | "playing" | "paused" | "finished";

/** Estado privado completo: vive solo en el centro de comando. */
export interface GameState {
  room: string;
  title: string;
  status: GameStatus;
  rounds: number;
  playlist: Question[];
  index: number;
  cluesShown: number;
  answerShown: boolean;
  showScoreboard: boolean;
  scoreTitle: string | null;
  teams: Team[];
  timer: TimerState;
  resumeTimer: boolean;
  updatedAt: number;
}

/** Lo único que recibe la pantalla pública: sin respuesta ni pistas ocultas. */
export interface PublicQuestion {
  emojis: string;
  kind: Kind;
  category: string;
  clues: string[];
  cluesTotal: number;
  answer: string | null;
  solution: string | null;
}

export interface PublicState {
  room: string;
  title: string;
  status: GameStatus;
  index: number;
  total: number;
  round: number;
  totalRounds: number;
  inRound: number;
  roundSize: number;
  current: PublicQuestion | null;
  answerShown: boolean;
  showScoreboard: boolean;
  scoreTitle: string | null;
  teams: Team[];
  timer: TimerState; // endsAt en reloj del servidor
  updatedAt: number;
}