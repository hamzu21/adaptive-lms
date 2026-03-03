import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, BarChart3, FileText, ClipboardList, TrendingUp, Bot, Camera, User, Video } from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/student", icon: <BarChart3 className="w-4 h-4" /> },
  { label: "My Courses", href: "/student/courses", icon: <BookOpen className="w-4 h-4" /> },
  { label: "Assessments", href: "/student/assessments", icon: <FileText className="w-4 h-4" /> },
  { label: "Assignments", href: "/student/assignments", icon: <ClipboardList className="w-4 h-4" /> },
  { label: "Live Classes", href: "/student/live", icon: <Video className="w-4 h-4" /> },
  { label: "Progress", href: "/student/progress", icon: <TrendingUp className="w-4 h-4" /> },
  { label: "AI Assistant", href: "/student/ai-chat", icon: <Bot className="w-4 h-4" /> },
];

const StudentProfile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [fullName, setFullName] = useState("");
  const [expertise, setExpertise] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["student-profile", user?.id],
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
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName.trim(), expertise: expertise.trim(), avatar_url: avatarUrl })
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-profile"] });
      toast({ title: "Profile updated!" });
    },
    onError: () => toast({ title: "Failed to update profile", variant: "destructive" }),
  });

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "File too large (max 2MB)", variant: "destructive" });
      return;
    }
    const ext = file.name.split(".").pop();
    const path = `avatars/${user.id}/avatar.${ext}`;
    const { error } = await supabase.storage.from("lesson-videos").upload(path, file, { upsert: true });
    if (error) {
      toast({ title: "Upload failed", variant: "destructive" });
      return;
    }
    const { data } = supabase.storage.from("lesson-videos").getPublicUrl(path);
    setAvatarUrl(data.publicUrl);
    toast({ title: "Avatar uploaded!" });
  };

  if (isLoading) {
    return (
      <DashboardLayout title="My Profile" navItems={navItems}>
        <div className="max-w-2xl mx-auto space-y-6">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="My Profile" navItems={navItems}>
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader><CardTitle>Profile Picture</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-6">
            <div className="relative group">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-24 h-24 rounded-full object-cover border-2 border-border" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-10 h-10 text-primary" />
                </div>
              )}
              <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Camera className="w-6 h-6 text-white" />
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </label>
            </div>
            <p className="text-sm text-muted-foreground">Click to upload a new photo (max 2MB)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Personal Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea id="bio" value={expertise} onChange={(e) => setExpertise(e.target.value)} placeholder="Tell us about yourself, your interests, and goals..." rows={4} />
            </div>
            <Button onClick={() => updateProfile.mutate()} disabled={updateProfile.isPending} className="w-full sm:w-auto">
              {updateProfile.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default StudentProfile;
