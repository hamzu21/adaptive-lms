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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    // Fetch student performance data
    const [enrollRes, attemptsRes, progressRes, lessonsRes] = await Promise.all([
      supabase.from("enrollments").select("course_id, courses(id, title, subject)").eq("student_id", user.id),
      supabase.from("assessment_attempts").select("score, total_marks, assessment_id, assessments(title, course_id, courses(title, subject))").eq("student_id", user.id).not("completed_at", "is", null),
      supabase.from("lesson_progress").select("lesson_id, completed, lessons(title, course_id, courses(title, subject))").eq("student_id", user.id).eq("completed", true),
      supabase.from("enrollments").select("course_id").eq("student_id", user.id),
    ]);

    const enrollments = enrollRes.data || [];
    const attempts = attemptsRes.data || [];
    const completedLessons = progressRes.data || [];

    // Get total lessons per course
    const courseIds = enrollments.map((e: any) => e.course_id);
    let totalLessonsData: any[] = [];
    if (courseIds.length > 0) {
      const { data } = await supabase.from("lessons").select("id, course_id").in("course_id", courseIds);
      totalLessonsData = data || [];
    }

    // Build performance summary for AI
    const coursePerformance = enrollments.map((e: any) => {
      const course = e.courses as any;
      const courseAttempts = attempts.filter((a: any) => a.assessments?.course_id === e.course_id);
      const courseLessons = totalLessonsData.filter((l: any) => l.course_id === e.course_id);
      const courseCompleted = completedLessons.filter((p: any) => p.lessons?.course_id === e.course_id);
      const avgScore = courseAttempts.length > 0
        ? Math.round(courseAttempts.reduce((s: number, a: any) => s + ((a.score || 0) / (a.total_marks || 1)) * 100, 0) / courseAttempts.length)
        : null;
      return {
        course: course?.title || "Unknown",
        subject: course?.subject || "Unknown",
        quizzesTaken: courseAttempts.length,
        avgScore,
        lessonsCompleted: courseCompleted.length,
        totalLessons: courseLessons.length,
        completionRate: courseLessons.length > 0 ? Math.round((courseCompleted.length / courseLessons.length) * 100) : 0,
      };
    });

    const performanceSummary = JSON.stringify({ coursePerformance, totalQuizzes: attempts.length, totalLessonsCompleted: completedLessons.length });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are an educational AI tutor analyzing a student's learning performance. Based on their data, provide:
1. "strengths": Array of {topic, reason} - subjects/courses where student excels (high scores, good completion)
2. "weaknesses": Array of {topic, reason} - subjects/courses needing improvement
3. "recommendations": Array of {title, description, priority} - specific actionable learning recommendations (priority: high/medium/low)
4. "summary": A brief 2-3 sentence motivational summary of overall performance

Return ONLY valid JSON with these 4 keys. If student has no data, provide encouraging defaults about getting started.`,
          },
          {
            role: "user",
            content: `Analyze this student's performance data:\n${performanceSummary}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_performance",
              description: "Return structured analysis of student performance",
              parameters: {
                type: "object",
                properties: {
                  strengths: {
                    type: "array",
                    items: { type: "object", properties: { topic: { type: "string" }, reason: { type: "string" } }, required: ["topic", "reason"] },
                  },
                  weaknesses: {
                    type: "array",
                    items: { type: "object", properties: { topic: { type: "string" }, reason: { type: "string" } }, required: ["topic", "reason"] },
                  },
                  recommendations: {
                    type: "array",
                    items: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, priority: { type: "string", enum: ["high", "medium", "low"] } }, required: ["title", "description", "priority"] },
                  },
                  summary: { type: "string" },
                },
                required: ["strengths", "weaknesses", "recommendations", "summary"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "analyze_performance" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const t = await aiResponse.text();
      console.error("AI error:", aiResponse.status, t);
      throw new Error("AI gateway error");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let analysis;
    if (toolCall?.function?.arguments) {
      analysis = JSON.parse(toolCall.function.arguments);
    } else {
      // Fallback: try to parse content directly
      const content = aiData.choices?.[0]?.message?.content || "{}";
      analysis = JSON.parse(content);
    }

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-analyze error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
