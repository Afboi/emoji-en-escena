import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Emoji en Escena · Juego en vivo" },
      { name: "description", content: "Juego familiar en vivo para adivinar películas y series con emojis, con centro de comando y pantalla de teatro." },
      { property: "og:title", content: "Emoji en Escena · Juego en vivo" },
      { property: "og:description", content: "Adiviná películas y series con emojis. Centro de comando + pantalla de teatro sincronizados." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-stage-gradient px-6 text-center">
      <div className="text-7xl anim-float">🎬🍿🤔</div>
      <h1 className="font-display text-5xl font-black text-show-gradient md:text-7xl">Emoji en Escena</h1>
      <ol className="max-w-lg space-y-1 text-left text-muted-foreground">
        <li>1. Abrí el <b className="text-foreground">Centro de comando</b> en la laptop del animador.</li>
        <li>2. Abrí la <b className="text-foreground">Pantalla de teatro</b> en el proyector (puede ser otro equipo).</li>
        <li>3. Escribí el código de sala que muestra el centro de comando.</li>
      </ol>
      <div className="flex flex-wrap justify-center gap-4">
        <Link to="/control" className="rounded-xl bg-primary px-8 py-4 font-bold text-primary-foreground shadow-glow">Centro de comando</Link>
        <Link to="/screen" search={{ room: undefined }} className="rounded-xl border border-border bg-secondary px-8 py-4 font-bold">Pantalla de teatro</Link>
      </div>
    </div>
  );
}