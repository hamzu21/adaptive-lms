import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import ChatConversationList from "@/components/ChatConversationList";
import { useChatPersistence } from "@/hooks/useChatPersistence";
import { BookOpen, BarChart3, FileText, TrendingUp, ClipboardList, Send, Bot, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

const navItems = [
  { label: "Dashboard", href: "/student", icon: <BarChart3 className="w-4 h-4" /> },
  { label: "My Courses", href: "/student/courses", icon: <BookOpen className="w-4 h-4" /> },
  { label: "Assessments", href: "/student/assessments", icon: <FileText className="w-4 h-4" /> },
  { label: "Assignments", href: "/student/assignments", icon: <ClipboardList className="w-4 h-4" /> },
  { label: "Progress", href: "/student/progress", icon: <TrendingUp className="w-4 h-4" /> },
];

type Msg = { role: "user" | "assistant"; content: string };

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
  } = useChatPersistence();

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  // Auto-create conversation for lesson context on first load
  useEffect(() => {
    if (lessonContext && !activeConversationId && !initializedRef.current && !loadingConversations) {
      initializedRef.current = true;
      createConversation(lessonContext.title, lessonContext.course).then(() => {
        // Clear search params after creating conversation
        setSearchParams({});
      });
    }
  }, [lessonContext, activeConversationId, loadingConversations, createConversation, setSearchParams]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const send = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    let convId = activeConversationId;
    // Create conversation on first message if needed
    if (!convId) {
      convId = await createConversation(lessonContext?.title, lessonContext?.course);
      if (!convId) {
        toast.error("Failed to create conversation");
        return;
      }
    }

    const userMsg: Msg = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    // Save user message to DB
    await saveMessage(convId, "user", trimmed);

    const { data: { session } } = await supabase.auth.getSession();

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ messages: [...messages, userMsg], lessonContext }),
      });

      if (resp.status === 429) { toast.error("Rate limit exceeded. Please try again later."); setIsLoading(false); return; }
      if (resp.status === 402) { toast.error("AI credits exhausted."); setIsLoading(false); return; }
      if (!resp.ok || !resp.body) throw new Error("Failed to start stream");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let assistantSoFar = "";
      let streamDone = false;

      const processChunk = (jsonStr: string) => {
        if (jsonStr === "[DONE]") return true;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            assistantSoFar += content;
            const snapshot = assistantSoFar;
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant") {
                return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: snapshot } : m));
              }
              return [...prev, { role: "assistant", content: snapshot }];
            });
          }
          return false;
        } catch {
          return null; // incomplete
        }
      };

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "" || !line.startsWith("data: ")) continue;
          const result = processChunk(line.slice(6).trim());
          if (result === true) { streamDone = true; break; }
          if (result === null) { textBuffer = line + "\n" + textBuffer; break; }
        }
      }

      // Save assistant response to DB
      if (assistantSoFar) {
        await saveMessage(convId, "assistant", assistantSoFar);
      }
    } catch (e) {
      console.error("Chat error:", e);
      toast.error("Failed to get AI response. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, lessonContext, activeConversationId, createConversation, saveMessage, setMessages]);

  const activeConv = conversations.find((c) => c.id === activeConversationId);

  return (
    <DashboardLayout title="AI Study Assistant" navItems={navItems}>
      <div className="flex h-[calc(100vh-12rem)] bg-card rounded-xl border border-border overflow-hidden">
        {/* Sidebar */}
        <ChatConversationList
          conversations={conversations}
          activeId={activeConversationId}
          loading={loadingConversations}
          onSelect={loadConversation}
          onNew={startNewChat}
          onDelete={deleteConversation}
        />

        {/* Chat Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            {loadingMessages ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <Bot className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-lg font-semibold mb-2">AI Study Assistant</h2>
                {activeConv?.lesson_title ? (
                  <>
                    <p className="text-sm text-muted-foreground max-w-md">
                      Ask me anything about <span className="font-medium text-foreground">"{activeConv.lesson_title}"</span>
                      {activeConv.course_name && <> from <span className="font-medium text-foreground">{activeConv.course_name}</span></>}.
                    </p>
                    <div className="flex flex-wrap gap-2 mt-6 justify-center">
                      {[`Summarize "${activeConv.lesson_title}"`, `What are the key concepts?`, `Give me practice questions`].map((s) => (
                        <button key={s} onClick={() => setInput(s)} className="text-xs px-3 py-1.5 rounded-full border border-border bg-background hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
                          {s}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground max-w-md">
                      Ask me anything about your courses! I can help explain concepts, provide study tips, and answer academic questions.
                    </p>
                    <div className="flex flex-wrap gap-2 mt-6 justify-center">
                      {["Explain recursion simply", "Study tips for exams", "Help me understand arrays"].map((s) => (
                        <button key={s} onClick={() => setInput(s)} className="text-xs px-3 py-1.5 rounded-full border border-border bg-background hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
                          {s}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <AnimatePresence>
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-3 mb-4 ${msg.role === "user" ? "justify-end" : ""}`}
                  >
                    {msg.role === "assistant" && (
                      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                        <Bot className="w-4 h-4 text-primary" />
                      </div>
                    )}
                    <div className={`max-w-[80%] rounded-xl px-4 py-3 text-sm ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                      {msg.role === "assistant" ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        msg.content
                      )}
                    </div>
                    {msg.role === "user" && (
                      <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center shrink-0 mt-1">
                        <User className="w-4 h-4 text-secondary-foreground" />
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
            {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="flex gap-3 mb-4">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="bg-muted rounded-xl px-4 py-3">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          <div className="border-t border-border p-3">
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
                }}
                placeholder="Ask a question..."
                className="min-h-[44px] max-h-[120px] resize-none"
                rows={1}
              />
              <Button onClick={send} disabled={!input.trim() || isLoading} size="icon" className="shrink-0">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StudentAIChat;
