import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { BarChart3, Users, BookOpen, Settings, UserCheck, Search, Trash2, Plus, X, Activity } from "lucide-react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const navItems = [
  { label: "Dashboard", href: "/admin", icon: <BarChart3 className="w-4 h-4" /> },
  { label: "Users", href: "/admin/users", icon: <Users className="w-4 h-4" /> },
  { label: "Courses", href: "/admin/courses", icon: <BookOpen className="w-4 h-4" /> },
  { label: "Enrollments", href: "/admin/enrollments", icon: <UserCheck className="w-4 h-4" /> },
  { label: "Activity Logs", href: "/admin/activity-logs", icon: <Activity className="w-4 h-4" /> },
  { label: "Settings", href: "/admin/settings", icon: <Settings className="w-4 h-4" /> },
];

interface EnrollmentRow {
  id: string;
  enrolled_at: string;
  studentName: string;
  studentRollNumber: string;
  studentEmail: string;
  courseTitle: string;
  courseSubject: string;
  student_id: string;
  course_id: string;
}

const AdminEnrollments = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");

  // Fetch all enrollments with joined data
  const { data: enrollments, isLoading } = useQuery({
    queryKey: ["admin-enrollments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("id, student_id, course_id, enrolled_at")
        .order("enrolled_at", { ascending: false });
      if (error) throw error;

      const studentIds = [...new Set((data || []).map((e) => e.student_id))];
      const courseIds = [...new Set((data || []).map((e) => e.course_id))];

      const [profilesRes, coursesRes] = await Promise.all([
        studentIds.length > 0
          ? supabase.from("profiles").select("user_id, full_name, roll_number").in("user_id", studentIds)
          : { data: [] },
        courseIds.length > 0
          ? supabase.from("courses").select("id, title, subject").in("id", courseIds)
          : { data: [] },
      ]);

      const profilesMap = new Map((profilesRes.data || []).map((p) => [p.user_id, p]));
      const coursesMap = new Map((coursesRes.data || []).map((c) => [c.id, c]));

      return (data || []).map((e): EnrollmentRow => {
        const course = coursesMap.get(e.course_id);
        return {
          id: e.id,
          enrolled_at: e.enrolled_at,
          student_id: e.student_id,
          course_id: e.course_id,
          studentName: profilesMap.get(e.student_id)?.full_name || "Unknown",
          studentRollNumber: profilesMap.get(e.student_id)?.roll_number || "N/A",
          studentEmail: "",
          courseTitle: course?.title || "Unknown",
          courseSubject: course?.subject || "",
        };
      });
    },
  });

  // Fetch students (for add dialog)
  const { data: students } = useQuery({
    queryKey: ["admin-all-students"],
    queryFn: async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "student");
      const ids = (roles || []).map((r) => r.user_id);
      if (ids.length === 0) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, roll_number")
        .in("user_id", ids)
        .order("full_name");
      return profiles || [];
    },
  });

  // Fetch courses (for add dialog)
  const { data: courses } = useQuery({
    queryKey: ["admin-all-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title, subject")
        .order("title");
      if (error) throw error;
      return data || [];
    },
  });

  const addEnrollment = useMutation({
    mutationFn: async () => {
      if (!selectedStudent || !selectedCourse) throw new Error("Select a student and course");
      // Check for existing
      const { data: existing } = await supabase
        .from("enrollments")
        .select("id")
        .eq("student_id", selectedStudent)
        .eq("course_id", selectedCourse)
        .maybeSingle();
      if (existing) throw new Error("Student is already enrolled in this course");
      const { error } = await supabase.from("enrollments").insert({
        student_id: selectedStudent,
        course_id: selectedCourse,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success("Student enrolled successfully");
      setAddOpen(false);
      setSelectedStudent("");
      setSelectedCourse("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeEnrollment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("enrollments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success("Enrollment removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = (enrollments || []).filter((e) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      e.studentName.toLowerCase().includes(s) ||
      e.studentRollNumber.toLowerCase().includes(s) ||
      e.courseTitle.toLowerCase().includes(s) ||
      e.courseSubject.toLowerCase().includes(s)
    );
  });

  return (
    <DashboardLayout title="Enrollment Management" navItems={navItems}>
      {/* Summary */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 px-3 py-1 text-sm">
          Total Enrollments: {enrollments?.length || 0}
        </Badge>
        <Badge variant="outline" className="px-3 py-1 text-sm">
          Courses: {new Set((enrollments || []).map((e) => e.course_id)).size}
        </Badge>
        <Badge variant="outline" className="px-3 py-1 text-sm">
          Students: {new Set((enrollments || []).map((e) => e.student_id)).size}
        </Badge>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by student or course…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Button onClick={() => setAddOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Add Enrollment
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Enrolled On</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{e.studentName}</span>
                        <span className="text-xs font-mono text-primary">{e.studentRollNumber}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{e.courseTitle}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">{e.courseSubject || "—"}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(e.enrolled_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Enrollment</AlertDialogTitle>
                            <AlertDialogDescription>
                              Remove <strong>{e.studentName}</strong> from <strong>{e.courseTitle}</strong>? The student will lose access to course content.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => removeEnrollment.mutate(e.id)}
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                      {search ? "No enrollments match your search" : "No enrollments yet"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </motion.div>

      {/* Add Enrollment Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Enrollment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Student</Label>
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a student" />
                </SelectTrigger>
                <SelectContent>
                  {(students || []).map((s) => (
                    <SelectItem key={s.user_id} value={s.user_id}>
                      {s.full_name || "Unnamed"} {s.roll_number ? `(${s.roll_number})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Course</Label>
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a course" />
                </SelectTrigger>
                <SelectContent>
                  {(courses || []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title} {c.subject ? `(${c.subject})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={() => addEnrollment.mutate()} disabled={addEnrollment.isPending || !selectedStudent || !selectedCourse}>
              {addEnrollment.isPending ? "Enrolling…" : "Enroll Student"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AdminEnrollments;
