import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Stage } from "@/components/game/Stage";
import { useNow, useScreenRoom } from "@/lib/game/sync";

export const Route = createFileRoute("/screen")({
  validateSearch: (s: Record<string, unknown>): { room: string | undefined } => ({
    room: typeof s["room"] === "string" && s["room"] ? s["room"].toUpperCase() : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Pantalla de teatro · Emoji en Escena" },
      { name: "description", content: "Pantalla pública del juego Emoji en Escena para proyector." },
      { property: "og:title", content: "Pantalla de teatro · Emoji en Escena" },
      { property: "og:description", content: "Pantalla pública del juego para proyector 16:9." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ScreenPage,
});

function toggleFullscreen() {
  if (document.fullscreenElement) void document.exitFullscreen();
  else void document.documentElement.requestFullscreen?.();
}

function ScreenPage() {
  const { room } = Route.useSearch();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const { state, status, notFound, readError, offset } = useScreenRoom(room ?? null);
  const now = useNow(200);
  const [hint, setHint] = useState(true);
  const hideRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "f" || e.key === "F") toggleFullscreen();
    };
    window.addEventListener("keydown", onKey);
    const t = setTimeout(() => setHint(false), 5000);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearTimeout(t);
    };
  }, []);

  if (!room) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-stage-gradient px-6">
        <h1 className="font-display text-4xl font-black text-show-gradient">Conectar pantalla</h1>
        <p className="text-muted-foreground">Escribí el código de sala de 4 letras que aparece en el centro de comando.</p>
        <form
          className="flex gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (code.trim()) void navigate({ to: "/screen", search: { room: code.trim().toUpperCase() } });
          }}
        >
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={8}
            placeholder="ABCD"
            className="h-14 w-48 rounded-xl border border-input bg-background text-center font-display text-2xl tracking-[0.3em] uppercase outline-none focus:border-ring"
          />
          <button className="h-14 rounded-xl bg-primary px-6 font-bold text-primary-foreground">Conectar</button>
        </form>
      </div>
    );
  }

  return (
    <div
      className="group flex h-screen w-screen items-center justify-center overflow-hidden bg-stage"
      onMouseMove={() => {
        setHint(true);
        clearTimeout(hideRef.current);
        hideRef.current = setTimeout(() => setHint(false), 3000);
      }}
      onDoubleClick={toggleFullscreen}
    >
      <div className="relative w-[min(100vw,177.78vh)]">
        <Stage state={state} now={now + offset} waiting={notFound ? `No existe la sala ${room}. Revisá el código.` : undefined} />
        {state?.theatreMode && state.theatreJoinOpen && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#080817]/75 p-5 sm:p-10">
            <div className="flex w-full max-w-5xl flex-col items-center gap-6 rounded-3xl border-2 border-highlight/70 bg-[#111426]/95 px-6 py-8 text-center shadow-2xl sm:flex-row sm:gap-10 sm:px-12 sm:py-10">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=700x700&margin=8&data=${encodeURIComponent(`${window.location.origin}/join?room=${room}`)}`}
                alt="QR grande para unirse al juego"
                className="h-[min(52vh,62vw)] w-[min(52vh,62vw)] max-h-[560px] max-w-[560px] rounded-2xl bg-white p-3"
              />
              <div className="flex min-w-0 flex-col items-center text-center sm:items-start sm:text-left">
                <p className="font-display text-3xl font-black text-highlight sm:text-5xl">¡Entrá a jugar!</p>
                <p className="mt-3 text-xl text-white/90 sm:text-3xl">Escaneá este QR con tu celular</p>
                <p className="mt-5 rounded-xl border border-white/20 px-6 py-3 font-display text-3xl font-black tracking-[0.25em] text-white sm:text-5xl">{room}</p>
                <p className="mt-4 text-base text-white/70 sm:text-xl">¡Sumate y preparate para adivinar!</p>
              </div>
            </div>
          </div>
        )}
      </div>
      {status !== "online" && (
        <div className="fixed left-4 top-4 rounded-lg border border-border bg-card/80 px-3 py-2 text-xs font-semibold text-muted-foreground anim-pulse-soft">
          {readError ? `Error de conexión: ${readError}` : status === "connecting" ? "Conectando…" : "Reconectando…"}
        </div>
      )}
      <button
        onClick={toggleFullscreen}
        className={`fixed bottom-4 right-4 rounded-lg border border-border bg-card/80 px-3 py-2 text-xs font-semibold text-muted-foreground transition-opacity ${hint ? "opacity-100" : "opacity-0"}`}
      >
        Pantalla completa (F)
      </button>
    </div>
  );
}