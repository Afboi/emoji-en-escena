import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Json } from "@/integrations/supabase/types";

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomCode(): string {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  return [...bytes].map((b) => letters[b % letters.length]).join("");
}

const credsSchema = z.object({ code: z.string().min(3).max(8), secret: z.string().min(20).max(200) });

async function verify(code: string, secret: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("room_secrets").select("secret_hash, private_state").eq("code", code).maybeSingle();
  if (error) throw new Error("No se pudo verificar la sala.");
  if (!data || data.secret_hash !== (await sha256(secret))) throw new Error("Sala no autorizada.");
  return { supabaseAdmin, data };
}

export const getServerTime = createServerFn({ method: "GET" }).handler(async () => ({ now: Date.now() }));

export const createRoom = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  for (let i = 0; i < 6; i++) {
    const code = randomCode();
    const { error } = await supabaseAdmin.from("rooms").insert({ code, public_state: {} });
    if (error) {
      if (error.code === "23505") continue;
      throw new Error("No se pudo crear la sala.");
    }
    const secret = crypto.randomUUID() + crypto.randomUUID();
    const { error: e2 } = await supabaseAdmin.from("room_secrets").insert({ code, secret_hash: await sha256(secret) });
    if (e2) throw new Error("No se pudo crear la sala.");
    return { code, secret };
  }
  throw new Error("No se pudo generar un código libre.");
});

export const pushRoom = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    credsSchema
      .extend({ publicState: z.record(z.unknown()), privateState: z.record(z.unknown()) })
      .refine((v) => JSON.stringify(v).length < 600_000, "Estado demasiado grande")
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await verify(data.code, data.secret);
    const now = new Date().toISOString();
    const [a, b] = await Promise.all([
      supabaseAdmin.from("rooms").update({ public_state: data.publicState as Json, updated_at: now }).eq("code", data.code),
      supabaseAdmin.from("room_secrets").update({ private_state: data.privateState as Json }).eq("code", data.code),
    ]);
    if (a.error || b.error) throw new Error("No se pudo guardar el estado.");
    return { ok: true, at: Date.now() };
  });

export const loadRoom = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => credsSchema.parse(input))
  .handler(async ({ data }) => {
    const { data: row } = await verify(data.code, data.secret);
    return { privateState: (row.private_state ?? null) as Json };
  });

const theatreJoinSchema = z.object({
  code: z.string().min(3).max(8).transform((v) => v.toUpperCase()),
  nickname: z.string().trim().min(1).max(24),
});
export const joinTheatre = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => theatreJoinSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: room, error } = await supabaseAdmin.from("room_secrets").select("private_state").eq("code", data.code).maybeSingle();
    if (error || !room) throw new Error("No encontramos esa sala.");
    const state = room.private_state as Record<string, unknown> | null;
    if (state?.["theatreJoinOpen"] !== true) throw new Error("El animador todavía no abrió el ingreso.");
    const player = { id: crypto.randomUUID(), room_code: data.code, nickname: data.nickname };
    const { error: insertError } = await supabaseAdmin.from("theatre_players" as never).insert(player as never);
    if (insertError) throw new Error("No se pudo ingresar. Intentá de nuevo.");
    return { playerId: player.id, nickname: player.nickname, room: data.code };
  });

const answerSchema = z.object({
  code: z.string().min(3).max(8).transform((v) => v.toUpperCase()),
  playerId: z.string().uuid(),
  answer: z.string().trim().min(1).max(160),
});
function normalizeAnswer(value: string) {
  return value.normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toLocaleLowerCase("es").replace(/[^a-z0-9 ]/g, " ").replace(/\\s+/g, " ").trim();
}
export const submitTheatreAnswer = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => answerSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: player, error: playerError } = await supabaseAdmin.from("theatre_players" as never).select("id, room_code" as never).eq("id" as never, data.playerId as never).maybeSingle();
    if (playerError || !player) throw new Error("Participante no válido.");
    const { data: room, error } = await supabaseAdmin.from("room_secrets").select("private_state").eq("code", data.code).maybeSingle();
    if (error || !room || (player as unknown as { room_code: string }).room_code !== data.code) throw new Error("Sala no válida.");
    const state = room.private_state as unknown as { theatreMode?: boolean; answerShown?: boolean; status?: string; index?: number; playlist?: { answer?: string }[]; timer?: { enabled?: boolean; running?: boolean; endsAt?: number | null; duration?: number } };
    if (state.theatreMode !== true || state.answerShown || state.status !== "playing" || !state.playlist?.[state.index ?? -1]) throw new Error("No hay una pregunta abierta.");
    const correct = normalizeAnswer(data.answer) === normalizeAnswer(state.playlist[state.index!].answer ?? "");
    const remaining = state.timer?.endsAt ? Math.max(0, state.timer.endsAt - Date.now()) : 0;
    if (state.timer?.enabled && state.timer.running && remaining <= 0) throw new Error("Se acabó el tiempo para responder.");
    const points = correct ? (state.timer?.enabled && state.timer.running ? Math.max(100, Math.round(1000 * Math.min(1, remaining / Math.max(1000, (state.timer?.duration ?? 45) * 1000)))) : 1000) : 0;
    const { data: result, error: scoreError } = await supabaseAdmin.rpc("record_theatre_answer" as never, {
      p_player_id: data.playerId, p_question_index: state.index!, p_answer: data.answer, p_correct: correct, p_points: points,
    } as never);
    if (scoreError) throw new Error("No se pudo registrar la respuesta.");
    const row = (result as unknown as { accepted: boolean; awarded: number }[])?.[0];
    return { accepted: row?.accepted === true, correct, points: row?.awarded ?? 0 };
  });

export const listTheatrePlayers = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => credsSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await verify(data.code, data.secret);
    const { data: players, error } = await supabaseAdmin.from("theatre_players" as never).select("id, nickname, score, joined_at" as never).eq("room_code" as never, data.code as never).order("joined_at" as never);
    if (error) throw new Error("No se pudo cargar el público.");
    return { players: players ?? [] };
  });
