import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { BarChart3, Users, BookOpen, Settings, UserCheck, Activity, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";

const navItems = [
  { label: "Dashboard", href: "/admin", icon: <BarChart3 className="w-4 h-4" /> },
  { label: "Users", href: "/admin/users", icon: <Users className="w-4 h-4" /> },
  { label: "Courses", href: "/admin/courses", icon: <BookOpen className="w-4 h-4" /> },
  { label: "Enrollments", href: "/admin/enrollments", icon: <UserCheck className="w-4 h-4" /> },
  { label: "Activity Logs", href: "/admin/activity-logs", icon: <Activity className="w-4 h-4" /> },
  { label: "Settings", href: "/admin/settings", icon: <Settings className="w-4 h-4" /> },
];

const ACTIVITY_LABELS: Record<string, { label: string; color: string }> = {
  login: { label: "Login", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  lesson_completed: { label: "Lesson Completed", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  quiz_completed: { label: "Quiz Completed", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
};

const AdminActivityLogs = () => {
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data: logs, isLoading } = useQuery({
    queryKey: ["admin-activity-logs", typeFilter],
    queryFn: async () => {
      let query = supabase
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (typeFilter !== "all") {
        query = query.eq("activity_type", typeFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch profile names for user_ids
      const userIds = [...new Set((data || []).map((l: any) => l.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);

      const nameMap = new Map((profiles || []).map((p: any) => [p.user_id, p.full_name]));

      return (data || []).map((log: any) => ({
        ...log,
        user_name: nameMap.get(log.user_id) || "Unknown",
      }));
    },
  });

  const filtered = (logs || []).filter((log: any) =>
    !search || log.user_name.toLowerCase().includes(search.toLowerCase()) ||
    (log.metadata?.lesson_title || "").toLowerCase().includes(search.toLowerCase()) ||
    (log.metadata?.assessment_title || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout title="Activity Logs" navItems={navItems}>
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or content..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Activities</SelectItem>
            <SelectItem value="login">Logins</SelectItem>
            <SelectItem value="lesson_completed">Lessons</SelectItem>
            <SelectItem value="quiz_completed">Quizzes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No activity logs found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((log: any, i: number) => {
            const config = ACTIVITY_LABELS[log.activity_type] || { label: log.activity_type, color: "bg-muted text-muted-foreground" };
            const meta = log.metadata || {};

            let detail = "";
            if (log.activity_type === "lesson_completed") {
              detail = `${meta.lesson_title || "a lesson"} in ${meta.course_title || "a course"}`;
            } else if (log.activity_type === "quiz_completed") {
              detail = `${meta.assessment_title || "a quiz"} — ${meta.score ?? 0}/${meta.total_marks ?? 0}`;
            } else if (log.activity_type === "login") {
              detail = "Signed in";
            }

            return (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                className="flex items-center gap-4 bg-card border border-border rounded-xl px-4 py-3"
              >
                <Badge variant="outline" className={config.color}>
                  {config.label}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{log.user_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{detail}</p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(log.created_at).toLocaleString()}
                </span>
              </motion.div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
};

export default AdminActivityLogs;
