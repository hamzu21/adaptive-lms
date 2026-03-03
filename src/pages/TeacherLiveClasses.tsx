import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import JitsiMeetRoom from "@/components/JitsiMeetRoom";
import { BookOpen, BarChart3, Users, FileText, TrendingUp, ClipboardList, Video, Plus, Play, Square, Trash2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { motion } from "framer-motion";

const navItems = [
  { label: "Dashboard", href: "/teacher", icon: <BarChart3 className="w-4 h-4" /> },
  { label: "My Classes", href: "/teacher/classes", icon: <Users className="w-4 h-4" /> },
  { label: "Courses", href: "/teacher/courses", icon: <BookOpen className="w-4 h-4" /> },
  { label: "Assessments", href: "/teacher/assessments", icon: <FileText className="w-4 h-4" /> },
  { label: "Assignments", href: "/teacher/assignments", icon: <ClipboardList className="w-4 h-4" /> },
  { label: "Live Classes", href: "/teacher/live", icon: <Video className="w-4 h-4" /> },
  { label: "Analytics", href: "/teacher/analytics", icon: <TrendingUp className="w-4 h-4" /> },
];

const TeacherLiveClasses = () => {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", description: "", course_id: "", scheduled_at: "" });

  const { data: courses } = useQuery({
    queryKey: ["teacher-courses-select", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, title").eq("teacher_id", user!.id);
      return data || [];
    },
  });

  const { data: liveClasses, isLoading } = useQuery({
    queryKey: ["teacher-live-classes", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("live_classes")
        .select("*, courses(title)")
        .eq("teacher_id", user!.id)
        .order("scheduled_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const createClass = useMutation({
    mutationFn: async () => {
      const roomId = `adaptlearn-${crypto.randomUUID().slice(0, 8)}`;
      // Convert local datetime-local value to proper ISO string with timezone
      const localDate = new Date(form.scheduled_at);
      const { error } = await supabase.from("live_classes").insert({
        ...form,
        scheduled_at: localDate.toISOString(),
        teacher_id: user!.id,
        jitsi_room_id: roomId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-live-classes"] });
      setShowForm(false);
      setForm({ title: "", description: "", course_id: "", scheduled_at: "" });
      toast.success("Live class scheduled!");
    },
    onError: () => toast.error("Failed to create class"),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status };
      if (status === "live") updates.started_at = new Date().toISOString();
      if (status === "ended") updates.ended_at = new Date().toISOString();
      const { error } = await supabase.from("live_classes").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-live-classes"] });
    },
  });

  const deleteClass = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("live_classes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-live-classes"] });
      toast.success("Live class deleted");
    },
  });

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
      scheduled: { label: "Scheduled", variant: "secondary" },
      live: { label: "🔴 Live", variant: "destructive" },
      ended: { label: "Ended", variant: "default" },
    };
    const s = map[status] || map.scheduled;
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  if (activeRoomId) {
    return (
      <DashboardLayout title="Live Class" navItems={navItems}>
        <Button variant="outline" size="sm" onClick={() => setActiveRoomId(null)} className="mb-4">
          ← Back to classes
        </Button>
        <JitsiMeetRoom
          roomId={activeRoomId}
          displayName={profile?.full_name || "Teacher"}
          onClose={() => setActiveRoomId(null)}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Live Classes" navItems={navItems}>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground">Schedule and manage live video lectures via Jitsi Meet.</p>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-1" /> Schedule Class
        </Button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-xl p-5 mb-6 space-y-4">
          <Input placeholder="Class title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Textarea placeholder="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Select value={form.course_id} onValueChange={(v) => setForm({ ...form, course_id: v })}>
            <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
            <SelectContent>
              {courses?.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} />
          <div className="flex gap-2">
            <Button onClick={() => createClass.mutate()} disabled={!form.title || !form.course_id || !form.scheduled_at || createClass.isPending}>
              Create
            </Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </motion.div>
      )}

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : liveClasses && liveClasses.length > 0 ? (
        <div className="space-y-3">
          {liveClasses.map((lc: any) => (
            <motion.div key={lc.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold truncate">{lc.title}</h3>
                  {statusBadge(lc.status)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {lc.courses?.title} · <Calendar className="w-3 h-3 inline" /> {format(new Date(lc.scheduled_at), "MMM d, yyyy h:mm a")}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                {lc.status === "scheduled" && (
                  <Button size="sm" onClick={() => { updateStatus.mutate({ id: lc.id, status: "live" }); setActiveRoomId(lc.jitsi_room_id); }}>
                    <Play className="w-4 h-4 mr-1" /> Start
                  </Button>
                )}
                {lc.status === "live" && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => setActiveRoomId(lc.jitsi_room_id)}>
                      <Video className="w-4 h-4 mr-1" /> Rejoin
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => updateStatus.mutate({ id: lc.id, status: "ended" })}>
                      <Square className="w-4 h-4 mr-1" /> End
                    </Button>
                  </>
                )}
                {lc.status !== "live" && (
                  <Button size="sm" variant="ghost" onClick={() => deleteClass.mutate(lc.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <Video className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No live classes scheduled yet.</p>
        </div>
      )}
    </DashboardLayout>
  );
};

export default TeacherLiveClasses;
