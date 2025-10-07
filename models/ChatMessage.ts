// models/ChatMessage.ts

export interface ChatMessage {
  _id: {
    $oid: string;
  };
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
    intent_confidence: numberWrapper;
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
    latency_ms: numberWrapper;
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

interface numberWrapper {
  $numberDouble?: string;
  $numberInt?: string;
}
