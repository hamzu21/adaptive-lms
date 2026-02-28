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
    const [enrollRes, attemptsRes, progressRes] = await Promise.all([
      supabase.from("enrollments").select("course_id, courses(id, title, subject)").eq("student_id", user.id),
      supabase.from("assessment_attempts").select("score, total_marks, assessment_id, completed_at, assessments(title, course_id, courses(title, subject))").eq("student_id", user.id).not("completed_at", "is", null).order("completed_at", { ascending: false }),
      supabase.from("lesson_progress").select("lesson_id, completed, lessons(id, title, course_id, position, courses(title, subject))").eq("student_id", user.id).eq("completed", true),
    ]);

    const enrollments = enrollRes.data || [];
    const attempts = attemptsRes.data || [];
    const completedLessons = progressRes.data || [];

    // Get ALL lessons for enrolled courses (needed for finding incomplete ones)
    const courseIds = enrollments.map((e: any) => e.course_id);
    let allLessons: any[] = [];
    if (courseIds.length > 0) {
      const { data } = await supabase.from("lessons").select("id, title, course_id, position, courses(title, subject)").in("course_id", courseIds).order("position", { ascending: true });
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
      return new Response(
        JSON.stringify({
          strengths: [
            {
              topic: "Overall Mastery",
              reason: "All enrolled lessons are completed and your latest quiz attempts are perfect.",
            },
          ],
          weaknesses: [],
          recommendations: [],
          summary:
            "Amazing work — you have completed all lessons and achieved perfect scores in your latest assessments.",
          learningPath: [],
          difficultyProfile: {
            level: "advanced",
            description: "You have mastered the current enrolled curriculum.",
            adjustmentNote:
              "Ask your teacher for advanced modules, project-based challenges, or higher-level courses.",
          },
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

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
1. "strengths": Array of {topic, reason} - subjects/courses where student excels
2. "weaknesses": Array of {topic, reason} - subjects/courses needing improvement
3. "recommendations": Array of {title, description, priority} - specific actionable learning recommendations (priority: high/medium/low)
4. "summary": A brief 2-3 sentence motivational summary
5. "learningPath": Array of recommended next steps, each with:
   - "courseId": the course ID from the data
   - "courseName": course name
   - "lessonId": specific lesson ID to do next (from incompleteLessons)
   - "lessonTitle": lesson title
   - "reason": why this lesson is recommended now (1 sentence)
   - "difficulty": recommended difficulty level ("review" for struggling students who should revisit basics, "standard" for on-track students, "challenge" for excelling students who should push ahead)
   - "urgency": "high" (falling behind), "medium" (on track), "low" (ahead of pace)
6. "difficultyProfile": Overall assessment of where the student is:
   - "level": "beginner" | "intermediate" | "advanced"
   - "description": 1 sentence summary of their learning level
   - "adjustmentNote": specific advice on how to adjust difficulty

Use the incompleteLessons data to recommend SPECIFIC real lessons. Prioritize courses where the student is struggling (low scores, low completion).
If student has no data, provide encouraging defaults about getting started.
Return ONLY valid JSON.`,
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
              description: "Return structured analysis of student performance with adaptive learning path",
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
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                        priority: { type: "string", enum: ["high", "medium", "low"] },
                      },
                      required: ["title", "description", "priority"],
                    },
                  },
                  summary: { type: "string" },
                  learningPath: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        courseId: { type: "string" },
                        courseName: { type: "string" },
                        lessonId: { type: "string" },
                        lessonTitle: { type: "string" },
                        reason: { type: "string" },
                        difficulty: { type: "string", enum: ["review", "standard", "challenge"] },
                        urgency: { type: "string", enum: ["high", "medium", "low"] },
                      },
                      required: ["courseId", "courseName", "lessonId", "lessonTitle", "reason", "difficulty", "urgency"],
                    },
                  },
                  difficultyProfile: {
                    type: "object",
                    properties: {
                      level: { type: "string", enum: ["beginner", "intermediate", "advanced"] },
                      description: { type: "string" },
                      adjustmentNote: { type: "string" },
                    },
                    required: ["level", "description", "adjustmentNote"],
                  },
                },
                required: ["strengths", "weaknesses", "recommendations", "summary", "learningPath", "difficultyProfile"],
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
