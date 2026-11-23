# Emoji en Escena

Juego familiar para escenario: el público adivina películas y series mediante emojis y pistas. Incluye consola privada del presentador, pantalla de proyección sincronizada, cronómetro, marcador individual y banco editable de preguntas.

## Ejecutar sin Lovable

El proyecto está migrado a este repositorio y se ejecuta como una aplicación web normal. No requiere créditos ni tokens de Lovable.

1. Instala Node.js 20+ (o Bun).
2. Clona el repositorio y ejecuta `npm install`.
3. Inicia con `npm run dev` y abre la URL local que muestra Vite.
4. Abre `/control` en el monitor privado y `/screen?room=CODIGO` en la pantalla pública. Para tres monitores, abre otra pestaña de `/screen` si deseas una vista de apoyo.

## Modalidades

- **Modo escenario / piscina:** sigue usando la consola del animador y puntos manuales; no necesita teléfonos.
- **Modo teatro interactivo:** los participantes ingresan en `/join?room=CODIGO`, envían respuestas desde el celular y suman puntos automáticamente. El panel muestra el QR y el ranking puede aparecer en la pantalla de proyección.

Para habilitar el modo teatro en Supabase, ejecutá el SQL de `supabase/migrations/202611230001_theatre_mode.sql` en el SQL Editor de tu proyecto. Luego desplegá la aplicación con las variables de Supabase configuradas; las salas entre dispositivos requieren HTTPS y backend activo. El QR se genera mediante QRServer y requiere conexión a internet en el dispositivo del animador.

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
