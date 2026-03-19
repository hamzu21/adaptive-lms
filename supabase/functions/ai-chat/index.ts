import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";
import { z } from "https://esm.sh/zod@3.25.76";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MessageSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().min(1).max(10000),
  })).min(1).max(50),
  lessonContext: z.object({
    title: z.string().max(200).optional(),
    content: z.string().max(50000).optional(),
    course: z.string().max(200).optional(),
  }).optional().nullable(),
});

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    console.log(`Authorization header present: ${!!authHeader}`);
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("Missing or invalid Authorization header");
      throw new Error("Unauthorized: Missing Bearer token");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    console.log("Verifying user token...");
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error("Auth error:", authError?.message || "No user found");
      throw new Error("Unauthorized");
    }

    const userId = user.id;
    console.log(`User verified: ${userId}`);
    
    // Check for service role key (needed for some operations if any, but not used yet in chat)
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const body = MessageSchema.parse(await req.json());
    const { messages, lessonContext } = body;

    // Fetch student context for personalized responses
    const [enrollRes, profileRes] = await Promise.all([
      supabase.from("enrollments").select("courses(title, subject)").eq("student_id", userId),
      supabase.from("profiles").select("full_name").eq("user_id", userId).single(),
    ]);

    const courses = (enrollRes.data || []).map((e: any) => e.courses?.title).filter(Boolean);
    const studentName = profileRes.data?.full_name || "Student";

    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY is not configured");

    let systemContent = `You are an AI learning assistant for a student named ${studentName}. They are enrolled in: ${courses.join(", ") || "no courses yet"}.

Your role:
- Help them understand course material and concepts
- Answer academic questions clearly and concisely
- Provide study tips and learning strategies
- Be encouraging and supportive
- Use examples and analogies to explain complex topics
- Keep responses focused and educational
- If asked about non-academic topics, gently redirect to learning

Format responses with markdown for readability. Use bullet points, headers, and bold text where helpful.

Crucially, always include 3 unique, relevant, and concise follow-up questions at the very end of your response inside exactly this format: [[Suggestions: Question 1 | Question 2 | Question 3]]. These should help the student explore the topic deeper.`;

    if (lessonContext && lessonContext.title && lessonContext.content) {
      systemContent += `\n\nThe student is currently viewing the lesson "${lessonContext.title}"${lessonContext.course ? ` from the course "${lessonContext.course}"` : ""}. Here is the lesson content:\n\n---\n${lessonContext.content}\n---\n\nUse this lesson content as primary context when answering their questions. Reference specific parts of the lesson when relevant.`;
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemContent },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Groq rate limit exceeded. Please try again later." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const t = await response.text();
      console.error("Groq AI chat error:", response.status, t);
      throw new Error(`Groq AI error: ${response.status}`);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return new Response(JSON.stringify({ error: "Invalid input", details: e.errors }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.error("ai-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
