import { Link } from "react-router-dom";
import { useAIAnalysis, type LearningPathItem, type DifficultyProfile } from "@/components/AIInsightsPanel";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Route, Gauge, ArrowRight, BookOpen, AlertTriangle, Zap, Target } from "lucide-react";
import { cn } from "@/lib/utils";

const difficultyConfig = {
  review: { label: "Review", icon: AlertTriangle, color: "bg-amber-500/10 text-amber-700 border-amber-500/20" },
  standard: { label: "Standard", icon: Target, color: "bg-primary/10 text-primary border-primary/20" },
  challenge: { label: "Challenge", icon: Zap, color: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" },
};

const urgencyConfig = {
  high: { label: "Urgent", color: "bg-destructive/10 text-destructive border-destructive/20" },
  medium: { label: "Recommended", color: "bg-amber-500/10 text-amber-700 border-amber-500/20" },
  low: { label: "Optional", color: "bg-muted text-muted-foreground border-border" },
};

const levelConfig = {
  beginner: { label: "Beginner", color: "text-amber-600", bgColor: "bg-amber-500/10", progress: 25 },
  intermediate: { label: "Intermediate", color: "text-primary", bgColor: "bg-primary/10", progress: 55 },
  advanced: { label: "Advanced", color: "text-emerald-600", bgColor: "bg-emerald-500/10", progress: 85 },
};

function DifficultyProfileCard({ profile }: { profile: DifficultyProfile }) {
  const config = levelConfig[profile.level] || levelConfig.beginner;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-xl border border-border p-5"
    >
      <div className="flex items-center gap-2 mb-4">
        <Gauge className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-sm">Your Difficulty Level</h3>
      </div>

      <div className="flex items-center gap-4 mb-3">
        <div className={cn("w-14 h-14 rounded-xl flex items-center justify-center", config.bgColor)}>
          <span className={cn("text-lg font-bold", config.color)}>{config.label.charAt(0)}</span>
        </div>
        <div className="flex-1">
          <p className={cn("font-bold text-lg", config.color)}>{config.label}</p>
          <p className="text-xs text-muted-foreground">{profile.description}</p>
        </div>
      </div>

      {/* Progress bar showing level */}
      <div className="w-full h-2 rounded-full bg-secondary mb-2">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${config.progress}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={cn("h-full rounded-full", profile.level === "beginner" ? "bg-amber-500" : profile.level === "intermediate" ? "bg-primary" : "bg-emerald-500")}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>Beginner</span>
        <span>Intermediate</span>
        <span>Advanced</span>
      </div>

      <p className="text-xs text-muted-foreground mt-3 p-2 rounded-lg bg-secondary/50">
        💡 {profile.adjustmentNote}
      </p>
    </motion.div>
  );
}

function LearningPathStep({ item, index }: { item: LearningPathItem; index: number }) {
  const diff = difficultyConfig[item.difficulty] || difficultyConfig.standard;
  const urg = urgencyConfig[item.urgency] || urgencyConfig.medium;
  const DiffIcon = diff.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -15 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Link
        to={`/student/courses/${item.courseId}`}
        className="flex items-start gap-3 p-4 rounded-xl border border-border bg-card hover:bg-secondary/50 transition-colors group"
      >
        {/* Step number */}
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
          {index + 1}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm font-semibold truncate">{item.lessonTitle}</span>
            <Badge variant="outline" className={cn("text-[10px] shrink-0", diff.color)}>
              <DiffIcon className="w-3 h-3 mr-1" />
              {diff.label}
            </Badge>
            <Badge variant="outline" className={cn("text-[10px] shrink-0", urg.color)}>
              {urg.label}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-1">
            <BookOpen className="w-3 h-3 inline mr-1" />
            {item.courseName}
          </p>
          <p className="text-xs text-muted-foreground">{item.reason}</p>
        </div>

        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
      </Link>
    </motion.div>
  );
}

export default function AdaptiveLearningPath() {
  const { data, isLoading, error } = useAIAnalysis();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-sm text-muted-foreground p-4 bg-card rounded-xl border border-border">
        <Route className="w-5 h-5 mb-2 text-primary" />
        <p>Your personalized learning path will appear once you enroll in courses and start taking quizzes.</p>
      </div>
    );
  }

  const hasPath = data.learningPath && data.learningPath.length > 0;
  const hasProfile = data.difficultyProfile;

  if (!hasPath && !hasProfile) {
    return (
      <div className="text-sm text-muted-foreground p-4 bg-card rounded-xl border border-border">
        <Route className="w-5 h-5 mb-2 text-primary" />
        <p>Complete some lessons and quizzes to unlock your personalized learning path!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Difficulty Profile */}
      {hasProfile && <DifficultyProfileCard profile={data.difficultyProfile!} />}

      {/* Learning Path */}
      {hasPath && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Route className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">Your Learning Path</h3>
            <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
              AI-Personalized
            </Badge>
          </div>

          <div className="space-y-2">
            {data.learningPath!.map((item, i) => (
              <LearningPathStep key={`${item.courseId}-${item.lessonId}`} item={item} index={i} />
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
