import { describe, expect, it } from "vitest";
import { adjustScore, goTo, leaders, newGame, pauseTimer, roundInfo, startTimer, timerRemaining } from "./logic";
import { SAMPLE_QUESTIONS } from "./sample";

describe("temporizador", () => {
  it("cuenta hacia atrás según la hora real y se pausa conservando el resto", () => {
    const t0 = newGame("ABCD").timer; // 45 s
    const running = startTimer(t0, 1000);
    expect(timerRemaining(running, 11000)).toBe(35000);
    const paused = pauseTimer(running, 11000);
    expect(timerRemaining(paused, 99999)).toBe(35000);
    expect(timerRemaining(startTimer(paused, 20000), 25000)).toBe(30000);
  });
  it("nunca baja de cero", () => {
    expect(timerRemaining(startTimer(newGame("A").timer, 0), 999999)).toBe(0);
  });
});

describe("partida", () => {
  it("12 preguntas en 3 rondas: la pregunta 5 es la primera de la ronda 2", () => {
    expect(roundInfo(4, 12, 3)).toEqual({ round: 2, per: 4, inRound: 1 });
  });
  it("cambiar de pregunta oculta pistas y respuesta", () => {
    const s = { ...newGame("A", SAMPLE_QUESTIONS), cluesShown: 2, answerShown: true };
    const n = goTo(s, 1);
    expect([n.index, n.cluesShown, n.answerShown]).toEqual([1, 0, false]);
    expect(goTo(s, 99).index).toBe(11);
  });
  it("puntos y empates", () => {
    const g = newGame("A");
    const [a, b] = g.teams;
    let teams = adjustScore(g.teams, a!.id, 3);
    teams = adjustScore(teams, b!.id, 3);
    expect(leaders(teams).length).toBe(2);
    expect(leaders(adjustScore(teams, b!.id, -1))[0]!.id).toBe(a!.id);
  });
});

import { nextStep, toPublic } from "./logic";
describe("pantalla pública", () => {
  it("no envía la respuesta ni pistas ocultas antes de revelarlas", () => {
    const s = { ...newGame("A", SAMPLE_QUESTIONS), status: "playing" as const, cluesShown: 1 };
    const p = toPublic(s, 0);
    expect(p.current?.answer).toBeNull();
    expect(p.current?.clues.length).toBe(1);
    expect(JSON.stringify(p)).not.toContain("El Rey León");
    expect(toPublic({ ...s, answerShown: true }, 0).current?.answer).toBe("El Rey León");
  });
  it("al cerrar una ronda muestra el marcador antes de seguir", () => {
    const s = { ...newGame("A", SAMPLE_QUESTIONS), rounds: 4, status: "playing" as const, index: 3 };
    const end = nextStep(s);
    expect([end.showScoreboard, end.scoreTitle, end.index]).toEqual([true, "Fin de la ronda 1", 3]);
    expect(nextStep(end).index).toBe(4);
  });
});