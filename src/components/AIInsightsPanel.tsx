import { useAIAnalysis } from "@/hooks/useAIAnalysis";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Lightbulb, Star, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

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
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-destructive p-4 bg-destructive/10 rounded-xl border border-destructive/20">
        <AlertTriangle className="w-5 h-5 mb-2" />
        <p className="font-semibold">AI Analysis Error</p>
        <p className="text-xs opacity-80">{(error as Error).message}</p>
        <Button 
          variant="outline" 
          size="sm" 
          className="mt-3 text-xs"
          onClick={() => window.location.reload()}
        >
          Retry
        </Button>
      </div>
    );
  }

  if (!data || (!data.summary && !data.strengths)) {
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
      {data.summary && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-xl border border-border p-5 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-4 h-4 text-primary" />
            <h3 className="font-bold text-sm">AI Performance Summary</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed italic">
            "{data.summary}"
          </p>
        </motion.div>
      )}

      {/* Strengths */}
      {data.strengths && data.strengths.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-xl border border-border p-5 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <h3 className="font-bold text-sm">Strong Areas</h3>
          </div>
          <div className="space-y-4">
            {data.strengths.map((s, i) => (
              <div key={i} className="flex flex-col gap-1.5 ml-1">
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 w-fit h-auto whitespace-normal rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-wide">
                  {s.topic}
                </Badge>
                <p className="text-xs text-muted-foreground leading-normal pl-0.5">
                  {s.reason}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Weaknesses */}
      {data.weaknesses && data.weaknesses.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-xl border border-border p-5 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown className="w-4 h-4 text-destructive" />
            <h3 className="font-bold text-sm">Needs Improvement</h3>
          </div>
          <div className="space-y-4">
            {data.weaknesses.map((w, i) => (
              <div key={i} className="flex flex-col gap-1.5 ml-1">
                <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 w-fit h-auto whitespace-normal rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-wide">
                  {w.topic}
                </Badge>
                <p className="text-xs text-muted-foreground leading-normal pl-0.5">
                  {w.reason}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Recommendations */}
      {data.recommendations && data.recommendations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card rounded-xl border border-border p-5 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="w-4 h-4 text-primary" />
            <h3 className="font-bold text-sm">Recommendations</h3>
          </div>
          <div className="space-y-4">
            {data.recommendations.map((r, i) => (
              <div key={i} className="space-y-1.5 p-3 rounded-lg bg-secondary/30 border border-border/50">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold leading-tight">{r.title}</span>
                  <Badge variant="outline" className={cn("text-[9px] font-black uppercase rounded-full px-2 py-0", priorityColors[r.priority] || priorityColors.medium)}>
                    {r.priority}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{r.description}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
