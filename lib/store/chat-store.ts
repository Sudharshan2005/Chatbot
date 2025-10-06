// lib/store/chat-store.ts
import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { io, Socket } from 'socket.io-client';
import type { Chat, ChatMessage } from '../../lib/types';

interface ChatState {
  activeChatId: string | null;
  chats: Record<string, Chat>;
  isBotTyping: boolean;
  socket: Socket | null;
  addUserMessage: (content: string) => void;
  commitBotMessage: (content: string) => void;
  setBotTyping: (typing: boolean) => void;
  setActiveChat: (chatId: string) => void;
  deleteChat: (chatId: string) => void;
  initializeSocket: (sessionId: string) => void;
  endSession: (sessionId: string) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  activeChatId: null,
  chats: {},
  isBotTyping: false,
  socket: null,
  addUserMessage: (content) => {
    const chatId = get().activeChatId;
    if (!chatId) return;
    const message: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };
    set((state) => ({
      chats: {
        ...state.chats,
        [chatId]: {
          ...state.chats[chatId],
          messages: [...(state.chats[chatId]?.messages || []), message],
        },
      },
    }));
  },
  commitBotMessage: (content, escalated = false) => {
  const chatId = get().activeChatId;
  if (!chatId) return;
  const message: ChatMessage = {
    id: uuidv4(),
    role: 'assistant',
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
    set((state) => ({
      activeChatId: chatId,
      chats: {
        ...state.chats,
        [chatId]: state.chats[chatId] || { id: chatId, messages: [] },
      },
    }));
  },
  deleteChat: (chatId) => {
    set((state) => {
      const { [chatId]: _, ...remainingChats } = state.chats;
      const newActiveChatId =
        state.activeChatId === chatId ? null : state.activeChatId;
      return {
        chats: remainingChats,
        activeChatId: newActiveChatId,
      };
    });
    // Optionally, notify backend to end session
    fetch('http://localhost:5001/end_session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: chatId }),
    }).catch((e) => console.error('Failed to end session:', e));
  },
  initializeSocket: (sessionId) => {
    const socket = io('http://localhost:5001', { withCredentials: true });
    socket.on('connect', () => {
      console.log('Socket connected');
      socket.emit('join', { session_id: sessionId });
    });
    socket.on('server:hello', (data) => {
      console.log('Server hello:', data);
    });
    socket.on('message:ack', (data) => {
      console.log('Message received:', data);
      set({ isBotTyping: false });
      get().commitBotMessage(data.response);
    });
    socket.on('error', (data) => {
      console.error('Socket error:', data);
    });
    socket.on('joined', (data) => {
      console.log('Joined session:', data);
    });
    set({ socket });
  },
  endSession: async (sessionId) => {
    const socket = get().socket;
    if (socket) {
      socket.emit('leave', { session_id: sessionId });
      socket.disconnect();
    }
    try {
      const res = await fetch('http://localhost:5001/end_session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      });
      if (!res.ok) throw new Error('Failed to end session');
      set({ activeChatId: null, socket: null });
    } catch (e: any) {
      console.error('End session error:', e.message);
    }
  },
}));