import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
};

const url = Deno.env.get("SUPABASE_URL")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const auth = { autoRefreshToken: false, persistSession: false };
const admin = createClient(url, serviceRoleKey, { auth });

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (request.method !== "POST") return new Response(null, { status: 405, headers });

  const input = await request.json().catch(() => null);
  const phone = input?.phone;
  const password = input?.password;
  if (typeof phone !== "string" || !/^\+[1-9]\d{7,14}$/.test(phone) || typeof password !== "string" || !password) {
    return Response.json({ error: "Invalid phone number or password" }, { status: 401, headers });
  }

  const { data: borrower, error: lookupError } = await admin
    .rpc("resolve_borrower_sign_in_phone", { p_phone: phone })
    .maybeSingle<{ user_id: string; email: string }>();

  if (lookupError) return Response.json({ error: "Phone sign-in is temporarily unavailable" }, { status: 503, headers });

  // Use Supabase Auth for the password check and session. An unlinked number
  // follows the same Auth path and receives the same failure response.
  const client = createClient(url, anonKey, { auth });
  const { data, error } = await client.auth.signInWithPassword({
    email: borrower?.email ?? "unlinked-phone@example.invalid",
    password,
  });

  if (error?.status === 429) return Response.json({ error: "Too many attempts" }, { status: 429, headers });
  if (!borrower || error || !data.session || data.user?.id !== borrower.user_id || !data.user.email_confirmed_at) {
    return Response.json({ error: "Invalid phone number or password" }, { status: 401, headers });
  }

  const { access_token, refresh_token } = data.session;
  return Response.json({ access_token, refresh_token }, { headers });
});
