# Publicar Emoji en Escena (para usar desde celulares)

La aplicación necesita estar publicada en internet para que el QR funcione desde teléfonos. El modo local (`localhost`) solo funciona en la computadora del animador.

## Despliegue recomendado: Vercel conectado a GitHub

1. Abrí https://vercel.com/new e iniciá sesión.
2. Importá el repositorio `Afboi/emoji-en-escena` desde GitHub.
3. En **Environment Variables**, agregá las variables de abajo (Production, Preview y Development).
4. Deploy. Vercel publicará la app y dará una URL HTTPS.
5. Abrí esa URL, entrá a `/control`, creá/abrí una sala y usá el QR del panel de modo teatro.

## Variables de entorno

| Variable | Valor |
| --- | --- |
| `SUPABASE_URL` | URL del proyecto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave secreta de servidor de Supabase (rotada; nunca publicarla) |
| `SUPABASE_PUBLISHABLE_KEY` | Clave publishable de Supabase |
| `VITE_SUPABASE_URL` | La misma URL del proyecto |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | La misma clave publishable |

**Seguridad:** nunca agregues la clave secreta a una variable que empiece por `VITE_`, ni al repositorio, ni a capturas. Configurala solo en el panel privado del hosting.

## Después de publicar

- Centro de comando: `https://TU-DOMINIO/control`
- Proyección: `https://TU-DOMINIO/screen?room=CODIGO`
- Participantes: el QR abre `/join?room=CODIGO`

Cada actualización que se suba a la rama principal de GitHub se puede desplegar automáticamente desde el proyecto conectado.

## Importante

Antes de usar el modo teatro con público real, probá con dos teléfonos: ingreso, envío de respuesta, puntuación y pantalla. No compartas el código secreto de la sala ni la clave de servicio.
