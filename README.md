# Emoji en Escena

Juego familiar para escenario: el público adivina películas y series mediante emojis y pistas. Incluye consola privada del presentador, pantalla de proyección sincronizada, cronómetro, marcador individual y banco editable de preguntas.

## Ejecutar sin Lovable

El proyecto está migrado a este repositorio y se ejecuta como una aplicación web normal. No requiere créditos ni tokens de Lovable.

1. Instala Node.js 20+ (o Bun).
2. Clona el repositorio y ejecuta `npm install`.
3. Inicia con `npm run dev` y abre la URL local que muestra Vite.
4. Abre `/control` en el monitor privado y `/screen?room=CODIGO` en la pantalla pública. Para tres monitores, abre otra pestaña de `/screen` si deseas una vista de apoyo.

## Uso sin backend

Sin variables de Supabase, la aplicación funciona en modo local y sincroniza las pantallas abiertas en el mismo navegador mediante BroadcastChannel. Es ideal para el PC del animador y sus monitores conectados. Para sincronizar entre computadoras distintas, configura Supabase (ver `.env.example`).

## Scripts

- `npm run dev`: desarrollo local.
- `npm run build`: compilación.
- `npm run preview`: probar la compilación.
- `npm run lint`: análisis estático.
- `npm test`: pruebas.

## Funciones del juego

- Banco de preguntas con emojis, pistas y respuestas; importar/exportar JSON.
- Preguntas de películas y series familiares; cronómetro configurable.
- Participantes individuales, nombres editables y marcador con ajustes +1, −1, +3 y −3.
- Rondas de 10 preguntas (la última puede ser más corta).
- Consola privada y pantalla pública: la respuesta y las pistas ocultas no se envían al proyector.

## Variables opcionales

Copiá `.env.example` a `.env` solo si vas a conectar una instancia de Supabase. Nunca publiques credenciales.

## Tecnologías

React, TypeScript, TanStack Start, Vite, Tailwind CSS y Supabase opcional.
