export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export type SessionStatus = "active" | "resolved"
export type SessionPriority = "low" | "medium" | "high"

export interface Chat {
  id: string;
  messages: ChatMessage[];
  title?: string;
  escalated?: boolean;
}
export type ChatSession = {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: number
  updatedAt: number
}

export interface User {
  id: string;
  name: string;
  email: string;
  initials: string; 
}

export type AuthState = {
  token: string | null
  user: User | null
}
