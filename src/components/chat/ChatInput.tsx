import { Send, Square, Loader2, Sparkles } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  onStop?: () => void;
  suggestions?: string[];
  placeholder?: string;
}

export default function ChatInput({ onSend, isLoading, onStop, suggestions, placeholder }: ChatInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    onSend(input.trim());
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [input]);

  return (
    <div className="w-full max-w-3xl mx-auto p-4 md:px-6 md:pb-8 flex flex-col gap-3">
      {/* Suggestions */}
      {!isLoading && suggestions && suggestions.length > 0 && input.length === 0 && (
        <div className="flex flex-wrap gap-2 justify-center animate-in fade-in slide-in-from-bottom-2 duration-500">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => {
                setInput(s);
                textareaRef.current?.focus();
              }}
              className="text-[11px] px-3 py-1.5 rounded-full border border-border bg-background hover:bg-secondary/80 hover:border-primary/30 transition-all text-muted-foreground hover:text-primary flex items-center gap-1.5 shadow-sm"
            >
              <Sparkles className="w-3 h-3" />
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input Box */}
      <div className="relative group">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-primary/10 rounded-[28px] blur-sm opacity-0 group-focus-within:opacity-100 transition-opacity" />
        <div className="relative flex items-end gap-2 p-2 bg-card border border-border/60 rounded-[28px] shadow-sm hover:border-border transition-colors focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/10 pl-5 pr-2 py-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || "Message AI Study Assistant..."}
            rows={1}
            className="flex-1 bg-transparent border-0 ring-0 focus:ring-0 resize-none py-2 text-sm max-h-[200px] scrollbar-none"
          />
          
          <div className="flex items-center gap-1 pb-0.5">
            {isLoading ? (
              <Button
                size="icon"
                onClick={onStop}
                className="h-9 w-9 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white shrink-0 shadow-lg"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
              </Button>
            ) : (
              <Button
                size="icon"
                disabled={!input.trim()}
                onClick={handleSend}
                className="h-9 w-9 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shrink-0 shadow-lg disabled:opacity-30 disabled:shadow-none transition-all"
              >
                <Send className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
      
      <p className="text-[10px] text-center text-muted-foreground/60 px-4">
        AI Assistant can make mistakes. Always verify important academic information.
      </p>
    </div>
  );
}
