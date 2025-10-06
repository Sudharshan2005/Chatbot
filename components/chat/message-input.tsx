// components/message-input.tsx
"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";
import { useChatStore } from "@/lib/store/chat-store";
import { useToast } from "@/hooks/use-toast";

export default function MessageInput() {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { addUserMessage, setBotTyping, commitBotMessage, activeChatId } =
    useChatStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autosize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, []);

  async function onSend() {
    const text = value.trim();
    if (!text) return;
    if (!activeChatId) {
      toast({
        title: "No active chat",
        description: "Please create a new chat.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    setValue("");
    addUserMessage(text);
    setBotTyping(true);

    // Check for escalation keywords
    const needsEscalation =
      text.toLowerCase().includes("human") ||
      text.toLowerCase().includes("support") ||
      text.toLowerCase().includes("escalate");

    try {
      const res = await fetch("http://localhost:5001/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          session_id: activeChatId,
          user_id: "user_123",
          org_id: "acme",
          channel: "web",
        }),
      });
      if (!res.ok) throw new Error("Failed to send message");
      const data = await res.json();

      // Handle escalation
      if (
  needsEscalation ||
  data.nlu?.intent_confidence < 0.3 &&
  data.status === "open"
) {
  commitBotMessage("I'm sorry, I couldn't fully resolve your query. Let me escalate this to a human agent. Please wait a moment.", true);
  await fetch("http://localhost:5001/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "Escalate to human agent",
      session_id: activeChatId,
      user_id: "user_123",
      org_id: "acme",
      channel: "web",
    }),
  });
} else {
        // Message:ack event will handle the response via SocketIO
      }
    } catch (e: any) {
      toast({
        title: "Failed to send",
        description: e.message || "Try again.",
        variant: "destructive",
      });
      setBotTyping(false);
    } finally {
      setLoading(false);
      autosize();
    }
  }

  return (
    <div className="flex items-end gap-2">
      <label htmlFor="message" className="sr-only">
        Message
      </label>
      <textarea
        id="message"
        ref={textareaRef}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          autosize();
        }}
        onInput={autosize}
        placeholder="Type your message..."
        rows={1}
        className="flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSend();
          }
        }}
      />
      <Button
        onClick={onSend}
        disabled={loading || !value.trim()}
        aria-label="Send message"
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Send className="size-4" />
        )}
      </Button>
    </div>
  );
}