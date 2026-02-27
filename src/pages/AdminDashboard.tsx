import DashboardLayout from "@/components/DashboardLayout";
import { BarChart3, Users, BookOpen, ShieldCheck, Settings, UserPlus, GraduationCap } from "lucide-react";
import { motion } from "framer-motion";
import { useAdminStats } from "@/hooks/useCourses";
import { Skeleton } from "@/components/ui/skeleton";

const navItems = [
  { label: "Dashboard", href: "/admin", icon: <BarChart3 className="w-4 h-4" /> },
  { label: "Users", href: "/admin/users", icon: <Users className="w-4 h-4" /> },
  { label: "Courses", href: "/admin/courses", icon: <BookOpen className="w-4 h-4" /> },
  { label: "Settings", href: "/admin/settings", icon: <Settings className="w-4 h-4" /> },
];

const AdminDashboard = () => {
  const { data: stats, isLoading } = useAdminStats();

  const statCards = [
    { label: "Total Users", value: stats?.totalUsers?.toString() ?? "0", icon: Users, change: "" },
    { label: "Active Courses", value: stats?.activeCourses?.toString() ?? "0", icon: BookOpen, change: "" },
    { label: "Students", value: stats?.students?.toString() ?? "0", icon: GraduationCap, change: "" },
    { label: "Teachers", value: stats?.teachers?.toString() ?? "0", icon: ShieldCheck, change: "" },
  ];

  return (
    <DashboardLayout title="Admin Dashboard" navItems={navItems}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><s.icon className="w-5 h-5 text-primary" /></div>
            </div>
            {isLoading ? <Skeleton className="h-7 w-16 mb-1" /> : <p className="text-2xl font-bold">{s.value}</p>}
            <p className="text-sm text-muted-foreground">{s.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Recent Users</h2>
            <div className="flex items-center gap-1 text-primary text-sm cursor-pointer hover:underline"><UserPlus className="w-4 h-4" /> Add User</div>
          </div>
          <p className="text-sm text-muted-foreground">User listing will be populated from database records.</p>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold mb-4">System Overview</h2>
          <div className="space-y-4">
            {[{ label: "Total Courses", value: stats?.activeCourses?.toString() ?? "0" }, { label: "Total Students", value: stats?.students?.toString() ?? "0" }, { label: "Total Teachers", value: stats?.teachers?.toString() ?? "0" }].map((item) => (
              <div key={item.label} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <span className="text-sm font-semibold">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
