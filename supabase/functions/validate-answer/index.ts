import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.25.76";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AnswerSchema = z.object({
  questionId: z.string().uuid(),
  selectedOption: z.number().int().min(0).max(9),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    console.log(`Authorization header present: ${!!authHeader}`);
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("Missing or invalid Authorization header");
      throw new Error("Unauthorized: Missing Bearer token");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the user
    console.log("Verifying user token...");
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    
    if (authError) {
      console.error("Auth error from getUser:", authError.message);
      throw new Error(`Unauthorized: ${authError.message}`);
    }
    
    if (!user) {
      console.error("No user found for token");
      throw new Error("Unauthorized: No user found");
    }

    console.log(`User verified: ${user.id}`);

    const { questionId, selectedOption } = AnswerSchema.parse(await req.json());
    console.log(`Validating question ${questionId} with option ${selectedOption} for user ${user.id}`);

    // Use service role to read correct_option (bypasses RLS)
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: question, error: qErr } = await adminClient
      .from("questions")
      .select("correct_option, marks")
      .eq("id", questionId)
      .single();

    if (qErr) {
      console.error("Database error fetching question:", qErr);
      throw new Error(`Question fetch failed: ${qErr.message}`);
    }
    
    if (!question) {
      console.error(`Question not found: ${questionId}`);
      throw new Error("Question not found in database");
    }

    const isCorrect = selectedOption === question.correct_option;
    console.log(`Result: ${isCorrect ? "Correct" : "Incorrect"}`);

    return new Response(
      JSON.stringify({ isCorrect, marks: question.marks }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Validation error:", err.message);
    const status = err.message?.includes("Unauthorized") ? 401 : 400;
    return new Response(
      JSON.stringify({ error: err.message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
