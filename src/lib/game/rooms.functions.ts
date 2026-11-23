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