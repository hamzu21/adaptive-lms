import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: string;
  createdAt: string;
  lastSignIn: string | null;
}

async function adminFetch(action: string, method = "GET", body?: any, search?: string) {
  const { data: { session } } = await supabase.auth.getSession();
  const params = new URLSearchParams({ action });
  if (search) params.set("search", search);

  const resp = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users?${params}`,
    {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }
  );
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || "Request failed");
  }
  return resp.json();
}

export function useAdminUsers(search: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["admin-users", user?.id, search],
    enabled: !!user,
    queryFn: () => adminFetch("list", "GET", undefined, search),
  });
}

export function useUpdateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, newRole }: { userId: string; newRole: string }) =>
      adminFetch("update-role", "POST", { userId, newRole }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Role updated successfully");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => adminFetch("delete-user", "POST", { userId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success("User deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, fullName }: { userId: string; fullName: string }) =>
      adminFetch("update-profile", "POST", { userId, fullName }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Profile updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useAdminCourses() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["admin-courses", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: coursesData, error } = await supabase
        .from("courses")
        .select("id, title, subject, is_published, created_at, teacher_id")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch teacher profiles separately
      const teacherIds = [...new Set((coursesData || []).map((c: any) => c.teacher_id))];
      let profilesMap: Record<string, string> = {};
      if (teacherIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", teacherIds);
        profilesMap = (profiles || []).reduce((acc: any, p: any) => { acc[p.user_id] = p.full_name; return acc; }, {});
      }

      return (coursesData || []).map((c: any) => ({
        ...c,
        teacherName: profilesMap[c.teacher_id] || "Unknown",
      }));
    },
  });
}

export function useToggleCoursePublish() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ courseId, isPublished }: { courseId: string; isPublished: boolean }) => {
      const { error } = await supabase.from("courses").update({ is_published: isPublished }).eq("id", courseId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-courses"] });
      toast.success("Course updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (courseId: string) => {
      const { error } = await supabase.from("courses").delete().eq("id", courseId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-courses"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success("Course deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
