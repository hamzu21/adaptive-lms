import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import JitsiMeetRoom from "@/components/JitsiMeetRoom";
import { BookOpen, BarChart3, FileText, TrendingUp, ClipboardList, Bot, Video, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { motion } from "framer-motion";

const navItems = [
  { label: "Dashboard", href: "/student", icon: <BarChart3 className="w-4 h-4" /> },
  { label: "My Courses", href: "/student/courses", icon: <BookOpen className="w-4 h-4" /> },
  { label: "Assessments", href: "/student/assessments", icon: <FileText className="w-4 h-4" /> },
  { label: "Assignments", href: "/student/assignments", icon: <ClipboardList className="w-4 h-4" /> },
  { label: "Live Classes", href: "/student/live", icon: <Video className="w-4 h-4" /> },
  { label: "Progress", href: "/student/progress", icon: <TrendingUp className="w-4 h-4" /> },
  { label: "AI Assistant", href: "/student/ai-chat", icon: <Bot className="w-4 h-4" /> },
];

const StudentLiveClasses = () => {
  const { user, profile } = useAuth();
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);

  const { data: liveClasses, isLoading, refetch } = useQuery({
    queryKey: ["student-live-classes", user?.id],
    enabled: !!user,
    queryFn: async () => {
      // Get enrolled course IDs first
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("course_id")
        .eq("student_id", user!.id);
      const courseIds = (enrollments || []).map((e) => e.course_id);
      if (courseIds.length === 0) return [];

      const { data, error } = await supabase
        .from("live_classes")
        .select("*, courses(title)")
        .in("course_id", courseIds)
        .in("status", ["scheduled", "live"])
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  // Realtime subscription for live class status changes
  useEffect(() => {
    const channel = supabase
      .channel("live-classes-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "live_classes" }, () => {
        refetch();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refetch]);

  if (activeRoomId) {
    return (
      <DashboardLayout title="Live Class" navItems={navItems}>
        <Button variant="outline" size="sm" onClick={() => setActiveRoomId(null)} className="mb-4">
          ← Back to classes
        </Button>
        <JitsiMeetRoom
          roomId={activeRoomId}
          displayName={profile?.full_name || "Student"}
          onClose={() => setActiveRoomId(null)}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Live Classes" navItems={navItems}>
      <p className="text-sm text-muted-foreground mb-6">Join live video lectures from your enrolled courses.</p>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : liveClasses && liveClasses.length > 0 ? (
        <div className="space-y-3">
          {liveClasses.map((lc: any) => (
            <motion.div key={lc.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold truncate">{lc.title}</h3>
                  {lc.status === "live" ? (
                    <Badge variant="destructive">🔴 Live Now</Badge>
                  ) : (
                    <Badge variant="secondary">Upcoming</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {lc.courses?.title} · <Calendar className="w-3 h-3 inline" /> {format(new Date(lc.scheduled_at), "MMM d, yyyy h:mm a")}
                </p>
                {lc.description && <p className="text-xs text-muted-foreground mt-1">{lc.description}</p>}
              </div>
              <div className="shrink-0">
                {lc.status === "live" && lc.started_at ? (
                  <Button size="sm" onClick={() => setActiveRoomId(lc.jitsi_room_id)}>
                    <Video className="w-4 h-4 mr-1" /> Join Now
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {lc.status === "live" ? "Teacher is starting the class..." : `Starts ${format(new Date(lc.scheduled_at), "h:mm a")}`}
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <Video className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No upcoming live classes.</p>
        </div>
      )}
    </DashboardLayout>
  );
};

export default StudentLiveClasses;
