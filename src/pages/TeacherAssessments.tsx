import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { BookOpen, BarChart3, Users, FileText, Plus, Trash2, ArrowLeft, Save, Eye, EyeOff, CheckCircle2, TrendingUp, ClipboardList, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { motion } from "framer-motion";

const navItems = [
  { label: "Dashboard", href: "/teacher", icon: <BarChart3 className="w-4 h-4" /> },
  { label: "My Classes", href: "/teacher/classes", icon: <Users className="w-4 h-4" /> },
  { label: "Courses", href: "/teacher/courses", icon: <BookOpen className="w-4 h-4" /> },
  { label: "Assessments", href: "/teacher/assessments", icon: <FileText className="w-4 h-4" /> },
  { label: "Assignments", href: "/teacher/assignments", icon: <ClipboardList className="w-4 h-4" /> },
  { label: "Live Classes", href: "/teacher/live", icon: <Video className="w-4 h-4" /> },
  { label: "Analytics", href: "/teacher/analytics", icon: <TrendingUp className="w-4 h-4" /> },
];

interface QuestionForm {
  id?: string;
  question_text: string;
  options: string[];
  correct_option: number;
  marks: number;
  position: number;
  difficulty: "easy" | "medium" | "hard";
  isNew?: boolean;
}

interface AssessmentForm {
  title: string;
  description: string;
  course_id: string;
  total_marks: number;
  is_published: boolean;
}

const emptyQuestion = (pos: number): QuestionForm => ({
  question_text: "",
  options: ["", "", "", ""],
  correct_option: 0,
  marks: 1,
  position: pos,
  difficulty: "medium",
  isNew: true,
});

const TeacherAssessments = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<AssessmentForm>({ title: "", description: "", course_id: "", total_marks: 100, is_published: false });
  const [questions, setQuestions] = useState<QuestionForm[]>([]);

  // Fetch teacher's courses for the dropdown
  const { data: courses } = useQuery({
    queryKey: ["teacher-courses-assess", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("id, title, subject").eq("teacher_id", user!.id).order("title");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch assessments
  const { data: assessments, isLoading } = useQuery({
    queryKey: ["teacher-assessments", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: teacherCourses } = await supabase.from("courses").select("id").eq("teacher_id", user!.id);
      const courseIds = (teacherCourses || []).map((c) => c.id);
      if (courseIds.length === 0) return [];
      const { data, error } = await supabase
        .from("assessments")
        .select("*, courses(title)")
        .in("course_id", courseIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const saveAssessment = useMutation({
    mutationFn: async () => {
      if (!form.title.trim()) throw new Error("Assessment title is required");
      if (!form.course_id) throw new Error("Select a course");

      const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);
      let assessmentId = editingId;

      if (assessmentId) {
        const { error } = await supabase.from("assessments")
          .update({ title: form.title, description: form.description, course_id: form.course_id, total_marks: totalMarks, is_published: form.is_published })
          .eq("id", assessmentId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("assessments")
          .insert({ title: form.title, description: form.description, course_id: form.course_id, total_marks: totalMarks, is_published: form.is_published })
          .select("id").single();
        if (error) throw error;
        assessmentId = data.id;
      }

      // Delete removed questions (if editing)
      if (editingId) {
        const keepIds = questions.filter((q) => q.id && !q.isNew).map((q) => q.id!);
        if (keepIds.length > 0) {
          await supabase.from("questions").delete().eq("assessment_id", assessmentId!).not("id", "in", `(${keepIds.join(",")})`);
        } else {
          await supabase.from("questions").delete().eq("assessment_id", assessmentId!);
        }
      }

      // Upsert questions
      const existingQs = questions.filter((q) => q.id && !q.isNew);
      const newQs = questions.filter((q) => !q.id || q.isNew);

      for (const q of existingQs) {
        await supabase.from("questions").update({
          question_text: q.question_text,
          options: q.options,
          correct_option: q.correct_option,
          marks: q.marks,
          position: q.position,
          difficulty: q.difficulty,
        }).eq("id", q.id!);
      }

      if (newQs.length > 0) {
        const { error } = await supabase.from("questions").insert(
          newQs.map((q) => ({
            assessment_id: assessmentId!,
            question_text: q.question_text,
            options: q.options,
            correct_option: q.correct_option,
            marks: q.marks,
            position: q.position,
            difficulty: q.difficulty,
          }))
        );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "Assessment updated!" : "Assessment created!");
      queryClient.invalidateQueries({ queryKey: ["teacher-assessments"] });
      resetForm();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteAssessment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("assessments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Assessment deleted");
      queryClient.invalidateQueries({ queryKey: ["teacher-assessments"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const startEdit = async (id: string) => {
    const assessment = assessments?.find((a) => a.id === id);
    if (!assessment) return;
    setForm({ title: assessment.title, description: assessment.description, course_id: assessment.course_id, total_marks: assessment.total_marks, is_published: assessment.is_published });
    setEditingId(id);
    setCreating(true);

    const { data } = await supabase.from("questions").select("*").eq("assessment_id", id).order("position");
    setQuestions((data || []).map((q) => ({
      id: q.id,
      question_text: q.question_text,
      options: q.options as string[],
      correct_option: q.correct_option,
      marks: q.marks,
      position: q.position,
      difficulty: (q as any).difficulty || "medium",
    })));
  };

  const resetForm = () => {
    setForm({ title: "", description: "", course_id: "", total_marks: 100, is_published: false });
    setQuestions([]);
    setEditingId(null);
    setCreating(false);
  };

  const addQuestion = () => setQuestions((prev) => [...prev, emptyQuestion(prev.length)]);

  const removeQuestion = (idx: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== idx).map((q, i) => ({ ...q, position: i })));
  };

  const updateQuestion = (idx: number, field: string, value: any) => {
    setQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, [field]: value } : q)));
  };

  const updateOption = (qIdx: number, oIdx: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIdx ? { ...q, options: q.options.map((o, j) => (j === oIdx ? value : o)) } : q
      )
    );
  };

  // List view
  if (!creating) {
    return (
      <DashboardLayout title="Assessments" navItems={navItems}>
        <div className="flex justify-between items-center mb-6">
          <p className="text-muted-foreground text-sm">{assessments?.length ?? 0} assessments</p>
          <Button onClick={() => setCreating(true)} className="gap-2"><Plus className="w-4 h-4" /> New Assessment</Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />)}</div>
        ) : assessments && assessments.length > 0 ? (
          <div className="space-y-3">
            {assessments.map((a: any, i: number) => (
              <motion.div key={a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-card rounded-xl border border-border p-5 flex items-center justify-between hover:border-primary/30 transition-colors">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{a.title}</p>
                    <p className="text-xs text-muted-foreground">{a.courses?.title || "Unknown course"} · {a.total_marks} marks · {a.is_published ? "Published" : "Draft"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {a.is_published ? <Eye className="w-4 h-4 text-primary" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                  <Button variant="outline" size="sm" onClick={() => startEdit(a.id)}>Edit</Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteAssessment.mutate(a.id)} className="text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">No assessments yet. Create your first quiz!</p>
            <Button onClick={() => setCreating(true)} className="gap-2"><Plus className="w-4 h-4" /> Create Assessment</Button>
          </div>
        )}
      </DashboardLayout>
    );
  }

  // Form view
  return (
    <DashboardLayout title={editingId ? "Edit Assessment" : "Create Assessment"} navItems={navItems}>
      <Button variant="ghost" onClick={resetForm} className="mb-4 gap-2 text-muted-foreground">
        <ArrowLeft className="w-4 h-4" /> Back to assessments
      </Button>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Assessment details */}
          <div className="bg-card rounded-xl border border-border p-6 space-y-4">
            <h2 className="text-lg font-semibold">Assessment Details</h2>
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Chapter 3 Quiz" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="course">Course *</Label>
              <Select value={form.course_id} onValueChange={(v) => setForm({ ...form, course_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select a course" /></SelectTrigger>
                <SelectContent>
                  {courses?.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc">Description</Label>
              <Textarea id="desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Instructions for students" rows={2} />
            </div>
          </div>

          {/* Questions */}
          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Questions ({questions.length})</h2>
              <Button variant="outline" size="sm" onClick={addQuestion} className="gap-2"><Plus className="w-4 h-4" /> Add Question</Button>
            </div>

            {questions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No questions yet. Add your first question above.</p>
            ) : (
              <div className="space-y-6">
                {questions.map((q, qIdx) => (
                  <div key={qIdx} className="border border-border rounded-lg p-5 space-y-4 bg-muted/30">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-1 rounded">Q{qIdx + 1}</span>
                        <Input
                          type="number"
                          value={q.marks}
                          onChange={(e) => updateQuestion(qIdx, "marks", parseInt(e.target.value) || 1)}
                          className="w-20"
                          min={1}
                        />
                        <span className="text-xs text-muted-foreground">marks</span>
                        <Select value={q.difficulty} onValueChange={(v) => updateQuestion(qIdx, "difficulty", v)}>
                          <SelectTrigger className="w-28 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="easy"><span className="text-emerald-600">● Easy</span></SelectItem>
                            <SelectItem value="medium"><span className="text-amber-600">● Medium</span></SelectItem>
                            <SelectItem value="hard"><span className="text-red-600">● Hard</span></SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => removeQuestion(qIdx)} className="text-destructive hover:text-destructive shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <Textarea
                      value={q.question_text}
                      onChange={(e) => updateQuestion(qIdx, "question_text", e.target.value)}
                      placeholder="Enter your question"
                      rows={2}
                    />

                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Options (select the correct answer)</Label>
                      <RadioGroup
                        value={q.correct_option.toString()}
                        onValueChange={(v) => updateQuestion(qIdx, "correct_option", parseInt(v))}
                      >
                        {q.options.map((opt, oIdx) => (
                          <div key={oIdx} className="flex items-center gap-3">
                            <RadioGroupItem value={oIdx.toString()} id={`q${qIdx}-o${oIdx}`} />
                            <Input
                              value={opt}
                              onChange={(e) => updateOption(qIdx, oIdx, e.target.value)}
                              placeholder={`Option ${String.fromCharCode(65 + oIdx)}`}
                              className={`flex-1 ${q.correct_option === oIdx ? "border-primary/50 bg-primary/5" : ""}`}
                            />
                            {q.correct_option === oIdx && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-card rounded-xl border border-border p-6 space-y-4">
            <h2 className="text-lg font-semibold">Publish</h2>
            <div className="flex items-center justify-between">
              <Label htmlFor="published">Visible to students</Label>
              <Switch id="published" checked={form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} />
            </div>
            <p className="text-xs text-muted-foreground">
              {form.is_published ? "Enrolled students can take this quiz." : "Draft mode — only you can see it."}
            </p>
          </div>

          <div className="bg-card rounded-xl border border-border p-6">
            <h2 className="text-sm font-semibold mb-2">Summary</h2>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Questions</span><span className="font-medium">{questions.length}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Total marks</span><span className="font-medium">{questions.reduce((s, q) => s + q.marks, 0)}</span></div>
            </div>
            {questions.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground mb-2">Difficulty Distribution</p>
                <div className="space-y-1">
                  {(["easy", "medium", "hard"] as const).map((d) => {
                    const count = questions.filter((q) => q.difficulty === d).length;
                    return (
                      <div key={d} className="flex justify-between text-xs">
                        <span className={d === "easy" ? "text-emerald-600" : d === "hard" ? "text-red-600" : "text-amber-600"}>
                          {d.charAt(0).toUpperCase() + d.slice(1)}
                        </span>
                        <span className="font-medium">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <Button className="w-full gap-2" onClick={() => saveAssessment.mutate()} disabled={saveAssessment.isPending}>
            <Save className="w-4 h-4" />
            {saveAssessment.isPending ? "Saving..." : editingId ? "Update Assessment" : "Create Assessment"}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TeacherAssessments;
