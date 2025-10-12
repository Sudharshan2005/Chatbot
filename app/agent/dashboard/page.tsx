"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import type { ChatSession, ChatMessage, RawMessage } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Mail, Eye, CheckCircle2, RotateCcw, Download, User, Send } from "lucide-react";
import { createClient } from '@supabase/supabase-js';
import { cn } from "@/lib/utils";
import { io, Socket } from "socket.io-client";

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

// Helper function to convert raw messages to ChatMessage format
function processRawMessages(rawMessages: RawMessage[]): ChatMessage[] {
  const messages: ChatMessage[] = [];
  
  rawMessages.forEach((msg) => {
    // Handle new format: user_message and response in same document
    if (msg.user_message !== undefined) {
      // Always show user message
      messages.push({
        id: msg.message_id,
        role: "user" as const,
        content: msg.user_message,
        createdAt: new Date(msg.timestamp).getTime(),
        isAgent: false,
        user_message: msg.user_message,
        response: msg.response,
        waitingForResponse: !msg.response // Show waiting only if no response
      });

      // Show agent response if it exists
      if (msg.response) {
        messages.push({
          id: `${msg.message_id}-response`,
          role: "assistant" as const,
          content: msg.response,
          createdAt: new Date(msg.timestamp).getTime(),
          isAgent: true,
          user_message: msg.user_message
        });
      }
    }
    // Handle legacy format
    else if (msg.content && msg.role) {
      messages.push({
        id: msg.message_id || msg._id || `msg-${Date.now()}`,
        role: msg.role,
        content: msg.content,
        createdAt: msg.createdAt || new Date(msg.timestamp).getTime(),
        isAgent: msg.isAgent || msg.role === 'assistant'
      });
    }
  });
  
  // Sort by timestamp
  return messages.sort((a, b) => a.createdAt - b.createdAt);
}

function AgentChatInterface({ 
  session, 
  agentId,
  onNewMessage 
}: { 
  session: ChatSession;
  agentId: string;
  onNewMessage: (message: ChatMessage) => void;
}) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [session.messages]);

  // Process messages to handle the new data structure
  const processedMessages = useMemo(() => {
    return processRawMessages(session.messages);
  }, [session.messages]);

  // Check if there are any user messages waiting for response
  const hasPendingMessages = useMemo(() => {
    return processedMessages.some(msg => 
      msg.role === "user" && !msg.response && msg.waitingForResponse
    );
  }, [processedMessages]);

  const sendMessage = async () => {
    if (!message.trim() || isSending || !hasPendingMessages) return;

    setIsSending(true);
    try {
      const response = await fetch('http://localhost:5001/agent/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          agent_id: agentId,
          session_id: session.id,
          message: message.trim()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }

      const data = await response.json();
      
      // Create a temporary message for immediate UI update
      const tempMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        role: "assistant",
        content: message.trim(),
        createdAt: Date.now(),
        isAgent: true,
        isTemporary: true
      };

      onNewMessage(tempMessage);
      setMessage("");
      
      toast({
        title: "Message sent",
        description: "Your response has been delivered to the user.",
      });

    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: "Failed to send message",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-4 overflow-auto max-h-[400px] p-4 border rounded-lg">
        {processedMessages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No messages yet. Start the conversation!
          </div>
        ) : (
          processedMessages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex",
                msg.role === "user" ? "justify-start" : "justify-end"
              )}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-lg px-4 py-2",
                  msg.role === "user"
                    ? msg.waitingForResponse 
                      ? "bg-yellow-100 border border-yellow-300 text-yellow-900" 
                      : "bg-muted text-foreground"
                    : msg.isTemporary
                    ? "bg-primary/70 text-primary-foreground"
                    : "bg-primary text-primary-foreground"
                )}
              >
                <div className="text-sm">{msg.content}</div>
                <div className={cn(
                  "text-xs mt-1 flex items-center gap-2",
                  msg.role === "user" 
                    ? msg.waitingForResponse 
                      ? "text-yellow-700" 
                      : "text-muted-foreground"
                    : "text-primary-foreground/70"
                )}>
                  <span>
                    {msg.role === "user" ? "User" : "You"} • {formatTime(msg.createdAt)}
                  </span>
                  {msg.waitingForResponse && (
                    <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-800">
                      Waiting for response
                    </Badge>
                  )}
                  {msg.isTemporary && (
                    <Badge variant="outline" className="text-xs">
                      Sending...
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="flex gap-2 mt-4">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={
            hasPendingMessages 
              ? "Respond to the user's message..." 
              : "Waiting for user message..."
          }
          disabled={isSending || !hasPendingMessages}
          className="flex-1"
        />
        <Button 
          onClick={sendMessage} 
          disabled={!message.trim() || isSending || !hasPendingMessages}
          size="icon"
          title={!hasPendingMessages ? "No user messages waiting for response" : undefined}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
      
      {!hasPendingMessages && processedMessages.length > 0 && (
        <div className="text-xs text-muted-foreground text-center mt-2">
          All user messages have been responded to. Waiting for new user message...
        </div>
      )}
    </div>
  );
}

