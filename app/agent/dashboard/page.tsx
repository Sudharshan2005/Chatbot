"use client";

import { useMemo, useState, useEffect } from "react";
import type { ChatSession } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import MessageBubble from "@/components/chat/message-bubble";
import { useToast } from "@/hooks/use-toast";
import { Mail, Eye, CheckCircle2, RotateCcw, Download, User } from "lucide-react";
import { createClient } from '@supabase/supabase-js';
import { cn } from "@/lib/utils";

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

export default function AgentDashboard() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [agentId, setAgentId] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    // Get agent ID from localStorage or context
    const userData = { email: 'agent5@company.com' }
    if (userData) {
      const user = userData;
      setAgentId(user.email);
    }

    fetchAgentSessions();
  }, []);

  async function fetchAgentSessions() {
    try {
      setLoading(true);
      const userData = { email: 'agent5@company.com' }
      if (!userData) return;

      const user = userData;
      
      // Fetch sessions assigned to this agent
      const res = await fetch(`http://localhost:5001/agent/sessions?agent_id=${user.email}`, {
        method: "GET",
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        console.log(data)
        setSessions(data.sessions || []);
      }
    } catch (error) {
      console.error("Failed to fetch agent sessions:", error);
      toast({
        title: "Failed to load sessions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function resolveSession(sessionId: string) {
    try {
      // Update Supabase
      const { error } = await supabase
        .from('tickets')
        .update({ 
          isActive: false,
          updatedAt: new Date().toISOString()
        })
        .eq('sessionId', sessionId);

      if (error) throw error;

      // Remove from agent's current_sessions
      await fetch('http://localhost:5001/agent/remove-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id: agentId,
          session_id: sessionId
        })
      });

      // Update local state
      setSessions(prev => prev.map(s => 
        s.id === sessionId ? { ...s, status: "resolved" as const } : s
      ));

      toast({ title: "Session resolved" });
    } catch (error) {
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

      // Add back to agent's current_sessions
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

      toast({ title: "Session reopened" });
    } catch (error) {
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

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>;
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
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => setSelectedSession(session)}>
                          <Eye className="h-4 w-4" />
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
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Session Details Dialog - Similar to admin but without assignment options */}
      {selectedSession && (
        <Dialog open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedSession.title}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <StatusBadge status={selectedSession.status} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Priority</span>
                  <PriorityBadge priority={selectedSession.priority} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">User</span>
                  <div>
                    <div>{selectedSession.userName || "-"}</div>
                    <div className="text-muted-foreground">{selectedSession.userEmail || "-"}</div>
                  </div>
                </div>
                {selectedSession.status === "active" && (
                  <Button 
                    onClick={() => resolveSession(selectedSession.id)}
                    className="w-full"
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Mark as Resolved
                  </Button>
                )}
              </div>
              <div className="flex flex-col rounded-md border p-4">
                <div className="mb-4 text-sm font-medium">Messages</div>
                <div className="space-y-4 max-h-[500px] overflow-auto">
                  {selectedSession.messages.map((m) => (
                    <MessageBubble key={m.id} message={m} />
                  ))}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </main>
  );
}