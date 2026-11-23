import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { listTheatrePlayers } from "@/lib/game/rooms.functions";
import { Btn, Panel, inputCls } from "@/components/game/Btn";
import { Stage, TEAM_BG } from "@/components/game/Stage";
import {
  adjustScore, goTo, newGame, nextStep, parseBank, pauseTimer, resetTimer, restartRound, roundInfo, startTimer, timerRemaining, toPublic, uid,
} from "@/lib/game/logic";
import { SAMPLE_QUESTIONS } from "@/lib/game/sample";
import { CLOUD, useBank, useControlRoom, useNow } from "@/lib/game/sync";
import type { GameState, Question } from "@/lib/game/types";

export const Route = createFileRoute("/control")({
  head: () => ({
    meta: [
      { title: "Centro de comando · Emoji en Escena" },
      { name: "description", content: "Consola privada del animador para dirigir Emoji en Escena: preguntas, pistas, cronómetro y marcador." },
      { property: "og:title", content: "Centro de comando · Emoji en Escena" },
      { property: "og:description", content: "Consola del animador: preguntas, pistas, cronómetro y marcador en vivo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ControlPage,
});

type Update = (fn: (s: GameState) => GameState) => void;
const STATUS_LABEL = { idle: "Sin preparar", ready: "Lista para empezar", playing: "En juego", paused: "En pausa", finished: "Finalizada" } as const;

function ControlPage() {
  const room = useControlRoom();
  const { state, update, status, error, screens, offset } = room;
  const [bank, setBank] = useBank();
  const now = useNow(250);
  const [tab, setTab] = useState<"live" | "bank">("live");

  if (status === "error" && !state) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
        <p className="font-display text-xl font-bold">No se pudo abrir la sala</p>
        <p className="text-sm text-muted-foreground">{error}</p>
        <Btn variant="primary" onClick={() => void room.newRoom()}>Reintentar</Btn>
      </div>
    );
  }
  if (!state || !bank) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Abriendo sala…</div>;
  }

  const screenPath = `/screen?room=${state.room}`;
  const statusChip =
    status === "online"
      ? screens > 0
        ? { dot: "bg-success", text: `Pantalla conectada${screens > 1 ? ` (${screens})` : ""}` }
        : { dot: "bg-highlight anim-pulse-soft", text: "Público aún no conectado" }
      : status === "connecting"
        ? { dot: "bg-highlight anim-pulse-soft", text: "Conectando…" }
        : status === "offline"
          ? { dot: "bg-destructive anim-pulse-soft", text: "Reconectando…" }
          : { dot: "bg-destructive", text: "Error de sincronización" };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-border bg-background/90 px-5 py-3 backdrop-blur">
        <span className="text-2xl">🎬</span>
        <input
          value={state.title}
          onChange={(e) => update((s) => ({ ...s, title: e.target.value }))}
          className="w-60 bg-transparent font-display text-lg font-black text-show-gradient outline-none"
          aria-label="Nombre del juego"
        />
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm">
            <span className="text-muted-foreground">Código de sala</span>
            <span className="font-display text-lg font-black tracking-[0.25em] text-highlight">{state.room}</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm font-semibold">
            <span className={`h-2.5 w-2.5 rounded-full ${statusChip.dot}`} />
            {statusChip.text}
          </div>
          {status === "error" && <Btn size="sm" variant="highlight" onClick={() => void room.retry()}>Reintentar</Btn>}
          <Btn variant="accent" onClick={() => window.open(screenPath, "eee-screen", "width=1280,height=720")}>Abrir pantalla ↗</Btn>
          <Btn size="sm" confirm="¿Abrir una sala nueva? La pantalla tendrá que conectarse con el nuevo código." onClick={() => void room.newRoom()}>
            Nueva sala
          </Btn>
        </div>
      </header>

      {!CLOUD && (
        <div className="border-b border-highlight/40 bg-highlight/10 px-5 py-2 text-sm text-highlight">
          Modo local: sin conexión a la nube, la pantalla solo se sincroniza si se abre en este mismo navegador y equipo.
        </div>
      )}
      {error && status === "error" && (
        <div className="border-b border-destructive/40 bg-destructive/10 px-5 py-2 text-sm text-destructive">{error} · Se reintenta automáticamente.</div>
      )}

      <nav className="flex gap-2 px-5 pt-4">
        {(["live", "bank"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm font-bold ${tab === t ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {t === "live" ? "En vivo" : `Banco y configuración (${bank.length})`}
          </button>
        ))}
      </nav>

      {tab === "live" ? (
        <LiveTab state={state} update={update} now={now} offset={offset} screenPath={screenPath} screens={screens} creds={room.creds} />
      ) : (
        <BankTab state={state} update={update} bank={bank} setBank={setBank} />
      )}
    </div>
  );
}

function LiveTab({ state, update, now, offset, screenPath, screens, creds }: { state: GameState; update: Update; now: number; offset: number; screenPath: string; screens: number; creds: { code: string; secret: string } | null }) {\n  const [players, setPlayers] = useState<{ id: string; nickname: string; score: number }[]>([]);\n  useEffect(() => {\n    if (!creds || !CLOUD) return;\n    let active = true;\n    const load = async () => { try { const result = await listTheatrePlayers({ data: creds }); if (active) setPlayers(result.players as unknown as { id: string; nickname: string; score: number }[]); } catch { /* se reintenta en el siguiente ciclo */ } };\n    void load(); const interval = setInterval(() => void load(), 2500);\n    return () => { active = false; clearInterval(interval); };\n  }, [creds]);
  const q = state.playlist[state.index];
  const total = state.playlist.length;
  const info = roundInfo(state.index, total, state.rounds);
  const secs = Math.ceil(timerRemaining(state.timer, now) / 1000);
  const live = state.status === "playing" || state.status === "paused";
  const isRoundEnd = state.showScoreboard && state.scoreTitle !== null;
  const nextLabel =
    state.index >= total - 1 ? "🏁 Terminar y ver ganador" : isRoundEnd ? "Empezar siguiente ronda ▶" : info.inRound === info.per ? "Cerrar ronda y ver marcador ▶" : "Siguiente pregunta ▶";
  const pub = useMemo(() => toPublic(state, offset), [state, offset]);

  return (
    <div className="grid gap-4 p-5 xl:grid-cols-[1.1fr_1fr]">
      <div className="flex flex-col gap-4">
        <Panel title="Estado de partida" right={<span className="text-xs font-bold uppercase text-highlight">{STATUS_LABEL[state.status]}</span>}>
          <div className="flex flex-wrap gap-2">
            {(state.status === "idle" || state.status === "finished") && (
              <Btn variant="highlight" size="lg" disabled={total === 0} onClick={() => update((s) => ({ ...goTo(s, 0), status: "ready", teams: s.status === "finished" ? s.teams.map((t) => ({ ...t, score: 0 })) : s.teams }))}>
                🎬 Preparar
              </Btn>
            )}
            {state.status === "ready" && (
              <Btn variant="primary" size="lg" onClick={() => update((s) => ({ ...goTo(s, 0), status: "playing" }))}>▶ Iniciar partida</Btn>
            )}
            {state.status === "playing" && (
              <Btn variant="highlight" size="lg" onClick={() => update((s) => ({ ...s, status: "paused", resumeTimer: s.timer.running, timer: pauseTimer(s.timer, Date.now()) }))}>⏸ Pausar</Btn>
            )}
            {state.status === "paused" && (
              <Btn variant="primary" size="lg" onClick={() => update((s) => ({ ...s, status: "playing", timer: s.resumeTimer ? startTimer(s.timer, Date.now()) : s.timer, resumeTimer: false }))}>▶ Reanudar</Btn>
            )}
            {live && (
              <>
                <Btn size="lg" confirm={`¿Reiniciar la ronda ${info.round}? Vuelve a su primera pregunta (los puntos se mantienen).`} onClick={() => update(restartRound)}>↺ Reiniciar ronda</Btn>
                <Btn size="lg" confirm="¿Terminar la partida y mostrar el ganador?" onClick={() => update((s) => ({ ...s, status: "finished", timer: pauseTimer(s.timer, Date.now()) }))}>🏁 Terminar partida</Btn>
              </>
            )}
            {state.status !== "idle" && (
              <Btn variant="danger" size="lg" confirm="¿Reiniciar toda la partida? Vuelve a la espera y los puntajes quedan en cero." onClick={() => update((s) => ({ ...goTo(s, 0), status: "idle", teams: s.teams.map((t) => ({ ...t, score: 0 })) }))}>
                ⟲ Reiniciar todo
              </Btn>
            )}
          </div>
          {total === 0 && <p className="mt-3 text-sm text-destructive">No hay preguntas en la partida. Agregalas en «Banco y configuración».</p>}
          {total > 0 && <p className="mt-3 text-xs text-muted-foreground">{total} preguntas · {Math.ceil(total / info.per)} rondas de hasta {info.per}</p>}
        </Panel>

        <Panel
          title={live ? `Pregunta actual · Ronda ${info.round} · ${info.inRound}/${Math.min(info.per, total - (info.round - 1) * info.per)} (${state.index + 1} de ${total})` : "Pregunta actual"}
          right={<Btn size="sm" disabled={!live || state.index === 0} onClick={() => update((s) => goTo(s, s.index - 1))}>◀ Anterior</Btn>}
        >
          {q && live ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-5">
                <div className="text-6xl leading-none">{q.emojis}</div>
                <div>
                  <div className="font-display text-2xl font-black">{q.answer}</div>
                  <div className="text-sm text-muted-foreground">{q.kind} · {q.category} · {q.difficulty}</div>
                </div>
              </div>
              {q.notes && <p className="rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-sm"><b className="text-accent">Nota MC:</b> {q.notes}</p>}
              <div className="flex flex-col gap-2">
                {q.clues.map((c, i) => {
                  const shown = i < state.cluesShown;
                  return (
                    <div key={i} className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm ${shown ? "border-highlight/60 bg-highlight/10" : "border-border"}`}>
                      <span className="font-display text-xs font-black text-highlight">PISTA {i + 1}</span>
                      <span className="flex-1">{c}</span>
                      <span className="text-xs text-muted-foreground">{shown ? "En pantalla" : "Oculta"}</span>
                    </div>
                  );
                })}
                {q.clues.length === 0 && <p className="text-sm text-muted-foreground">Esta pregunta no tiene pistas.</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                <Btn variant="highlight" disabled={state.cluesShown >= q.clues.length || state.answerShown} onClick={() => update((s) => ({ ...s, cluesShown: s.cluesShown + 1 }))}>💡 Revelar pista siguiente</Btn>
                <Btn disabled={state.cluesShown === 0} onClick={() => update((s) => ({ ...s, cluesShown: s.cluesShown - 1 }))}>Ocultar última pista</Btn>
                {state.answerShown ? (
                  <Btn onClick={() => update((s) => ({ ...s, answerShown: false }))}>🙈 Ocultar respuesta</Btn>
                ) : (
                  <Btn variant="accent" onClick={() => update((s) => ({ ...s, answerShown: true, showScoreboard: false, timer: pauseTimer(s.timer, Date.now()) }))}>🎉 Revelar respuesta</Btn>
                )}
              </div>
              <Btn variant="primary" size="lg" onClick={() => update(nextStep)}>{nextLabel}</Btn>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {state.status === "finished" ? "Partida terminada. La pantalla muestra al ganador." : "La partida no ha empezado. Presioná «Preparar» y luego «Iniciar partida»."}
            </p>
          )}
        </Panel>

        <Panel
          title="Cronómetro"
          right={
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={state.timer.enabled} onChange={(e) => update((s) => ({ ...s, timer: { ...s.timer, enabled: e.target.checked } }))} />
              Activo
            </label>
          }
        >
          <div className="flex flex-wrap items-center gap-4">
            <div className={`font-display text-5xl font-black tabular-nums ${secs <= 10 ? "text-primary" : "text-highlight"} ${state.timer.enabled ? "" : "opacity-30"}`}>
              {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, "0")}
            </div>
            <div className="flex flex-wrap gap-2">
              {state.timer.running ? (
                <Btn variant="highlight" disabled={!state.timer.enabled} onClick={() => update((s) => ({ ...s, timer: pauseTimer(s.timer, Date.now()) }))}>⏸ Pausar</Btn>
              ) : (
                <Btn variant="primary" disabled={!state.timer.enabled || state.status !== "playing"} onClick={() => update((s) => ({ ...s, timer: startTimer(s.timer, Date.now()) }))}>▶ Iniciar</Btn>
              )}
              <Btn disabled={!state.timer.enabled} onClick={() => update((s) => ({ ...s, timer: resetTimer(s.timer) }))}>↺ Reiniciar</Btn>
            </div>
            <label className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
              Segundos por pregunta
              <input
                type="number"
                min={5}
                max={600}
                value={state.timer.duration}
                onChange={(e) => {
                  const d = Math.max(5, Math.min(600, Number(e.target.value) || 5));
                  update((s) => ({ ...s, timer: resetTimer({ ...s.timer, duration: d }) }));
                }}
                className={`${inputCls} w-20`}
              />
            </label>
          </div>
        </Panel>
      </div>

      <div className="flex flex-col gap-4">
        <Panel title="Lo que ve el público" right={<span className={`text-xs font-bold ${screens > 0 ? "text-success" : "text-highlight"}`}>{screens > 0 ? "● En vivo" : "○ Nadie conectado"}</span>}>
          <div className="overflow-hidden rounded-xl border border-border">
            <Stage state={pub} now={now + offset} />
          </div>
          <div className="mt-3 rounded-lg bg-secondary/60 p-3 text-xs leading-relaxed text-muted-foreground">
            <b className="text-foreground">En el proyector:</b> abrí <span className="font-mono text-foreground">/screen</span> en cualquier navegador y escribí el código{" "}
            <b className="font-display tracking-widest text-highlight">{state.room}</b> (o usá <span className="font-mono text-foreground">{screenPath}</span>). Presioná <b>F</b> o doble clic para pantalla completa.
          </div>
        </Panel>
        <TeamsPanel state={state} update={update} />
      </div>
    </div>
  );
}

function TeamsPanel({ state, update }: { state: GameState; update: Update }) {
  return (
    <Panel
      title="Participantes y marcador"
      right={
        <Btn size="sm" variant={state.showScoreboard ? "highlight" : "ghost"} onClick={() => update((s) => ({ ...s, showScoreboard: !s.showScoreboard, scoreTitle: null }))}>
          {state.showScoreboard ? "Ocultar marcador público" : "Mostrar marcador público"}
        </Btn>
      }
    >
      <div className="flex flex-col gap-2">
        {state.teams.map((t, i) => (
          <div key={t.id} className="flex items-center gap-2 rounded-xl border border-border bg-background/40 p-2">
            <span className={`h-8 w-1.5 rounded-full ${TEAM_BG[i % 4]}`} />
            <input
              value={t.name}
              onChange={(e) => update((s) => ({ ...s, teams: s.teams.map((x) => (x.id === t.id ? { ...x, name: e.target.value } : x)) }))}
              className="min-w-0 flex-1 bg-transparent font-bold outline-none"
              aria-label="Nombre del equipo"
            />
            <Btn size="sm" onClick={() => update((s) => ({ ...s, teams: adjustScore(s.teams, t.id, -1) }))}>−1</Btn>
            <div className="w-12 text-center font-display text-2xl font-black tabular-nums">{t.score}</div>
            <Btn size="sm" variant="success" onClick={() => update((s) => ({ ...s, teams: adjustScore(s.teams, t.id, 1) }))}>+1</Btn>
            <Btn size="sm" variant="success" onClick={() => update((s) => ({ ...s, teams: adjustScore(s.teams, t.id, 3) }))}>+3</Btn>
            <Btn size="sm" variant="danger" onClick={() => update((s) => ({ ...s, teams: adjustScore(s.teams, t.id, -3) }))}>−3</Btn>
            <Btn size="sm" variant="danger" confirm={`¿Eliminar "${t.name}"?`} onClick={() => update((s) => ({ ...s, teams: s.teams.filter((x) => x.id !== t.id) }))}>✕</Btn>
          </div>
        ))}
        {state.teams.length === 0 && <p className="text-sm text-muted-foreground">Sin participantes todavía.</p>}
        <div className="flex gap-2">
          <Btn onClick={() => update((s) => ({ ...s, teams: [...s.teams, { id: uid(), name: `Participante ${s.teams.length + 1}`, score: 0 }] }))}>+ Agregar participante</Btn>
          <Btn confirm="¿Poner todos los puntajes en cero?" onClick={() => update((s) => ({ ...s, teams: s.teams.map((t) => ({ ...t, score: 0 })) }))}>Puntajes a cero</Btn>
        </div>
      </div>
    </Panel>
  );
}

const EMPTY: Question = { id: "", emojis: "", answer: "", category: "", difficulty: "media", kind: "película", clues: [], solution: "", notes: "" };

function BankTab({ state, update, bank, setBank }: { state: GameState; update: Update; bank: Question[]; setBank: (b: Question[]) => void }) {
  const [editing, setEditing] = useState<Question | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("");
  const [cat, setCat] = useState("");
  const [diff, setDiff] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const inGame = new Set(state.playlist.map((q) => q.id));
  const locked = state.status === "playing" || state.status === "paused";
  const categories = useMemo(() => {
    const m = new Map<string, number>();
    bank.forEach((q) => m.set(q.category, (m.get(q.category) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [bank]);

  const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const filtered = bank.filter(
    (q) =>
      (!search || norm(`${q.answer} ${q.category} ${q.emojis}`).includes(norm(search))) &&
      (!kind || q.kind === kind) &&
      (!cat || q.category === cat) &&
      (!diff || q.difficulty === diff),
  );

  const saveBank = (next: Question[]) => {
    setBank(next);
    if (!locked) update((s) => ({ ...s, playlist: s.playlist.flatMap((p) => next.find((q) => q.id === p.id) ?? []) }));
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ questions: bank }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "emoji-en-escena.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="grid gap-4 p-5 xl:grid-cols-[1fr_1fr]">
      <Panel
        title="Banco de preguntas"
        right={
          <div className="flex flex-wrap gap-2">
            <Btn size="sm" variant="primary" onClick={() => setEditing({ ...EMPTY, id: uid() })}>+ Nueva</Btn>
            <Btn size="sm" onClick={() => fileRef.current?.click()}>Importar JSON</Btn>
            <Btn size="sm" onClick={exportJson}>Exportar JSON</Btn>
            <Btn size="sm" confirm="¿Agregar las preguntas de ejemplo que falten en el banco?" onClick={() => saveBank([...bank, ...SAMPLE_QUESTIONS.filter((s) => !bank.some((b) => b.id === s.id))])}>Cargar demo</Btn>
          </div>
        }
      >
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            try {
              const qs = parseBank(await f.text());
              const replace = window.confirm(`Se encontraron ${qs.length} preguntas.\nAceptar = reemplazar el banco · Cancelar = agregarlas al banco actual`);
              const ids = new Set(bank.map((b) => b.id));
              saveBank(replace ? qs : [...bank, ...qs.map((q) => (ids.has(q.id) ? { ...q, id: uid() } : q))]);
              setError(null);
            } catch (err) {
              setError(err instanceof Error ? err.message : "No se pudo leer el archivo.");
            }
          }}
        />
        {error && <p className="mb-3 rounded-lg bg-destructive/15 px-3 py-2 text-sm text-destructive">{error}</p>}
        <div className="mb-3 grid gap-2 sm:grid-cols-4">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar…" className={`${inputCls} sm:col-span-4`} />
          <select value={kind} onChange={(e) => setKind(e.target.value)} className={inputCls}>
            <option value="">Todo tipo</option>
            <option value="película">Películas</option>
            <option value="serie">Series</option>
          </select>
          <select value={cat} onChange={(e) => setCat(e.target.value)} className={`${inputCls} sm:col-span-2`}>
            <option value="">Todas las categorías</option>
            {categories.map(([c]) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={diff} onChange={(e) => setDiff(e.target.value)} className={inputCls}>
            <option value="">Todo nivel</option>
            <option value="fácil">Fácil</option>
            <option value="media">Media</option>
            <option value="difícil">Difícil</option>
          </select>
        </div>
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>{filtered.length} de {bank.length} · ☑ = incluida en la partida</span>
          <Btn size="sm" disabled={locked || filtered.length === 0} onClick={() => update((s) => ({ ...s, playlist: [...s.playlist, ...filtered.filter((q) => !s.playlist.some((p) => p.id === q.id))] }))}>Agregar filtradas</Btn>
        </div>
        {bank.length === 0 && <p className="text-sm text-muted-foreground">El banco está vacío. Creá una pregunta o cargá la demo.</p>}
        {bank.length > 0 && filtered.length === 0 && <p className="text-sm text-muted-foreground">Ninguna pregunta coincide con los filtros.</p>}
        <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto pr-1">
          {filtered.map((q) => (
            <div key={q.id} className="flex items-center gap-3 rounded-xl border border-border bg-background/40 p-2">
              <input
                type="checkbox"
                disabled={locked}
                checked={inGame.has(q.id)}
                onChange={(e) => update((s) => ({ ...s, playlist: e.target.checked ? [...s.playlist, q] : s.playlist.filter((p) => p.id !== q.id) }))}
                aria-label="Incluir en la partida"
              />
              <span className="w-24 shrink-0 text-2xl">{q.emojis}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-bold">{q.answer}</div>
                <div className="text-xs text-muted-foreground">{q.kind} · {q.category} · {q.difficulty} · {q.clues.length} pistas</div>
              </div>
              <Btn size="sm" onClick={() => setEditing(q)}>Editar</Btn>
              <Btn size="sm" variant="danger" disabled={locked && inGame.has(q.id)} confirm={`¿Eliminar "${q.answer}" del banco?`} onClick={() => saveBank(bank.filter((b) => b.id !== q.id))}>✕</Btn>
            </div>
          ))}
        </div>
      </Panel>

      <div className="flex flex-col gap-4">
        {editing && (
          <Editor
            key={editing.id}
            initial={editing}
            categories={categories.map(([c]) => c)}
            onCancel={() => setEditing(null)}
            onSave={(q) => {
              saveBank(bank.some((b) => b.id === q.id) ? bank.map((b) => (b.id === q.id ? q : b)) : [...bank, q]);
              setEditing(null);
            }}
          />
        )}

        <Panel title={`Partida · ${state.playlist.length} preguntas`}>
          <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
            <label className="flex items-center gap-2">
              Preguntas por ronda
              <span className="rounded-lg border border-border px-3 py-2 font-bold">10</span>
            </label>
            <span className="text-muted-foreground">10 preguntas por ronda</span>
            <Btn size="sm" disabled={locked} onClick={() => update((s) => ({ ...s, playlist: [...s.playlist].sort(() => Math.random() - 0.5) }))}>Mezclar</Btn>
            <Btn size="sm" disabled={locked} onClick={() => update((s) => ({ ...s, playlist: bank }))}>Usar todo el banco</Btn>
            <Btn size="sm" variant="danger" disabled={locked} confirm="¿Quitar todas las preguntas de la partida?" onClick={() => update((s) => ({ ...s, playlist: [] }))}>Vaciar</Btn>
          </div>
          {locked && <p className="mb-2 text-xs text-highlight">La partida está en curso: terminala o reiniciala para cambiar preguntas y orden.</p>}
          {state.playlist.length === 0 && <p className="text-sm text-muted-foreground">Marcá preguntas en el banco para armar la partida.</p>}
          <ol className="flex flex-col gap-1">
            {state.playlist.map((q, i) => {
              const r = roundInfo(i, state.playlist.length, state.rounds);
              const move = (d: number) =>
                update((s) => {
                  const p = [...s.playlist];
                  const j = i + d;
                  if (j < 0 || j >= p.length) return s;
                  [p[i], p[j]] = [p[j]!, p[i]!];
                  return { ...s, playlist: p };
                });
              return (
                <li key={q.id}>
                  {r.inRound === 1 && <div className="mt-2 mb-1 font-display text-xs font-bold tracking-widest text-accent">RONDA {r.round}</div>}
                  <div className={`flex items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-secondary ${i === state.index && locked ? "bg-primary/15" : ""}`}>
                    <span className="w-6 text-right text-muted-foreground">{i + 1}.</span>
                    <span className="w-20">{q.emojis}</span>
                    <span className="flex-1 truncate">{q.answer}</span>
                    <Btn size="sm" disabled={locked || i === 0} onClick={() => move(-1)}>↑</Btn>
                    <Btn size="sm" disabled={locked || i === state.playlist.length - 1} onClick={() => move(1)}>↓</Btn>
                  </div>
                </li>
              );
            })}
          </ol>
        </Panel>

        <Panel title="Categorías">
          <div className="flex flex-col gap-1">
            {categories.map(([c, n]) => (
              <div key={c} className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-secondary">
                <span className="flex-1">{c}</span>
                <span className="text-xs text-muted-foreground">{n}</span>
                <Btn
                  size="sm"
                  onClick={() => {
                    const name = window.prompt("Nuevo nombre de la categoría", c)?.trim();
                    if (name && name !== c) saveBank(bank.map((q) => (q.category === c ? { ...q, category: name } : q)));
                  }}
                >
                  Renombrar
                </Btn>
                <Btn size="sm" variant="danger" confirm={`¿Eliminar la categoría "${c}"? Sus ${n} preguntas pasan a "General".`} onClick={() => saveBank(bank.map((q) => (q.category === c ? { ...q, category: "General" } : q)))}>✕</Btn>
              </div>
            ))}
            <p className="mt-1 text-xs text-muted-foreground">Para crear una categoría, escribila al editar una pregunta.</p>
          </div>
        </Panel>

        <Panel title="Modo de prueba">
          <p className="mb-3 text-sm text-muted-foreground">Restablece la sala con preguntas de demostración y 10 preguntas por ronda.</p>
          <Btn
            variant="highlight"
            confirm="Se reemplaza la partida actual por datos de prueba. ¿Continuar?"
            onClick={() =>
              update((s) => ({
                ...newGame(s.room, SAMPLE_QUESTIONS),
                title: s.title,
                rounds: 10,
                status: "ready",
                teams: [],
              }))
            }
          >
            🧪 Cargar partida de prueba
          </Btn>
        </Panel>
      </div>
    </div>
  );
}

function Editor({ initial, categories, onSave, onCancel }: { initial: Question; categories: string[]; onSave: (q: Question) => void; onCancel: () => void }) {
  const [q, setQ] = useState(initial);
  const [clues, setClues] = useState(initial.clues.length ? initial.clues : ["", ""]);
  const valid = q.emojis.trim() !== "" && q.answer.trim() !== "";
  return (
    <Panel title={initial.answer ? "Editar pregunta" : "Nueva pregunta"}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm sm:col-span-2">
          Emojis
          <input value={q.emojis} onChange={(e) => setQ({ ...q, emojis: e.target.value })} className={`${inputCls} h-16 text-4xl`} placeholder="🦁👑🌅" />
        </label>
        <label className="text-sm">
          Respuesta exacta
          <input value={q.answer} onChange={(e) => setQ({ ...q, answer: e.target.value })} className={inputCls} />
        </label>
        <label className="text-sm">
          Categoría
          <input list="cats" value={q.category} onChange={(e) => setQ({ ...q, category: e.target.value })} className={inputCls} placeholder="Animación" />
          <datalist id="cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
        </label>
        <label className="text-sm">
          Tipo
          <select value={q.kind} onChange={(e) => setQ({ ...q, kind: e.target.value as Question["kind"] })} className={inputCls}>
            <option value="película">Película</option>
            <option value="serie">Serie</option>
          </select>
        </label>
        <label className="text-sm">
          Nivel
          <select value={q.difficulty} onChange={(e) => setQ({ ...q, difficulty: e.target.value as Question["difficulty"] })} className={inputCls}>
            <option value="fácil">Fácil</option>
            <option value="media">Media</option>
            <option value="difícil">Difícil</option>
          </select>
        </label>
        <div className="flex flex-col gap-2 text-sm sm:col-span-2">
          Pistas graduales (2 a 4, de la más difícil a la más fácil)
          {clues.map((c, i) => (
            <div key={i} className="flex gap-2">
              <input value={c} onChange={(e) => setClues(clues.map((x, j) => (j === i ? e.target.value : x)))} className={inputCls} placeholder={`Pista ${i + 1}`} />
              <Btn size="sm" variant="danger" disabled={clues.length <= 1} onClick={() => setClues(clues.filter((_, j) => j !== i))}>✕</Btn>
            </div>
          ))}
          <Btn size="sm" disabled={clues.length >= 4} onClick={() => setClues([...clues, ""])} className="self-start">+ Pista</Btn>
        </div>
        <label className="text-sm sm:col-span-2">
          Revelación (dato que acompaña la respuesta)
          <input value={q.solution} onChange={(e) => setQ({ ...q, solution: e.target.value })} className={inputCls} />
        </label>
        <label className="text-sm sm:col-span-2">
          Notas para el MC (no se muestran al público)
          <input value={q.notes} onChange={(e) => setQ({ ...q, notes: e.target.value })} className={inputCls} />
        </label>
      </div>
      <div className="mt-4 flex gap-2">
        <Btn
          variant="primary"
          disabled={!valid}
          onClick={() => onSave({ ...q, emojis: q.emojis.trim(), answer: q.answer.trim(), category: q.category.trim() || "General", clues: clues.map((c) => c.trim()).filter(Boolean).slice(0, 4) })}
        >
          Guardar
        </Btn>
        <Btn onClick={onCancel}>Cancelar</Btn>
      </div>
    </Panel>
  );
}