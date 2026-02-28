import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Textarea } from "@/components/ui/textarea";
import { StickyNote, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface StudentNotesProps {
  lessonId: string;
}

const StudentNotes = ({ lessonId }: StudentNotesProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  const { data: note, isLoading } = useQuery({
    queryKey: ["student-note", lessonId, user?.id],
    enabled: !!lessonId && !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("student_notes")
        .select("id, content")
        .eq("student_id", user!.id)
        .eq("lesson_id", lessonId)
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    setContent(note?.content ?? "");
    setHasChanges(false);
  }, [note]);

  const saveNote = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("student_notes")
        .upsert(
          { student_id: user!.id, lesson_id: lessonId, content },
          { onConflict: "student_id,lesson_id" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ["student-note", lessonId] });
      toast.success("Notes saved!");
    },
    onError: () => toast.error("Failed to save notes"),
  });

  const handleChange = useCallback((val: string) => {
    setContent(val);
    setHasChanges(true);
  }, []);

  return (
    <div className="mt-6 border-t border-border pt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <StickyNote className="w-4 h-4 text-primary" /> My Notes
        </h3>
        {hasChanges && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => saveNote.mutate()}
            disabled={saveNote.isPending}
            className="gap-1.5"
          >
            {saveNote.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save
          </Button>
        )}
      </div>
      {isLoading ? (
        <div className="h-24 bg-muted/50 animate-pulse rounded-lg" />
      ) : (
        <Textarea
          value={content}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Write your personal notes for this lesson..."
          rows={4}
          className="resize-y bg-muted/30"
        />
      )}
    </div>
  );
};

export default StudentNotes;
