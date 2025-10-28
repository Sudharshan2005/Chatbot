import mongoose, { Schema, model, models, Document } from "mongoose";

export interface ChatMessageType extends Document {
  org_id: string;
  user_id: string;
  channel: string;
  session_id: string;
  case_id: string;
  message_id: string;
  parent_message_id: string | null;
  request_id: string;
  direction: "inbound" | "outbound";
  user_message: string;
  response: string;
  source: string;
  status: "open" | "closed";
  nlu: {
    intent: string;
    intent_confidence: number;
    language: string;
    sentiment: string;
    tone: string;
  };
  retrieval: {
    kb_id: string;
    top_k_doc_ids: string[];
    answer_confidence: number | null;
    similarity_score: number | null;
  };
  llm: {
    model: string;
    latency_ms: number;
    prompt_tokens: number | null;
    completion_tokens: number | null;
  };
  ticket: {
    escalated: boolean;
    ticket_id: string | null;
    resolution_code: string | null;
  };
  feedback: {
    user_rating: number | null;
    user_comment: string | null;
  };
  security: {
    pii_redacted: boolean;
    pii_types: string[];
  };
  timestamp: string;
}

const ChatMessageSchema = new Schema<ChatMessageType>({
  org_id: String,
  user_id: String,
  channel: String,
  session_id: String,
  case_id: String,
  message_id: String,
  parent_message_id: String,
  request_id: String,
  direction: { type: String, enum: ["inbound", "outbound"] },
  user_message: String,
  response: String,
  source: String,
  status: { type: String, enum: ["open", "closed"], default: "open" },
  nlu: {
    intent: String,
    intent_confidence: Number,
    language: String,
    sentiment: String,
    tone: String,
  },
  retrieval: {
    kb_id: String,
    top_k_doc_ids: [String],
    answer_confidence: Number,
    similarity_score: Number,
  },
  llm: {
    model: String,
    latency_ms: Number,
    prompt_tokens: Number,
    completion_tokens: Number,
  },
  ticket: {
    escalated: { type: Boolean, default: false },
    ticket_id: String,
    resolution_code: String,
  },
  feedback: {
    user_rating: Number,
    user_comment: String,
  },
  security: {
    pii_redacted: Boolean,
    pii_types: [String],
  },
  timestamp: String,
});

export const ChatMessage =
  models.ChatMessage || model<ChatMessageType>("ChatMessage", ChatMessageSchema);
