import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Emoji en Escena · Juego en vivo" },
      { name: "description", content: "Elegí la modalidad de juego: escenario sin celulares o teatro interactivo." },
      { property: "og:title", content: "Emoji en Escena · Juego en vivo" },
      { property: "og:description", content: "Dos formas de jugar: en escenario o con participantes conectados desde sus teléfonos." },
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
      <p className="max-w-2xl text-lg text-muted-foreground">
        Elegí cómo querés jugar. Las dos modalidades comparten el banco de películas y series.
      </p>
      <div className="grid w-full max-w-4xl gap-5 md:grid-cols-2">
        <section className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card/70 p-7 text-center">
          <div className="text-5xl">🏖️</div>
          <h2 className="font-display text-2xl font-black">Modo escenario</h2>
          <p className="text-muted-foreground">Ideal para piscina, atril o actividades donde los huéspedes no usan celulares. El animador lee respuestas y lleva los puntos.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/control" className="rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground">Abrir control</Link>
            <Link to="/screen" search={{ room: undefined }} className="rounded-xl border border-border bg-secondary px-6 py-3 font-bold">Pantalla</Link>
          </div>
        </section>
        <section className="flex flex-col items-center gap-4 rounded-2xl border border-highlight/40 bg-highlight/5 p-7 text-center">
          <div className="text-5xl">📱</div>
          <h2 className="font-display text-2xl font-black">Modo teatro interactivo</h2>
          <p className="text-muted-foreground">Para el teatro: los huéspedes se unen con QR desde sus teléfonos, responden y compiten por el ranking.</p>
          <span className="rounded-full border border-highlight/40 px-4 py-2 text-sm font-semibold text-highlight">Próxima implementación · requiere conexión en línea</span>
        </section>
      </div>
      <p className="max-w-xl text-sm text-muted-foreground">
        El modo escenario sigue funcionando sin que los participantes tengan que conectarse. La modalidad interactiva se habilitará como una experiencia separada.
      </p>
    </main>
  );
}
