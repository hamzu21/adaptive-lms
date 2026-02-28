import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { BookOpen, BarChart3, Users, FileText, ClipboardList, TrendingUp, User, Save, Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { motion } from "framer-motion";

const navItems = [
  { label: "Dashboard", href: "/teacher", icon: <BarChart3 className="w-4 h-4" /> },
  { label: "My Classes", href: "/teacher/classes", icon: <Users className="w-4 h-4" /> },
  { label: "Courses", href: "/teacher/courses", icon: <BookOpen className="w-4 h-4" /> },
  { label: "Assessments", href: "/teacher/assessments", icon: <FileText className="w-4 h-4" /> },
  { label: "Assignments", href: "/teacher/assignments", icon: <ClipboardList className="w-4 h-4" /> },
  { label: "Analytics", href: "/teacher/analytics", icon: <TrendingUp className="w-4 h-4" /> },
  { label: "Profile", href: "/teacher/profile", icon: <User className="w-4 h-4" /> },
];

const TeacherProfile = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fullName, setFullName] = useState("");
  const [expertise, setExpertise] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["teacher-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, expertise")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setExpertise(profile.expertise || "");
      setAvatarUrl(profile.avatar_url);
    }
  }, [profile]);

  const updateProfile = useMutation({
    mutationFn: async () => {
      if (!fullName.trim()) throw new Error("Name is required");
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName.trim(), expertise: expertise.trim(), avatar_url: avatarUrl })
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile updated!");
      queryClient.invalidateQueries({ queryKey: ["teacher-profile"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2MB");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `${user!.id}/avatar.${ext}`;

      // Check if bucket exists, upload
      const { error: uploadError } = await supabase.storage
        .from("lesson-videos") // Reusing public bucket for avatars
        .upload(`avatars/${filePath}`, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("lesson-videos").getPublicUrl(`avatars/${filePath}`);
      setAvatarUrl(data.publicUrl);
      toast.success("Avatar uploaded!");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Profile" navItems={navItems}>
        <div className="space-y-4">
          <div className="h-48 bg-muted animate-pulse rounded-xl" />
          <div className="h-32 bg-muted animate-pulse rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Profile" navItems={navItems}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto space-y-6"
      >
        {/* Avatar Section */}
        <div className="bg-card rounded-xl border border-border p-6 flex flex-col items-center gap-4">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border-2 border-border">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-bold text-primary">
                  {fullName?.charAt(0)?.toUpperCase() || "T"}
                </span>
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            >
              {uploading ? (
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              ) : (
                <Camera className="w-5 h-5 text-white" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </div>
          <p className="text-xs text-muted-foreground">Click to upload a profile photo (max 2MB)</p>
        </div>

        {/* Profile Details */}
        <div className="bg-card rounded-xl border border-border p-6 space-y-4">
          <h2 className="text-lg font-semibold">Profile Details</h2>

          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name *</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expertise">Expertise / Bio</Label>
            <Textarea
              id="expertise"
              value={expertise}
              onChange={(e) => setExpertise(e.target.value)}
              placeholder="e.g. Mathematics teacher with 10 years of experience specializing in Algebra and Calculus"
              rows={4}
            />
            <p className="text-xs text-muted-foreground">Describe your teaching background, subjects, and expertise.</p>
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user?.email || ""} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
          </div>
        </div>

        <Button
          className="w-full gap-2"
          onClick={() => updateProfile.mutate()}
          disabled={updateProfile.isPending}
        >
          <Save className="w-4 h-4" />
          {updateProfile.isPending ? "Saving..." : "Save Profile"}
        </Button>
      </motion.div>
    </DashboardLayout>
  );
};

export default TeacherProfile;
