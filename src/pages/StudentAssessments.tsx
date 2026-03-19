import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import AdaptiveQuizEngine from "@/components/AdaptiveQuizEngine";
import { BookOpen, BarChart3, FileText, TrendingUp, CheckCircle2, Clock, ArrowLeft, AlertCircle, ClipboardList, Bot, Brain, Target, Zap, Video } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", href: "/student", icon: <BarChart3 className="w-4 h-4" /> },
  { label: "My Courses", href: "/student/courses", icon: <BookOpen className="w-4 h-4" /> },
  { label: "Assessments", href: "/student/assessments", icon: <FileText className="w-4 h-4" /> },
  { label: "Assignments", href: "/student/assignments", icon: <ClipboardList className="w-4 h-4" /> },
  { label: "Live Classes", href: "/student/live", icon: <Video className="w-4 h-4" /> },
  { label: "Progress", href: "/student/progress", icon: <TrendingUp className="w-4 h-4" /> },
  { label: "AI Assistant", href: "/student/ai-chat", icon: <Bot className="w-4 h-4" /> },
];

type ViewState =
  | { mode: "list" }
  | { mode: "quiz"; assessmentId: string }
  | { mode: "result"; attemptId: string };

const StudentAssessments = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [view, setView] = useState<ViewState>({ mode: "list" });

  return (
    <DashboardLayout title="Assessments" navItems={navItems}>
      <AnimatePresence mode="wait">
        {view.mode === "list" && (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <AssessmentList userId={user?.id} onStart={(id) => setView({ mode: "quiz", assessmentId: id })} onViewResult={(id) => setView({ mode: "result", attemptId: id })} />
          </motion.div>
        )}
        {view.mode === "quiz" && (
          <motion.div key="quiz" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <AdaptiveQuizEngine
              assessmentId={view.assessmentId}
              userId={user!.id}
              onBack={() => setView({ mode: "list" })}
              onComplete={(attemptId) => {
                queryClient.invalidateQueries({ queryKey: ["student-assessments"] });
                queryClient.invalidateQueries({ queryKey: ["student-stats"] });
                setView({ mode: "result", attemptId });
              }}
            />
          </motion.div>
        )}
        {view.mode === "result" && (
          <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <ResultView attemptId={view.attemptId} onBack={() => setView({ mode: "list" })} />
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
};

/* ─── Assessment List ─── */
function AssessmentList({ userId, onStart, onViewResult }: { userId?: string; onStart: (id: string) => void; onViewResult: (id: string) => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["student-assessments", userId],
    enabled: !!userId,
    queryFn: async () => {
      // Get enrolled course ids
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("course_id")
        .eq("student_id", userId!);
      const courseIds = (enrollments || []).map((e) => e.course_id);
      if (courseIds.length === 0) return [];

      const { data: assessments, error } = await supabase
        .from("assessments")
        .select("id, title, description, total_marks, course_id, courses(title)")
        .eq("is_published", true)
        .in("course_id", courseIds);
      if (error) throw error;

      // Get past attempts
      const { data: attempts } = await supabase
        .from("assessment_attempts")
        .select("id, assessment_id, score, total_marks, completed_at")
        .eq("student_id", userId!);

      const attemptMap = new Map<string, { id: string; score: number | null; total_marks: number | null; completed_at: string | null }>();
      (attempts || []).forEach((a) => {
        const existing = attemptMap.get(a.assessment_id);
        if (!existing || (a.completed_at && (!existing.completed_at || a.completed_at > existing.completed_at))) {
          attemptMap.set(a.assessment_id, a);
        }
      });

      return (assessments || []).map((a: any) => ({
        ...a,
        courseName: a.courses?.title || "Unknown",
        lastAttempt: attemptMap.get(a.id) || null,
      }));
    },
  });

  if (isLoading) {
    return (
      <div className="grid md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <FileText className="w-12 h-12 mx-auto mb-4 opacity-40" />
        <p className="text-lg font-medium">No assessments available</p>
        <p className="text-sm">Assessments will appear once your teacher publishes them.</p>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {data.map((a, i) => {
        const completed = !!a.lastAttempt?.completed_at;
        const scorePercent = completed && a.lastAttempt ? Math.round(((a.lastAttempt.score || 0) / (a.lastAttempt.total_marks || 1)) * 100) : null;
        return (
          <motion.div
            key={a.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-card rounded-xl border border-border p-6 flex flex-col"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              {completed && (
                <span className={cn(
                  "text-xs font-medium px-2 py-1 rounded-full",
                  (scorePercent ?? 0) >= 50 ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
                )}>
                  {scorePercent}%
                </span>
              )}
            </div>
            <h3 className="font-semibold mb-1">{a.title}</h3>
            <p className="text-xs text-muted-foreground mb-1">{a.courseName}</p>
            {a.description && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{a.description}</p>}
            <p className="text-xs text-muted-foreground mb-4">Total marks: {a.total_marks}</p>
            <div className="mt-auto flex gap-2">
              {completed ? (
                <>
                  <Button size="sm" variant="outline" onClick={() => onViewResult(a.lastAttempt!.id)}>
                    View Result
                  </Button>
                  <Button size="sm" onClick={() => onStart(a.id)}>Retake</Button>
                </>
              ) : a.lastAttempt && !a.lastAttempt.completed_at ? (
                <Button size="sm" onClick={() => onStart(a.id)}>
                  <Clock className="w-4 h-4 mr-1" /> Continue
                </Button>
              ) : (
                <Button size="sm" onClick={() => onStart(a.id)}>Start Quiz</Button>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

/* Old QuizTaker removed — replaced by AdaptiveQuizEngine component */

/* ─── Result View ─── */
function ResultView({ attemptId, onBack }: { attemptId: string; onBack: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["quiz-result", attemptId],
    queryFn: async () => {
      const { data: attempt, error: aErr } = await supabase
        .from("assessment_attempts")
        .select("id, score, total_marks, assessment_id, is_adaptive, difficulty_progression, assessments(title)")
        .eq("id", attemptId)
        .single();
      if (aErr) throw aErr;

      const { data: responses, error: rErr } = await supabase
        .from("attempt_responses")
        .select(`
          question_id, 
          selected_option, 
          is_correct, 
          difficulty_level, 
          questions!inner(
            question_text, 
            options, 
            correct_option, 
            marks, 
            difficulty
          )
        `)
        .eq("attempt_id", attemptId);

      if (rErr) {
        console.error("Error fetching responses:", rErr);
        // Fallback to empty if join failed or other error
        return { attempt, responses: [] };
      }

      return { attempt, responses: responses || [] };
    },
  });

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-48" /></div>;
  }

  if (!data) return null;

  const { attempt, responses } = data;
  const scorePercent = Math.round(((attempt.score || 0) / (attempt.total_marks || 1)) * 100);
  const passed = scorePercent >= 50;

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={onBack} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to assessments
      </button>

      <div className="bg-card rounded-xl border border-border p-8 text-center mb-6">
        <div className={cn(
          "w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center",
          passed ? "bg-primary/10" : "bg-destructive/10"
        )}>
          {passed ? (
            <CheckCircle2 className="w-10 h-10 text-primary" />
          ) : (
            <AlertCircle className="w-10 h-10 text-destructive" />
          )}
        </div>
        <h2 className="text-xl font-bold mb-1">{(attempt as any).assessments?.title}</h2>
        {(attempt as any).is_adaptive && (
          <div className="flex items-center justify-center gap-1 mb-2">
            <Brain className="w-4 h-4 text-primary" />
            <span className="text-xs text-primary font-medium">Adaptive Quiz</span>
          </div>
        )}
        <p className="text-3xl font-bold mb-1">
          <span className={passed ? "text-primary" : "text-destructive"}>{scorePercent}%</span>
        </p>
        <p className="text-sm text-muted-foreground">{attempt.score}/{attempt.total_marks} marks</p>
      </div>

      <h3 className="font-semibold mb-4">Question Review</h3>
      {responses.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">
          <AlertCircle className="w-8 h-8 mx-auto mb-3 opacity-20" />
          <p className="text-sm font-medium">No question details available for this attempt.</p>
          <p className="text-[10px] opacity-70">This could happen if the questions were modified or deleted after you completed the quiz.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {responses.map((r: any, i: number) => {
            const q = r.questions;
            const options = (Array.isArray(q?.options) ? q.options : []) as string[];
            return (
              <div key={r.question_id} className="bg-card rounded-xl border border-border p-5">
                <div className="flex items-start gap-3 mb-3">
                  <span className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                    r.is_correct ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
                  )}>
                    {i + 1}
                  </span>
                  <p className="text-sm font-medium flex-1">{q?.question_text}</p>
                  {(r.difficulty_level || q?.difficulty) && (
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0",
                      (r.difficulty_level || q?.difficulty) === "easy" ? "bg-emerald-500/10 text-emerald-600" :
                      (r.difficulty_level || q?.difficulty) === "hard" ? "bg-red-500/10 text-red-600" :
                      "bg-amber-500/10 text-amber-600"
                    )}>
                      {(r.difficulty_level || q?.difficulty)?.charAt(0).toUpperCase() + (r.difficulty_level || q?.difficulty)?.slice(1)}
                    </span>
                  )}
                </div>
                <div className="space-y-2 ml-9">
                  {options.map((opt: string, oIdx: number) => {
                    const isCorrect = oIdx === q?.correct_option;
                    const isSelected = oIdx === r.selected_option;
                    return (
                      <div
                        key={oIdx}
                        className={cn(
                          "text-sm px-3 py-2 rounded-lg border",
                          isCorrect ? "border-primary bg-primary/5 text-primary font-medium" :
                          isSelected && !isCorrect ? "border-destructive bg-destructive/5 text-destructive" :
                          "border-border text-muted-foreground"
                        )}
                      >
                        {opt}
                        {isCorrect && <span className="ml-2 text-xs">✓ Correct</span>}
                        {isSelected && !isCorrect && <span className="ml-2 text-xs">✗ Your answer</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default StudentAssessments;
