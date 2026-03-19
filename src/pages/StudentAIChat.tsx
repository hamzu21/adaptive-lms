import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import ChatConversationList from "@/components/ChatConversationList";
import ChatMessage from "@/components/chat/ChatMessage";
import ChatInput from "@/components/chat/ChatInput";
import { useChatPersistence } from "@/hooks/useChatPersistence";
import { 
  BookOpen, 
  BarChart3, 
  FileText, 
  TrendingUp, 
  ClipboardList, 
  Bot, 
  Loader2, 
  Video,
  ChevronRight,
  MessageSquarePlus,
  Compass
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const navItems = [
  { label: "Dashboard", href: "/student", icon: <BarChart3 className="w-4 h-4" /> },
  { label: "My Courses", href: "/student/courses", icon: <BookOpen className="w-4 h-4" /> },
  { label: "Assessments", href: "/student/assessments", icon: <FileText className="w-4 h-4" /> },
  { label: "Assignments", href: "/student/assignments", icon: <ClipboardList className="w-4 h-4" /> },
  { label: "Live Classes", href: "/student/live", icon: <Video className="w-4 h-4" /> },
  { label: "Progress", href: "/student/progress", icon: <TrendingUp className="w-4 h-4" /> },
];

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

const StudentAIChat = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const lessonContext = useMemo(() => {
    const title = searchParams.get("lessonTitle");
    const content = searchParams.get("lessonContent");
    const course = searchParams.get("courseName");
    if (title && content) return { title, content, course: course || "" };
    return null;
  }, [searchParams]);

  const {
    conversations,
    activeConversationId,
    messages,
    setMessages,
    loadingConversations,
    loadingMessages,
    loadConversation,
    createConversation,
    startNewChat,
    saveMessage,
    deleteConversation,
    deleteAllConversations,
  } = useChatPersistence();

  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [dynamicSuggestions, setDynamicSuggestions] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const initializedRef = useRef(false);

  const initialSuggestions = useMemo(() => {
    return lessonContext?.title 
      ? [`Summarize "${lessonContext.title}"`, `What are the key concepts?`, `Give me practice questions`]
      : ["Explain recursion simply", "Study tips for exams", "Help me understand arrays"];
  }, [lessonContext]);

  // Set initial suggestions
  useEffect(() => {
    if (messages.length === 0) {
      setDynamicSuggestions(initialSuggestions);
    }
  }, [messages.length, initialSuggestions]);

  // Auto-create conversation for lesson context on first load
  useEffect(() => {
    if (lessonContext && !activeConversationId && !initializedRef.current && !loadingConversations) {
      initializedRef.current = true;
      createConversation(lessonContext.title, lessonContext.course).then(() => {
        setSearchParams({});
      });
    }
  }, [lessonContext, activeConversationId, loadingConversations, createConversation, setSearchParams]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      const scrollArea = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollArea) {
        scrollArea.scrollTop = scrollArea.scrollHeight;
      }
    }
  }, [messages]);

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
      toast.info("Generation stopped");
    }
  };

  const send = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    let convId = activeConversationId;
    if (!convId) {
      convId = await createConversation(lessonContext?.title, lessonContext?.course);
      if (!convId) {
        toast.error("Failed to create conversation");
        return;
      }
    }

    const userMsg: { role: "user" | "assistant"; content: string } = { role: "user", content };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    setDynamicSuggestions([]); // Clear suggestions while loading

    await saveMessage(convId, "user", content);

    const { data: { session } } = await supabase.auth.getSession();
    abortControllerRef.current = new AbortController();

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ messages: [...messages, userMsg], lessonContext }),
        signal: abortControllerRef.current.signal,
      });

      if (!resp.ok) {
        if (resp.status === 429) throw new Error("Rate limit exceeded");
        if (resp.status === 402) throw new Error("AI credits exhausted");
        throw new Error("Failed to start stream");
      }

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let assistantSoFar = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.trim() === "" || !line.startsWith("data: ")) continue;
          
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }
          
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              assistantSoFar += delta;
              
              // Handle suggestion parsing
              let displayContent = assistantSoFar;
              const suggestionsMarker = "[[Suggestions:";
              const markerIndex = assistantSoFar.indexOf(suggestionsMarker);
              
              if (markerIndex !== -1) {
                displayContent = assistantSoFar.substring(0, markerIndex).trim();
                const remaining = assistantSoFar.substring(markerIndex + suggestionsMarker.length);
                const closeIndex = remaining.indexOf("]]");
                if (closeIndex !== -1) {
                  const suggestionsStr = remaining.substring(0, closeIndex);
                  const suggestionsList = suggestionsStr
                    .split("|")
                    .map((s) => s.trim())
                    .filter((s) => s.length > 0);
                  if (suggestionsList.length > 0) {
                    setDynamicSuggestions(suggestionsList);
                  }
                }
              }

              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: displayContent } : m));
                }
                return [...prev, { role: "assistant", content: displayContent }];
              });
            }
          } catch (e) {
             // Incomplete JSON chunk
          }
        }
      }

      if (assistantSoFar) {
        // Strip suggestions before saving to DB
        const suggestionsMarker = "[[Suggestions:";
        const markerIndex = assistantSoFar.indexOf(suggestionsMarker);
        const finalContent = markerIndex !== -1 
          ? assistantSoFar.substring(0, markerIndex).trim() 
          : assistantSoFar;
        
        await saveMessage(convId, "assistant", finalContent);
      }
    } catch (e: any) {
      if (e.name === 'AbortError') return;
      console.error("Chat error:", e);
      toast.error(e.message || "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [isLoading, messages, lessonContext, activeConversationId, createConversation, saveMessage, setMessages]);

  const activeConv = conversations.find((c) => c.id === activeConversationId);
  const suggestions = activeConv?.lesson_title 
    ? [`Summarize "${activeConv.lesson_title}"`, `What are the key concepts?`, `Give me practice questions`]
    : ["Explain recursion simply", "Study tips for exams", "Help me understand arrays"];

  return (
    <DashboardLayout title="AI Study Assistant" navItems={navItems} noPadding>
      <div className="flex bg-background h-[calc(100vh-4rem)] relative overflow-hidden">
        {/* Sidebar Expansion Button (when closed) */}
        {!sidebarOpen && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            className="absolute left-4 top-4 z-50 rounded-full bg-background/80 backdrop-blur border border-border"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}

        {/* Professional Sidebar */}
        <AnimatePresence mode="wait">
          {sidebarOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="h-full border-r border-border flex flex-col bg-muted/20 backdrop-blur-sm z-40 relative group"
            >
              {/* Toggle close */}
              <button 
                onClick={() => setSidebarOpen(false)}
                className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-12 bg-border/20 hover:bg-border/40 rounded-r-lg flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100 z-50"
              >
                <div className="w-1.5 h-6 bg-muted-foreground/30 rounded-full" />
              </button>

              <ChatConversationList
                conversations={conversations}
                activeId={activeConversationId}
                loading={loadingConversations}
                onSelect={loadConversation}
                onNew={startNewChat}
                onDelete={deleteConversation}
                onDeleteAll={deleteAllConversations}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col relative bg-background overflow-hidden">
          {/* Header (Minimal) */}
          <div className="h-14 border-b border-border/40 flex items-center justify-between px-6 bg-background/50 backdrop-blur sticky top-0 z-30">
            <div className="flex items-center gap-2">
              {activeConv ? (
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-primary uppercase tracking-tighter">Active Session</span>
                  <span className="text-sm font-semibold truncate max-w-[200px] md:max-w-md">
                    {activeConv.title}
                  </span>
                </div>
              ) : (
                <span className="text-sm font-semibold">New Conversation</span>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={startNewChat} className="gap-2 text-xs h-8 rounded-full">
              <MessageSquarePlus className="w-3.5 h-3.5" />
              New Chat
            </Button>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth" ref={scrollRef}>
            <div className="flex flex-col min-h-full">
              {loadingMessages ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-primary/40" />
                    <p className="text-sm text-muted-foreground animate-pulse">Syncing your conversation...</p>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-2xl mx-auto">
                   <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-primary/20 to-primary/5 flex items-center justify-center mb-6 shadow-inner ring-1 ring-primary/10">
                    <Bot className="w-10 h-10 text-primary animate-bounce-slow" />
                  </div>
                  <h2 className="text-3xl font-black mb-4 tracking-tight">AI Study Assistant</h2>
                  <p className="text-muted-foreground leading-relaxed mb-8">
                    {activeConv?.lesson_title 
                      ? <>How can I help you master <span className="text-foreground font-bold underline decoration-primary/30 decoration-2 underline-offset-4">"{activeConv.lesson_title}"</span> today?</>
                      : "Your personalized educational companion. Ask questions about your courses, get study summaries, or practice for your next exam."
                    }
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-md">
                    <div className="p-4 rounded-2xl border border-border bg-muted/30 text-left">
                      <Compass className="w-4 h-4 text-primary mb-2" />
                      <h4 className="text-xs font-bold uppercase mb-1">Clarity</h4>
                      <p className="text-[11px] text-muted-foreground line-clamp-2">"Explain the difference between SQL and NoSQL databases."</p>
                    </div>
                    <div className="p-4 rounded-2xl border border-border bg-muted/30 text-left">
                      <FileText className="w-4 h-4 text-primary mb-2" />
                      <h4 className="text-xs font-bold uppercase mb-1">Practice</h4>
                      <p className="text-[11px] text-muted-foreground line-clamp-2">"Give me 5 hard questions about Javascript Closures."</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col flex-1">
                  <AnimatePresence initial={false}>
                    {messages.map((msg, i) => (
                      <ChatMessage 
                        key={`${i}-${msg.role}`} 
                        role={msg.role} 
                        content={msg.content} 
                        isLatest={i === messages.length - 1 && msg.role === "assistant"}
                        onRegenerate={() => {
                          const lastUserMsg = messages.filter(m => m.role === "user").pop();
                          if (lastUserMsg) {
                            setMessages(prev => prev.slice(0, -1)); // remove last assistant msg
                            send(lastUserMsg.content);
                          }
                        }}
                      />
                    ))}
                  </AnimatePresence>
                  
                  {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                    <motion.div 
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }} 
                      className="py-12 flex justify-center"
                    >
                      <div className="max-w-3xl w-full px-6 flex gap-6">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                          <Bot className="w-5 h-5 text-primary animate-pulse" />
                        </div>
                        <div className="flex items-center gap-2">
                           <div className="flex gap-1.5">
                            {[0, 1, 2].map((i) => (
                              <motion.div
                                key={i}
                                animate={{ y: [0, -4, 0] }}
                                transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                                className="w-1.5 h-1.5 bg-primary/40 rounded-full"
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                  <div className="h-48 shrink-0" /> {/* Spacer for input overlay, increased for dynamic suggestions */}
                </div>
              )}
            </div>
          </div>

          {/* Input Overlay (Blurred/Transparent) */}
          <div className="absolute bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-background via-background/95 to-transparent pt-12">
            <ChatInput 
              onSend={send} 
              isLoading={isLoading} 
              onStop={stopGeneration}
              suggestions={dynamicSuggestions}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StudentAIChat;
