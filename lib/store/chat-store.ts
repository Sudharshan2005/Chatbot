"use client";

import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import { io, Socket } from "socket.io-client";
import type { Chat, ChatMessage } from "@/lib/types";

interface ChatState {
  activeChatId: string | null;
  chats: Record<string, Chat>;
  isBotTyping: boolean;
  socket: Socket | null;
  isInputDisabled: boolean;
  addUserMessage: (content: string) => void;
  commitBotMessage: (content: string, escalated?: boolean) => void;
  setBotTyping: (typing: boolean) => void;
  setActiveChat: (chatId: string) => void;
  deleteChat: (chatId: string) => void;
  initializeSocket: (sessionId: string) => void;
  endSession: (sessionId: string) => Promise<void>;
  loadHistoricalChats: () => Promise<void>;
  setInputDisabled: (disabled: boolean) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  activeChatId: null,
  chats: {},
  isBotTyping: false,
  socket: null,
  isInputDisabled: false,
  addUserMessage: (content) => {
    const chatId = get().activeChatId;
    if (!chatId) return;
    const messageId = uuidv4();
    const message: ChatMessage = {
      id: messageId,
      role: "user",
      content,
      timestamp: new Date().toISOString(),
    };
    set((state) => {
      const currentChat = state.chats[chatId] || { id: chatId, messages: [], title: "New chat" };
      const isFirstMessage = currentChat.messages.length === 0;
      return {
        chats: {
          ...state.chats,
          [chatId]: {
            ...currentChat,
            messages: [...currentChat.messages, message],
            title: isFirstMessage ? messageId : currentChat.title,
          },
        },
      };
    });
  },
  commitBotMessage: (content, escalated = false) => {
    const chatId = get().activeChatId;
    if (!chatId) return;
    const message: ChatMessage = {
      id: uuidv4(),
      role: "assistant",
      content,
      timestamp: new Date().toISOString(),
    };
    set((state) => ({
      chats: {
        ...state.chats,
        [chatId]: {
          ...state.chats[chatId],
          messages: [...(state.chats[chatId]?.messages || []), message],
          escalated: escalated || state.chats[chatId]?.escalated,
        },
      },
    }));
  },
  setBotTyping: (typing) => set({ isBotTyping: typing }),
  setActiveChat: (chatId) => {
    const prevSocket = get().socket;
    if (prevSocket) {
      prevSocket.emit("leave", { session_id: get().activeChatId });
      prevSocket.disconnect();
    }
    set((state) => ({
      activeChatId: chatId,
      chats: {
        ...state.chats,
        [chatId]: state.chats[chatId] || { id: chatId, messages: [], title: "New chat" },
      },
      socket: null,
      isInputDisabled: false, // Reset input disabled state on new chat
    }));
    get().initializeSocket(chatId);
  },
  deleteChat: (chatId) => {
    set((state) => {
      const { [chatId]: _, ...remainingChats } = state.chats;
      const newActiveChatId = state.activeChatId === chatId ? null : state.activeChatId;
      return {
        chats: remainingChats,
        activeChatId: newActiveChatId,
        isInputDisabled: false, // Reset input disabled state
      };
    });
    if (get().activeChatId === chatId) {
      get().endSession(chatId);
    }
  },
  initializeSocket: (sessionId) => {
    const userData = localStorage.getItem("support-chat-user");
    console.log("Initializing socket, user data:", userData);
    if (!userData) {
      console.error("No user data available for SocketIO");
      return;
    }
    const socket = io("http://localhost:5001", {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });
    socket.on("connect", () => {
      console.log("Socket connected for session:", sessionId);
      socket.emit("join", { session_id: sessionId });
    });
    socket.on("connect_error", (error) => {
      console.error("SocketIO connect error:", error.message);
    });
    socket.on("server:hello", (data) => {
      console.log("Server hello for session:", sessionId, data);
    });
    socket.on("message:ack", (data) => {
      console.log("Message received for session:", sessionId, data);
      if (data.session_id === sessionId) {
        set({ isBotTyping: false });
        get().commitBotMessage(data.response, data.ticket?.escalated);
      } else {
        console.warn("Received message for wrong session:", data.session_id, "Expected:", sessionId);
      }
    });
    socket.on("error", (data) => {
      console.error("Socket error for session:", sessionId, data);
    });
    socket.on("joined", (data) => {
      console.log("Joined session:", sessionId, data);
    });
    socket.on("left", (data) => {
      console.log("Left session:", sessionId, data);
    });
    set({ socket });
  },
  endSession: async (sessionId) => {
    const socket = get().socket;
    if (socket) {
      socket.emit("leave", { session_id: sessionId });
      socket.disconnect();
    }
    const userData = localStorage.getItem("support-chat-user");
    console.log("Ending session, user data:", userData);
    if (!userData) {
      console.error("No user data available for endSession");
      return;
    }
    const user = JSON.parse(userData);
    try {
      const res = await fetch(`http://localhost:5001/end_session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ session_id: sessionId, user_id: user.email }),
        credentials: "include",
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to end session");
      }
      console.log("Session ended:", sessionId);
      set({ activeChatId: null, socket: null, isInputDisabled: true });
    } catch (e: any) {
      console.error("End session error:", e.message);
    }
  },
  loadHistoricalChats: async () => {
    const userData = localStorage.getItem("support-chat-user");
    console.log("Loading historical chats, user data:", userData);
    if (!userData) {
      console.error("No user data available for fetching historical chats");
      return;
    }
    const user = JSON.parse(userData);
    try {
      const res = await fetch(`http://localhost:5001/user/sessions?user_id=${user.email}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch historical chats");
      }
      const { historical_chats } = await res.json();
      console.log("Fetched historical chats:", historical_chats);

      const newChats: Record<string, Chat> = {};
      Object.entries(historical_chats as Record<string, any[]>).forEach(([sessionId, rawMessages]) => {
        const messages: ChatMessage[] = [];
        rawMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        rawMessages.forEach((m) => {
          messages.push({
            id: m.message_id,
            role: "user",
            content: m.user_message,
            timestamp: m.timestamp,
          });
          if (m.response) {
            messages.push({
              id: uuidv4(),
              role: "assistant",
              content: m.response,
              timestamp: m.timestamp,
            });
          }
        });

        const firstMessage = rawMessages[0]?.user_message || "";
        const title = firstMessage.slice(0, 30) + (firstMessage.length > 30 ? "..." : "") || `Chat from ${new Date(rawMessages[0]?.timestamp).toLocaleDateString()}`;

        newChats[sessionId] = {
          id: sessionId,
          messages,
          title,
          escalated: rawMessages.some((m) => m.ticket?.escalated),
        };
      });

      set((state) => ({ chats: { ...state.chats, ...newChats } }));
    } catch (e: any) {
      console.error("Load historical chats error:", e.message);
    }
  },
  setInputDisabled: (disabled) => set({ isInputDisabled: disabled }),
}));