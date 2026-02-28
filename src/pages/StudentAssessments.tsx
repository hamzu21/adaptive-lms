import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { BookOpen, BarChart3, FileText, TrendingUp, CheckCircle2, Clock, ArrowLeft, AlertCircle, ClipboardList, Bot } from "lucide-react";
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
            <QuizTaker
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

/* ─── Quiz Taker ─── */
function QuizTaker({ assessmentId, userId, onBack, onComplete }: { assessmentId: string; userId: string; onBack: () => void; onComplete: (attemptId: string) => void }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});

  const { data: assessment } = useQuery({
    queryKey: ["quiz-assessment", assessmentId],
    queryFn: async () => {
      const { data, error } = await supabase.from("assessments").select("id, title, total_marks").eq("id", assessmentId).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: questions, isLoading } = useQuery({
    queryKey: ["quiz-questions", assessmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("questions")
        .select("id, question_text, options, correct_option, marks, position")
        .eq("assessment_id", assessmentId)
        .order("position", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!questions || questions.length === 0) throw new Error("No questions");

      // Create attempt
      const { data: attempt, error: aErr } = await supabase
        .from("assessment_attempts")
        .insert({ student_id: userId, assessment_id: assessmentId })
        .select("id")
        .single();
      if (aErr) throw aErr;

      // Calculate score and insert responses
      let score = 0;
      const responses = questions.map((q) => {
        const selected = answers[q.id] ?? -1;
        const correct = selected === (q as any).correct_option;
        if (correct) score += q.marks;
        return {
          attempt_id: attempt.id,
          question_id: q.id,
          selected_option: selected >= 0 ? selected : null,
          is_correct: correct,
        };
      });

      const { error: rErr } = await supabase.from("attempt_responses").insert(responses);
      if (rErr) throw rErr;

      // Update attempt with score
      const { error: uErr } = await supabase
        .from("assessment_attempts")
        .update({ score, total_marks: assessment?.total_marks || 0, completed_at: new Date().toISOString() })
        .eq("id", attempt.id);
      if (uErr) throw uErr;

      return attempt.id;
    },
    onSuccess: (attemptId) => {
      toast.success("Quiz submitted!");
      onComplete(attemptId);
    },
    onError: () => toast.error("Failed to submit quiz"),
  });

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-48" /></div>;
  }

  if (!questions || questions.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-40" />
        <p>This assessment has no questions yet.</p>
        <Button variant="ghost" className="mt-4" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
      </div>
    );
  }

  const q = questions[currentIdx];
  const options = (Array.isArray(q.options) ? q.options : []) as string[];
  const total = questions.length;
  const answered = Object.keys(answers).length;

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={onBack} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to assessments
      </button>

      <h2 className="text-lg font-semibold mb-2">{assessment?.title}</h2>
      <div className="flex items-center gap-3 mb-6">
        <Progress value={(answered / total) * 100} className="h-2 flex-1" />
        <span className="text-sm text-muted-foreground">{answered}/{total} answered</span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={q.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.15 }}
          className="bg-card rounded-xl border border-border p-6"
        >
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-medium text-muted-foreground">Question {currentIdx + 1} of {total}</span>
            <span className="text-xs text-muted-foreground">{q.marks} mark{q.marks !== 1 ? "s" : ""}</span>
          </div>
          <p className="font-medium mb-6">{q.question_text}</p>

          <RadioGroup
            value={answers[q.id] !== undefined ? String(answers[q.id]) : ""}
            onValueChange={(v) => setAnswers((prev) => ({ ...prev, [q.id]: parseInt(v) }))}
          >
            <div className="space-y-3">
              {options.map((opt, oIdx) => (
                <Label
                  key={oIdx}
                  htmlFor={`opt-${q.id}-${oIdx}`}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                    answers[q.id] === oIdx ? "border-primary bg-primary/5" : "border-border hover:bg-secondary"
                  )}
                >
                  <RadioGroupItem value={String(oIdx)} id={`opt-${q.id}-${oIdx}`} />
                  <span className="text-sm">{opt}</span>
                </Label>
              ))}
            </div>
          </RadioGroup>
        </motion.div>
      </AnimatePresence>

      <div className="flex justify-between mt-6">
        <Button variant="outline" disabled={currentIdx === 0} onClick={() => setCurrentIdx((i) => i - 1)}>
          Previous
        </Button>
        {currentIdx < total - 1 ? (
          <Button onClick={() => setCurrentIdx((i) => i + 1)}>Next</Button>
        ) : (
          <Button onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending || answered < total}>
            {answered < total ? `Answer all (${total - answered} left)` : "Submit Quiz"}
          </Button>
        )}
      </div>

      {/* Question navigation dots */}
      <div className="flex gap-1.5 justify-center mt-6 flex-wrap">
        {questions.map((qq, i) => (
          <button
            key={qq.id}
            onClick={() => setCurrentIdx(i)}
            className={cn(
              "w-8 h-8 rounded-lg text-xs font-medium transition-colors",
              i === currentIdx ? "bg-primary text-primary-foreground" :
              answers[qq.id] !== undefined ? "bg-primary/20 text-primary" :
              "bg-secondary text-muted-foreground"
            )}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Result View ─── */
function ResultView({ attemptId, onBack }: { attemptId: string; onBack: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["quiz-result", attemptId],
    queryFn: async () => {
      const { data: attempt, error: aErr } = await supabase
        .from("assessment_attempts")
        .select("id, score, total_marks, assessment_id, assessments(title)")
        .eq("id", attemptId)
        .single();
      if (aErr) throw aErr;

      const { data: responses } = await supabase
        .from("attempt_responses")
        .select("question_id, selected_option, is_correct, questions!inner(question_text, options, correct_option, marks)")
        .eq("attempt_id", attemptId) as any;

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
        <p className="text-3xl font-bold mb-1">
          <span className={passed ? "text-primary" : "text-destructive"}>{scorePercent}%</span>
        </p>
        <p className="text-sm text-muted-foreground">{attempt.score}/{attempt.total_marks} marks</p>
      </div>

      <h3 className="font-semibold mb-4">Question Review</h3>
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
                <p className="text-sm font-medium">{q?.question_text}</p>
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
    </div>
  );
}

export default StudentAssessments;
