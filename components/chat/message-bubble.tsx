// components/message-bubble.tsx
"use client";

import { cn } from "@/lib/utils";
import type { ChatMessage } from "../../lib/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { motion } from "framer-motion";

export default function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  const bubble = (
    <div
      className={cn(
        "max-w-[85%] md:max-w-[70%] rounded-lg px-3 py-2 text-sm",
        isUser ? "ml-auto bg-primary text-primary-foreground" : "bg-muted text-foreground"
      )}
      aria-live="polite"
    >
      {message.content}
    </div>
  );

  if (isUser) {
    return <div className="flex justify-end">{bubble}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="flex items-start gap-2"
    >
      <Avatar className="size-7">
        <AvatarFallback>AI</AvatarFallback>
      </Avatar>
      {bubble}
    </motion.div>
  );
}