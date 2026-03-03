import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { BookOpen, BarChart3, Users, FileText, TrendingUp, ChevronDown, CheckCircle2, XCircle, ClipboardList, Download, Video } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { exportCSV, exportPDF } from "@/lib/exportUtils";
import { toast } from "sonner";

const navItems = [
  { label: "Dashboard", href: "/teacher", icon: <BarChart3 className="w-4 h-4" /> },
  { label: "My Classes", href: "/teacher/classes", icon: <Users className="w-4 h-4" /> },
  { label: "Courses", href: "/teacher/courses", icon: <BookOpen className="w-4 h-4" /> },
  { label: "Assessments", href: "/teacher/assessments", icon: <FileText className="w-4 h-4" /> },
  { label: "Assignments", href: "/teacher/assignments", icon: <ClipboardList className="w-4 h-4" /> },
  { label: "Live Classes", href: "/teacher/live", icon: <Video className="w-4 h-4" /> },
  { label: "Analytics", href: "/teacher/analytics", icon: <TrendingUp className="w-4 h-4" /> },
];

const TeacherAnalytics = () => {
  const { user } = useAuth();
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null);

  // Fetch teacher's assessments with course info
  const { data: assessments, isLoading: assessmentsLoading } = useQuery({
    queryKey: ["teacher-analytics-assessments", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: courses } = await supabase
        .from("courses")
        .select("id, title")
        .eq("teacher_id", user!.id);
      const courseIds = (courses || []).map((c) => c.id);
      if (courseIds.length === 0) return [];

      const { data, error } = await supabase
        .from("assessments")
        .select("id, title, total_marks, course_id")
        .in("course_id", courseIds);
      if (error) throw error;

      const courseMap = Object.fromEntries((courses || []).map((c) => [c.id, c.title]));
      return (data || []).map((a) => ({
        ...a,
        courseName: courseMap[a.course_id] || "Unknown",
      }));
    },
  });

  // Fetch detailed analytics for selected assessment
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ["teacher-assessment-analytics", selectedAssessmentId],
    enabled: !!selectedAssessmentId,
    queryFn: async () => {
      // Get all attempts for this assessment
      const { data: attempts } = await supabase
        .from("assessment_attempts")
        .select("id, student_id, score, total_marks, completed_at")
        .eq("assessment_id", selectedAssessmentId!)
        .not("completed_at", "is", null);

      if (!attempts || attempts.length === 0) {
        return { attempts: [], studentScores: [], questions: [], passRate: 0, avgScore: 0, highScore: 0, lowScore: 0 };
      }

      // Get student profiles
      const studentIds = [...new Set(attempts.map((a) => a.student_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", studentIds);
      const profileMap = Object.fromEntries((profiles || []).map((p) => [p.user_id, p.full_name || "Unknown"]));

      // Calculate student scores (best attempt per student)
      const bestAttempts = new Map<string, typeof attempts[0]>();
      attempts.forEach((a) => {
        const existing = bestAttempts.get(a.student_id);
        if (!existing || (a.score || 0) > (existing.score || 0)) {
          bestAttempts.set(a.student_id, a);
        }
      });

      const studentScores = Array.from(bestAttempts.values()).map((a) => {
        const pct = Math.round(((a.score || 0) / (a.total_marks || 1)) * 100);
        return {
          studentId: a.student_id,
          name: profileMap[a.student_id] || "Unknown",
          score: a.score || 0,
          totalMarks: a.total_marks || 0,
          percentage: pct,
          passed: pct >= 50,
        };
      }).sort((a, b) => b.percentage - a.percentage);

      const scores = studentScores.map((s) => s.percentage);
      const passRate = Math.round((studentScores.filter((s) => s.passed).length / studentScores.length) * 100);
      const avgScore = Math.round(scores.reduce((s, v) => s + v, 0) / scores.length);

      // Get questions for this assessment
      const { data: questions } = await supabase
        .from("questions")
        .select("id, question_text, correct_option, marks, position")
        .eq("assessment_id", selectedAssessmentId!)
        .order("position", { ascending: true }) as any;

      // Get all attempt responses for all attempts of this assessment
      const attemptIds = attempts.map((a) => a.id);
      const { data: responses } = await supabase
        .from("attempt_responses")
        .select("question_id, is_correct, attempt_id")
        .in("attempt_id", attemptIds);

      // Question-level stats
      const questionStats = (questions || []).map((q: any) => {
        const qResponses = (responses || []).filter((r) => r.question_id === q.id);
        const totalResponses = qResponses.length;
        const correctResponses = qResponses.filter((r) => r.is_correct).length;
        const accuracy = totalResponses > 0 ? Math.round((correctResponses / totalResponses) * 100) : 0;
        return {
          id: q.id,
          text: q.question_text,
          position: q.position,
          marks: q.marks,
          totalResponses,
          correctResponses,
          accuracy,
        };
      });

      return {
        attempts: attempts.length,
        studentScores,
        questions: questionStats,
        passRate,
        avgScore,
        highScore: scores.length > 0 ? Math.max(...scores) : 0,
        lowScore: scores.length > 0 ? Math.min(...scores) : 0,
      };
    },
  });

  return (
    <DashboardLayout title="Analytics" navItems={navItems}>
      {/* Assessment selector */}
      <div className="mb-6">
        <label className="text-sm font-medium text-muted-foreground mb-2 block">Select Assessment</label>
        {assessmentsLoading ? (
          <Skeleton className="h-10 w-72" />
        ) : assessments && assessments.length > 0 ? (
          <Select value={selectedAssessmentId || ""} onValueChange={(v) => setSelectedAssessmentId(v)}>
            <SelectTrigger className="w-full max-w-sm">
              <SelectValue placeholder="Choose an assessment..." />
            </SelectTrigger>
            <SelectContent>
              {assessments.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.title} — {a.courseName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <p className="text-sm text-muted-foreground">No assessments found. Create assessments first.</p>
        )}
      </div>

      {!selectedAssessmentId && (
        <div className="text-center py-16 text-muted-foreground">
          <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-40" />
          <p className="text-lg font-medium">Select an assessment to view analytics</p>
          <p className="text-sm">Choose from the dropdown above to see detailed performance data.</p>
        </div>
      )}

      {selectedAssessmentId && analyticsLoading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      )}

      {selectedAssessmentId && analytics && !analyticsLoading && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {analytics.studentScores.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-40" />
              <p className="text-lg font-medium">No attempts yet</p>
              <p className="text-sm">Students haven't taken this assessment yet.</p>
            </div>
          ) : (
            <>
              {/* Export buttons */}
              <div className="flex justify-end gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Download className="w-4 h-4" /> Export Scores
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => {
                      const selectedAssessment = assessments?.find((a) => a.id === selectedAssessmentId);
                      const headers = ["Student", "Score", "Total Marks", "Percentage", "Result"];
                      const rows = analytics.studentScores.map((s) => [s.name, s.score, s.totalMarks, `${s.percentage}%`, s.passed ? "Pass" : "Fail"]);
                      exportCSV(`class-scores-${selectedAssessment?.title || "report"}`, headers, rows);
                      toast.success("Scores exported as CSV");
                    }}>Download CSV</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      const selectedAssessment = assessments?.find((a) => a.id === selectedAssessmentId);
                      const headers = ["Student", "Score", "Total Marks", "Percentage", "Result"];
                      const rows = analytics.studentScores.map((s) => [s.name, s.score, s.totalMarks, `${s.percentage}%`, s.passed ? "Pass" : "Fail"]);
                      exportPDF(
                        `class-scores-${selectedAssessment?.title || "report"}`,
                        `Class Scores — ${selectedAssessment?.title || "Assessment"}`,
                        `Course: ${selectedAssessment?.courseName || "—"} · Avg: ${analytics.avgScore}% · Pass Rate: ${analytics.passRate}%`,
                        headers, rows
                      );
                      toast.success("Scores exported as PDF");
                    }}>Download PDF</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Download className="w-4 h-4" /> Export Questions
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => {
                      const selectedAssessment = assessments?.find((a) => a.id === selectedAssessmentId);
                      const headers = ["Q#", "Question", "Correct", "Total Responses", "Accuracy", "Marks"];
                      const rows = analytics.questions.map((q) => [`Q${q.position}`, q.text, q.correctResponses, q.totalResponses, `${q.accuracy}%`, q.marks]);
                      exportCSV(`question-analytics-${selectedAssessment?.title || "report"}`, headers, rows);
                      toast.success("Question analytics exported as CSV");
                    }}>Download CSV</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      const selectedAssessment = assessments?.find((a) => a.id === selectedAssessmentId);
                      const headers = ["Q#", "Question", "Correct", "Total", "Accuracy", "Marks"];
                      const rows = analytics.questions.map((q) => [`Q${q.position}`, q.text, q.correctResponses, q.totalResponses, `${q.accuracy}%`, q.marks]);
                      exportPDF(
                        `question-analytics-${selectedAssessment?.title || "report"}`,
                        `Question Performance — ${selectedAssessment?.title || "Assessment"}`,
                        `Course: ${selectedAssessment?.courseName || "—"} · ${analytics.questions.length} questions · ${analytics.attempts} total attempts`,
                        headers, rows, { orientation: "landscape" }
                      );
                      toast.success("Question analytics exported as PDF");
                    }}>Download PDF</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Summary stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Avg. Score", value: `${analytics.avgScore}%`, color: "text-primary" },
                  { label: "Pass Rate", value: `${analytics.passRate}%`, color: analytics.passRate >= 50 ? "text-primary" : "text-destructive" },
                  { label: "Highest", value: `${analytics.highScore}%`, color: "text-primary" },
                  { label: "Lowest", value: `${analytics.lowScore}%`, color: analytics.lowScore < 50 ? "text-destructive" : "text-primary" },
                ].map((s, i) => (
                  <motion.div
                    key={s.label}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-card rounded-xl border border-border p-5"
                  >
                    <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
                    <p className="text-sm text-muted-foreground">{s.label}</p>
                  </motion.div>
                ))}
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                {/* Student scores */}
                <div className="bg-card rounded-xl border border-border p-6">
                  <h3 className="font-semibold mb-4">Student Scores</h3>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {analytics.studentScores.map((s, i) => (
                      <motion.div
                        key={s.studentId}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="flex items-center gap-3"
                      >
                        <div className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center shrink-0",
                          s.passed ? "bg-primary/10" : "bg-destructive/10"
                        )}>
                          {s.passed ? (
                            <CheckCircle2 className="w-4 h-4 text-primary" />
                          ) : (
                            <XCircle className="w-4 h-4 text-destructive" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-1">
                            <p className="text-sm font-medium truncate">{s.name || "Student"}</p>
                            <span className={cn("text-sm font-semibold", s.passed ? "text-primary" : "text-destructive")}>
                              {s.percentage}%
                            </span>
                          </div>
                          <Progress value={s.percentage} className="h-1.5" />
                        </div>
                        <span className="text-xs text-muted-foreground w-14 text-right">{s.score}/{s.totalMarks}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Question-level performance */}
                <div className="bg-card rounded-xl border border-border p-6">
                  <h3 className="font-semibold mb-4">Question Performance</h3>
                  <div className="space-y-4 max-h-[400px] overflow-y-auto">
                    {analytics.questions.map((q, i) => (
                      <motion.div
                        key={q.id}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                      >
                        <div className="flex items-start justify-between mb-1.5">
                          <p className="text-sm font-medium">
                            <span className="text-muted-foreground mr-1.5">Q{q.position}.</span>
                            {q.text}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Progress value={q.accuracy} className="h-2 flex-1" />
                          <span className={cn(
                            "text-xs font-semibold w-10 text-right",
                            q.accuracy >= 70 ? "text-primary" : q.accuracy >= 40 ? "text-accent-foreground" : "text-destructive"
                          )}>
                            {q.accuracy}%
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {q.correctResponses}/{q.totalResponses} correct · {q.marks} mark{q.marks !== 1 ? "s" : ""}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </motion.div>
      )}
    </DashboardLayout>
  );
};

export default TeacherAnalytics;
