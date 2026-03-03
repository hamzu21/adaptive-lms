import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { BarChart3, Users, BookOpen, Settings, Search, Trash2, Edit2, Check, X, UserCheck, Activity } from "lucide-react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useAdminUsers, useUpdateRole, useDeleteUser, useUpdateProfile, type AdminUser } from "@/hooks/useAdminData";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { label: "Dashboard", href: "/admin", icon: <BarChart3 className="w-4 h-4" /> },
  { label: "Users", href: "/admin/users", icon: <Users className="w-4 h-4" /> },
  { label: "Courses", href: "/admin/courses", icon: <BookOpen className="w-4 h-4" /> },
  { label: "Enrollments", href: "/admin/enrollments", icon: <UserCheck className="w-4 h-4" /> },
  { label: "Activity Logs", href: "/admin/activity-logs", icon: <Activity className="w-4 h-4" /> },
  { label: "Settings", href: "/admin/settings", icon: <Settings className="w-4 h-4" /> },
];

const roleColors: Record<string, string> = {
  admin: "bg-destructive/10 text-destructive border-destructive/20",
  teacher: "bg-primary/10 text-primary border-primary/20",
  student: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  parent: "bg-amber-500/10 text-amber-700 border-amber-500/20",
};

function UserRow({ u, currentUserId }: { u: AdminUser; currentUserId: string }) {
  const updateRole = useUpdateRole();
  const deleteUser = useDeleteUser();
  const updateProfile = useUpdateProfile();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(u.fullName);
  const isSelf = u.id === currentUserId;

  const handleSaveName = () => {
    updateProfile.mutate({ userId: u.id, fullName: editName });
    setEditing(false);
  };

  return (
    <TableRow>
      <TableCell>
        {editing ? (
          <div className="flex items-center gap-1">
            <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8 w-40" />
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSaveName}><Check className="w-3.5 h-3.5" /></Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(false)}><X className="w-3.5 h-3.5" /></Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{u.fullName || "—"}</span>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setEditName(u.fullName); setEditing(true); }}>
              <Edit2 className="w-3 h-3 text-muted-foreground" />
            </Button>
          </div>
        )}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
      <TableCell>
        <Select
          value={u.role}
          onValueChange={(newRole) => updateRole.mutate({ userId: u.id, newRole })}
          disabled={isSelf || updateRole.isPending}
        >
          <SelectTrigger className="h-8 w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["student", "teacher", "parent", "admin"].map((r) => (
              <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {u.lastSignIn ? new Date(u.lastSignIn).toLocaleDateString() : "Never"}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</TableCell>
      <TableCell className="text-right">
        {!isSelf && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive">
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete User</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete <strong>{u.fullName || u.email}</strong> and all their data. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => deleteUser.mutate(u.id)}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </TableCell>
    </TableRow>
  );
}

const AdminUsers = () => {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useAdminUsers(search);
  const { user } = useAuth();
  const users: AdminUser[] = data?.users || [];

  const roleCounts = users.reduce((acc: Record<string, number>, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {});

  return (
    <DashboardLayout title="User Management" navItems={navItems}>
      {/* Role summary */}
      <div className="flex flex-wrap gap-3 mb-6">
        {Object.entries(roleCounts).map(([role, count]) => (
          <Badge key={role} variant="outline" className={`${roleColors[role] || ""} capitalize px-3 py-1 text-sm`}>
            {role}: {count}
          </Badge>
        ))}
        <Badge variant="outline" className="px-3 py-1 text-sm">Total: {users.length}</Badge>
      </div>

      {/* Search */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Last Sign In</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <UserRow key={u.id} u={u} currentUserId={user?.id || ""} />
                ))}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                      {search ? "No users match your search" : "No users found"}
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

export default AdminUsers;
