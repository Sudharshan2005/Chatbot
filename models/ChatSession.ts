// models/ChatSession.ts

export interface ChatSession {
  _id: {
    $oid: string;
  };
  session_id: string;
  case_ids: string[];
  channel: string;
  last_updated: {
    $date: {
      $numberLong: string;
    };
  };
  org_id: string;
  user_id: string;
}
