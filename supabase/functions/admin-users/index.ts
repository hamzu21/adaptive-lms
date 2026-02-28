import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    // Verify caller is admin using their token
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    // Check admin role
    const { data: roleData } = await anonClient.from("user_roles").select("role").eq("user_id", user.id).single();
    if (roleData?.role !== "admin") throw new Error("Forbidden: admin only");

    // Use service role for admin operations
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (req.method === "GET" && action === "list") {
      // List all users with profiles and roles
      const page = parseInt(url.searchParams.get("page") || "1");
      const perPage = 50;
      const search = url.searchParams.get("search") || "";

      const { data: authUsers, error: listError } = await adminClient.auth.admin.listUsers({
        page,
        perPage,
      });
      if (listError) throw listError;

      // Get all profiles and roles
      const userIds = authUsers.users.map((u: any) => u.id);
      const [profilesRes, rolesRes] = await Promise.all([
        adminClient.from("profiles").select("user_id, full_name, avatar_url").in("user_id", userIds),
        adminClient.from("user_roles").select("user_id, role").in("user_id", userIds),
      ]);

      const profilesMap = new Map((profilesRes.data || []).map((p: any) => [p.user_id, p]));
      const rolesMap = new Map((rolesRes.data || []).map((r: any) => [r.user_id, r.role]));

      let users = authUsers.users.map((u: any) => ({
        id: u.id,
        email: u.email,
        fullName: profilesMap.get(u.id)?.full_name || "",
        avatarUrl: profilesMap.get(u.id)?.avatar_url || null,
        role: rolesMap.get(u.id) || "student",
        createdAt: u.created_at,
        lastSignIn: u.last_sign_in_at,
      }));

      if (search) {
        const s = search.toLowerCase();
        users = users.filter((u: any) =>
          u.email?.toLowerCase().includes(s) || u.fullName?.toLowerCase().includes(s)
        );
      }

      return new Response(JSON.stringify({ users, total: authUsers.users.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST" && action === "update-role") {
      const { userId, newRole } = await req.json();
      if (!userId || !newRole) throw new Error("Missing userId or newRole");
      if (!["student", "teacher", "parent", "admin"].includes(newRole)) throw new Error("Invalid role");

      // Don't allow changing own role
      if (userId === user.id) throw new Error("Cannot change your own role");

      const { error } = await adminClient.from("user_roles").update({ role: newRole }).eq("user_id", userId);
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST" && action === "delete-user") {
      const { userId } = await req.json();
      if (!userId) throw new Error("Missing userId");
      if (userId === user.id) throw new Error("Cannot delete yourself");

      const { error } = await adminClient.auth.admin.deleteUser(userId);
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST" && action === "update-profile") {
      const { userId, fullName } = await req.json();
      if (!userId) throw new Error("Missing userId");

      const { error } = await adminClient.from("profiles").update({ full_name: fullName }).eq("user_id", userId);
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Unknown action");
  } catch (e) {
    console.error("admin-users error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: e instanceof Error && e.message.includes("Forbidden") ? 403 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
