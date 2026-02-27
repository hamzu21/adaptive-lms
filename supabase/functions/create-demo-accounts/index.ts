import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const demos = [
    { email: "demo.student@lms.test", password: "demo1234", full_name: "Demo Student", role: "student" },
    { email: "demo.teacher@lms.test", password: "demo1234", full_name: "Demo Teacher", role: "teacher" },
    { email: "demo.parent@lms.test", password: "demo1234", full_name: "Demo Parent", role: "parent" },
    { email: "demo.admin@lms.test", password: "demo1234", full_name: "Demo Admin", role: "admin" },
  ];

  const results = [];

  for (const demo of demos) {
    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existing = existingUsers?.users?.find((u) => u.email === demo.email);
    if (existing) {
      results.push({ email: demo.email, status: "already exists" });
      continue;
    }

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: demo.email,
      password: demo.password,
      email_confirm: true,
      user_metadata: { full_name: demo.full_name, role: demo.role },
    });

    if (error) {
      results.push({ email: demo.email, status: "error", message: error.message });
    } else {
      results.push({ email: demo.email, status: "created", id: data.user.id });
    }
  }

  return new Response(JSON.stringify({ results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
