import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, AlertCircle, Zap, Brain, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

type Difficulty = "easy" | "medium" | "hard";

interface Question {
  id: string;
  question_text: string;
  options: string[];
  marks: number;
  position: number;
  difficulty: Difficulty;
}

interface AdaptiveState {
  currentDifficulty: Difficulty;
  questionsAnswered: number;
  correctStreak: number;
  incorrectStreak: number;
  servedQuestions: { questionId: string; difficulty: Difficulty; wasCorrect: boolean }[];
}

const DIFFICULTY_ORDER: Difficulty[] = ["easy", "medium", "hard"];
const DIFFICULTY_CONFIG = {
  easy: { label: "Easy", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", icon: Target },
  medium: { label: "Medium", color: "bg-amber-500/10 text-amber-600 border-amber-500/20", icon: Brain },
  hard: { label: "Hard", color: "bg-red-500/10 text-red-600 border-red-500/20", icon: Zap },
};

function getNextDifficulty(state: AdaptiveState): Difficulty {
  const currentIdx = DIFFICULTY_ORDER.indexOf(state.currentDifficulty);
  if (state.correctStreak >= 2 && currentIdx < DIFFICULTY_ORDER.length - 1) {
    return DIFFICULTY_ORDER[currentIdx + 1];
  }
  if (state.incorrectStreak >= 2 && currentIdx > 0) {
    return DIFFICULTY_ORDER[currentIdx - 1];
  }
  return state.currentDifficulty;
}

function pickNextQuestion(
  allQuestions: Question[],
  answeredIds: Set<string>,
  targetDifficulty: Difficulty
): Question | null {
  const atTarget = allQuestions.filter((q) => q.difficulty === targetDifficulty && !answeredIds.has(q.id));
  if (atTarget.length > 0) return atTarget[Math.floor(Math.random() * atTarget.length)];
  const currentIdx = DIFFICULTY_ORDER.indexOf(targetDifficulty);
  for (let offset = 1; offset < DIFFICULTY_ORDER.length; offset++) {
    for (const dir of [1, -1]) {
      const checkIdx = currentIdx + offset * dir;
      if (checkIdx >= 0 && checkIdx < DIFFICULTY_ORDER.length) {
        const fallback = allQuestions.filter(
          (q) => q.difficulty === DIFFICULTY_ORDER[checkIdx] && !answeredIds.has(q.id)
        );
        if (fallback.length > 0) return fallback[Math.floor(Math.random() * fallback.length)];
      }
    }
  }
  return null;
}

async function validateAnswer(questionId: string, selectedOption: number): Promise<{ isCorrect: boolean; marks: number }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-answer`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ questionId, selectedOption }),
    }
  );

  if (!response.ok) throw new Error("Validation failed");
  return response.json();
}

interface AdaptiveQuizEngineProps {
  assessmentId: string;
  userId: string;
  onBack: () => void;
  onComplete: (attemptId: string) => void;
}

export default function AdaptiveQuizEngine({ assessmentId, userId, onBack, onComplete }: AdaptiveQuizEngineProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);
  const [correctOptionIdx, setCorrectOptionIdx] = useState<number | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [adaptiveState, setAdaptiveState] = useState<AdaptiveState>({
    currentDifficulty: "medium",
    questionsAnswered: 0,
    correctStreak: 0,
    incorrectStreak: 0,
    servedQuestions: [],
  });

  const { data: assessment } = useQuery({
    queryKey: ["quiz-assessment", assessmentId],
    queryFn: async () => {
      const { data, error } = await supabase.from("assessments").select("id, title, total_marks").eq("id", assessmentId).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: allQuestions, isLoading } = useQuery({
    queryKey: ["quiz-questions-adaptive", assessmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc("get_quiz_questions", { _assessment_id: assessmentId });
      if (error) throw error;
      return ((data || []) as any[]).map((q: any) => ({
        id: q.out_id,
        question_text: q.out_question_text,
        options: q.out_options,
        marks: q.out_marks,
        position: q.out_position,
        difficulty: q.out_difficulty,
      })) as Question[];
    },
  });

  const answeredIds = useMemo(
    () => new Set(adaptiveState.servedQuestions.map((q) => q.questionId)),
    [adaptiveState.servedQuestions]
  );

  const currentQuestion = useMemo(() => {
    if (!allQuestions || allQuestions.length === 0) return null;
    if (answeredIds.size >= allQuestions.length) return null;
    if (adaptiveState.questionsAnswered === 0 && adaptiveState.servedQuestions.length === 0) {
      return pickNextQuestion(allQuestions, answeredIds, "medium");
    }
    return pickNextQuestion(allQuestions, answeredIds, adaptiveState.currentDifficulty);
  }, [allQuestions, answeredIds, adaptiveState]);

  const totalQuestions = allQuestions?.length ?? 0;
  const isQuizComplete = answeredIds.size >= totalQuestions;

  const difficultyStats = useMemo(() => {
    const stats = { easy: 0, medium: 0, hard: 0 };
    adaptiveState.servedQuestions.forEach((q) => {
      if (q.wasCorrect) stats[q.difficulty]++;
    });
    return stats;
  }, [adaptiveState.servedQuestions]);

  const handleAnswer = useCallback(async () => {
    if (selectedAnswer === null || !currentQuestion || isValidating) return;

    setIsValidating(true);
    try {
      const result = await validateAnswer(currentQuestion.id, selectedAnswer);
      const isCorrect = result.isCorrect;
      setLastAnswerCorrect(isCorrect);
      // We don't reveal the correct option index to the client when wrong
      setCorrectOptionIdx(isCorrect ? selectedAnswer : null);
      setShowFeedback(true);

      setTimeout(() => {
        setAdaptiveState((prev) => {
          const newServed = [
            ...prev.servedQuestions,
            { questionId: currentQuestion.id, difficulty: currentQuestion.difficulty, wasCorrect: isCorrect },
          ];

          const newCorrectStreak = isCorrect ? prev.correctStreak + 1 : 0;
          const newIncorrectStreak = isCorrect ? 0 : prev.incorrectStreak + 1;

          const newState: AdaptiveState = {
            currentDifficulty: prev.currentDifficulty,
            questionsAnswered: prev.questionsAnswered + 1,
            correctStreak: newCorrectStreak,
            incorrectStreak: newIncorrectStreak,
            servedQuestions: newServed,
          };

          newState.currentDifficulty = getNextDifficulty(newState);

          if (newState.currentDifficulty !== prev.currentDifficulty) {
            newState.correctStreak = 0;
            newState.incorrectStreak = 0;
          }

          return newState;
        });

        setSelectedAnswer(null);
        setShowFeedback(false);
        setLastAnswerCorrect(null);
        setCorrectOptionIdx(null);
        setIsValidating(false);
      }, 1500);
    } catch {
      toast.error("Failed to validate answer");
      setIsValidating(false);
    }
  }, [selectedAnswer, currentQuestion, isValidating]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!allQuestions || allQuestions.length === 0) throw new Error("No questions");

      const { data: attempt, error: aErr } = await supabase
        .from("assessment_attempts")
        .insert({
          student_id: userId,
          assessment_id: assessmentId,
          is_adaptive: true,
          difficulty_progression: adaptiveState.servedQuestions.map((q) => ({
            questionId: q.questionId,
            difficulty: q.difficulty,
            correct: q.wasCorrect,
          })),
        })
        .select("id")
        .single();
      if (aErr) throw aErr;

      let score = 0;
      const responses = adaptiveState.servedQuestions.map((sq) => {
        const question = allQuestions.find((q) => q.id === sq.questionId)!;
        if (sq.wasCorrect) score += question.marks;
        return {
          attempt_id: attempt.id,
          question_id: sq.questionId,
          selected_option: null,
          is_correct: sq.wasCorrect,
          difficulty_level: sq.difficulty,
        };
      });

      const { error: rErr } = await supabase.from("attempt_responses").insert(responses);
      if (rErr) throw rErr;

      const { error: uErr } = await supabase
        .from("assessment_attempts")
        .update({
          score,
          total_marks: assessment?.total_marks || 0,
          completed_at: new Date().toISOString(),
        })
        .eq("id", attempt.id);
      if (uErr) throw uErr;

      return attempt.id;
    },
    onSuccess: (attemptId) => {
      toast.success("Adaptive quiz completed!");
      onComplete(attemptId);
    },
    onError: () => toast.error("Failed to submit quiz"),
  });

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!allQuestions || allQuestions.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-40" />
        <p>This assessment has no questions yet.</p>
        <Button variant="ghost" className="mt-4" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
      </div>
    );
  }

  if (isQuizComplete) {
    const correctCount = adaptiveState.servedQuestions.filter((q) => q.wasCorrect).length;
    const scorePercent = Math.round((correctCount / totalQuestions) * 100);

    return (
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card rounded-xl border border-border p-8 text-center"
        >
          <div className="w-20 h-20 rounded-full mx-auto mb-4 bg-primary/10 flex items-center justify-center">
            <Brain className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-xl font-bold mb-2">Adaptive Quiz Complete!</h2>
          <p className="text-3xl font-bold text-primary mb-2">{scorePercent}%</p>
          <p className="text-sm text-muted-foreground mb-6">
            {correctCount}/{totalQuestions} correct
          </p>

          <div className="flex justify-center gap-3 mb-6">
            {DIFFICULTY_ORDER.map((diff) => {
              const total = adaptiveState.servedQuestions.filter((q) => q.difficulty === diff).length;
              const correct = difficultyStats[diff];
              if (total === 0) return null;
              const config = DIFFICULTY_CONFIG[diff];
              return (
                <div key={diff} className={cn("px-3 py-2 rounded-lg border text-sm", config.color)}>
                  <p className="font-semibold">{config.label}</p>
                  <p className="text-xs">{correct}/{total} correct</p>
                </div>
              );
            })}
          </div>

          <div className="mb-6">
            <p className="text-xs text-muted-foreground mb-2">Difficulty Progression</p>
            <div className="flex gap-1 justify-center flex-wrap">
              {adaptiveState.servedQuestions.map((sq, i) => {
                const config = DIFFICULTY_CONFIG[sq.difficulty];
                return (
                  <div
                    key={i}
                    className={cn(
                      "w-7 h-7 rounded text-[10px] font-bold flex items-center justify-center border",
                      sq.wasCorrect ? config.color : "bg-destructive/10 text-destructive border-destructive/20"
                    )}
                    title={`Q${i + 1}: ${sq.difficulty} - ${sq.wasCorrect ? "✓" : "✗"}`}
                  >
                    {i + 1}
                  </div>
                );
              })}
            </div>
          </div>

          <Button onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending} className="gap-2">
            {submitMutation.isPending ? "Submitting..." : "Submit Results"}
          </Button>
        </motion.div>
      </div>
    );
  }

  if (!currentQuestion) return null;

  const options = (Array.isArray(currentQuestion.options) ? currentQuestion.options : []) as string[];
  const config = DIFFICULTY_CONFIG[currentQuestion.difficulty];
  const DiffIcon = config.icon;

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={onBack} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to assessments
      </button>

      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold">{assessment?.title}</h2>
        <Badge variant="outline" className={cn("gap-1", config.color)}>
          <DiffIcon className="w-3 h-3" />
          {config.label}
        </Badge>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <Progress value={(answeredIds.size / totalQuestions) * 100} className="h-2 flex-1" />
        <span className="text-sm text-muted-foreground">
          {answeredIds.size}/{totalQuestions}
        </span>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <div className="flex gap-1">
          {DIFFICULTY_ORDER.map((diff) => (
            <div
              key={diff}
              className={cn(
                "h-1.5 w-8 rounded-full transition-all",
                diff === adaptiveState.currentDifficulty
                  ? diff === "easy" ? "bg-emerald-500" : diff === "medium" ? "bg-amber-500" : "bg-red-500"
                  : "bg-muted"
              )}
            />
          ))}
        </div>
        <span className="text-xs text-muted-foreground">Adaptive difficulty</span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.15 }}
          className="bg-card rounded-xl border border-border p-6"
        >
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-medium text-muted-foreground">
              Question {answeredIds.size + 1} of {totalQuestions}
            </span>
            <span className="text-xs text-muted-foreground">{currentQuestion.marks} mark{currentQuestion.marks !== 1 ? "s" : ""}</span>
          </div>
          <p className="font-medium mb-6">{currentQuestion.question_text}</p>

          <RadioGroup
            value={selectedAnswer !== null ? String(selectedAnswer) : ""}
            onValueChange={(v) => !showFeedback && setSelectedAnswer(parseInt(v))}
          >
            <div className="space-y-3">
              {options.map((opt, oIdx) => {
                const isSelected = selectedAnswer === oIdx;
                const isCorrectOption = correctOptionIdx === oIdx;
                return (
                  <Label
                    key={oIdx}
                    htmlFor={`opt-${currentQuestion.id}-${oIdx}`}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                      showFeedback && isCorrectOption
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : showFeedback && isSelected && !lastAnswerCorrect
                        ? "border-destructive bg-destructive/10 text-destructive"
                        : isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-secondary",
                      showFeedback && "pointer-events-none"
                    )}
                  >
                    <RadioGroupItem value={String(oIdx)} id={`opt-${currentQuestion.id}-${oIdx}`} disabled={showFeedback} />
                    <span className="text-sm">{opt}</span>
                    {showFeedback && isCorrectOption && <span className="ml-auto text-xs">✓ Correct</span>}
                    {showFeedback && isSelected && !lastAnswerCorrect && <span className="ml-auto text-xs">✗</span>}
                  </Label>
                );
              })}
            </div>
          </RadioGroup>

          {showFeedback && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "mt-4 p-3 rounded-lg text-sm font-medium",
                lastAnswerCorrect
                  ? "bg-primary/10 text-primary"
                  : "bg-destructive/10 text-destructive"
              )}
            >
              {lastAnswerCorrect
                ? "🎉 Correct! Moving to the next question..."
                : "Not quite. Better luck on the next one!"}
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="flex justify-end mt-6">
        <Button onClick={handleAnswer} disabled={selectedAnswer === null || showFeedback || isValidating}>
          {isValidating ? "Checking..." : "Confirm Answer"}
        </Button>
      </div>

      <div className="flex gap-1 justify-center mt-6 flex-wrap">
        {adaptiveState.servedQuestions.map((sq, i) => (
          <div
            key={i}
            className={cn(
              "w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center",
              sq.wasCorrect ? "bg-primary/20 text-primary" : "bg-destructive/20 text-destructive"
            )}
          >
            {sq.wasCorrect ? "✓" : "✗"}
          </div>
        ))}
      </div>
    </div>
  );
}
