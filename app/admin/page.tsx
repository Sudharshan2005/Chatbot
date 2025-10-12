"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import type { ChatSession, Agent } from "@/lib/types"; // Import Agent type
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import MessageBubble from "@/components/chat/message-bubble";
import { useToast } from "@/hooks/use-toast";
import { Mail, Eye, MoreHorizontal, CheckCircle2, RotateCcw, XCircle, Download, User, UserCheck } from "lucide-react"; // Added User and UserCheck icons
import { cn } from "@/lib/utils";
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function StatusBadge({ status }: { status: ChatSession["status"] }) {
  return (
    <Badge variant={status === "active" ? "default" : "secondary"}>
      {status === "active" ? "Active" : "Resolved"}
    </Badge>
  );
}

function PriorityBadge({ priority }: { priority: ChatSession["priority"] }) {
  const tone =
    priority === "high"
      ? "bg-destructive text-destructive-foreground"
      : priority === "medium"
        ? "bg-primary text-primary-foreground"
        : "bg-muted text-muted-foreground";
  return <Badge className={cn(tone, "capitalize")}>{priority}</Badge>;
}

function formatTime(ts?: number | null) {
  if (!ts) return "-";
  const d = new Date(ts);
  return d.toLocaleString();
}

function SessionDetails({
  open,
  onOpenChange,
  session,
  onUpdateSession,
  agents,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  session: ChatSession;
  onUpdateSession: (updatedSession: ChatSession) => void;
  agents: Agent[];
}) {
  const { toast } = useToast();
  const [selectedAgent, setSelectedAgent] = useState(session.assignee ?? ""); // Changed from assignee to selectedAgent
  const [userEmail, setUserEmail] = useState(session.userEmail ?? "");
  const [userName, setUserName] = useState(session.userName ?? "");
  const [newTag, setNewTag] = useState("");

  const availableAgents = agents.filter(agent => 
    agent.status === "available" && agent.current_sessions.length < agent.max_sessions
  );

  async function setSessionStatus(sessionId: string, status: ChatSession["status"]) {
    try {
      if (status === "active") {
        // Create or update ticket in Supabase
        const { data, error } = await supabase
          .from('tickets')
          .upsert({
            sessionId: sessionId,
            isActive: true,
            userId: session.userEmail,
            userName: session.userName,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }, {
            onConflict: 'sessionId',
            ignoreDuplicates: false
          });

        if (error) throw error;
      } else {
        // When closing session, remove from agent's current_sessions
        if (session.assignee) {
          await fetch('http://localhost:5001/agent/remove-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              agent_id: session.assignee,
              session_id: sessionId
            })
          });
        }

        const { data, error } = await supabase
          .from('tickets')
          .update({ 
            isActive: false,
            updatedAt: new Date().toISOString()
          })
          .eq('sessionId', sessionId);

        if (error) throw error;
      }

      const updatedSession = { 
        ...session, 
        status,
        closedAt: status === "resolved" ? Date.now() : null
      };
      onUpdateSession(updatedSession);
      toast({ title: `Session ${status === "active" ? "reopened" : "closed"}` });
    } catch (e: any) {
      toast({
        title: "Failed to update status",
        description: e.message || "Try again.",
        variant: "destructive",
      });
    }
  }

  async function assignAgent(sessionId: string, agentId: string) {
    try {
      if (!agentId) return;
      console.log(agentId, sessionId)

      // Update Supabase ticket with assigned agent
      const { error: supabaseError } = await supabase
        .from('tickets')
        .update({ 
          escalatedTo: agentId,
          updatedAt: new Date().toISOString()
        })
        .eq('sessionId', sessionId);

      if (supabaseError) throw supabaseError;

      // Add session to agent's current_sessions in MongoDB
      const agentResponse = await fetch('http://localhost:5001/agent/assign-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id: agentId,
          session_id: sessionId
        })
      });

      if (!agentResponse.ok) {
        throw new Error('Failed to update agent assignment');
      }

      const assignedAgent = agents.find(a => a.user_id === agentId);

      const updatedSession = { 
        ...session, 
        assignee: agentId,
        assigneeName: assignedAgent?.name || agentId
      };
      
      onUpdateSession(updatedSession);
      toast({ title: `Session assigned to ${assignedAgent?.name || agentId}` });
    } catch (e: any) {
      toast({
        title: "Failed to assign agent",
        description: e.message || "Try again.",
        variant: "destructive",
      });
    }
  }

  async function updateSessionMeta(sessionId: string, meta: Partial<ChatSession>) {
    try {
      const updateData: any = {};
      if ("priority" in meta) updateData.priority = meta.priority;
      if ("userEmail" in meta) updateData.userId = meta.userEmail;
      if ("userName" in meta) updateData.userName = meta.userName;

      // Check if ticket exists in Supabase
      const { data: existingTicket } = await supabase
        .from('tickets')
        .select('sessionId')
        .eq('sessionId', sessionId)
        .single();

      if (existingTicket) {
        // Update existing ticket
        const { error } = await supabase
          .from('tickets')
          .update({
            ...updateData,
            updatedAt: new Date().toISOString()
          })
          .eq('sessionId', sessionId);

        if (error) throw error;
      } else {
        // Create new ticket if it doesn't exist
        const { error } = await supabase
          .from('tickets')
          .insert({
            sessionId: sessionId,
            isActive: true,
            userId: session.userEmail,
            userName: session.userName,
            ...updateData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });

        if (error) throw error;
      }

      const updatedSession = { ...session, ...meta, status: "active" };
      onUpdateSession(updatedSession);
      toast({ title: "Session updated" });
    } catch (e: any) {
      toast({
        title: "Failed to update session",
        description: e.message || "Try again.",
        variant: "destructive",
      });
    }
  }

  async function addTag(sessionId: string, tag: string) {
    try {
      // Check if ticket exists
      const { data: existingTicket } = await supabase
        .from('tickets')
        .select('tags, sessionId')
        .eq('sessionId', sessionId)
        .single();

      const newTags = [...(existingTicket?.tags || []), tag];
      
      if (existingTicket) {
        // Update existing ticket
        const { error } = await supabase
          .from('tickets')
          .update({ 
            tags: newTags,
            updatedAt: new Date().toISOString()
          })
          .eq('sessionId', sessionId);

        if (error) throw error;
      } else {
        // Create new ticket with tags
        const { error } = await supabase
          .from('tickets')
          .insert({
            sessionId: sessionId,
            isActive: true,
            userId: session.userEmail,
            userName: session.userName,
            tags: newTags,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });

        if (error) throw error;
      }

      const updatedSession = { ...session, tags: newTags, status: "active" };
      onUpdateSession(updatedSession);
      toast({ title: "Tag added" });
    } catch (e: any) {
      toast({
        title: "Failed to add tag",
        description: e.message || "Try again.",
        variant: "destructive",
      });
    }
  }

  async function removeTag(sessionId: string, tag: string) {
    try {
      const { data: ticket, error: fetchError } = await supabase
        .from('tickets')
        .select('tags')
        .eq('sessionId', sessionId)
        .single();

      if (fetchError) throw fetchError;

      const newTags = (ticket.tags || []).filter(t => t !== tag);
      const { error } = await supabase
        .from('tickets')
        .update({ 
          tags: newTags,
          updatedAt: new Date().toISOString()
        })
        .eq('sessionId', sessionId);

      if (error) throw error;

      const updatedSession = { ...session, tags: newTags };
      onUpdateSession(updatedSession);
      toast({ title: "Tag removed" });
    } catch (e: any) {
      toast({
        title: "Failed to remove tag",
        description: e.message || "Try again.",
        variant: "destructive",
      });
    }
  }

  function exportTranscript() {
    const lines = [
      `Session: ${session.title}`,
      `Status: ${session.status}`,
      `Priority: ${session.priority}`,
      `Assignee: ${session.assignee || "-"}`,
      `User: ${session.userName || "-"} <${session.userEmail || "-"}>`,
      `Created: ${formatTime(session.createdAt)}`,
      `Updated: ${formatTime(session.updatedAt)}`,
      `Closed: ${formatTime(session.closedAt)}`,
      "",
      "Transcript:",
      ...session.messages.map((m) => `[${new Date(m.createdAt).toISOString()}] ${m.role.toUpperCase()}: ${m.content}`),
    ].join("\n");
    const blob = new Blob([lines], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `session-${session.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-balance">{session.title || "Session"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <div className="flex items-center gap-2">
                <StatusBadge status={session.status} />
                {session.status === "active" ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setSessionStatus(session.id, "resolved")}
                    aria-label="Close session"
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Close
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setSessionStatus(session.id, "active")}
                    aria-label="Reopen session"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reopen
                  </Button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Priority</span>
              <Select
                value={session.priority}
                onValueChange={(v: any) => updateSessionMeta(session.id, { priority: v })}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Assign Agent</span>
              <div className="flex gap-2">
                <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select agent" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Unassigned</SelectItem>
                    {availableAgents.map((agent) => (
                      <SelectItem key={agent.user_id} value={agent.user_id}>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span>{agent.name}</span>
                          <Badge variant="outline" className="ml-2">
                            {agent.current_sessions.length}/{agent.max_sessions}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  onClick={() => assignAgent(session.id, selectedAgent)}
                  disabled={!selectedAgent}
                  className="cursor-pointer"
                >
                  <UserCheck className="mr-2 h-4 w-4" />
                  Assign
                </Button>
              </div>
            </div>

            {session.assignee && (
              <div className="flex items-center justify-between p-2 bg-muted rounded">
                <span className="text-sm text-muted-foreground">Assigned to:</span>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {session.assigneeName || session.assignee}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <span className="text-sm text-muted-foreground">User</span>
              <div className="grid grid-cols-1 gap-2">
                <Input
                  value={userName}
                  placeholder="User name"
                  onChange={(e) => setUserName(e.target.value)}
                />
                <div className="flex gap-2">
                  <Input
                    value={userEmail}
                    placeholder="user@example.com"
                    onChange={(e) => setUserEmail(e.target.value)}
                  />
                  <Button asChild variant="secondary" aria-label="Contact user">
                    <a
                      href={userEmail ? `mailto:${userEmail}` : "#"}
                      onClick={(e) => !userEmail && e.preventDefault()}
                    >
                      <Mail className="mr-2 h-4 w-4" />
                      Email
                    </a>
                  </Button>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    updateSessionMeta(session.id, { userEmail: userEmail || null, userName: userName || null });
                  }}
                >
                  Save user
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-sm text-muted-foreground">Tags</span>
              <div className="flex flex-wrap gap-2">
                {session.tags.map((t) => (
                  <Badge key={t} variant="outline" className="gap-2">
                    {t}
                    <button
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => removeTag(session.id, t)}
                      aria-label={`Remove tag ${t}`}
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  placeholder="Add tag"
                  onChange={(e) => setNewTag(e.target.value)}
                />
                <Button
                  size="sm"
                  onClick={() => {
                    const tag = newTag.trim();
                    if (!tag) return;
                    addTag(session.id, tag);
                    setNewTag("");
                  }}
                >
                  Add
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Transcript</span>
              <Button
                size="sm"
                variant="secondary"
                onClick={exportTranscript}
                aria-label="Export transcript"
              >
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>

            <div className="grid gap-1 text-sm">
              <div className="text-muted-foreground">Created</div>
              <div>{formatTime(session.createdAt)}</div>
              <div className="text-muted-foreground">Updated</div>
              <div>{formatTime(session.updatedAt)}</div>
              {session.closedAt ? (
                <>
                  <div className="text-muted-foreground">Closed</div>
                  <div>{formatTime(session.closedAt)}</div>
                </>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col rounded-md border p-4">
            <div className="mb-4 text-sm font-medium">Messages ({session.messages.length})</div>
            <div className="flex-1 space-y-4 overflow-auto max-h-[500px] pr-2">
              {session.messages.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-8">No messages found.</div>
              ) : (
                session.messages.map((m) => <MessageBubble key={m.id} message={m} />)
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SessionsTable({
  sessions,
  onOpenSession,
  onDeleteSession,
  onUpdateSession,
}: {
  sessions: ChatSession[];
  onOpenSession: (s: ChatSession) => void;
  onDeleteSession: (sessionId: string) => void;
  onUpdateSession: (updatedSession: ChatSession) => void;
}) {
  const { toast } = useToast();

  async function setSessionStatus(sessionId: string, status: ChatSession["status"]) {
    try {
      if (status === "active") {
        // Create or update ticket in Supabase
        const { data, error } = await supabase
          .from('tickets')
          .upsert({
            sessionId: sessionId,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }, {
            onConflict: 'sessionId',
            ignoreDuplicates: false
          });

        if (error) throw error;
      } else {
        // Mark as resolved in Supabase
        const { data, error } = await supabase
          .from('tickets')
          .update({ 
            isActive: false,
            updatedAt: new Date().toISOString()
          })
          .eq('sessionId', sessionId);

        if (error) throw error;
      }

      // Update local state
      const updatedSession = sessions.find(s => s.id === sessionId);
      if (updatedSession) {
        onUpdateSession({
          ...updatedSession,
          status,
          closedAt: status === "resolved" ? Date.now() : null
        });
      }
      
      toast({ title: `Session ${status === "active" ? "reopened" : "closed"}` });
    } catch (e: any) {
      console.error("Update status error:", e.message);
      toast({
        title: "Failed to update status",
        description: e.message || "Try again.",
        variant: "destructive",
      });
    }
  }

  async function deleteChat(sessionId: string) {
    try {
      // Delete from Supabase if exists
      const { error } = await supabase
        .from('tickets')
        .delete()
        .eq('sessionId', sessionId);

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "not found"

      onDeleteSession(sessionId);
      toast({ title: "Session deleted" });
    } catch (e: any) {
      console.error("Delete session error:", e.message);
      toast({
        title: "Failed to delete session",
        description: e.message || "Try again.",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>User</TableHead>
            <TableHead>Messages</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Assignee</TableHead>
            <TableHead>Tags</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-0">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sessions.map((s) => (
            <TableRow key={s.id}>
              <TableCell className="font-medium">{s.title || "Untitled"}</TableCell>
              <TableCell className="text-sm">
                {s.userName || "-"}
                <div className="text-muted-foreground">{s.userEmail || "-"}</div>
              </TableCell>
              <TableCell>{s.messages.length}</TableCell>
              <TableCell className="text-sm">{formatTime(s.updatedAt)}</TableCell>
              <TableCell>
                <PriorityBadge priority={s.priority} />
              </TableCell>
              <TableCell className="text-sm">{s.assigneeName || s.assignee || "-"}</TableCell>
              <TableCell className="max-w-48">
                <div className="flex flex-wrap gap-1">
                  {s.tags.slice(0, 4).map((t) => (
                    <Badge key={t} variant="outline">
                      {t}
                    </Badge>
                  ))}
                  {s.tags.length > 4 ? (
                    <span className="text-xs text-muted-foreground">+{s.tags.length - 4}</span>
                  ) : null}
                </div>
              </TableCell>
              <TableCell>
                <StatusBadge status={s.status} />
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => onOpenSession(s)} aria-label="View session">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="ghost" aria-label="More actions">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {s.status === "active" ? (
                        <DropdownMenuItem onClick={() => setSessionStatus(s.id, "resolved")}>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Close session
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => setSessionStatus(s.id, "active")}>
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Reopen session
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem asChild>
                        <a
                          href={s.userEmail ? `mailto:${s.userEmail}` : "#"}
                          onClick={(e) => !s.userEmail && e.preventDefault()}
                        >
                          <Mail className="mr-2 h-4 w-4" />
                          Contact user
                        </a>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => deleteChat(s.id)}>
                        <XCircle className="mr-2 h-4 w-4" />
                        Delete session
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {sessions.length === 0 && (
            <TableRow>
              <TableCell colSpan={9} className="text-center text-muted-foreground">
                No sessions.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export default function AdminPage() {
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tab, setTab] = useState<"active" | "resolved" | "users">("active");
  const [query, setQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<"all" | "low" | "medium" | "high">("all");
  const [selected, setSelected] = useState<ChatSession | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchAllData() {
      try {
        setLoading(true);
        
        // Fetch agents
        const agentsRes = await fetch('http://localhost:5001/admin/agents', {
          method: "GET",
          credentials: "include",
        });

        if (agentsRes.ok) {
          const agentsData = await agentsRes.json();
          setAgents(agentsData.agents || []);
        }

        // Fetch all tickets from Supabase
        const { data: tickets, error: ticketsError } = await supabase
          .from('tickets')
          .select('*');

        if (ticketsError) throw ticketsError;

        // Create a map of active session IDs from Supabase
        const activeTicketSessionIds = new Set(
          tickets?.filter(ticket => ticket.isActive).map(ticket => ticket.sessionId) || []
        );

        // Fetch all sessions from MongoDB
        const res = await fetch(`http://localhost:5001/admin/sessions`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to fetch sessions");
        }

        const data = await res.json();
        const mongoSessions = data.sessions || [];

        // Fetch messages for all sessions
        const sessionsWithMessages = await Promise.all(
          mongoSessions.map(async (session: any) => {
            const sessionId = session.session_id;
            
            // Fetch messages for this session using message_ids
            const messagePromises = (session.message_ids || []).map(async (messageId: string) => {
              try {
                const messageRes = await fetch(`http://localhost:5001/admin/message/${messageId}`, {
                  method: "GET",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  credentials: "include",
                });
                
                if (messageRes.ok) {
                  return await messageRes.json();
                }
                return null;
              } catch (error) {
                console.error(`Failed to fetch message ${messageId}:`, error);
                return null;
              }
            });

            const messagesData = (await Promise.all(messagePromises)).filter(Boolean);
            
            // Process messages
            const messages = messagesData
              .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
              .flatMap((m: any) => {
                const messages = [];
                
                // Add user message
                if (m.user_message) {
                  messages.push({
                    id: m.message_id,
                    role: "user" as const,
                    content: m.user_message,
                    createdAt: new Date(m.timestamp).getTime(),
                  });
                }
                
                // Add assistant response
                if (m.response) {
                  messages.push({
                    id: m.message_id + "-response",
                    role: "assistant" as const,
                    content: m.response,
                    createdAt: new Date(m.timestamp).getTime(),
                  });
                }
                
                return messages;
              });

            // Determine title from first message
            const firstMessage = messagesData[0];
            const title = firstMessage?.user_message 
              ? (firstMessage.user_message.substring(0, 50) + (firstMessage.user_message.length > 50 ? "..." : ""))
              : "Untitled Session";

            // Determine status: active only if in Supabase with isActive: true
            const isActive = activeTicketSessionIds.has(sessionId);
            const supabaseTicket = tickets?.find(t => t.sessionId === sessionId);
            const assignedAgent = agents.find(a => a.user_id === supabaseTicket?.escalatedTo); // Fixed this line
            
            return {
              id: sessionId,
              title,
              status: isActive ? "active" : "resolved",
              priority: supabaseTicket?.priority || "low",
              assignee: supabaseTicket?.escalatedTo || null,
              assigneeName: assignedAgent?.name || null, // Fixed this line
              userName: supabaseTicket?.userName || session.user_id || null,
              userEmail: supabaseTicket?.userId || session.user_id || null,
              tags: supabaseTicket?.tags || [],
              messages,
              createdAt: new Date(session.last_updated).getTime(),
              updatedAt: new Date(session.last_updated).getTime(),
              closedAt: isActive ? null : new Date(session.last_updated).getTime(),
            };
          })
        );

        setChats(sessionsWithMessages);
      } catch (e: any) {
        console.error("Fetch sessions error:", e.message);
        toast({
          title: "Failed to fetch sessions",
          description: e.message || "Try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    fetchAllData();
  }, [toast]);

  const stats = useMemo(() => {
    const total = chats.length;
    const active = chats.filter((c) => c.status === "active").length;
    const resolved = chats.filter((c) => c.status === "resolved").length;
    const users = new Set(chats.map((c) => c.userEmail).filter(Boolean)).size;
    return { total, active, resolved, users };
  }, [chats]);

  const filtered = useMemo(() => {
    const list = tab === "users" ? chats : chats.filter((c) => c.status === tab);
    const q = query.trim().toLowerCase();
    const byQuery = q
      ? list.filter(
          (c) =>
            c.title.toLowerCase().includes(q) ||
            (c.userEmail || "").toLowerCase().includes(q) ||
            (c.userName || "").toLowerCase().includes(q) ||
            c.tags.some((t) => t.toLowerCase().includes(q))
        )
      : list;
    const byPriority = priorityFilter === "all" ? byQuery : byQuery.filter((c) => c.priority === priorityFilter);
    return byPriority.sort((a, b) => b.updatedAt - a.updatedAt);
  }, [chats, tab, query, priorityFilter]);

  const usersList = useMemo(() => {
    const map = new Map<
      string,
      { userEmail: string; userName: string | null; active: number; resolved: number; total: number }
    >();
    chats.forEach((c) => {
      if (!c.userEmail) return;
      const key = c.userEmail;
      const item = map.get(key) || { userEmail: key, userName: c.userName, active: 0, resolved: 0, total: 0 };
      item.total += 1;
      if (c.status === "active") item.active += 1;
      else item.resolved += 1;
      item.userName = item.userName || c.userName;
      map.set(key, item);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [chats]);

  function onUpdateSession(updatedSession: ChatSession) {
    setChats((prev) =>
      prev.map((s) => (s.id === updatedSession.id ? { ...s, ...updatedSession } : s))
    );
  }

  function onDeleteSession(sessionId: string) {
    setChats((prev) => prev.filter((s) => s.id !== sessionId));
    if (selected?.id === sessionId) {
      setSelected(null);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl p-4 md:p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading sessions...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-balance">Admin Dashboard</h1>
        <Button asChild variant="secondary">
          <Link href="/">Back to chat</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Sessions</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{stats.total}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Active</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{stats.active}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Resolved</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{stats.resolved}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Users</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{stats.users}</CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={(v: any) => setTab(v)} className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">Active Sessions ({stats.active})</TabsTrigger>
          <TabsTrigger value="resolved">Resolved Sessions ({stats.resolved})</TabsTrigger>
          <TabsTrigger value="users">Users ({stats.users})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 items-center gap-2">
              <Input
                placeholder="Search title, user, tag..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <Select value={priorityFilter} onValueChange={(v: any) => setPriorityFilter(v)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All priorities</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <SessionsTable
            sessions={filtered}
            onOpenSession={(s) => setSelected(s)}
            onDeleteSession={onDeleteSession}
            onUpdateSession={onUpdateSession}
          />
        </TabsContent>

        <TabsContent value="resolved" className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 items-center gap-2">
              <Input
                placeholder="Search title, user, tag..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <Select value={priorityFilter} onValueChange={(v: any) => setPriorityFilter(v)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All priorities</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <SessionsTable
            sessions={filtered}
            onOpenSession={(s) => setSelected(s)}
            onDeleteSession={onDeleteSession}
            onUpdateSession={onUpdateSession}
          />
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Resolved</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead className="w-0">Contact</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersList.map((u) => (
                  <TableRow key={u.userEmail}>
                    <TableCell className="font-medium">{u.userName || "-"}</TableCell>
                    <TableCell>{u.userEmail}</TableCell>
                    <TableCell>{u.active}</TableCell>
                    <TableCell>{u.resolved}</TableCell>
                    <TableCell>{u.total}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="secondary" aria-label="Email user">
                        <a href={`mailto:${u.userEmail}`}>
                          <Mail className="mr-2 h-4 w-4" />
                          Email
                        </a>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {usersList.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No users found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {selected && (
        <SessionDetails
          open={!!selected}
          onOpenChange={(v) => !v && setSelected(null)}
          session={selected}
          onUpdateSession={onUpdateSession}
          agents={agents}
        />
      )}
    </main>
  );
}