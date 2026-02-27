import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { BarChart3, TrendingUp, BookOpen, Bell, CheckCircle2, XCircle, UserPlus, Trash2, Users } from "lucide-react";
import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import { useParentChildren, useAddChild, useRemoveChild, useChildPerformance } from "@/hooks/useParentData";

const navItems = [
  { label: "Dashboard", href: "/parent", icon: <BarChart3 className="w-4 h-4" /> },
  { label: "Progress", href: "/parent/progress", icon: <TrendingUp className="w-4 h-4" /> },
  { label: "Notifications", href: "/parent/notifications", icon: <Bell className="w-4 h-4" /> },
];

const ParentDashboard = () => {
  const { data: children, isLoading: childrenLoading } = useParentChildren();
  const addChild = useAddChild();
  const removeChild = useRemoveChild();
  const [childName, setChildName] = useState("");
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  // Auto-select first child
  const activeChildId = selectedChildId || children?.[0]?.id || null;
  const { data: performance, isLoading: perfLoading } = useChildPerformance(activeChildId);

  const handleAddChild = () => {
    if (!childName.trim()) return;
    addChild.mutate(childName, {
      onSuccess: () => {
        toast.success("Child linked successfully!");
        setChildName("");
      },
      onError: (err: any) => toast.error(err.message),
    });
  };

  return (
    <DashboardLayout title="Parent Dashboard" navItems={navItems}>
      {/* Link Child Section */}
      <div className="bg-card rounded-xl border border-border p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" /> My Children
        </h2>

        <div className="flex gap-3 mb-4">
          <Input
            placeholder="Enter child's registered full name"
            value={childName}
            onChange={(e) => setChildName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddChild()}
            className="max-w-sm"
          />
          <Button onClick={handleAddChild} disabled={addChild.isPending} className="gap-2">
            <UserPlus className="w-4 h-4" />
            {addChild.isPending ? "Linking..." : "Link Child"}
          </Button>
        </div>

        {childrenLoading ? (
          <div className="flex gap-3">
            {[1, 2].map((i) => <Skeleton key={i} className="h-10 w-32 rounded-lg" />)}
          </div>
        ) : children && children.length > 0 ? (
          <div className="flex gap-2 flex-wrap">
            {children.map((child) => (
              <div
                key={child.id}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors",
                  activeChildId === child.id ? "border-primary bg-primary/5" : "border-border hover:bg-secondary"
                )}
                onClick={() => setSelectedChildId(child.id)}
              >
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                  {child.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium">{child.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeChild.mutate(child.id, {
                      onSuccess: () => {
                        toast.success("Child unlinked");
                        if (selectedChildId === child.id) setSelectedChildId(null);
                      },
                    });
                  }}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No children linked yet. Enter your child's registered name above to link them.</p>
        )}
      </div>

      {!activeChildId ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-4 opacity-40" />
          <p className="text-lg font-medium">Link a child to see their performance</p>
          <p className="text-sm">Use the form above to add your child by their registered name.</p>
        </div>
      ) : perfLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
          <Skeleton className="h-48 rounded-xl" />
        </div>
      ) : performance ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Courses", value: performance.totalCourses.toString(), icon: BookOpen },
              { label: "Overall Progress", value: `${performance.overallProgress}%`, icon: TrendingUp },
              { label: "Quizzes Taken", value: performance.totalQuizzes.toString(), icon: CheckCircle2 },
              { label: "Avg. Quiz Score", value: `${performance.avgScore}%`, icon: BarChart3 },
            ].map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} className="bg-card rounded-xl border border-border p-5">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                  <s.icon className="w-5 h-5 text-primary" />
                </div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </motion.div>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Course Performance */}
            <div className="bg-card rounded-xl border border-border p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" /> Course Performance
              </h2>
              {performance.courseStats.length > 0 ? (
                <div className="space-y-4">
                  {performance.courseStats.map((c) => (
                    <div key={c.id}>
                      <div className="flex justify-between mb-1">
                        <div>
                          <p className="text-sm font-medium">{c.title}</p>
                          <p className="text-xs text-muted-foreground">{c.subject}</p>
                        </div>
                        <span className={cn("text-sm font-bold", c.progress >= 70 ? "text-primary" : c.progress >= 40 ? "text-accent-foreground" : "text-destructive")}>
                          {c.progress}%
                        </span>
                      </div>
                      <Progress value={c.progress} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-0.5">{c.completedLessons}/{c.totalLessons} lessons</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No courses enrolled yet.</p>
              )}
            </div>

            {/* Recent Quiz Results */}
            <div className="bg-card rounded-xl border border-border p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" /> Recent Quiz Results
              </h2>
              {performance.quizHistory.length > 0 ? (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {performance.quizHistory.map((q) => (
                    <div key={q.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", q.passed ? "bg-primary/10" : "bg-destructive/10")}>
                        {q.passed ? <CheckCircle2 className="w-4 h-4 text-primary" /> : <XCircle className="w-4 h-4 text-destructive" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{q.title}</p>
                        <p className="text-xs text-muted-foreground">{q.courseName}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={cn("text-sm font-semibold", q.passed ? "text-primary" : "text-destructive")}>{q.percentage}%</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(q.completedAt), "MMM d")}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No quiz results yet.</p>
              )}
            </div>
          </div>
        </motion.div>
      ) : null}
    </DashboardLayout>
  );
};

export default ParentDashboard;
