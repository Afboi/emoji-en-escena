import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { joinTheatre, submitTheatreAnswer } from "@/lib/game/rooms.functions";
import { useScreenRoom } from "@/lib/game/sync";

type Player = { playerId: string; nickname: string; room: string };
const PLAYER_KEY = "eee:theatre-player";

export const Route = createFileRoute("/join")({
  validateSearch: (s: Record<string, unknown>): { room?: string } => ({
    room: typeof s.room === "string" ? s.room.toUpperCase() : undefined,
  }),
  head: () => ({ meta: [{ title: "Unirse · Emoji en Escena" }, { name: "robots", content: "noindex" }] }),
  component: JoinPage,
});

function JoinPage() {
  const { room } = Route.useSearch();
  const [code, setCode] = useState(room ?? "");
  const [nickname, setNickname] = useState("");
  const [player, setPlayer] = useState<Player | null>(null);
  const [answer, setAnswer] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [submittedIndex, setSubmittedIndex] = useState<number | null>(null);
  const { state } = useScreenRoom(player?.room ?? null);
  const questionIndex = state?.index ?? -1;
  const alreadySubmitted = submittedIndex === questionIndex;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PLAYER_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Player;
        if (!room || room === saved.room) setPlayer(saved);
      }
    } catch { /* ignorar registro local corrupto */ }
  }, [room]);

  async function enter(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMessage("");
    try {
      const result = await joinTheatre({ data: { code: code.trim().toUpperCase(), nickname: nickname.trim() } });
      const next = { playerId: result.playerId, nickname: result.nickname, room: result.room };
      localStorage.setItem(PLAYER_KEY, JSON.stringify(next)); setPlayer(next);
      setMessage("¡Listo! Ya estás en la sala.");
    } catch (err) { setMessage(err instanceof Error ? err.message : "No se pudo ingresar."); }
    finally { setBusy(false); }
  }

  async function sendAnswer(e: React.FormEvent) {
    e.preventDefault(); if (!player || !answer.trim()) return;
    if (alreadySubmitted) return;
    setBusy(true); setMessage("");
    try {
      const result = await submitTheatreAnswer({ data: { code: player.room, playerId: player.playerId, answer: answer.trim() } });
      setSubmittedIndex(questionIndex);
      setMessage(result.accepted ? (result.correct && result.points === 3 ? "¡Respuesta brillante! 🎉 +3 puntos" : result.correct && result.points === 1 ? "¡La tenías! ✍️ Un pequeño detalle de escritura: +1 punto" : "Respuesta registrada. ¡La próxima puede ser la tuya! 🍀") : "Esta pregunta ya quedó respondida.");
      setAnswer("");
    } catch (err) { setMessage(err instanceof Error ? err.message : "No se pudo enviar."); }
    finally { setBusy(false); }
  }

  return <main className="flex min-h-screen items-center justify-center bg-stage-gradient px-4 py-8">
    <section className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-xl">
      <div className="mb-5 text-center"><div className="mb-2 text-xs font-bold tracking-widest text-highlight">FIESTA RESORT</div><div className="text-5xl">🎬📱</div><h1 className="mt-3 font-display text-3xl font-black text-show-gradient">Emoji en Escena</h1><p className="text-muted-foreground">Modo teatro interactivo</p></div>
      {!player ? <form onSubmit={enter} className="flex flex-col gap-3">
        <label className="text-sm font-semibold">Código de sala</label><input required maxLength={8} value={code} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="ABCD" className="h-12 rounded-xl border border-input bg-background px-4 text-center text-xl font-black tracking-widest"/>
        <label className="text-sm font-semibold">Tu nombre o apodo</label><input required maxLength={24} value={nickname} onChange={e=>setNickname(e.target.value)} placeholder="¿Cómo te llamás?" className="h-12 rounded-xl border border-input bg-background px-4"/>
        <button disabled={busy} className="mt-2 rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground">{busy ? "Ingresando…" : "Entrar a jugar"}</button>
      </form> : <div className="flex flex-col gap-4 text-center">
        <p className="rounded-xl bg-secondary p-3 font-bold">¡Hola, {player.nickname}! · Sala {player.room}</p>
        {state?.status === "finished" ? (() => {
          const ranked = [...(state.teams ?? [])].sort((a, b) => b.score - a.score);
          const topScore = ranked[0]?.score;
          const winners = ranked.filter((t) => t.score === topScore);
          return <div className="flex flex-col items-center gap-4 rounded-2xl border border-highlight/40 bg-gradient-to-b from-highlight/15 to-secondary p-5 text-center">
            <div className="text-6xl">🏆</div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-highlight">¡Partida finalizada!</p>
            <h2 className="font-display text-2xl font-black text-show-gradient">{winners.length > 1 ? "¡Tenemos un empate!" : winners.length === 1 ? "¡El ganador es…" : "¡Gracias por jugar!"}</h2>
            {winners.length > 0 && <p className="text-3xl font-black">{winners.map((w) => w.name).join(" · ")}</p>}
            {winners.length > 0 && <p className="font-bold text-highlight">{topScore} {topScore === 1 ? "punto" : "puntos"}</p>}
            <div className="mt-2 w-full space-y-2 text-left">
              {ranked.map((team, i) => <div key={team.id} className="flex items-center justify-between rounded-lg bg-background/70 px-3 py-2">
                <span className="font-semibold">{i + 1}. {team.name}</span><span className="font-display font-black">{team.score} pts</span>
              </div>)}
            </div>
            <p className="text-sm text-muted-foreground">¡Gracias por ser parte de Emoji en Escena! 🎬</p>
          </div>;
        })() : state?.status === "playing" && state.current && !state.answerShown ? <>
          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Pregunta {state.index + 1}</div>
          <div className="text-6xl">{state.current.emojis}</div>
          {state.current.clues.map((clue,i)=><p key={i} className="rounded-lg bg-secondary p-2 text-sm">💡 {clue}</p>)}
          {state.timer.enabled && <p className="text-highlight">¡Respondé antes de que termine el tiempo!</p>}
          {alreadySubmitted ? <div className="flex flex-col items-center gap-2 rounded-xl border border-success/30 bg-success/10 p-4"><div className="text-3xl">✅</div><p className="font-bold">¡Respuesta enviada!</p><p className="text-sm text-muted-foreground">Tu respuesta quedó registrada. Esperá la siguiente pregunta.</p></div> : <form onSubmit={sendAnswer} className="flex flex-col gap-3"><input autoComplete="off" value={answer} onChange={e=>setAnswer(e.target.value)} placeholder="Tu respuesta…" className="h-12 rounded-xl border border-input bg-background px-4 text-center" disabled={busy} required/><button disabled={busy} className="rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground">{busy ? "Enviando…" : "Enviar respuesta"}</button></form>}
        </> : <div className="rounded-xl bg-secondary p-5"><div className="text-4xl">⏳</div><p className="mt-2 font-bold">{state?.theatreJoinOpen ? "Esperando la próxima pregunta…" : "El animador está preparando la partida"}</p></div>}
        <button className="text-sm text-muted-foreground underline" onClick={()=>{localStorage.removeItem(PLAYER_KEY);setPlayer(null);}}>Salir / cambiar participante</button>
      </div>}
      {message && <p role="status" className="mt-4 rounded-xl bg-secondary p-3 text-center text-sm font-semibold">{message}</p>}
      <p className="mt-5 text-center text-xs text-muted-foreground">Las respuestas se registran una sola vez por pregunta.</p>
    </section>
  </main>;
}
