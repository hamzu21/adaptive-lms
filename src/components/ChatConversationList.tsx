import { useState, useMemo } from "react";
import { Plus, MessageSquare, Trash2, Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  onDeleteAll: () => void;
}

const ChatConversationList = ({ conversations, activeId, loading, onSelect, onNew, onDelete, onDeleteAll }: Props) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return conversations;
    const q = search.toLowerCase();
    return conversations.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.lesson_title?.toLowerCase().includes(q) ||
        c.course_name?.toLowerCase().includes(q)
    );
  }, [conversations, search]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this chat?")) {
      setDeletingId(id);
      await onDelete(id);
      setDeletingId(null);
    }
  };

  const handleClearAll = async () => {
    if (window.confirm("Are you sure you want to delete ALL chats? This cannot be undone.")) {
      setIsDeletingAll(true);
      await onDeleteAll();
      setIsDeletingAll(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-muted/10 backdrop-blur-md">
      {/* Search & Actions */}
      <div className="p-4 space-y-3 shrink-0">
        <Button 
          onClick={onNew} 
          className="w-full gap-2 rounded-xl shadow-sm bg-background border border-border/50 hover:bg-muted text-foreground transition-all h-10"
        >
          <Plus className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-wider">New Chat</span>
        </Button>
        
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className="h-9 pl-9 pr-7 text-xs bg-muted/40 border-0 focus-visible:ring-1 focus-visible:ring-primary/20 rounded-xl"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <ScrollArea className="flex-1 px-2">
        <div className="space-y-0.5 pb-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-primary/40" />
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">Updating...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <p className="text-[11px] text-muted-foreground font-medium">
                {search ? "No matches found" : "No recent chats"}
              </p>
            </div>
          ) : (
            filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => onSelect(c.id)}
                className={cn(
                  "w-full text-left rounded-xl px-3 py-3 transition-all group relative border border-transparent hover:border-border/40",
                  activeId === c.id
                    ? "bg-background shadow-sm border-border/60 text-foreground ring-1 ring-primary/5"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border border-transparent transition-colors",
                    activeId === c.id ? "bg-primary/5 border-primary/10" : "bg-muted group-hover:bg-background"
                  )}>
                    <MessageSquare className={cn(
                      "w-3 h-3",
                      activeId === c.id ? "text-primary" : "text-muted-foreground/60"
                    )} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-1">
                      <span className="truncate text-xs font-bold tracking-tight">{c.title}</span>
                    </div>
                    {c.lesson_title && (
                      <p className="text-[10px] text-muted-foreground truncate opacity-70 mt-0.5">
                        {c.lesson_title}
                      </p>
                    )}
                    <p className="text-[9px] text-muted-foreground/50 font-medium uppercase tracking-tighter mt-1">
                      {format(new Date(c.updated_at), "MMM d, h:mm a")}
                    </p>
                  </div>
                </div>

                {/* Delete Button */}
                <button
                  onClick={(e) => handleDelete(e, c.id)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all p-1.5 rounded-lg hover:bg-destructive/10 hover:text-destructive text-muted-foreground/40"
                  aria-label="Delete chat"
                >
                  {deletingId === c.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Trash2 className="w-3 h-3" />
                  )}
                </button>
              </button>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Sidebar Footer */}
      {conversations.length > 0 && (
        <div className="p-4 border-t border-border/40 shrink-0">
          <Button 
            onClick={handleClearAll}
            disabled={isDeletingAll}
            variant="ghost"
            className="w-full gap-2 justify-start h-9 text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-xl transition-all"
          >
            {isDeletingAll ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
            <span className="text-[10px] font-bold uppercase tracking-wider">Clear all history</span>
          </Button>
        </div>
      )}
    </div>
  );
};

export default ChatConversationList;
