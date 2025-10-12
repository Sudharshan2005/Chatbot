export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  createdAt: number
  isAgent: boolean;
  user_message: string;
}

export type SessionStatus = "active" | "resolved"
export type SessionPriority = "low" | "medium" | "high"

export interface Chat {
  id: string;
  messages: ChatMessage[];
  title?: string;
  escalated?: boolean;
}

export interface Agent {
  _id: string;
  user_id: string;
  name: string;
  role: string;
  status: 'available' | 'busy' | 'offline';
  current_sessions: string[];
  max_sessions: number;
  skills: string[];
  created_at: string;
  updated_at: string;
}

export interface ChatSession {
  id: string;
  title: string;
  status: 'active' | 'resolved';
  priority: 'low' | 'medium' | 'high';
  assignee: string | null;
  assigneeName: string | null;
  userName: string | null;
  userEmail: string | null;
  tags: string[];
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  closedAt: number | null;
  last_updated: number;
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
