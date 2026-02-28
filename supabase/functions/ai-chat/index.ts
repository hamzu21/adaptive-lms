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
    if (!authHeader?.startsWith("Bearer ")) throw new Error("Missing authorization");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) throw new Error("Unauthorized");
    const userId = claimsData.claims.sub as string;

    const { messages, lessonContext } = await req.json();
    if (!messages || !Array.isArray(messages)) throw new Error("Messages array required");

    // Fetch student context for personalized responses
    const [enrollRes, profileRes] = await Promise.all([
      supabase.from("enrollments").select("courses(title, subject)").eq("student_id", userId),
      supabase.from("profiles").select("full_name").eq("user_id", userId).single(),
    ]);

    const courses = (enrollRes.data || []).map((e: any) => e.courses?.title).filter(Boolean);
    const studentName = profileRes.data?.full_name || "Student";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let systemContent = `You are an AI learning assistant for a student named ${studentName}. They are enrolled in: ${courses.join(", ") || "no courses yet"}.

Your role:
- Help them understand course material and concepts
- Answer academic questions clearly and concisely
- Provide study tips and learning strategies
- Be encouraging and supportive
- Use examples and analogies to explain complex topics
- Keep responses focused and educational
- If asked about non-academic topics, gently redirect to learning

Format responses with markdown for readability. Use bullet points, headers, and bold text where helpful.`;

    if (lessonContext && lessonContext.title && lessonContext.content) {
      systemContent += `\n\nThe student is currently viewing the lesson "${lessonContext.title}"${lessonContext.course ? ` from the course "${lessonContext.course}"` : ""}. Here is the lesson content:\n\n---\n${lessonContext.content}\n---\n\nUse this lesson content as primary context when answering their questions. Reference specific parts of the lesson when relevant.`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemContent },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const t = await response.text();
      console.error("AI chat error:", response.status, t);
      throw new Error("AI gateway error");
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
