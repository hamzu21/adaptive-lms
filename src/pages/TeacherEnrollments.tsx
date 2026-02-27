import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { BookOpen, BarChart3, Users, FileText, UserPlus, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { motion } from "framer-motion";

const navItems = [
  { label: "Dashboard", href: "/teacher", icon: <BarChart3 className="w-4 h-4" /> },
  { label: "My Classes", href: "/teacher/classes", icon: <Users className="w-4 h-4" /> },
  { label: "Courses", href: "/teacher/courses", icon: <BookOpen className="w-4 h-4" /> },
  { label: "Assessments", href: "/teacher/assessments", icon: <FileText className="w-4 h-4" /> },
];

const TeacherEnrollments = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [studentEmail, setStudentEmail] = useState("");

  // Fetch teacher's courses
  const { data: courses } = useQuery({
    queryKey: ["teacher-courses-enroll", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title, subject")
        .eq("teacher_id", user!.id)
        .order("title");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch enrollments for selected course
  const { data: enrollments, isLoading: enrollmentsLoading } = useQuery({
    queryKey: ["course-enrollments", selectedCourseId],
    enabled: !!selectedCourseId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("id, student_id, enrolled_at")
        .eq("course_id", selectedCourseId)
        .order("enrolled_at", { ascending: false });
      if (error) throw error;

      // Fetch profile names for enrolled students
      if (!data || data.length === 0) return [];
      const studentIds = data.map((e) => e.student_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", studentIds);

      const profileMap = new Map((profiles || []).map((p) => [p.user_id, p.full_name]));
      return data.map((e) => ({
        ...e,
        studentName: profileMap.get(e.student_id) || "Unknown",
      }));
    },
  });

  // Enroll student by email
  const enrollStudent = useMutation({
    mutationFn: async () => {
      if (!selectedCourseId) throw new Error("Select a course first");
      if (!studentEmail.trim()) throw new Error("Enter a student email");

      // Find user by email — we need to look up via profiles + auth
      // Since we can't query auth.users, we'll search profiles by matching
      // We need a different approach: use a DB function or search by user_id
      // For now, let's look up the student via their profile
      // Actually, we need to find user by email. Let's use a simpler approach:
      // Query all student-role users and match by checking profiles
      
      // First, find all users with student role
      const { data: studentRoles, error: roleErr } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "student");
      if (roleErr) throw roleErr;

      if (!studentRoles || studentRoles.length === 0) throw new Error("No students found in the system");

      // Now we need to match by email. Since email is in auth.users (not accessible),
      // we'll create a workaround by storing email lookup. For now, let's use
      // a direct enrollment by matching profile name or using the student user_id approach.
      // 
      // Better approach: search profiles for a matching name/email pattern
      // Since we stored full_name in profiles, let's search by that
      const { data: matchingProfiles, error: profErr } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", studentRoles.map((r) => r.user_id));
      if (profErr) throw profErr;

      // Try to find student - match by full_name or treat input as user_id
      const match = matchingProfiles?.find(
        (p) => p.full_name.toLowerCase() === studentEmail.trim().toLowerCase()
      );

      // If no name match, try treating input as a user_id directly
      const studentId = match?.user_id || (
        studentRoles.some((r) => r.user_id === studentEmail.trim()) ? studentEmail.trim() : null
      );

      if (!studentId) throw new Error("Student not found. Enter the student's full name as registered.");

      // Check if already enrolled
      const { data: existing } = await supabase
        .from("enrollments")
        .select("id")
        .eq("student_id", studentId)
        .eq("course_id", selectedCourseId)
        .maybeSingle();

      if (existing) throw new Error("Student is already enrolled in this course");

      const { error } = await supabase
        .from("enrollments")
        .insert({ student_id: studentId, course_id: selectedCourseId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Student enrolled successfully!");
      setStudentEmail("");
      queryClient.invalidateQueries({ queryKey: ["course-enrollments", selectedCourseId] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const removeEnrollment = useMutation({
    mutationFn: async (enrollmentId: string) => {
      const { error } = await supabase.from("enrollments").delete().eq("id", enrollmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Student removed from course");
      queryClient.invalidateQueries({ queryKey: ["course-enrollments", selectedCourseId] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <DashboardLayout title="Enrollment Management" navItems={navItems}>
      {/* Course selector */}
      <div className="bg-card rounded-xl border border-border p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Select Course</h2>
        <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
          <SelectTrigger className="w-full max-w-md">
            <SelectValue placeholder="Choose a course to manage enrollments" />
          </SelectTrigger>
          <SelectContent>
            {courses?.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.title} {c.subject ? `(${c.subject})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(!courses || courses.length === 0) && (
          <p className="text-sm text-muted-foreground mt-2">No courses yet. Create a course first from the Courses page.</p>
        )}
      </div>

      {selectedCourseId && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Enroll new student */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" /> Enroll Student
            </h2>
            <div className="space-y-3">
              <Input
                placeholder="Student's full name"
                value={studentEmail}
                onChange={(e) => setStudentEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && enrollStudent.mutate()}
              />
              <Button
                className="w-full gap-2"
                onClick={() => enrollStudent.mutate()}
                disabled={enrollStudent.isPending}
              >
                <UserPlus className="w-4 h-4" />
                {enrollStudent.isPending ? "Enrolling..." : "Enroll Student"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Enter the student's registered full name to enroll them.
              </p>
            </div>
          </div>

          {/* Enrolled students list */}
          <div className="lg:col-span-2 bg-card rounded-xl border border-border p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" /> Enrolled Students ({enrollments?.length ?? 0})
            </h2>

            {enrollmentsLoading ? (
              <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />)}</div>
            ) : enrollments && enrollments.length > 0 ? (
              <div className="space-y-2">
                {enrollments.map((e, i) => (
                  <motion.div
                    key={e.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                        {e.studentName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{e.studentName}</p>
                        <p className="text-xs text-muted-foreground">
                          Enrolled {new Date(e.enrolled_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeEnrollment.mutate(e.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </motion.div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No students enrolled yet.</p>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default TeacherEnrollments;
