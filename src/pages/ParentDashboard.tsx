import DashboardLayout from "@/components/DashboardLayout";
import { BarChart3, TrendingUp, BookOpen, Bell, CheckCircle2, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";

const navItems = [
  { label: "Dashboard", href: "/parent", icon: <BarChart3 className="w-4 h-4" /> },
  { label: "Progress", href: "/parent/progress", icon: <TrendingUp className="w-4 h-4" /> },
  { label: "Notifications", href: "/parent/notifications", icon: <Bell className="w-4 h-4" /> },
];

const childCourses = [
  { name: "Mathematics", score: 72, grade: "B+", trend: "up" },
  { name: "Physics", score: 45, grade: "D", trend: "down" },
  { name: "Computer Science", score: 88, grade: "A", trend: "up" },
  { name: "English", score: 60, grade: "C+", trend: "stable" },
];

const notifications = [
  { type: "alert", msg: "Your child scored below 50% in Physics quiz #5", time: "2 hours ago" },
  { type: "success", msg: "Your child completed Computer Science Module 8", time: "1 day ago" },
  { type: "info", msg: "New assessment scheduled for Mathematics", time: "2 days ago" },
  { type: "success", msg: "Your child improved Mathematics score by 12%", time: "3 days ago" },
];

const ParentDashboard = () => {
  return (
    <DashboardLayout title="Parent Dashboard" navItems={navItems}>
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl border border-border p-6 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">C</div>
          <div>
            <h2 className="text-xl font-bold">Child's Performance</h2>
            <p className="text-sm text-muted-foreground">BSIT — Semester 5 · Overall Avg: 66%</p>
          </div>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" /> Course Performance</h2>
          <div className="space-y-4">
            {childCourses.map((c) => (
              <div key={c.name} className="flex items-center gap-4">
                <div className="flex-1"><div className="flex justify-between mb-1"><p className="text-sm font-medium">{c.name}</p><span className="text-xs font-semibold text-muted-foreground">{c.grade}</span></div><Progress value={c.score} className="h-2" /></div>
                <span className={`text-sm font-bold w-10 text-right ${c.score >= 70 ? "text-primary" : c.score >= 50 ? "text-accent" : "text-destructive"}`}>{c.score}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Bell className="w-5 h-5 text-primary" /> Recent Notifications</h2>
          <div className="space-y-3">
            {notifications.map((n, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                {n.type === "alert" ? <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" /> : n.type === "success" ? <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" /> : <Bell className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />}
                <div><p className="text-sm">{n.msg}</p><p className="text-xs text-muted-foreground mt-0.5">{n.time}</p></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ParentDashboard;
