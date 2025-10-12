"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";
import { useChatStore } from "@/lib/store/chat-store";
import { useToast } from "@/hooks/use-toast";
import { createClient } from '@supabase/supabase-js'


export default function MessageInput() {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const { toast } = useToast();
  const { addUserMessage, setBotTyping, activeChatId, isInputDisabled, setInputDisabled } = useChatStore();
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

    const userData = localStorage.getItem("support-chat-user");
    console.log("Fetching user for message:", userData);
    if (!userData) {
      toast({
        title: "Not authenticated",
        description: "Please log in to send messages.",
        variant: "destructive",
      });
      return;
    }
    const user = JSON.parse(userData);

    setLoading(true);
    setValue("");
    addUserMessage(text);
    setBotTyping(true);

    try {
      console.log("Sending message:", { session_id: activeChatId, user_id: user.email, message: text });
      const res = await fetch("http://localhost:5001/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text,
          session_id: activeChatId,
          user_id: user.email,
          org_id: "acme",
          channel: "web",
        }),
        credentials: "include",
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to send message");
      }
      const data = await res.json();
      console.log("Received response:", { session_id: activeChatId, response: data });
      const similarityScore = data.retrieval?.similarity_score;
      if (typeof similarityScore === "number" && similarityScore < 0.5) {
        setShowOptions(true);
      }
    } catch (e: any) {
      console.error("Send message error:", e.message);
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

  async function handleEscalate() {
      if (!activeChatId) return;
      const userData = localStorage.getItem("support-chat-user");
      if (!userData) {
        toast({
          title: "Not authenticated",
          description: "Please log in to escalate.",
          variant: "destructive",
        });
        return;
      }
      const user = JSON.parse(userData);
      try {
        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
        const { data, error } = await supabase
          .from('tickets')
          .insert([
            {
              isActive: true,
              sessionId: activeChatId,
              escalatedTo: 'person',
              userId: user.email,
              timestamp: new Date().toISOString(),
            }
          ]);
  
        if (error) {
          throw new Error(error.message || "Failed to create ticket");
        }
  
        toast({
          title: "Escalated and session ended",
          description: "Your session has been escalated to a person and ended.",
        });
        setShowOptions(false);
      } catch (e: any) {
        console.error("Escalate error:", e.message);
        toast({
          title: "Failed to escalate",
          description: e.message || "Try again.",
          variant: "destructive",
        });
      }
    }

  async function handleEndSession() {
    if (!activeChatId) return;
    const userData = localStorage.getItem("support-chat-user");
    if (!userData) {
      toast({
        title: "Not authenticated",
        description: "Please log in to end session.",
        variant: "destructive",
      });
      return;
    }
    const user = JSON.parse(userData);
    try {
      const res = await fetch("http://localhost:5001/end_session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_id: activeChatId,
          user_id: user.email,
        }),
        credentials: "include",
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to end session");
      }
      toast({
        title: "Session ended",
        description: "Your chat session has been ended.",
      });
      setInputDisabled(true);
      setShowOptions(false);
    } catch (e: any) {
      console.error("End session error:", e.message);
      toast({
        title: "Failed to end session",
        description: e.message || "Try again.",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="flex flex-col gap-2">
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
          disabled={isInputDisabled}
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
          disabled={loading || !value.trim() || isInputDisabled}
          aria-label="Send message"
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
        </Button>
      </div>
      {showOptions && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleEscalate}
            disabled={loading}
            aria-label="Escalate to person"
          >
            Escalate to Person
          </Button>
          <Button
            variant="outline"
            onClick={handleEndSession}
            disabled={loading}
            aria-label="End session"
          >
            End Session
          </Button>
        </div>
      )}
    </div>
  );
}