import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { BookOpen, BarChart3, FileText, TrendingUp, Upload, ClipboardList, Clock, CheckCircle2, AlertCircle, Loader2, Paperclip, X, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { format, isPast } from "date-fns";

const navItems = [
  { label: "Dashboard", href: "/student", icon: <BarChart3 className="w-4 h-4" /> },
  { label: "My Courses", href: "/student/courses", icon: <BookOpen className="w-4 h-4" /> },
  { label: "Assessments", href: "/student/assessments", icon: <FileText className="w-4 h-4" /> },
  { label: "Assignments", href: "/student/assignments", icon: <ClipboardList className="w-4 h-4" /> },
  { label: "Progress", href: "/student/progress", icon: <TrendingUp className="w-4 h-4" /> },
  { label: "AI Assistant", href: "/student/ai-chat", icon: <Bot className="w-4 h-4" /> },
];

const StudentAssignments = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [submissionText, setSubmissionText] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const { data: assignments, isLoading } = useQuery({
    queryKey: ["student-assignments", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assignments")
        .select("*, courses!inner(title)")
        .eq("is_published", true)
        .order("due_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: submissions } = useQuery({
    queryKey: ["student-submissions", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("assignment_submissions")
        .select("*")
        .eq("student_id", user!.id);
      return new Map((data || []).map((s) => [s.assignment_id, s]));
    },
  });

  const submitAssignment = useMutation({
    mutationFn: async () => {
      if (!selectedAssignment || !user) throw new Error("Missing data");
      if (!submissionText.trim() && !file) throw new Error("Please provide text or upload a file");

      let fileUrl: string | null = null;
      let fileName: string | null = null;

      if (file) {
        const filePath = `${user.id}/${selectedAssignment.id}/${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("assignment-files")
          .upload(filePath, file, { upsert: true });
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("assignment-files")
          .getPublicUrl(filePath);
        fileUrl = urlData.publicUrl;
        fileName = file.name;
      }

      const { error } = await supabase
        .from("assignment_submissions")
        .upsert(
          {
            assignment_id: selectedAssignment.id,
            student_id: user.id,
            submission_text: submissionText.trim() || null,
            file_url: fileUrl,
            file_name: fileName,
          },
          { onConflict: "assignment_id,student_id" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Assignment submitted!");
      queryClient.invalidateQueries({ queryKey: ["student-submissions"] });
      setSubmitDialogOpen(false);
      setSubmissionText("");
      setFile(null);
      setSelectedAssignment(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const openSubmitDialog = (assignment: any) => {
    setSelectedAssignment(assignment);
    const existing = submissions?.get(assignment.id);
    setSubmissionText(existing?.submission_text || "");
    setFile(null);
    setSubmitDialogOpen(true);
  };

  return (
    <DashboardLayout title="Assignments" navItems={navItems}>
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
        </div>
      ) : assignments && assignments.length > 0 ? (
        <div className="space-y-4">
          {assignments.map((a: any, i: number) => {
            const sub = submissions?.get(a.id);
            const isOverdue = a.due_date && isPast(new Date(a.due_date)) && !sub;
            const isGraded = !!sub?.graded_at;

            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card rounded-xl border border-border p-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{a.title}</h3>
                      {isGraded && <Badge className="bg-primary/10 text-primary border-0">Graded</Badge>}
                      {sub && !isGraded && <Badge variant="secondary">Submitted</Badge>}
                      {isOverdue && <Badge variant="destructive">Overdue</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{(a as any).courses?.title}</p>
                    {a.description && <p className="text-sm text-muted-foreground mb-3">{a.description}</p>}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" /> {a.total_marks} marks
                      </span>
                      {a.due_date && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> Due: {format(new Date(a.due_date), "MMM d, yyyy")}
                        </span>
                      )}
                    </div>

                    {isGraded && sub && (
                      <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle2 className="w-4 h-4 text-primary" />
                          <span className="text-sm font-semibold text-primary">
                            Score: {sub.score}/{a.total_marks}
                          </span>
                        </div>
                        {sub.feedback && (
                          <p className="text-sm text-muted-foreground mt-1">{sub.feedback}</p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="shrink-0">
                    {!sub ? (
                      <Button onClick={() => openSubmitDialog(a)} className="gap-2">
                        <Upload className="w-4 h-4" /> Submit
                      </Button>
                    ) : !isGraded ? (
                      <Button variant="outline" onClick={() => openSubmitDialog(a)} className="gap-2">
                        <Upload className="w-4 h-4" /> Resubmit
                      </Button>
                    ) : null}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 text-muted-foreground">
          <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-40" />
          <p className="text-lg font-medium">No assignments yet</p>
          <p className="text-sm">Your teachers haven't published any assignments.</p>
        </div>
      )}

      {/* Submit Dialog */}
      <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Submit Assignment: {selectedAssignment?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Your Answer (text)</Label>
              <Textarea
                value={submissionText}
                onChange={(e) => setSubmissionText(e.target.value)}
                placeholder="Type your answer here..."
                rows={5}
              />
            </div>
            <div className="space-y-2">
              <Label>Upload File (PDF, DOCX, images)</Label>
              {file ? (
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                  <Paperclip className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm flex-1 truncate">{file.name}</span>
                  <Button variant="ghost" size="sm" onClick={() => setFile(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.gif"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              )}
            </div>
            <Button
              className="w-full gap-2"
              onClick={() => submitAssignment.mutate()}
              disabled={submitAssignment.isPending}
            >
              {submitAssignment.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {submitAssignment.isPending ? "Submitting..." : "Submit Assignment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default StudentAssignments;
