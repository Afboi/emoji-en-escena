import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Emoji en Escena · Juego en vivo" },
      { name: "description", content: "Juego de películas y series con emojis." },
      { property: "og:title", content: "Emoji en Escena · Juego en vivo" },
      { property: "og:description", content: "Emoji en Escena · Fiesta Resort" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-stage-gradient px-6 py-12 text-center">
      <div className="text-7xl anim-float">🎬🍿🤔</div>
      <h1 className="font-display text-5xl font-black text-show-gradient md:text-7xl">Emoji en Escena</h1>
      <p className="max-w-xl text-lg text-muted-foreground">¡Preparáte para adivinar!</p>
      <div className="flex flex-wrap justify-center gap-4">
        <Link to="/control" className="rounded-xl bg-primary px-8 py-4 text-lg font-bold text-primary-foreground">Abrir control</Link>
        <Link to="/screen" search={{ room: undefined }} className="rounded-xl border border-border bg-secondary px-8 py-4 text-lg font-bold">Pantalla</Link>
      </div>
    </main>
  );
}
