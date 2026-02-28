import { useState, useEffect } from "react";
import { Star, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useFeedback } from "@/hooks/useFeedback";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface FeedbackRatingProps {
  courseId: string;
  lessonId?: string | null;
  label?: string;
}

export default function FeedbackRating({ courseId, lessonId, label }: FeedbackRatingProps) {
  const { feedback, isLoading, submitFeedback } = useFeedback(courseId, lessonId);
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [comment, setComment] = useState("");
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (feedback) {
      setRating(feedback.rating);
      setComment(feedback.comment);
    }
  }, [feedback]);

  const handleSubmit = () => {
    if (rating < 1) return;
    submitFeedback.mutate({ rating, comment });
    setExpanded(false);
  };

  if (isLoading) return null;

  return (
    <div className="mt-4 border-t border-border pt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">
            {label || "Rate this"}
          </span>
        </div>
        {!expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="flex items-center gap-1"
          >
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={cn(
                  "w-4 h-4 transition-colors cursor-pointer",
                  star <= rating
                    ? "fill-amber-400 text-amber-400"
                    : "text-muted-foreground/30"
                )}
              />
            ))}
            {feedback && (
              <span className="text-[10px] text-muted-foreground ml-1">
                (edit)
              </span>
            )}
          </button>
        )}
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-3 space-y-3">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onMouseEnter={() => setHoveredStar(star)}
                    onMouseLeave={() => setHoveredStar(0)}
                    onClick={() => setRating(star)}
                    className="p-0.5"
                  >
                    <Star
                      className={cn(
                        "w-6 h-6 transition-colors",
                        star <= (hoveredStar || rating)
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted-foreground/30 hover:text-amber-300"
                      )}
                    />
                  </button>
                ))}
                <span className="text-xs text-muted-foreground ml-2">
                  {rating === 1 && "Poor"}
                  {rating === 2 && "Fair"}
                  {rating === 3 && "Good"}
                  {rating === 4 && "Very Good"}
                  {rating === 5 && "Excellent"}
                </span>
              </div>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your thoughts (optional)..."
                className="min-h-[60px] resize-none text-sm"
                maxLength={500}
                rows={2}
              />
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={rating < 1 || submitFeedback.isPending}
                >
                  {feedback ? "Update" : "Submit"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setExpanded(false);
                    if (feedback) {
                      setRating(feedback.rating);
                      setComment(feedback.comment);
                    }
                  }}
                >
                  Cancel
                </Button>
                <span className="text-[10px] text-muted-foreground ml-auto">
                  {comment.length}/500
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
