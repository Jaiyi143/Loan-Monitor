import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateClientPayload {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return Response.json({ error: "Missing Authorization header" }, { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await callerClient.auth.getUser();
    if (userError || !userData.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
    }

    const { data: callerProfile, error: profileError } = await callerClient
      .from("profiles")
      .select("role")
      .eq("id", userData.user.id)
      .single();

    if (profileError || callerProfile?.role !== "admin") {
      return Response.json({ error: "Admin access required" }, { status: 403, headers: corsHeaders });
    }

    const body = (await req.json()) as CreateClientPayload;
    const email = body.email?.trim().toLowerCase();
    const password = body.password;
    const fullName = body.fullName?.trim();
    const phone = body.phone?.trim() || null;

    if (!email || !password || password.length < 8 || !fullName) {
      return Response.json(
        { error: "Email, full name, and a password of at least 8 characters are required." },
        { status: 400, headers: corsHeaders },
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (createError || !created.user) {
      return Response.json(
        { error: createError?.message ?? "Failed to create auth user" },
        { status: 400, headers: corsHeaders },
      );
    }

    const { error: insertError } = await adminClient.from("profiles").insert({
      id: created.user.id,
      email,
      full_name: fullName,
      phone,
      role: "client",
    });

    if (insertError) {
      await adminClient.auth.admin.deleteUser(created.user.id);
      return Response.json({ error: insertError.message }, { status: 400, headers: corsHeaders });
    }

    return Response.json(
      { id: created.user.id, email, full_name: fullName, phone },
      { status: 201, headers: corsHeaders },
    );
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      { status: 500, headers: corsHeaders },
    );
  }
});
