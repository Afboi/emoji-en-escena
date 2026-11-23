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
      setMessage(result.accepted ? (result.correct ? `¡Correcto! +${result.points} ${result.points === 1 ? "punto" : "puntos"}` : "Respuesta registrada. ¡Suerte en la próxima!") : "Ya habías respondido esta pregunta.");
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
        {state?.status === "playing" && state.current && !state.answerShown ? <>
          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Pregunta {state.index + 1}</div>
          <div className="text-6xl">{state.current.emojis}</div>
          {state.current.clues.map((clue,i)=><p key={i} className="rounded-lg bg-secondary p-2 text-sm">💡 {clue}</p>)}
          {state.timer.enabled && <p className="text-highlight">¡Respondé antes de que termine el tiempo!</p>}
          <form onSubmit={sendAnswer} className="flex flex-col gap-3"><input autoComplete="off" value={answer} onChange={e=>setAnswer(e.target.value)} placeholder={alreadySubmitted ? "Respuesta enviada" : "Tu respuesta…"} className="h-12 rounded-xl border border-input bg-background px-4 text-center" disabled={busy || alreadySubmitted} required/><button disabled={busy || alreadySubmitted} className="rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground">{busy ? "Enviando…" : alreadySubmitted ? "Respuesta enviada" : "Enviar respuesta"}</button></form>
        </> : <div className="rounded-xl bg-secondary p-5"><div className="text-4xl">⏳</div><p className="mt-2 font-bold">{state?.theatreJoinOpen ? "Esperando la próxima pregunta…" : "El animador está preparando la partida"}</p></div>}
        <button className="text-sm text-muted-foreground underline" onClick={()=>{localStorage.removeItem(PLAYER_KEY);setPlayer(null);}}>Salir / cambiar participante</button>
      </div>}
      {message && <p role="status" className="mt-4 rounded-xl bg-secondary p-3 text-center text-sm font-semibold">{message}</p>}
      <p className="mt-5 text-center text-xs text-muted-foreground">Las respuestas se registran una sola vez por pregunta.</p>
    </section>
  </main>;
}
