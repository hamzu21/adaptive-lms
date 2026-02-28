import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import {
  BookOpen, BarChart3, Users, FileText, TrendingUp, Plus, Trash2, Save,
  ArrowLeft, Eye, EyeOff, ClipboardList, CheckCircle2, Loader2, Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { format } from "date-fns";

const navItems = [
  { label: "Dashboard", href: "/teacher", icon: <BarChart3 className="w-4 h-4" /> },
  { label: "My Classes", href: "/teacher/classes", icon: <Users className="w-4 h-4" /> },
  { label: "Courses", href: "/teacher/courses", icon: <BookOpen className="w-4 h-4" /> },
  { label: "Assessments", href: "/teacher/assessments", icon: <FileText className="w-4 h-4" /> },
  { label: "Assignments", href: "/teacher/assignments", icon: <ClipboardList className="w-4 h-4" /> },
  { label: "Analytics", href: "/teacher/analytics", icon: <TrendingUp className="w-4 h-4" /> },
];

interface AssignmentForm {
  title: string;
  description: string;
  total_marks: number;
  due_date: string;
  is_published: boolean;
  course_id: string;
}

const TeacherAssignments = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [gradingSubmission, setGradingSubmission] = useState<any>(null);
  const [gradeScore, setGradeScore] = useState("");
  const [gradeFeedback, setGradeFeedback] = useState("");
  const [viewAssignmentId, setViewAssignmentId] = useState<string | null>(null);
  const [form, setForm] = useState<AssignmentForm>({
    title: "", description: "", total_marks: 100, due_date: "", is_published: false, course_id: "",
  });

  const { data: courses } = useQuery({
    queryKey: ["teacher-courses-select", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, title").eq("teacher_id", user!.id).order("title");
      return data || [];
    },
  });

  const { data: assignments, isLoading } = useQuery({
    queryKey: ["teacher-assignments-list", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: coursesData } = await supabase.from("courses").select("id").eq("teacher_id", user!.id);
      const courseIds = (coursesData || []).map((c) => c.id);
      if (courseIds.length === 0) return [];
      const { data, error } = await supabase
        .from("assignments")
        .select("*, courses!inner(title)")
        .in("course_id", courseIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: submissions } = useQuery({
    queryKey: ["teacher-assignment-submissions", viewAssignmentId],
    enabled: !!viewAssignmentId,
    queryFn: async () => {
      const { data } = await supabase
        .from("assignment_submissions")
        .select("*")
        .eq("assignment_id", viewAssignmentId!);
      // Get student profiles
      const studentIds = (data || []).map((s) => s.student_id);
      let profileMap: Record<string, string> = {};
      if (studentIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", studentIds);
        profileMap = Object.fromEntries((profiles || []).map((p) => [p.user_id, p.full_name || "Unknown"]));
      }
      return (data || []).map((s) => ({ ...s, studentName: profileMap[s.student_id] || "Unknown" }));
    },
  });

  const saveAssignment = useMutation({
    mutationFn: async () => {
      if (!form.title.trim()) throw new Error("Title is required");
      if (!form.course_id) throw new Error("Select a course");

      const payload = {
        title: form.title,
        description: form.description,
        total_marks: form.total_marks,
        due_date: form.due_date || null,
        is_published: form.is_published,
        course_id: form.course_id,
      };

      if (editingId) {
        const { error } = await supabase.from("assignments").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("assignments").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "Assignment updated!" : "Assignment created!");
      queryClient.invalidateQueries({ queryKey: ["teacher-assignments-list"] });
      resetForm();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteAssignment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("assignments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Assignment deleted");
      queryClient.invalidateQueries({ queryKey: ["teacher-assignments-list"] });
    },
  });

  const gradeSubmission = useMutation({
    mutationFn: async () => {
      if (!gradingSubmission) throw new Error("No submission selected");
      const score = parseInt(gradeScore);
      if (isNaN(score) || score < 0) throw new Error("Invalid score");

      const { error } = await supabase
        .from("assignment_submissions")
        .update({ score, feedback: gradeFeedback || null, graded_at: new Date().toISOString() })
        .eq("id", gradingSubmission.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Submission graded!");
      queryClient.invalidateQueries({ queryKey: ["teacher-assignment-submissions"] });
      setGradingSubmission(null);
      setGradeScore("");
      setGradeFeedback("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const resetForm = () => {
    setForm({ title: "", description: "", total_marks: 100, due_date: "", is_published: false, course_id: "" });
    setEditingId(null);
    setCreating(false);
  };

  const startEdit = (a: any) => {
    setForm({
      title: a.title,
      description: a.description,
      total_marks: a.total_marks,
      due_date: a.due_date ? format(new Date(a.due_date), "yyyy-MM-dd") : "",
      is_published: a.is_published,
      course_id: a.course_id,
    });
    setEditingId(a.id);
    setCreating(true);
  };

  // Submissions view
  if (viewAssignmentId) {
    const assignment = assignments?.find((a: any) => a.id === viewAssignmentId);
    return (
      <DashboardLayout title={`Submissions: ${assignment?.title || ""}`} navItems={navItems}>
        <Button variant="ghost" onClick={() => setViewAssignmentId(null)} className="mb-4 gap-2 text-muted-foreground">
          <ArrowLeft className="w-4 h-4" /> Back to assignments
        </Button>

        {submissions && submissions.length > 0 ? (
          <div className="space-y-4">
            {submissions.map((sub: any) => (
              <div key={sub.id} className="bg-card rounded-xl border border-border p-5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-medium">{sub.studentName}</h3>
                      {sub.graded_at ? (
                        <Badge className="bg-primary/10 text-primary border-0">
                          {sub.score}/{assignment?.total_marks}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                    </div>
                    {sub.submission_text && (
                      <p className="text-sm text-muted-foreground mb-2 whitespace-pre-wrap">{sub.submission_text}</p>
                    )}
                    {sub.file_name && (
                      <a
                        href={sub.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                      >
                        <Download className="w-3.5 h-3.5" /> {sub.file_name}
                      </a>
                    )}
                    {sub.feedback && (
                      <p className="text-sm mt-2 p-2 bg-muted/50 rounded-lg">
                        <strong>Feedback:</strong> {sub.feedback}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      Submitted: {format(new Date(sub.submitted_at), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                  <div className="shrink-0">
                    {!sub.graded_at ? (
                      <Button
                        size="sm"
                        onClick={() => {
                          setGradingSubmission(sub);
                          setGradeScore(sub.score?.toString() || "");
                          setGradeFeedback(sub.feedback || "");
                        }}
                        className="gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Grade
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setGradingSubmission(sub);
                          setGradeScore(sub.score?.toString() || "");
                          setGradeFeedback(sub.feedback || "");
                        }}
                      >
                        Update Grade
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-40" />
            <p>No submissions yet</p>
          </div>
        )}

        {/* Grading Dialog */}
        <Dialog open={!!gradingSubmission} onOpenChange={(open) => !open && setGradingSubmission(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Grade: {gradingSubmission?.studentName}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Score (out of {assignment?.total_marks})</Label>
                <Input
                  type="number"
                  min={0}
                  max={assignment?.total_marks}
                  value={gradeScore}
                  onChange={(e) => setGradeScore(e.target.value)}
                  placeholder="Enter score"
                />
              </div>
              <div className="space-y-2">
                <Label>Feedback (optional)</Label>
                <Textarea
                  value={gradeFeedback}
                  onChange={(e) => setGradeFeedback(e.target.value)}
                  placeholder="Provide feedback to the student..."
                  rows={3}
                />
              </div>
              <Button
                className="w-full gap-2"
                onClick={() => gradeSubmission.mutate()}
                disabled={gradeSubmission.isPending}
              >
                {gradeSubmission.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {gradeSubmission.isPending ? "Saving..." : "Save Grade"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    );
  }

  // Create/Edit form
  if (creating) {
    return (
      <DashboardLayout title={editingId ? "Edit Assignment" : "Create Assignment"} navItems={navItems}>
        <Button variant="ghost" onClick={resetForm} className="mb-4 gap-2 text-muted-foreground">
          <ArrowLeft className="w-4 h-4" /> Back to assignments
        </Button>

        <div className="max-w-2xl space-y-6">
          <div className="bg-card rounded-xl border border-border p-6 space-y-4">
            <div className="space-y-2">
              <Label>Course *</Label>
              <Select value={form.course_id} onValueChange={(v) => setForm({ ...form, course_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select a course" /></SelectTrigger>
                <SelectContent>
                  {courses?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Assignment title" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the assignment..." rows={4} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Total Marks</Label>
                <Input type="number" min={1} value={form.total_marks} onChange={(e) => setForm({ ...form, total_marks: parseInt(e.target.value) || 100 })} />
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Publish to students</Label>
              <Switch checked={form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} />
            </div>
          </div>
          <Button className="w-full gap-2" onClick={() => saveAssignment.mutate()} disabled={saveAssignment.isPending}>
            <Save className="w-4 h-4" />
            {saveAssignment.isPending ? "Saving..." : editingId ? "Update Assignment" : "Create Assignment"}
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  // List view
  return (
    <DashboardLayout title="Assignments" navItems={navItems}>
      <div className="flex justify-between items-center mb-6">
        <p className="text-muted-foreground text-sm">{assignments?.length ?? 0} assignments</p>
        <Button onClick={() => setCreating(true)} className="gap-2">
          <Plus className="w-4 h-4" /> New Assignment
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
      ) : assignments && assignments.length > 0 ? (
        <div className="space-y-3">
          {assignments.map((a: any, i: number) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card rounded-xl border border-border p-5 flex items-center justify-between hover:border-primary/30 transition-colors"
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <ClipboardList className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate">{a.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {(a as any).courses?.title} · {a.total_marks} marks
                    {a.due_date && ` · Due ${format(new Date(a.due_date), "MMM d")}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {a.is_published ? <Eye className="w-4 h-4 text-primary" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                <Button variant="outline" size="sm" onClick={() => setViewAssignmentId(a.id)}>
                  Submissions
                </Button>
                <Button variant="outline" size="sm" onClick={() => startEdit(a)}>Edit</Button>
                <Button variant="ghost" size="sm" onClick={() => deleteAssignment.mutate(a.id)} className="text-destructive hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground mb-4">No assignments yet. Create your first!</p>
          <Button onClick={() => setCreating(true)} className="gap-2"><Plus className="w-4 h-4" /> Create Assignment</Button>
        </div>
      )}
    </DashboardLayout>
  );
};

export default TeacherAssignments;
