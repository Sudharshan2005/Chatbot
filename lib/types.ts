export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

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

export type User = {
  id: string
  email: string
  displayName: string
  avatarUrl?: string | null
}

export type AuthState = {
  token: string | null
  user: User | null
}
