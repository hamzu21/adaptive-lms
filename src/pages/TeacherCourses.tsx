import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { BookOpen, BarChart3, Users, FileText, Plus, Trash2, GripVertical, Eye, EyeOff, ArrowLeft, Save, TrendingUp, ClipboardList, Video, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { motion } from "framer-motion";

const navItems = [
  { label: "Dashboard", href: "/teacher", icon: <BarChart3 className="w-4 h-4" /> },
  { label: "My Classes", href: "/teacher/classes", icon: <Users className="w-4 h-4" /> },
  { label: "Courses", href: "/teacher/courses", icon: <BookOpen className="w-4 h-4" /> },
  { label: "Assessments", href: "/teacher/assessments", icon: <FileText className="w-4 h-4" /> },
  { label: "Assignments", href: "/teacher/assignments", icon: <ClipboardList className="w-4 h-4" /> },
  { label: "Analytics", href: "/teacher/analytics", icon: <TrendingUp className="w-4 h-4" /> },
];

interface Lesson {
  id?: string;
  title: string;
  content: string;
  position: number;
  isNew?: boolean;
  video_url: string;
  video_file_url: string;
  _videoFile?: File | null;
}

interface CourseForm {
  title: string;
  description: string;
  subject: string;
  is_published: boolean;
}

const TeacherCourses = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [creating, setCreating] = useState(searchParams.get("create") === "true");
  const [form, setForm] = useState<CourseForm>({ title: "", description: "", subject: "", is_published: false });
  const [lessons, setLessons] = useState<Lesson[]>([]);

  const { data: courses, isLoading } = useQuery({
    queryKey: ["teacher-courses-list", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("teacher_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveCourse = useMutation({
    mutationFn: async () => {
      if (!form.title.trim()) throw new Error("Course title is required");

      let courseId = editingCourseId;

      if (courseId) {
        const { error } = await supabase
          .from("courses")
          .update({ title: form.title, description: form.description, subject: form.subject, is_published: form.is_published })
          .eq("id", courseId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("courses")
          .insert({ title: form.title, description: form.description, subject: form.subject, is_published: form.is_published, teacher_id: user!.id })
          .select("id")
          .single();
        if (error) throw error;
        courseId = data.id;
      }

      // Handle lessons
      const existingLessons = lessons.filter((l) => l.id && !l.isNew);
      const newLessons = lessons.filter((l) => !l.id || l.isNew);

      // Upload video files first
      for (const lesson of lessons) {
        if (lesson._videoFile) {
          const filePath = `${courseId}/${Date.now()}-${lesson._videoFile.name}`;
          const { error: uploadError } = await supabase.storage.from("lesson-videos").upload(filePath, lesson._videoFile);
          if (uploadError) throw uploadError;
          const { data: urlData } = supabase.storage.from("lesson-videos").getPublicUrl(filePath);
          lesson.video_file_url = urlData.publicUrl;
        }
      }

      // Update existing lessons
      for (const lesson of existingLessons) {
        await supabase
          .from("lessons")
          .update({ title: lesson.title, content: lesson.content, position: lesson.position, video_url: lesson.video_url, video_file_url: lesson.video_file_url })
          .eq("id", lesson.id!);
      }

      // Insert new lessons
      if (newLessons.length > 0) {
        const { error } = await supabase.from("lessons").insert(
          newLessons.map((l) => ({
            course_id: courseId!,
            title: l.title,
            content: l.content,
            position: l.position,
            video_url: l.video_url,
            video_file_url: l.video_file_url,
          }))
        );
        if (error) throw error;
      }

      return courseId;
    },
    onSuccess: () => {
      toast.success(editingCourseId ? "Course updated!" : "Course created!");
      queryClient.invalidateQueries({ queryKey: ["teacher-courses-list"] });
      resetForm();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteCourse = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("courses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Course deleted");
      queryClient.invalidateQueries({ queryKey: ["teacher-courses-list"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteLesson = async (lessonId: string, index: number) => {
    if (lessonId && !lessons[index].isNew) {
      await supabase.from("lessons").delete().eq("id", lessonId);
    }
    setLessons((prev) => prev.filter((_, i) => i !== index).map((l, i) => ({ ...l, position: i })));
  };

  const startEdit = async (courseId: string) => {
    const course = courses?.find((c) => c.id === courseId);
    if (!course) return;
    setForm({ title: course.title, description: course.description, subject: course.subject, is_published: course.is_published });
    setEditingCourseId(courseId);
    setCreating(true);

    const { data } = await supabase
      .from("lessons")
      .select("*")
      .eq("course_id", courseId)
      .order("position", { ascending: true });
    setLessons((data || []).map((l: any) => ({ id: l.id, title: l.title, content: l.content, position: l.position, video_url: l.video_url || "", video_file_url: l.video_file_url || "" })));
  };

  const resetForm = () => {
    setForm({ title: "", description: "", subject: "", is_published: false });
    setLessons([]);
    setEditingCourseId(null);
    setCreating(false);
  };

  const addLesson = () => {
    setLessons((prev) => [...prev, { title: "", content: "", position: prev.length, isNew: true, video_url: "", video_file_url: "" }]);
  };

  const updateLesson = (index: number, field: keyof Lesson, value: string) => {
    setLessons((prev) => prev.map((l, i) => (i === index ? { ...l, [field]: value } : l)));
  };

  // Course list view
  if (!creating) {
    return (
      <DashboardLayout title="My Courses" navItems={navItems}>
        <div className="flex justify-between items-center mb-6">
          <p className="text-muted-foreground text-sm">{courses?.length ?? 0} courses</p>
          <Button onClick={() => setCreating(true)} className="gap-2">
            <Plus className="w-4 h-4" /> New Course
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />)}</div>
        ) : courses && courses.length > 0 ? (
          <div className="space-y-3">
            {courses.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card rounded-xl border border-border p-5 flex items-center justify-between hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <BookOpen className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{c.title}</p>
                    <p className="text-xs text-muted-foreground">{c.subject || "No subject"} · {c.is_published ? "Published" : "Draft"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {c.is_published ? <Eye className="w-4 h-4 text-primary" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                  <Button variant="outline" size="sm" onClick={() => startEdit(c.id)}>Edit</Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteCourse.mutate(c.id)} className="text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">No courses yet. Create your first course!</p>
            <Button onClick={() => setCreating(true)} className="gap-2"><Plus className="w-4 h-4" /> Create Course</Button>
          </div>
        )}
      </DashboardLayout>
    );
  }

  // Course form view
  return (
    <DashboardLayout title={editingCourseId ? "Edit Course" : "Create Course"} navItems={navItems}>
      <Button variant="ghost" onClick={resetForm} className="mb-4 gap-2 text-muted-foreground">
        <ArrowLeft className="w-4 h-4" /> Back to courses
      </Button>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Course details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card rounded-xl border border-border p-6 space-y-4">
            <h2 className="text-lg font-semibold">Course Details</h2>
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Introduction to Algebra" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="e.g. Mathematics" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What will students learn?" rows={3} />
            </div>
          </div>

          {/* Lessons */}
          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Lessons ({lessons.length})</h2>
              <Button variant="outline" size="sm" onClick={addLesson} className="gap-2">
                <Plus className="w-4 h-4" /> Add Lesson
              </Button>
            </div>

            {lessons.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No lessons yet. Add your first lesson above.</p>
            ) : (
              <div className="space-y-4">
                {lessons.map((lesson, idx) => (
                  <div key={idx} className="border border-border rounded-lg p-4 space-y-3 bg-muted/30">
                    <div className="flex items-center gap-3">
                      <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-xs font-semibold text-muted-foreground shrink-0">#{idx + 1}</span>
                      <Input
                        value={lesson.title}
                        onChange={(e) => updateLesson(idx, "title", e.target.value)}
                        placeholder="Lesson title"
                        className="flex-1"
                      />
                      <Button variant="ghost" size="sm" onClick={() => deleteLesson(lesson.id || "", idx)} className="text-destructive hover:text-destructive shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <Textarea
                      value={lesson.content}
                      onChange={(e) => updateLesson(idx, "content", e.target.value)}
                      placeholder="Lesson content (supports markdown)"
                      rows={3}
                    />
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground"><Video className="w-3.5 h-3.5" /> Video (optional)</div>
                      <Input
                        value={lesson.video_url}
                        onChange={(e) => updateLesson(idx, "video_url", e.target.value)}
                        placeholder="YouTube or Vimeo URL"
                        className="text-sm"
                      />
                      <div className="flex items-center gap-2">
                        {lesson.video_file_url && !lesson._videoFile ? (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted px-2 py-1 rounded flex-1">
                            <Video className="w-3 h-3" />
                            <span className="truncate">Uploaded video</span>
                            <button onClick={() => { const copy = [...lessons]; copy[idx] = { ...copy[idx], video_file_url: "" }; setLessons(copy); }} className="ml-auto"><X className="w-3 h-3" /></button>
                          </div>
                        ) : lesson._videoFile ? (
                          <div className="flex items-center gap-2 text-xs text-primary bg-primary/10 px-2 py-1 rounded flex-1">
                            <Upload className="w-3 h-3" />
                            <span className="truncate">{lesson._videoFile.name}</span>
                            <button onClick={() => { const copy = [...lessons]; copy[idx] = { ...copy[idx], _videoFile: null }; setLessons(copy); }} className="ml-auto"><X className="w-3 h-3" /></button>
                          </div>
                        ) : (
                          <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                            <Upload className="w-3.5 h-3.5" /> Upload video file
                            <input type="file" accept="video/*" className="hidden" onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) { const copy = [...lessons]; copy[idx] = { ...copy[idx], _videoFile: file }; setLessons(copy); }
                            }} />
                          </label>
                        )}
                      </div>
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
              <Label htmlFor="published">Make visible to students</Label>
              <Switch id="published" checked={form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} />
            </div>
            <p className="text-xs text-muted-foreground">
              {form.is_published ? "Students enrolled in this course can see it." : "Course is in draft mode. Only you can see it."}
            </p>
          </div>

          <Button
            className="w-full gap-2"
            onClick={() => saveCourse.mutate()}
            disabled={saveCourse.isPending}
          >
            <Save className="w-4 h-4" />
            {saveCourse.isPending ? "Saving..." : editingCourseId ? "Update Course" : "Create Course"}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TeacherCourses;
