// components/chat/sidebar.tsx
"use client";

import { useState } from "react";
import { useChatStore } from "@/lib/store/chat-store";
import { cn } from "@/lib/utils";
import { PanelLeftClose, PanelLeftOpen, Plus, Trash2 } from "lucide-react";
import { Chat } from "../../lib/types"; // Import the Chat type
import { v4 as uuidv4 } from "uuid";

export default function Sidebar() {
  const { chats, activeChatId, setActiveChat, endSession } = useChatStore();
  const [isOpen, setIsOpen] = useState(true); // Example: Sidebar toggle state

  // Convert chats object to array
  const chatArray = Object.values(chats) as Chat[];

  return (
    <div
      className={cn(
        "flex flex-col border-r bg-sidebar",
        isOpen ? "w-64" : "w-16"
      )}
    >
      <div className="flex items-center justify-between p-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
        >
          {isOpen ? <PanelLeftClose className="size-5" /> : <PanelLeftOpen className="size-5" />}
        </button>
        {isOpen && (
          <button
            onClick={() => setActiveChat(uuidv4())}
            aria-label="New chat"
            className="p-1 hover:bg-sidebar-accent rounded"
          >
            <Plus className="size-5" />
          </button>
        )}
      </div>
      {isOpen && (
        <ul className="flex-1 overflow-y-auto p-2 space-y-2">
          {chatArray.map((c) => (
            <li
              key={c.id}
              className={cn(
                "group rounded-md border border-transparent hover:border-sidebar-border/70"
              )}
            >
              <button
                className={cn(
                  "w-full text-left px-2 py-2 rounded-md flex items-center justify-between",
                  activeChatId === c.id
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "hover:bg-sidebar-accent"
                )}
                onClick={() => setActiveChat(c.id)}
              >
                <span className="truncate">
                  {c.title || "New chat"}
                  {c.escalated && <span className="ml-2 text-xs text-destructive">(Escalated)</span>}
                </span>
                                <Trash2
                  className="size-4 opacity-0 group-hover:opacity-100 hover:text-destructive transition"
                  onClick={(e) => {
                    e.stopPropagation();
                    endSession(c.id);
                  }}
                  aria-label="Delete chat"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}