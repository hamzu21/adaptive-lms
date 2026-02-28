import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Lightbulb, Star } from "lucide-react";
import { motion } from "framer-motion";

interface Analysis {
  strengths: { topic: string; reason: string }[];
  weaknesses: { topic: string; reason: string }[];
  recommendations: { title: string; description: string; priority: string }[];
  summary: string;
}

export function useAIAnalysis() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["ai-analysis", user?.id],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<Analysis> => {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-analyze`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({}),
        }
      );
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "Failed to analyze");
      }
      return resp.json();
    },
  });
}

const priorityColors: Record<string, string> = {
  high: "bg-destructive/10 text-destructive border-destructive/20",
  medium: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  low: "bg-primary/10 text-primary border-primary/20",
};

export default function AIInsightsPanel() {
  const { data, isLoading, error } = useAIAnalysis();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-sm text-muted-foreground p-4 bg-card rounded-xl border border-border">
        <Lightbulb className="w-5 h-5 mb-2 text-primary" />
        <p>AI analysis will appear once you have course progress data.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-xl border border-border p-4"
      >
        <div className="flex items-center gap-2 mb-2">
          <Star className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">AI Summary</h3>
        </div>
        <p className="text-sm text-muted-foreground">{data.summary}</p>
      </motion.div>

      {/* Strengths */}
      {data.strengths.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-xl border border-border p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <h3 className="font-semibold text-sm">Strong Areas</h3>
          </div>
          <div className="space-y-2">
            {data.strengths.map((s, i) => (
              <div key={i} className="flex items-start gap-2">
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 shrink-0 text-xs">
                  {s.topic}
                </Badge>
                <span className="text-xs text-muted-foreground">{s.reason}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Weaknesses */}
      {data.weaknesses.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-xl border border-border p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown className="w-4 h-4 text-destructive" />
            <h3 className="font-semibold text-sm">Needs Improvement</h3>
          </div>
          <div className="space-y-2">
            {data.weaknesses.map((w, i) => (
              <div key={i} className="flex items-start gap-2">
                <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 shrink-0 text-xs">
                  {w.topic}
                </Badge>
                <span className="text-xs text-muted-foreground">{w.reason}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Recommendations */}
      {data.recommendations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card rounded-xl border border-border p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">Recommendations</h3>
          </div>
          <div className="space-y-3">
            {data.recommendations.map((r, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{r.title}</span>
                  <Badge variant="outline" className={`text-[10px] ${priorityColors[r.priority] || priorityColors.medium}`}>
                    {r.priority}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{r.description}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
