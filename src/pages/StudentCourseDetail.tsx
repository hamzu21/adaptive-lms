import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { BookOpen, BarChart3, FileText, TrendingUp, CheckCircle2, Circle, ArrowLeft, ClipboardList } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import StudentNotes from "@/components/StudentNotes";
import LessonVideoPlayer from "@/components/LessonVideoPlayer";

const navItems = [
  { label: "Dashboard", href: "/student", icon: <BarChart3 className="w-4 h-4" /> },
  { label: "My Courses", href: "/student/courses", icon: <BookOpen className="w-4 h-4" /> },
  { label: "Assessments", href: "/student/assessments", icon: <FileText className="w-4 h-4" /> },
  { label: "Assignments", href: "/student/assignments", icon: <ClipboardList className="w-4 h-4" /> },
  { label: "Progress", href: "/student/progress", icon: <TrendingUp className="w-4 h-4" /> },
];

const StudentCourseDetail = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);

  const { data: course, isLoading: courseLoading } = useQuery({
    queryKey: ["student-course", courseId],
    enabled: !!courseId && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title, subject, description")
        .eq("id", courseId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: lessons, isLoading: lessonsLoading } = useQuery({
    queryKey: ["student-lessons", courseId],
    enabled: !!courseId && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("id, title, content, position, video_url, video_file_url")
        .eq("course_id", courseId!)
        .order("position", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: progressData } = useQuery({
    queryKey: ["student-lesson-progress", courseId, user?.id],
    enabled: !!courseId && !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("lesson_progress")
        .select("lesson_id, completed")
        .eq("student_id", user!.id)
        .eq("completed", true);
      return new Set((data || []).map((p) => p.lesson_id));
    },
  });

  const markComplete = useMutation({
    mutationFn: async (lessonId: string) => {
      const { error } = await supabase.from("lesson_progress").upsert(
        { student_id: user!.id, lesson_id: lessonId, completed: true, completed_at: new Date().toISOString() },
        { onConflict: "student_id,lesson_id" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-lesson-progress", courseId] });
      queryClient.invalidateQueries({ queryKey: ["student-courses"] });
      queryClient.invalidateQueries({ queryKey: ["student-stats"] });
      toast.success("Lesson marked as complete!");
    },
  });

  const selectedLesson = lessons?.find((l) => l.id === selectedLessonId);
  const completedCount = lessons?.filter((l) => progressData?.has(l.id)).length ?? 0;
  const totalCount = lessons?.length ?? 0;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <DashboardLayout title={course?.title || "Course"} navItems={navItems}>
      <Link to="/student/courses" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to courses
      </Link>

      {courseLoading || lessonsLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
          <div className="grid lg:grid-cols-3 gap-6 mt-6">
            <Skeleton className="h-64 lg:col-span-1" />
            <Skeleton className="h-64 lg:col-span-2" />
          </div>
        </div>
      ) : (
        <>
          {course?.description && (
            <p className="text-sm text-muted-foreground mb-2">{course.description}</p>
          )}
          <div className="flex items-center gap-3 mb-6">
            <Progress value={progressPercent} className="h-2 flex-1 max-w-xs" />
            <span className="text-sm font-medium text-primary">{completedCount}/{totalCount} lessons</span>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Lesson list */}
            <div className="bg-card rounded-xl border border-border p-4">
              <h2 className="font-semibold mb-3 text-sm">Lessons</h2>
              {lessons && lessons.length > 0 ? (
                <div className="space-y-1">
                  {lessons.map((lesson) => {
                    const done = progressData?.has(lesson.id);
                    const active = selectedLessonId === lesson.id;
                    return (
                      <button
                        key={lesson.id}
                        onClick={() => setSelectedLessonId(lesson.id)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-colors",
                          active
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-secondary text-foreground"
                        )}
                      >
                        {done ? (
                          <CheckCircle2 className={cn("w-4 h-4 shrink-0", active ? "text-primary-foreground" : "text-primary")} />
                        ) : (
                          <Circle className={cn("w-4 h-4 shrink-0", active ? "text-primary-foreground/60" : "text-muted-foreground")} />
                        )}
                        <span className="truncate">{lesson.title}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No lessons yet.</p>
              )}
            </div>

            {/* Lesson content */}
            <div className="lg:col-span-2 bg-card rounded-xl border border-border p-6 min-h-[300px]">
              <AnimatePresence mode="wait">
                {selectedLesson ? (
                  <motion.div
                    key={selectedLesson.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.15 }}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <h2 className="text-lg font-semibold">{selectedLesson.title}</h2>
                      {!progressData?.has(selectedLesson.id) && (
                        <Button
                          size="sm"
                          onClick={() => markComplete.mutate(selectedLesson.id)}
                          disabled={markComplete.isPending}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Mark Complete
                        </Button>
                      )}
                      {progressData?.has(selectedLesson.id) && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> Completed
                        </span>
                      )}
                    </div>
                    <LessonVideoPlayer videoUrl={selectedLesson.video_url} videoFileUrl={selectedLesson.video_file_url} />
                    <div className="prose prose-sm max-w-none text-foreground">
                      {selectedLesson.content.split("\n").map((para, i) => (
                        <p key={i}>{para}</p>
                      ))}
                    </div>
                    <StudentNotes lessonId={selectedLesson.id} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center h-full min-h-[250px] text-muted-foreground"
                  >
                    <BookOpen className="w-10 h-10 mb-3 opacity-40" />
                    <p className="text-sm">Select a lesson to start reading</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
};

export default StudentCourseDetail;
