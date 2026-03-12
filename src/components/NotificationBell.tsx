import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

const NotificationBell = () => {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const fetchNotifications = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("id, title, message, read, created_at, metadata")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setNotifications(data as any);
    setLoading(false);
  };

  useEffect(() => {
    fetchNotifications();

    if (!user) return;

    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications((prev) => [newNotif, ...prev].slice(0, 20));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = async () => {
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const getNotificationRoute = (meta: any): string | null => {
    const type = meta?.type;
    if (!type) return null;

    const rolePrefix = role === "teacher" ? "/teacher" : role === "admin" ? "/admin" : "/student";

    switch (type) {
      case "live_class_started":
      case "live_class_scheduled":
        return role === "teacher" ? "/teacher/live" : "/student/live";
      case "assessment_published":
        return `${rolePrefix}/assessments`;
      case "assessment_submission":
        return "/teacher/assessments";
      case "enrollment":
        return role === "teacher" ? "/teacher/enrollments" : `${rolePrefix}/courses`;
      case "enrolled":
        return "/student/courses";
      case "course_updated":
        return `${rolePrefix}/courses`;
      case "assignment_published":
        return `${rolePrefix}/assignments`;
      case "assignment_graded":
        return "/student/assignments";
      case "lesson_created":
        return meta?.course_id ? `${rolePrefix}/courses/${meta.course_id}` : `${rolePrefix}/courses`;
      case "low_score_alert":
        return "/parent";
      default:
        return null;
    }
  };

  const handleNotificationClick = (n: Notification) => {
    if (!n.read) markRead(n.id);
    const meta = (n as any).metadata;
    const route = getNotificationRoute(meta);
    if (route) {
      setOpen(false);
      navigate(route);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive" />
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs text-primary hover:underline"
            >
              Mark all read
            </button>
          )}
        </div>
        <div className="max-h-72 overflow-y-auto">
          {loading ? (
            <p className="p-4 text-sm text-muted-foreground text-center">Loading…</p>
          ) : notifications.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground text-center">
              No notifications yet
            </p>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={cn(
                  "w-full text-left px-4 py-3 border-b border-border last:border-0 transition-colors hover:bg-muted/50",
                  !n.read && "bg-primary/5"
                )}
              >
                <div className="flex items-start gap-2">
                  {!n.read && (
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  )}
                  <div className={cn(!n.read ? "" : "ml-3.5")}>
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-xs text-muted-foreground">{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
