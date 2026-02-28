import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Conversation } from "@/components/ChatConversationList";

type Msg = { role: "user" | "assistant"; content: string };

export function useChatPersistence() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Load conversations list
  const fetchConversations = useCallback(async () => {
    if (!user) return;
    setLoadingConversations(true);
    const { data } = await supabase
      .from("chat_conversations")
      .select("*")
      .eq("student_id", user.id)
      .order("updated_at", { ascending: false });
    setConversations((data as Conversation[]) || []);
    setLoadingConversations(false);
  }, [user]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Load messages for a conversation
  const loadConversation = useCallback(async (conversationId: string) => {
    setActiveConversationId(conversationId);
    setLoadingMessages(true);
    const { data } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    setMessages((data as Msg[]) || []);
    setLoadingMessages(false);
  }, []);

  // Create a new conversation
  const createConversation = useCallback(
    async (lessonTitle?: string | null, courseName?: string | null) => {
      if (!user) return null;
      const title = lessonTitle ? `About: ${lessonTitle}` : "New Chat";
      const { data, error } = await supabase
        .from("chat_conversations")
        .insert({
          student_id: user.id,
          title,
          lesson_title: lessonTitle || null,
          course_name: courseName || null,
        })
        .select()
        .single();
      if (error || !data) return null;
      setConversations((prev) => [data as Conversation, ...prev]);
      setActiveConversationId(data.id);
      setMessages([]);
      return data.id as string;
    },
    [user]
  );

  // Start new chat (clear active)
  const startNewChat = useCallback(() => {
    setActiveConversationId(null);
    setMessages([]);
  }, []);

  // Save a message to DB
  const saveMessage = useCallback(
    async (conversationId: string, role: "user" | "assistant", content: string) => {
      await supabase.from("chat_messages").insert({
        conversation_id: conversationId,
        role,
        content,
      });
      // Update conversation timestamp and title if first user message
      const updates: Record<string, string> = { updated_at: new Date().toISOString() };
      if (role === "user") {
        // Update title to first user message (truncated)
        const conv = conversations.find((c) => c.id === conversationId);
        if (conv?.title === "New Chat" || conv?.title?.startsWith("About: ")) {
          // Keep lesson-based titles, only update generic ones
          if (conv.title === "New Chat") {
            updates.title = content.slice(0, 60);
          }
        }
      }
      await supabase.from("chat_conversations").update(updates).eq("id", conversationId);
      // Update local list
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? { ...c, ...updates }
            : c
        ).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      );
    },
    [conversations]
  );

  // Delete a conversation
  const deleteConversation = useCallback(
    async (id: string) => {
      await supabase.from("chat_conversations").delete().eq("id", id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConversationId === id) {
        setActiveConversationId(null);
        setMessages([]);
      }
    },
    [activeConversationId]
  );

  return {
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
  };
}
