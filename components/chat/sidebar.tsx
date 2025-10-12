// components/chat/sidebar.tsx
"use client";

import { useState, useEffect } from "react";
import { useChatStore } from "@/lib/store/chat-store";
import { cn } from "@/lib/utils";
import { PanelLeftClose, PanelLeftOpen, Plus, Trash2, LogOut } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: string;
  name: string;
  email: string;
  initials: string;
}

export default function Sidebar() {
  const { chats, activeChatId, setActiveChat, deleteChat, endSession } = useChatStore();
  const [isOpen, setIsOpen] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const { toast } = useToast();
  const chatArray = Object.values(chats) as Chat[];
  console.log(chatArray);


  useEffect(() => {
    const fetchProfile = async () => {
      const userData = localStorage.getItem("support-chat-user");
      console.log("Fetching user from localStorage:", userData);
      if (!userData) {
        console.log("No user data in localStorage");
        return;
      }

      const storedUser = JSON.parse(userData);
      try {
        const res = await fetch(`/api/user?user_id=${storedUser.email}`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || "Failed to fetch profile");
        }
        const { user } = await res.json();
        console.log("Fetched user from API:", user);
        setUser(user);
        localStorage.setItem("support-chat-user", JSON.stringify(user));
        console.log("Updated localStorage with user:", localStorage.getItem("support-chat-user"));
      } catch (e: any) {
        console.error("Fetch profile error:", e.message);
        toast({
          title: "Failed to fetch profile",
          description: e.message || "Please log in again.",
          variant: "destructive",
        });
        // Do not clear localStorage here to prevent accidental data loss
        setUser(null);
      }
    };

    if (!user) fetchProfile();
  }, [user, toast]);

  const handleLogout = async () => {
    try {
      const userData = localStorage.getItem("support-chat-user");
      if (!userData) throw new Error("Not authenticated");
      const user = JSON.parse(userData);
      // End all active sessions
      for (const chat of chatArray) {
        await endSession(chat.id);
      }
      console.log("Clearing localStorage on logout");
      localStorage.removeItem("support-chat-user");
      setUser(null);
      toast({
        title: "Logged out",
        description: "All sessions have been cleared.",
      });
    } catch (e: any) {
      console.error("Logout error:", e.message);
      toast({
        title: "Logout failed",
        description: e.message || "Try again.",
        variant: "destructive",
      });
    }
  };

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
        <>
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
                      deleteChat(c.id);
                    }}
                    aria-label="Delete chat"
                  />
                </button>
              </li>
            ))}
          </ul>
          <div className="border-t p-2">
            {user ? (
              <div className="flex items-center gap-2">
                <Avatar className="size-8">
                  <AvatarFallback>{user.name.slice(0, 1)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-medium truncate">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  aria-label="Log out"
                >
                  <LogOut className="size-4" />
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Loading profile...</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}