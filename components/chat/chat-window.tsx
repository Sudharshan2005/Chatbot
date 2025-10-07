// components/chat-window.tsx
"use client";

import { useEffect, useMemo, useRef } from "react";
import { useChatStore } from "@/lib/store/chat-store";
import MessageBubble from "./message-bubble";
import TypingIndicator from "./typing-indicator";
import MessageInput from "./message-input";
import { v4 as uuidv4 } from "uuid";

export default function ChatWindow() {
  const { activeChatId, setActiveChat, chats, isBotTyping, loadHistoricalChats } = useChatStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Load historical chats and initialize chat
  useEffect(() => {
    const userData = localStorage.getItem("support-chat-user");
    console.log("ChatWindow checking user data:", userData);
    if (userData && Object.keys(chats).length === 0) {
      loadHistoricalChats();
    }
    if (!activeChatId) {
      const newChatId = uuidv4();
      setActiveChat(newChatId);
    }
  }, [chats, activeChatId, setActiveChat, loadHistoricalChats]);

  // Smooth scroll to bottom
  const messages = chats[activeChatId]?.messages || [];

  useEffect(() => {
  endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
}, [messages.length, isBotTyping, activeChatId]);



  const emptyState = useMemo(
    () => (
      <div className="flex-1 grid place-items-center text-center text-muted-foreground px-6">
        <div className="space-y-2">
          <p className="text-lg">Welcome to Gemini Support</p>
          <p className="text-sm">Ask a question to get started.</p>
        </div>
      </div>
    ),
    []
  );

  return (
    <>
    <div className="flex-1 flex flex-col overflow-y-scroll">
      <div ref={containerRef} className="flex-1 px-4 md:px-6">
        {messages.length === 0 ? (
          emptyState
        ) : (
          <div className="mx-auto max-w-3xl py-4 space-y-3">
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}
            {isBotTyping && <TypingIndicator />}
            <div ref={endRef} />
          </div>
        )}
      </div>
    </div>
    <div className="border-t p-3">
        <div className="mx-auto max-w-3xl">
          <MessageInput />
        </div>
      </div>
    </>
  );
}