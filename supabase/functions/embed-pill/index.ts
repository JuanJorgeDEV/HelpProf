/// <reference path="./deno-ambient.d.ts" />
// HelpProf — Edge Function: Gemini text-embedding-004 (768) → atualiza pills.embedding
// Secrets: GEMINI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, EMBED_WEBHOOK_SECRET (mesmo valor de app.embed_webhook_secret)

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent";

type EmbedBody = { pill_id?: string; text?: string };

async function embed768(text: string, apiKey: string): Promise<number[]> {
  const url = `${GEMINI_URL}?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "models/text-embedding-004",
      content: { parts: [{ text }] },
      outputDimensionality: 768,
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini embed failed (${res.status}): ${errText}`);
  }
  const data = await res.json() as {
    embedding?: { values?: number[] };
  };
  const values = data?.embedding?.values;
  if (!values || values.length !== 768) {
    throw new Error(`Gemini embedding length invalid: ${values?.length}`);
  }
  return values;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const webhookSecret = Deno.env.get("EMBED_WEBHOOK_SECRET") ?? "";
  const incomingSecret = req.headers.get("x-embed-webhook-secret") ?? "";
  if (!webhookSecret || incomingSecret !== webhookSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: EmbedBody;
  try {
    body = (await req.json()) as EmbedBody;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const pillId = body.pill_id?.trim();
  if (!pillId) {
    return new Response(JSON.stringify({ error: "pill_id required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!geminiKey || !supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let textContent = body.text?.trim();
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (!textContent) {
    const { data: row, error: fetchErr } = await supabase
      .from("pills")
      .select("survival_content")
      .eq("id", pillId)
      .is("deleted_at", null)
      .maybeSingle();

    if (fetchErr || !row?.survival_content) {
      return new Response(
        JSON.stringify({ error: fetchErr?.message ?? "Pill not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    }
    textContent = row.survival_content as string;
  }

  try {
    const vector = await embed768(textContent, geminiKey);

    const { error: upErr } = await supabase.rpc("set_pill_embedding", {
      p_id: pillId,
      p_vec: vector,
    });

    if (upErr) {
      console.error("[embed-pill] supabase rpc", upErr);
      return new Response(JSON.stringify({ error: upErr.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, pill_id: pillId }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[embed-pill]", e);
    return new Response(
      JSON.stringify({ error: String((e as Error)?.message ?? e) }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
