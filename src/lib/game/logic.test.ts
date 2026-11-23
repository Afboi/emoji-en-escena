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
  it("agrupa diez preguntas por ronda", () => {
    expect(roundInfo(9, 26, 10)).toEqual({ round: 1, per: 10, inRound: 10 });
    expect(roundInfo(10, 26, 10)).toEqual({ round: 2, per: 10, inRound: 1 });
  });
  it("cambiar de pregunta oculta pistas y respuesta", () => {
    const s = { ...newGame("A", SAMPLE_QUESTIONS), cluesShown: 2, answerShown: true };
    const n = goTo(s, 1);
    expect([n.index, n.cluesShown, n.answerShown]).toEqual([1, 0, false]);
    expect(goTo(s, 99).index).toBe(35);
  });
  it("puntos y empates", () => {
    const g = newGame("A");
    const participants = [{ id: "p1", name: "Vera", score: 0 }, { id: "p2", name: "Daniel", score: 0 }];
    const [a, b] = participants;
    let teams = adjustScore(participants, a!.id, 3);
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
    const s = { ...newGame("A", SAMPLE_QUESTIONS), rounds: 10, status: "playing" as const, index: 3 };
    const end = nextStep(s);
    expect([end.showScoreboard, end.scoreTitle, end.index]).toEqual([true, "Fin de la ronda 1", 3]);
    expect(nextStep(end).index).toBe(4);
  });
});