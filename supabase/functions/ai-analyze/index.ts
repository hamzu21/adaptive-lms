import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  console.log("AI-Analyze function started");

  try {
    const authHeader = req.headers.get("Authorization");
    console.log(`Auth header present: ${!!authHeader}`);
    
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("Missing or invalid Authorization header");
      return new Response(JSON.stringify({ error: "Unauthorized: Missing Bearer token" }), { 
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const groqKey = Deno.env.get("GROQ_API_KEY");

    console.log("Environment check:", { 
      hasUrl: !!supabaseUrl, 
      hasAnon: !!supabaseAnonKey, 
      hasGroq: !!groqKey 
    });

    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(JSON.stringify({ error: "Missing Supabase configuration" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { 
        headers: { 
          Authorization: authHeader,
        } 
      }
    });

    console.log("Verifying user token...");
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error("Auth error from getUser:", authError.message);
      return new Response(JSON.stringify({ error: `Unauthorized: ${authError.message}` }), { 
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }
    
    if (!user) {
      console.error("No user found for token");
      return new Response(JSON.stringify({ error: "Unauthorized: No user found" }), { 
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    console.log(`User verified: ${user.id}`);

    // Fetch student performance data
    console.log("Fetching student data...");
    const [enrollRes, attemptsRes, progressRes] = await Promise.all([
      supabase.from("enrollments").select("course_id, courses(id, title, subject)").eq("student_id", user.id),
      supabase.from("assessment_attempts").select("score, total_marks, assessment_id, completed_at, assessments(title, course_id, courses(title, subject))").eq("student_id", user.id).not("completed_at", "is", null).order("completed_at", { ascending: false }),
      supabase.from("lesson_progress").select("lesson_id, completed, lessons(id, title, course_id, position, courses(title, subject))").eq("student_id", user.id).eq("completed", true),
    ]);

    if (enrollRes.error) console.error("Enrollment fetch error:", enrollRes.error);
    if (attemptsRes.error) console.error("Attempts fetch error:", attemptsRes.error);
    if (progressRes.error) console.error("Progress fetch error:", progressRes.error);

    const enrollments = enrollRes.data || [];
    const attempts = attemptsRes.data || [];
    const completedLessons = progressRes.data || [];

    console.log(`Data summary: ${enrollments.length} enrollments, ${attempts.length} attempts, ${completedLessons.length} lessons completed`);

    // Get ALL lessons for enrolled courses (needed for finding incomplete ones)
    const courseIds = enrollments.map((e: any) => e.course_id);
    let allLessons: any[] = [];
    if (courseIds.length > 0) {
      console.log(`Fetching lessons for ${courseIds.length} courses...`);
      const { data, error: lessonError } = await supabase.from("lessons").select("id, title, course_id, position, courses(title, subject)").in("course_id", courseIds).order("position", { ascending: true });
      if (lessonError) console.error("Lessons fetch error:", lessonError);
      allLessons = data || [];
    }

    const completedLessonIds = new Set(completedLessons.map((p: any) => p.lesson_id));

    // Use latest completed attempt per assessment to reflect current mastery
    const latestAttemptsByAssessment = new Map<string, any>();
    for (const attempt of attempts) {
      if (!attempt.assessment_id) continue;
      if (!latestAttemptsByAssessment.has(attempt.assessment_id)) {
        latestAttemptsByAssessment.set(attempt.assessment_id, attempt);
      }
    }
    const latestAttempts = Array.from(latestAttemptsByAssessment.values());

    // Build per-course performance + incomplete lessons
    const coursePerformance = enrollments.map((e: any) => {
      const course = e.courses as any;
      const courseAttempts = latestAttempts.filter((a: any) => a.assessments?.course_id === e.course_id);
      const courseLessons = allLessons.filter((l: any) => l.course_id === e.course_id);
      const courseCompleted = courseLessons.filter((l: any) => completedLessonIds.has(l.id));
      const incompleteLessons = courseLessons.filter((l: any) => !completedLessonIds.has(l.id)).slice(0, 3);

      const avgScore = courseAttempts.length > 0
        ? Math.round(courseAttempts.reduce((s: number, a: any) => s + ((a.score || 0) / (a.total_marks || 1)) * 100, 0) / courseAttempts.length)
        : null;

      // Recent score trend (last 3 attempts)
      const recentAttempts = courseAttempts.slice(0, 3);
      const recentAvg = recentAttempts.length > 0
        ? Math.round(recentAttempts.reduce((s: number, a: any) => s + ((a.score || 0) / (a.total_marks || 1)) * 100, 0) / recentAttempts.length)
        : null;

      return {
        courseId: e.course_id,
        course: course?.title || "Unknown",
        subject: course?.subject || "Unknown",
        quizzesTaken: courseAttempts.length,
        avgScore,
        recentAvgScore: recentAvg,
        lessonsCompleted: courseCompleted.length,
        totalLessons: courseLessons.length,
        completionRate: courseLessons.length > 0 ? Math.round((courseCompleted.length / courseLessons.length) * 100) : 0,
        incompleteLessons: incompleteLessons.map((l: any) => ({
          id: l.id,
          title: l.title,
          position: l.position,
        })),
      };
    });

    const performanceSummary = JSON.stringify({
      coursePerformance,
      totalQuizzes: attempts.length,
      totalQuizzesConsidered: latestAttempts.length,
      totalLessonsCompleted: completedLessons.length,
      totalLessonsAvailable: allLessons.length,
    });

    const allCoursesCompleted =
      coursePerformance.length > 0 &&
      coursePerformance.every(
        (course: any) => course.totalLessons > 0 && course.lessonsCompleted >= course.totalLessons
      );

    const allLatestAttemptsPerfect =
      latestAttempts.length > 0 &&
      latestAttempts.every(
        (attempt: any) =>
          (attempt.total_marks ?? 0) > 0 && (attempt.score ?? 0) >= (attempt.total_marks ?? 0)
      );

    if (allCoursesCompleted && allLatestAttemptsPerfect) {
      console.log("Returning perfect score summary");
      return new Response(
        JSON.stringify({
          strengths: [{ topic: "Overall Mastery", reason: "All lessons are completed and scores are perfect." }],
          weaknesses: [],
          recommendations: [],
          summary: "Amazing work! You've mastered everything currently assigned.",
          learningPath: [],
          difficultyProfile: { level: "advanced", description: "Mastered curriculum", adjustmentNote: "Time for new challenges!" },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!groqKey) {
      console.error("GROQ_API_KEY is missing");
      return new Response(JSON.stringify({ error: "AI configuration error: GROQ_API_KEY missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log(`Performance summary length: ${performanceSummary.length}`);
    console.log("Calling Groq API (Llama 3.3)...");
    const aiResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${groqKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `You are an expert educational AI tutor. Analyze the student's performance data and provide a detailed, supportive, and actionable analysis.
            Return a JSON object with the following structure:
            {
              "strengths": [{"topic": "string", "reason": "string"}],
              "weaknesses": [{"topic": "string", "reason": "string"}],
              "recommendations": [{"title": "string", "description": "string", "priority": "high|medium|low"}],
              "summary": "string (a warm, encouraging 2-3 sentence overview)",
              "learningPath": [{"courseId": "string", "lessonId": "string", "lessonTitle": "string", "reason": "string", "difficulty": "review|standard|challenge", "urgency": "high|medium|low"}],
              "difficultyProfile": {"level": "beginner|intermediate|advanced", "description": "string", "adjustmentNote": "string"}
            }
            Ensure the recommendations are specific to the student's weak areas and the summary is written in the second person ("You").
            Return ONLY the raw JSON object.`,
          },
          {
            role: "user",
            content: `Student Performance Summary: ${performanceSummary}`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
      }),
    });

    if (!aiResponse.ok) {
      const t = await aiResponse.text();
      console.error("Groq API error:", aiResponse.status, t);
      return new Response(JSON.stringify({ 
        error: `Groq error ${aiResponse.status}`, 
        details: t 
      }), {
        status: aiResponse.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const aiData = await aiResponse.json();
    console.log("Groq responded successfully");
    const content = aiData.choices?.[0]?.message?.content || "{}";
    
    // Attempt to extract JSON if it was returned with markdown markers
    let jsonStr = content.trim();
    if (jsonStr.startsWith("```json")) {
      jsonStr = jsonStr.replace(/^```json/, "").replace(/```$/, "").trim();
    } else if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```/, "").replace(/```$/, "").trim();
    }

    const analysis = JSON.parse(jsonStr);

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("Critical error in ai-analyze:", e.message);
    return new Response(JSON.stringify({ error: e.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
