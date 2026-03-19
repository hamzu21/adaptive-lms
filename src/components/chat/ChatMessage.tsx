import { Bot, User, Copy, Check, RotateCcw } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  isLatest?: boolean;
  onRegenerate?: () => void;
}

export default function ChatMessage({ role, content, isLatest, onRegenerate }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "group w-full py-6 flex justify-center border-b border-border/40 last:border-0",
        role === "assistant" ? "bg-muted/30" : "bg-background"
      )}
    >
      <div className="max-w-3xl w-full px-4 md:px-6 flex gap-4 md:gap-6">
        {/* Avatar */}
        <div className="shrink-0 mt-0.5">
          {role === "assistant" ? (
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 shadow-sm">
              <Bot className="w-5 h-5 text-primary" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center border border-border shadow-sm">
              <User className="w-5 h-5 text-secondary-foreground" />
            </div>
          )
          }
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">
              {role === "assistant" ? "AI Assistant" : "You"}
            </span>
          </div>

          <div className="prose prose-sm dark:prose-invert max-w-none break-words
            prose-headings:font-bold prose-headings:tracking-tight
            prose-p:leading-relaxed prose-p:text-foreground/90
            prose-strong:text-foreground prose-strong:font-bold
            prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded-sm prose-code:before:content-none prose-code:after:content-none
            prose-pre:bg-zinc-950 prose-pre:text-zinc-50 prose-pre:p-4 prose-pre:rounded-xl prose-pre:border prose-pre:border-border/50
            prose-ul:my-2 prose-li:my-1
          ">
            {role === "assistant" ? (
              <ReactMarkdown>{content}</ReactMarkdown>
            ) : (
              <p className="whitespace-pre-wrap">{content}</p>
            )}
          </div>

          {/* Actions (Always slightly visible on assistant messages, right-aligned to avoid suggestion overlap) */}
          {role === "assistant" && (
            <div className="flex items-center justify-end gap-3 mt-2 opacity-50 group-hover:opacity-100 transition-opacity">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-xl bg-background shadow-sm border-border/60 hover:bg-muted transition-all"
                onClick={copyToClipboard}
                title="Copy response"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
              </Button>
              {isLatest && onRegenerate && (
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-xl bg-background shadow-sm border-border/60 hover:bg-muted transition-all"
                  onClick={onRegenerate}
                  title="Regenerate response"
                >
                  <RotateCcw className="w-4 h-4 text-muted-foreground" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
