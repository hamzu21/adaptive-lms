import DashboardLayout from "@/components/DashboardLayout";
import { BarChart3, Users, BookOpen, ShieldCheck, Settings, GraduationCap, ClipboardList, UserCheck } from "lucide-react";
import { motion } from "framer-motion";
import { useAdminStats } from "@/hooks/useCourses";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

const navItems = [
  { label: "Dashboard", href: "/admin", icon: <BarChart3 className="w-4 h-4" /> },
  { label: "Users", href: "/admin/users", icon: <Users className="w-4 h-4" /> },
  { label: "Courses", href: "/admin/courses", icon: <BookOpen className="w-4 h-4" /> },
  { label: "Enrollments", href: "/admin/enrollments", icon: <UserCheck className="w-4 h-4" /> },
  { label: "Settings", href: "/admin/settings", icon: <Settings className="w-4 h-4" /> },
];

const chartConfig = {
  count: { label: "Enrollments", color: "hsl(var(--primary))" },
};

const AdminDashboard = () => {
  const { data: stats, isLoading } = useAdminStats();

  const statCards = [
    { label: "Total Users", value: stats?.totalUsers ?? 0, icon: Users },
    { label: "Active Courses", value: stats?.activeCourses ?? 0, icon: BookOpen },
    { label: "Students", value: stats?.students ?? 0, icon: GraduationCap },
    { label: "Teachers", value: stats?.teachers ?? 0, icon: ShieldCheck },
    { label: "Enrollments", value: stats?.totalEnrollments ?? 0, icon: UserCheck },
    { label: "Assessments", value: stats?.totalAssessments ?? 0, icon: ClipboardList },
  ];

  return (
    <DashboardLayout title="Admin Dashboard" navItems={navItems}>
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {statCards.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} className="bg-card rounded-xl border border-border p-5">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
              <s.icon className="w-5 h-5 text-primary" />
            </div>
            {isLoading ? <Skeleton className="h-7 w-16 mb-1" /> : <p className="text-2xl font-bold">{s.value}</p>}
            <p className="text-sm text-muted-foreground">{s.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Enrollment Trend */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold mb-4">Enrollment Trend (14 days)</h2>
          {isLoading ? (
            <Skeleton className="h-[200px] w-full" />
          ) : (
            <ChartContainer config={chartConfig} className="h-[200px] w-full">
              <BarChart data={stats?.enrollmentTrend || []} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </motion.div>

        {/* Recent Users */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Users</h2>
          {isLoading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(stats?.recentUsers || []).map((u: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell><Badge variant="secondary" className="capitalize">{u.role}</Badge></TableCell>
                    <TableCell className="text-right text-muted-foreground text-xs">{new Date(u.joinedAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
                {(stats?.recentUsers || []).length === 0 && (
                  <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">No users yet</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </motion.div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Course Distribution */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold mb-4">Courses by Subject</h2>
          {isLoading ? (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
          ) : (
            <div className="space-y-3">
              {(stats?.courseDistribution || []).map((item: any) => (
                <div key={item.subject} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                  <span className="text-sm font-medium">{item.subject}</span>
                  <Badge variant="outline">{item.count}</Badge>
                </div>
              ))}
              {(stats?.courseDistribution || []).length === 0 && (
                <p className="text-sm text-muted-foreground">No courses yet</p>
              )}
            </div>
          )}
        </motion.div>

        {/* Assessment Overview */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold mb-4">Assessment Overview</h2>
          {isLoading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
          ) : (
            <div className="space-y-4">
              {[
                { label: "Total Assessments", value: stats?.totalAssessments ?? 0 },
                { label: "Completed Attempts", value: stats?.completedAttempts ?? 0 },
                { label: "Average Score", value: `${stats?.avgScore ?? 0}%` },
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  <span className="text-sm font-semibold">{item.value}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
