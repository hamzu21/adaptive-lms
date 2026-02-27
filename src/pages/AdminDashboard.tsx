import DashboardLayout from "@/components/DashboardLayout";
import { BarChart3, Users, BookOpen, ShieldCheck, Settings, UserPlus, GraduationCap } from "lucide-react";
import { motion } from "framer-motion";

const navItems = [
  { label: "Dashboard", href: "/admin", icon: <BarChart3 className="w-4 h-4" /> },
  { label: "Users", href: "/admin/users", icon: <Users className="w-4 h-4" /> },
  { label: "Courses", href: "/admin/courses", icon: <BookOpen className="w-4 h-4" /> },
  { label: "Settings", href: "/admin/settings", icon: <Settings className="w-4 h-4" /> },
];

const stats = [
  { label: "Total Users", value: "1,240", icon: Users, change: "+12%" },
  { label: "Active Courses", value: "34", icon: BookOpen, change: "+3" },
  { label: "Students", value: "980", icon: GraduationCap, change: "+8%" },
  { label: "Teachers", value: "45", icon: ShieldCheck, change: "+2" },
];

const recentUsers = [
  { name: "Ayesha Javaid", role: "Student", email: "ayesha@example.com", date: "Feb 25, 2026" },
  { name: "Umy Aiman", role: "Student", email: "umy@example.com", date: "Feb 24, 2026" },
  { name: "Mr. Ali Zaidi", role: "Teacher", email: "ali@example.com", date: "Feb 23, 2026" },
  { name: "Sara Khan", role: "Parent", email: "sara@example.com", date: "Feb 22, 2026" },
  { name: "Ahmed Raza", role: "Student", email: "ahmed@example.com", date: "Feb 21, 2026" },
];

const AdminDashboard = () => {
  return (
    <DashboardLayout title="Admin Dashboard" navItems={navItems} userName="Admin Salman" userRole="admin">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-card rounded-xl border border-border p-5"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <s.icon className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xs font-medium text-primary bg-secondary px-2 py-0.5 rounded-full">{s.change}</span>
            </div>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-sm text-muted-foreground">{s.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Recent Users</h2>
            <div className="flex items-center gap-1 text-primary text-sm cursor-pointer hover:underline">
              <UserPlus className="w-4 h-4" /> Add User
            </div>
          </div>
          <div className="space-y-3">
            {recentUsers.map((u) => (
              <div key={u.email} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                    {u.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{u.name}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-medium bg-secondary px-2 py-0.5 rounded-full text-secondary-foreground">{u.role}</span>
                  <p className="text-xs text-muted-foreground mt-1">{u.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Overview */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold mb-4">System Overview</h2>
          <div className="space-y-4">
            {[
              { label: "System Uptime", value: "99.9%" },
              { label: "Active Sessions", value: "342" },
              { label: "Total Assessments", value: "1,890" },
              { label: "Content Modules", value: "256" },
              { label: "Storage Used", value: "12.4 GB" },
              { label: "Last Backup", value: "2 hours ago" },
            ].map((item) => (
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
