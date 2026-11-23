import { leaders, timerRemaining } from "@/lib/game/logic";
import type { PublicState } from "@/lib/game/types";

export const TEAM_BG = ["bg-team-1", "bg-team-2", "bg-team-3", "bg-team-4"];
export const TEAM_TEXT = ["text-team-1", "text-team-2", "text-team-3", "text-team-4"];

/** `now` debe estar en reloj del servidor (Date.now() + offset). */
function Timer({ state, now }: { state: PublicState; now: number }) {
  if (!state.timer.enabled) return null;
  const ms = timerRemaining(state.timer, now);
  const secs = Math.ceil(ms / 1000);
  const low = secs <= 10;
  const pct = state.timer.duration > 0 ? (ms / (state.timer.duration * 1000)) * 100 : 0;
  return (
    <div className="flex flex-col items-end gap-[0.6cqw]">
      <div className={`font-display text-[4.2cqw] font-black leading-none tabular-nums ${secs === 0 ? "text-primary anim-pulse-soft" : low ? "text-primary" : "text-highlight"}`}>
        {secs === 0 ? "¡Tiempo!" : `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`}
      </div>
      <div className="h-[0.5cqw] w-[14cqw] overflow-hidden rounded-full bg-secondary">
        <div className={`h-full rounded-full transition-[width] duration-200 ${low ? "bg-primary" : "bg-highlight"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Scoreboard({ state, title }: { state: PublicState; title: string }) {
  const sorted = [...state.teams].sort((a, b) => b.score - a.score);
  const max = Math.max(1, ...sorted.map((t) => t.score));
  return (
    <div className="flex h-full flex-col justify-center gap-[2cqw] px-[10cqw]">
      <p className="font-display text-[1.6cqw] font-bold tracking-[0.3em] text-muted-foreground">{state.title.toUpperCase()}</p>
      <h2 className="font-display text-[4.5cqw] font-black text-show-gradient anim-rise">{title}</h2>
      {sorted.length === 0 && <p className="text-[2cqw] text-muted-foreground">Sin participantes</p>}
      {sorted.map((t, i) => {
        const idx = state.teams.findIndex((x) => x.id === t.id) % 4;
        return (
          <div key={t.id} className="flex items-center gap-[2cqw] anim-rise" style={{ animationDelay: `${i * 90}ms` }}>
            <div className="w-[22cqw] truncate text-[2.4cqw] font-bold">{t.name}</div>
            <div className="h-[3.2cqw] flex-1 overflow-hidden rounded-full bg-secondary">
              <div className={`h-full rounded-full ${TEAM_BG[idx]} transition-[width] duration-700`} style={{ width: `${Math.max(4, (t.score / max) * 100)}%` }} />
            </div>
            <div className={`w-[8cqw] text-right font-display text-[3.4cqw] font-black tabular-nums ${TEAM_TEXT[idx]}`}>{t.score}</div>
          </div>
        );
      })}
    </div>
  );
}

export function Stage({ state, now, waiting }: { state: PublicState | null; now: number; waiting?: string | undefined }) {
  return (
    <div className="@container relative aspect-video w-full overflow-hidden bg-stage-gradient text-foreground select-none">
      <StageInner state={state} now={now} waiting={waiting} />
    </div>
  );
}

function StageInner({ state, now, waiting }: { state: PublicState | null; now: number; waiting?: string | undefined }) {
  if (!state) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-[2cqw]">
        <div className="text-[10cqw] anim-float">📡</div>
        <p className="font-display text-[3cqw] font-bold">{waiting ?? "Esperando al centro de comando…"}</p>
      </div>
    );
  }

  if (state.status === "finished") {
    const win = leaders(state.teams);
    return (
      <div className="flex h-full flex-col items-center justify-center gap-[2cqw] text-center">
        <div className="text-[9cqw] leading-none anim-pop">🏆</div>
        <p className="font-display text-[2.4cqw] font-bold tracking-[0.25em] text-muted-foreground">{win.length > 1 ? "¡EMPATE!" : "¡GANADOR!"}</p>
        <h1 className="font-display text-[6cqw] font-black leading-tight text-show-gradient anim-pop">{win.map((t) => t.name).join(" · ") || "¡Gracias por jugar!"}</h1>
        <div className="mt-[2cqw] flex flex-wrap justify-center gap-[2cqw]">
          {[...state.teams].sort((a, b) => b.score - a.score).map((t) => {
            const idx = state.teams.findIndex((x) => x.id === t.id) % 4;
            return (
              <div key={t.id} className="rounded-[1.5cqw] border border-border bg-card/60 px-[2.5cqw] py-[1.2cqw]">
                <div className="text-[1.6cqw] font-semibold text-muted-foreground">{t.name}</div>
                <div className={`font-display text-[3.5cqw] font-black ${TEAM_TEXT[idx]}`}>{t.score}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (state.showScoreboard) return <Scoreboard state={state} title={state.scoreTitle ?? "Marcador"} />;

  const q = state.current;
  if (state.status === "idle" || state.status === "ready" || !q) {
    const ready = state.status === "ready";
    return (
      <div className="flex h-full flex-col items-center justify-center gap-[2.5cqw] text-center">
        <div className="text-[11cqw] leading-none anim-float">🎬🍿🤔</div>
        <h1 className="font-display text-[6.5cqw] font-black leading-none text-show-gradient">{state.title}</h1>
        <p className={`font-display text-[2.8cqw] font-bold ${ready ? "text-highlight anim-pulse-soft" : "text-muted-foreground"}`}>¡Prepárense para adivinar!</p>
        {ready && state.total > 0 && (
          <p className="text-[1.9cqw] text-muted-foreground">
            {state.totalRounds} {state.totalRounds === 1 ? "ronda" : "rondas"} · {state.total} preguntas · {state.teams.length} participantes
          </p>
        )}
        <p className="mt-[1.5cqw] rounded-full border border-border px-[2cqw] py-[0.6cqw] font-display text-[1.6cqw] tracking-[0.3em] text-muted-foreground">SALA {state.room}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col px-[4cqw] py-[3cqw]">
      <header className="flex items-start justify-between">
        <div>
          <div className="font-display text-[1.6cqw] font-bold text-show-gradient">{state.title}</div>
          <div className="mt-[0.4cqw] text-[1.9cqw] font-semibold text-muted-foreground">
            Ronda {state.round}/{state.totalRounds} · Pregunta {state.inRound}/{state.roundSize}
          </div>
        </div>
        <Timer state={state} now={now} />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-[2cqw]">
        <div className="flex gap-[1cqw] text-[1.5cqw] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          <span>{q.kind === "serie" ? "📺 Serie" : "🎬 Película"}</span>·<span>{q.category}</span>
        </div>
        <div key={state.index} className={`leading-none transition-all duration-700 anim-pop ${q.answer ? "text-[9cqw]" : "text-[15cqw]"}`}>
          {q.emojis}
        </div>
        {q.answer ? (
          <div className="flex flex-col items-center gap-[0.8cqw] text-center">
            <div className="font-display text-[6cqw] font-black leading-tight text-show-gradient anim-pop">{q.answer}</div>
            {q.solution && <p className="max-w-[70cqw] text-[1.9cqw] text-muted-foreground anim-rise">{q.solution}</p>}
          </div>
        ) : (
          <div className="flex min-h-[10cqw] flex-col items-center gap-[0.9cqw]">
            {q.clues.map((c, i) => (
              <div key={i} className="flex items-center gap-[1.2cqw] rounded-full border border-border bg-card/70 px-[2.2cqw] py-[0.8cqw] text-[2.2cqw] font-semibold anim-rise">
                <span className="font-display text-[1.6cqw] font-black text-highlight">PISTA {i + 1}</span>
                {c}
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="flex justify-center gap-[0.5cqw]">
        {Array.from({ length: state.total }).map((_, i) => (
          <span key={i} className={`h-[0.4cqw] rounded-full transition-all ${i === state.index ? "w-[3cqw] bg-primary" : i < state.index ? "w-[1cqw] bg-accent" : "w-[1cqw] bg-secondary"}`} />
        ))}
      </footer>

      {state.status === "paused" && (
        <div className="absolute inset-0 flex items-center justify-center bg-stage/80 backdrop-blur-sm">
          <div className="font-display text-[6cqw] font-black tracking-[0.2em] text-highlight anim-pulse-soft">PAUSA</div>
        </div>
      )}
    </div>
  );
}