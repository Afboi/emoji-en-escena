@echo off
setlocal
title Emoji en Escena
cd /d "%~dp0"

echo ==========================================
echo          EMOJI EN ESCENA
echo ==========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo No se encontro Node.js.
  echo Instala la version LTS desde https://nodejs.org/
  echo Luego vuelve a ejecutar este archivo.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo No se encontro npm. Reinstala Node.js LTS y marca la opcion de PATH.
  pause
  exit /b 1
)

if not exist "package.json" (
  echo No encuentro package.json.
  echo Este BAT debe estar dentro de la carpeta del proyecto Emoji en Escena.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Instalando los componentes necesarios. Esto solo se hace la primera vez...
  call npm install
  if errorlevel 1 (
    echo Hubo un problema instalando las dependencias.
    pause
    exit /b 1
  )
)

echo.
echo Iniciando Emoji en Escena...
echo Cuando aparezca la direccion local, abre el control en /control.
echo Para detenerlo, presiona CTRL+C.
echo.
call npm run dev -- --host 0.0.0.0
pause