export default function AgentDashboard() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [agentId, setAgentId] = useState<string>("");
  const [socket, setSocket] = useState<Socket | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Get agent ID - in real app, this would come from auth context
    const userData = { email: 'agent5@company.com' };
    if (userData) {
      setAgentId(userData.email);
    }

    fetchAgentSessions();
  }, []);

  useEffect(() => {
    // Initialize Socket.IO connection
    if (agentId) {
      const newSocket = io('http://localhost:5001', {
        withCredentials: true
      });

      newSocket.on('connect', () => {
        console.log('Socket connected');
        newSocket.emit('agent_join', { agent_id: agentId });
      });

      newSocket.on('new_user_message', (data) => {
        console.log('New user message received:', data);
        handleNewUserMessage(data);
      });

      newSocket.on('agent_message_sent', (data) => {
        console.log('Agent message confirmed:', data);
        handleAgentMessageConfirmed(data);
      });

      newSocket.on('disconnect', () => {
        console.log('Socket disconnected');
      });

      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
      };
    }
  }, [agentId]);

  const handleNewUserMessage = (messageData: any) => {
    console.log('Processing new user message:', messageData);
    
    // Update the specific session with the new message
    setSessions(prev => prev.map(session => {
      if (session.id === messageData.session_id) {
        const updatedMessages = [...session.messages, messageData];
        return {
          ...session,
          messages: updatedMessages,
          updatedAt: Date.now()
        };
      }
      return session;
    }));

    // Update selected session if it's the current one
    if (selectedSession?.id === messageData.session_id) {
      setSelectedSession(prev => prev ? {
        ...prev,
        messages: [...prev.messages, messageData],
        updatedAt: Date.now()
      } : null);
    }

    // Show notification for new message
    if (selectedSession?.id !== messageData.session_id) {
      const sessionTitle = sessions.find(s => s.id === messageData.session_id)?.title || "Unknown session";
      toast({
        title: "New message",
        description: `New message from user in: ${sessionTitle}`,
        action: (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              const session = sessions.find(s => s.id === messageData.session_id);
              if (session) setSelectedSession(session);
            }}
          >
            View
          </Button>
        ),
      });
    }
  };

  const handleAgentMessageConfirmed = (messageData: any) => {
    console.log('Agent message confirmed:', messageData);
    
    // Update the session with the confirmed agent response
    setSessions(prev => prev.map(session => {
      if (session.id === messageData.session_id) {
        // Find and update the message that was responded to
        const updatedMessages = session.messages.map((msg: RawMessage) => 
          msg.message_id === messageData.message_id ? messageData : msg
        );
        
        return {
          ...session,
          messages: updatedMessages,
          updatedAt: Date.now()
        };
      }
      return session;
    }));

    // Update selected session if it's the current one
    if (selectedSession?.id === messageData.session_id) {
      setSelectedSession(prev => prev ? {
        ...prev,
        messages: prev.messages.map((msg: RawMessage) => 
          msg.message_id === messageData.message_id ? messageData : msg
        ),
        updatedAt: Date.now()
      } : null);
    }
  };

  const handleNewAgentMessage = (message: ChatMessage) => {
    // Temporary messages are handled locally in AgentChatInterface
    // We don't need to update the session state here as it will be refreshed
  };

  const fetchSessionMessages = async (sessionId: string) => {
    try {
      const res = await fetch(`http://localhost:5001/agent/sessions?agent_id=${agentId}`, {
        method: "GET",
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        const updatedSessions = data.sessions || [];
        setSessions(updatedSessions);
        
        // Update selected session if it's the current one
        const updatedSession = updatedSessions.find((s: ChatSession) => s.id === sessionId);
        if (updatedSession && selectedSession?.id === sessionId) {
          setSelectedSession(updatedSession);
        }
      }
    } catch (error) {
      console.error('Error fetching session messages:', error);
    }
  };

  async function fetchAgentSessions() {
    try {
      setLoading(true);
      const userData = { email: 'agent5@company.com' };
      if (!userData) return;

      const user = userData;
      
      const res = await fetch(`http://localhost:5001/agent/sessions?agent_id=${user.email}`, {
        method: "GET",
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        console.log("Fetched sessions:", data);
        setSessions(data.sessions || []);
      } else {
        throw new Error('Failed to fetch sessions');
      }
    } catch (error) {
      console.error("Failed to fetch agent sessions:", error);
      toast({
        title: "Failed to load sessions",
        description: "Please check your connection and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function resolveSession(sessionId: string) {
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ 
          isActive: false,
          updatedAt: new Date().toISOString()
        })
        .eq('sessionId', sessionId);

      if (error) throw error;

      await fetch('http://localhost:5001/agent/remove-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id: agentId,
          session_id: sessionId
        })
      });

      setSessions(prev => prev.map(s => 
        s.id === sessionId ? { ...s, status: "resolved" as const } : s
      ));

      if (selectedSession?.id === sessionId) {
        setSelectedSession(prev => prev ? { ...prev, status: "resolved" as const } : null);
      }

      toast({ title: "Session resolved" });
    } catch (error) {
      console.error('Error resolving session:', error);
      toast({
        title: "Failed to resolve session",
        variant: "destructive",
      });
    }
  }

  async function reopenSession(sessionId: string) {
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ 
          isActive: true,
          updatedAt: new Date().toISOString()
        })
        .eq('sessionId', sessionId);

      if (error) throw error;

      await fetch('http://localhost:5001/agent/assign-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id: agentId,
          session_id: sessionId
        })
      });

      setSessions(prev => prev.map(s => 
        s.id === sessionId ? { ...s, status: "active" as const } : s
      ));

      if (selectedSession?.id === sessionId) {
        setSelectedSession(prev => prev ? { ...prev, status: "active" as const } : null);
      }

      toast({ title: "Session reopened" });
    } catch (error) {
      console.error('Error reopening session:', error);
      toast({
        title: "Failed to reopen session",
        variant: "destructive",
      });
    }
  }

  const activeSessions = useMemo(() => 
    sessions.filter(s => s.status === "active"), [sessions]);
  
  const resolvedSessions = useMemo(() => 
    sessions.filter(s => s.status === "resolved"), [sessions]);

  // Process messages for resolved sessions display
  const getResolvedSessionMessages = (session: ChatSession) => {
    return processRawMessages(session.messages);
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading sessions...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Agent Dashboard</h1>
        <div className="flex items-center gap-4">
          <Badge variant="secondary">
            <User className="w-4 h-4 mr-2" />
            {agentId}
          </Badge>
          <Button onClick={fetchAgentSessions} variant="outline">
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Assigned</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{sessions.length}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Active</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{activeSessions.length}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Resolved</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{resolvedSessions.length}</CardContent>
        </Card>
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">Active Sessions ({activeSessions.length})</TabsTrigger>
          <TabsTrigger value="resolved">Resolved Sessions ({resolvedSessions.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead>Messages</TableHead>
                  <TableHead className="w-0">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeSessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell className="font-medium">{session.title}</TableCell>
                    <TableCell>
                      {session.userName || "-"}
                      <div className="text-muted-foreground">{session.userEmail || "-"}</div>
                    </TableCell>
                    <TableCell>
                      <PriorityBadge priority={session.priority} />
                    </TableCell>
                    <TableCell>{formatTime(session.updatedAt)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{session.messages.length}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => setSelectedSession(session)}
                          className="flex items-center gap-1"
                        >
                          <Eye className="h-4 w-4" />
                          Chat
                        </Button>
                        <Button 
                          size="sm" 
                          variant="secondary"
                          onClick={() => resolveSession(session.id)}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {activeSessions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No active sessions assigned to you.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="resolved">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Resolved</TableHead>
                  <TableHead className="w-0">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resolvedSessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell className="font-medium">{session.title}</TableCell>
                    <TableCell>
                      {session.userName || "-"}
                      <div className="text-muted-foreground">{session.userEmail || "-"}</div>
                    </TableCell>
                    <TableCell>
                      <PriorityBadge priority={session.priority} />
                    </TableCell>
                    <TableCell>{formatTime(session.closedAt)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => setSelectedSession(session)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="secondary"
                          onClick={() => reopenSession(session.id)}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {resolvedSessions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No resolved sessions.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {selectedSession && (
        <Dialog open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                Chat with User
                <Badge variant={selectedSession.status === "active" ? "default" : "secondary"}>
                  {selectedSession.status}
                </Badge>
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="space-y-1">
                  <div className="text-muted-foreground">User</div>
                  <div className="font-medium">{selectedSession.userName || "Unknown"}</div>
                  <div className="text-muted-foreground">{selectedSession.userEmail || "No email"}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-muted-foreground">Priority</div>
                  <div><PriorityBadge priority={selectedSession.priority} /></div>
                </div>
                <div className="space-y-1">
                  <div className="text-muted-foreground">Last Updated</div>
                  <div>{formatTime(selectedSession.updatedAt)}</div>
                </div>
              </div>

              {selectedSession.status === "active" ? (
                <AgentChatInterface 
                  session={selectedSession}
                  agentId={agentId}
                  onNewMessage={handleNewAgentMessage}
                />
              ) : (
                <div className="flex flex-col rounded-md border p-4">
                  <div className="mb-4 text-sm font-medium">Chat History (Resolved)</div>
                  <div className="space-y-4 max-h-[400px] overflow-auto">
                    {getResolvedSessionMessages(selectedSession).map((msg) => (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex",
                          msg.role === "user" ? "justify-start" : "justify-end"
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[80%] rounded-lg px-4 py-2",
                            msg.role === "user"
                              ? "bg-muted text-foreground"
                              : "bg-primary text-primary-foreground"
                          )}
                        >
                          <div className="text-sm">{msg.content}</div>
                          <div className={cn(
                            "text-xs mt-1",
                            msg.role === "user" ? "text-muted-foreground" : "text-primary-foreground/70"
                          )}>
                            {msg.role === "user" ? "User" : "Agent"} • {formatTime(msg.createdAt)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedSession.status === "active" && (
                <Button 
                  onClick={() => resolveSession(selectedSession.id)}
                  variant="outline"
                  className="w-full"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Mark as Resolved
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </main>
  );
}