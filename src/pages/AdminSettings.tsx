import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { BarChart3, Users, BookOpen, Settings, UserCheck, Save, Shield, Bell, Activity } from "lucide-react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

const navItems = [
  { label: "Dashboard", href: "/admin", icon: <BarChart3 className="w-4 h-4" /> },
  { label: "Users", href: "/admin/users", icon: <Users className="w-4 h-4" /> },
  { label: "Courses", href: "/admin/courses", icon: <BookOpen className="w-4 h-4" /> },
  { label: "Enrollments", href: "/admin/enrollments", icon: <UserCheck className="w-4 h-4" /> },
  { label: "Activity Logs", href: "/admin/activity-logs", icon: <Activity className="w-4 h-4" /> },
  { label: "Settings", href: "/admin/settings", icon: <Settings className="w-4 h-4" /> },
];

const AdminSettings = () => {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState(profile?.full_name || "");

  const updateProfile = useMutation({
    mutationFn: async () => {
      if (!fullName.trim()) throw new Error("Name cannot be empty");
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName.trim() })
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Profile updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <DashboardLayout title="Settings" navItems={navItems}>
      <div className="max-w-2xl space-y-6">
        {/* Admin Profile */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-xl border border-border p-6 space-y-4"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Admin Profile</h2>
              <p className="text-sm text-muted-foreground">Manage your account details</p>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user?.email || ""} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">Email cannot be changed</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Display Name</Label>
            <Input
              id="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
            />
          </div>

          <Button
            onClick={() => updateProfile.mutate()}
            disabled={updateProfile.isPending}
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            {updateProfile.isPending ? "Saving…" : "Save Changes"}
          </Button>
        </motion.div>

        {/* Platform Info */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-xl border border-border p-6 space-y-4"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Settings className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Platform Information</h2>
              <p className="text-sm text-muted-foreground">System details and configuration</p>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            {[
              { label: "Platform", value: "AdaptLearn LMS" },
              { label: "Role", value: "Administrator" },
              { label: "Authentication", value: "Email & Password" },
              { label: "Database", value: "Supabase" },
            ].map((item) => (
              <div key={item.label} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <span className="text-sm font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Notification Preferences */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-xl border border-border p-6 space-y-4"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Notifications</h2>
              <p className="text-sm text-muted-foreground">Manage notification preferences</p>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            {[
              { id: "new-users", label: "New user registrations", desc: "Get notified when new users sign up" },
              { id: "enrollments", label: "Enrollment activity", desc: "Notifications for new course enrollments" },
              { id: "assessments", label: "Assessment completions", desc: "When students complete assessments" },
            ].map((pref) => (
              <div key={pref.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{pref.label}</p>
                  <p className="text-xs text-muted-foreground">{pref.desc}</p>
                </div>
                <Switch defaultChecked />
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default AdminSettings;
