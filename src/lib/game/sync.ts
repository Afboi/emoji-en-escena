import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { makeRoomCode, newGame, toPublic } from "./logic";
import { createRoom, getServerTime, loadRoom, pushRoom } from "./rooms.functions";
import { SAMPLE_QUESTIONS } from "./sample";
import type { GameState, PublicState, Question } from "./types";

export const BANK_KEY = "pce:bank";
export const CREDS_KEY = "pce:creds";
export const roomKey = (room: string) => `pce:room:${room}`;
const channelName = (room: string) => `pce-room-${room}`;

/** Con backend: sincroniza entre dispositivos. Sin backend: solo pestañas del mismo navegador. */
export const CLOUD = Boolean(import.meta.env["VITE_SUPABASE_URL"] && import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"]);

export type ConnStatus = "connecting" | "online" | "offline" | "error";
type Creds = { code: string; secret: string };
type Msg = { type: "public"; state: PublicState } | { type: "hb" } | { type: "hello" };

export function useNow(interval = 200) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(id);
  }, [interval]);
  return now;
}

/** Diferencia entre el reloj del servidor y el local, para que el cronómetro coincida en todos los equipos. */
export function useServerOffset() {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    if (!CLOUD) return;
    let alive = true;
    (async () => {
      let best = { rtt: Infinity, off: 0 };
      for (let i = 0; i < 3; i++) {
        try {
          const t0 = Date.now();
          const { now } = await getServerTime();
          const t1 = Date.now();
          if (t1 - t0 < best.rtt) best = { rtt: t1 - t0, off: now - (t0 + t1) / 2 };
        } catch {
          /* se reintenta */
        }
      }
      if (alive && best.rtt !== Infinity) setOffset(Math.round(best.off));
    })();
    return () => {
      alive = false;
    };
  }, []);
  return offset;
}

export function useBank() {
  const [bank, setBank] = useState<Question[] | null>(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(BANK_KEY);
      const parsed = raw ? (JSON.parse(raw) as Question[]) : SAMPLE_QUESTIONS;
      setBank(parsed.map((q) => ({ ...q, notes: q.notes ?? "" })));
    } catch {
      setBank(SAMPLE_QUESTIONS);
    }
  }, []);
  useEffect(() => {
    if (bank) localStorage.setItem(BANK_KEY, JSON.stringify(bank));
  }, [bank]);
  return [bank, setBank] as const;
}

function readLocal(room: string): GameState | null {
  try {
    const raw = localStorage.getItem(roomKey(room));
    return raw ? { ...newGame(room), ...(JSON.parse(raw) as GameState), room } : null;
  } catch {
    return null;
  }
}

