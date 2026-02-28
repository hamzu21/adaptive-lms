import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { BarChart3, Users, BookOpen, Settings, Search, Trash2, Eye, EyeOff, UserCheck } from "lucide-react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useAdminCourses, useToggleCoursePublish, useDeleteCourse } from "@/hooks/useAdminData";

const navItems = [
  { label: "Dashboard", href: "/admin", icon: <BarChart3 className="w-4 h-4" /> },
  { label: "Users", href: "/admin/users", icon: <Users className="w-4 h-4" /> },
  { label: "Courses", href: "/admin/courses", icon: <BookOpen className="w-4 h-4" /> },
  { label: "Enrollments", href: "/admin/enrollments", icon: <UserCheck className="w-4 h-4" /> },
  { label: "Settings", href: "/admin/settings", icon: <Settings className="w-4 h-4" /> },
];

const AdminCourses = () => {
  const [search, setSearch] = useState("");
  const { data: courses, isLoading } = useAdminCourses();
  const togglePublish = useToggleCoursePublish();
  const deleteCourse = useDeleteCourse();

  const filtered = (courses || []).filter((c: any) =>
    !search || c.title.toLowerCase().includes(search.toLowerCase()) || c.subject.toLowerCase().includes(search.toLowerCase())
  );

  const publishedCount = (courses || []).filter((c: any) => c.is_published).length;
  const totalCount = (courses || []).length;

  return (
    <DashboardLayout title="Course Management" navItems={navItems}>
      {/* Summary */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 px-3 py-1 text-sm">
          Published: {publishedCount}
        </Badge>
        <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/20 px-3 py-1 text-sm">
          Draft: {totalCount - publishedCount}
        </Badge>
        <Badge variant="outline" className="px-3 py-1 text-sm">Total: {totalCount}</Badge>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search courses…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium text-sm">{c.title}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">{c.subject || "—"}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.teacherName || "Unknown"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={c.is_published
                          ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-700 border-amber-500/20"
                        }
                      >
                        {c.is_published ? "Published" : "Draft"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => togglePublish.mutate({ courseId: c.id, isPublished: !c.is_published })}
                          disabled={togglePublish.isPending}
                          title={c.is_published ? "Unpublish" : "Publish"}
                        >
                          {c.is_published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Course</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete <strong>{c.title}</strong> and all its lessons, assessments, and enrollments. This cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => deleteCourse.mutate(c.id)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                      {search ? "No courses match your search" : "No courses found"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </motion.div>
    </DashboardLayout>
  );
};

export default AdminCourses;
