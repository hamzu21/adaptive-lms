import { useState } from "react";
import { Plus, MessageSquare, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export interface Conversation {
  id: string;
  title: string;
  lesson_title: string | null;
  course_name: string | null;
  created_at: string;
  updated_at: string;
}

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  loading: boolean;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

const ChatConversationList = ({ conversations, activeId, loading, onSelect, onNew, onDelete }: Props) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeletingId(id);
    onDelete(id);
    setDeletingId(null);
  };

  return (
    <div className="w-64 border-r border-border flex flex-col bg-muted/30">
      <div className="p-3 border-b border-border">
        <Button onClick={onNew} variant="outline" size="sm" className="w-full gap-2">
          <Plus className="w-4 h-4" />
          New Chat
        </Button>
      </div>
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : conversations.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8 px-3">No conversations yet</p>
        ) : (
          <div className="p-2 space-y-1">
            {conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => onSelect(c.id)}
                className={cn(
                  "w-full text-left rounded-lg px-3 py-2 text-sm transition-colors group relative",
                  activeId === c.id
                    ? "bg-primary/10 text-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate font-medium">{c.title}</span>
                </div>
                {c.lesson_title && (
                  <p className="text-[10px] text-muted-foreground truncate mt-0.5 ml-5.5">
                    {c.lesson_title}
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground mt-0.5 ml-5.5">
                  {format(new Date(c.updated_at), "MMM d, h:mm a")}
                </p>
                <button
                  onClick={(e) => handleDelete(e, c.id)}
                  className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10"
                  aria-label="Delete conversation"
                >
                  {deletingId === c.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Trash2 className="w-3 h-3 text-destructive" />
                  )}
                </button>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default ChatConversationList;