/** Centro de comando: dueño del estado privado. Publica solo la versión pública. */
export function useControlRoom() {
  const [creds, setCreds] = useState<Creds | null>(null);
  const [state, setState] = useState<GameState | null>(null);
  const [status, setStatus] = useState<ConnStatus>("connecting");
  const [error, setError] = useState<string | null>(null);
  const [screens, setScreens] = useState(0);
  const [lastSeen, setLastSeen] = useState(0);
  const offset = useServerOffset();
  const chRef = useRef<BroadcastChannel | null>(null);
  const pubRef = useRef<PublicState | null>(null);
  const dirty = useRef(false);

  const openRoom = useCallback(async (fresh: boolean) => {
    setStatus("connecting");
    setError(null);
    try {
      let c: Creds | null = null;
      if (!fresh) {
        const raw = localStorage.getItem(CREDS_KEY);
        c = raw ? (JSON.parse(raw) as Creds) : null;
      }
      // A room created before Supabase was configured used the local-only
      // secret "local". It cannot authenticate against the cloud server.
      // Discard that stale credential and provision a real cloud room.
      if (CLOUD && c && c.secret.length < 20) {
        localStorage.removeItem(CREDS_KEY);
        c = null;
      }
      if (!c) {
        c = CLOUD ? await createRoom() : { code: makeRoomCode(), secret: "local" };
        localStorage.setItem(CREDS_KEY, JSON.stringify(c));
      }
      let s = readLocal(c.code);
      if (!s && CLOUD) {
        const { privateState } = await loadRoom({ data: c });
        if (privateState && typeof privateState === "object") s = { ...newGame(c.code), ...(privateState as unknown as GameState), room: c.code };
      }
      setCreds(c);
      setState(s ?? newGame(c.code));
      dirty.current = true;
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "No se pudo abrir la sala.");
      if (!fresh) {
        // credenciales inválidas o sala borrada: crear una nueva
        localStorage.removeItem(CREDS_KEY);
      }
    }
  }, []);

  useEffect(() => {
    void openRoom(false);
  }, [openRoom]);

  // Presencia de pantallas (nube) o latidos (local).
  useEffect(() => {
    if (!creds) return;
    if (CLOUD) {
      const ch = supabase.channel(`presence-${creds.code}`, { config: { presence: { key: "control" } } });
      ch.on("presence", { event: "sync" }, () => {
        const st = ch.presenceState<{ role: string }>();
        setScreens(Object.values(st).flat().filter((p) => p.role === "screen").length);
      }).subscribe((s) => {
        if (s === "CHANNEL_ERROR" || s === "TIMED_OUT" || s === "CLOSED") setStatus((p) => (p === "error" ? p : "offline"));
      });
      return () => {
        void supabase.removeChannel(ch);
      };
    }
    const bc = new BroadcastChannel(channelName(creds.code));
    chRef.current = bc;
    bc.onmessage = (e: MessageEvent<Msg>) => {
      if (e.data.type === "hb" || e.data.type === "hello") setLastSeen(Date.now());
      if (e.data.type === "hello" && pubRef.current) bc.postMessage({ type: "public", state: pubRef.current } satisfies Msg);
    };
    setStatus("online");
    return () => {
      bc.close();
      chRef.current = null;
    };
  }, [creds]);

  // Persistir + publicar.
  const flush = useCallback(async () => {
    if (!creds || !state || !CLOUD || !dirty.current) return;
    dirty.current = false;
    try {
      await pushRoom({
        data: {
          code: creds.code,
          secret: creds.secret,
          publicState: toPublic(state, offset) as unknown as Record<string, unknown>,
          privateState: state as unknown as Record<string, unknown>,
        },
      });
      setStatus("online");
      setError(null);
    } catch (e) {
      dirty.current = true;
      setStatus("error");
      setError(e instanceof Error ? e.message : "Error de sincronización");
    }
  }, [creds, state, offset]);

  useEffect(() => {
    if (!state) return;
    localStorage.setItem(roomKey(state.room), JSON.stringify(state));
    const pub = toPublic(state, 0);
    pubRef.current = pub;
    chRef.current?.postMessage({ type: "public", state: pub } satisfies Msg);
    dirty.current = true;
    const t = setTimeout(() => void flush(), 120);
    return () => clearTimeout(t);
  }, [state, flush]);

  // Reintento automático si falló la red.
  useEffect(() => {
    if (!CLOUD) return;
    const id = setInterval(() => {
      if (dirty.current) void flush();
    }, 3000);
    const onOnline = () => void flush();
    window.addEventListener("online", onOnline);
    return () => {
      clearInterval(id);
      window.removeEventListener("online", onOnline);
    };
  }, [flush]);

  const update = useCallback((fn: (s: GameState) => GameState) => {
    setState((prev) => (prev ? { ...fn(prev), updatedAt: Date.now() } : prev));
  }, []);

  const localScreen = Date.now() - lastSeen < 3500 ? 1 : 0;
  return {
    state,
    creds,
    update,
    status,
    error,
    screens: CLOUD ? screens : localScreen,
    offset,
    newRoom: () => openRoom(true),
    retry: () => (creds ? flush() : openRoom(false)),
  };
}

/** Pantalla pública: solo lectura. */
export function useScreenRoom(code: string | null) {
  const [state, setState] = useState<PublicState | null>(null);
  const [status, setStatus] = useState<ConnStatus>("connecting");
  const [notFound, setNotFound] = useState(false);
  const offset = useServerOffset();

  useEffect(() => {
    if (!code) return;
    setNotFound(false);
    if (CLOUD) {
      let alive = true;
      const fetchNow = async () => {
        const { data, error } = await supabase.from("rooms").select("public_state").eq("code", code).maybeSingle();
        if (!alive) return;
        if (error) return setStatus("offline");
        if (!data) return setNotFound(true);
        const ps = data.public_state as unknown as PublicState;
        setState(ps && "room" in ps ? ps : null);
      };
      void fetchNow();
      const ch = supabase
        .channel(`presence-${code}`, { config: { presence: { key: `screen-${Math.random().toString(36).slice(2)}` } } })
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "rooms", filter: `code=eq.${code}` }, (p) => {
          const ps = (p.new as { public_state: unknown }).public_state as PublicState;
          if (ps && "room" in ps) setState(ps);
        })
        .subscribe(async (s) => {
          if (s === "SUBSCRIBED") {
            setStatus("online");
            await ch.track({ role: "screen" });
            void fetchNow(); // ponerse al día tras reconexión
          } else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT" || s === "CLOSED") setStatus("offline");
        });
      const onVis = () => document.visibilityState === "visible" && void fetchNow();
      document.addEventListener("visibilitychange", onVis);
      window.addEventListener("online", onVis);
      return () => {
        alive = false;
        document.removeEventListener("visibilitychange", onVis);
        window.removeEventListener("online", onVis);
        void supabase.removeChannel(ch);
      };
    }
    const local = readLocal(code);
    setState(local ? toPublic(local, 0) : null);
    setStatus("online");
    const bc = new BroadcastChannel(channelName(code));
    bc.onmessage = (e: MessageEvent<Msg>) => {
      if (e.data.type === "public") setState(e.data.state);
    };
    bc.postMessage({ type: "hello" } satisfies Msg);
    const hb = setInterval(() => bc.postMessage({ type: "hb" } satisfies Msg), 1000);
    return () => {
      clearInterval(hb);
      bc.close();
    };
  }, [code]);

  return { state, status, notFound, offset };
}