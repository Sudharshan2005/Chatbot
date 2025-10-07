"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useChatStore } from "@/lib/store/chat-store"
import type { ChatSession } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import MessageBubble from "@/components/chat/message-bubble"
import { useToast } from "@/hooks/use-toast"
import { Mail, Eye, MoreHorizontal, CheckCircle2, RotateCcw, XCircle, Download } from "lucide-react"
import { cn } from "@/lib/utils"

function StatusBadge({ status }: { status: ChatSession["status"] }) {
  return (
    <Badge variant={status === "active" ? "default" : "secondary"}>{status === "active" ? "Active" : "Resolved"}</Badge>
  )
}

function PriorityBadge({ priority }: { priority: ChatSession["priority"] }) {
  const tone =
    priority === "high"
      ? "bg-destructive text-destructive-foreground"
      : priority === "medium"
        ? "bg-primary text-primary-foreground"
        : "bg-muted text-muted-foreground"
  return <Badge className={cn(tone, "capitalize")}>{priority}</Badge>
}

function formatTime(ts?: number | null) {
  if (!ts) return "-"
  const d = new Date(ts)
  return d.toLocaleString()
}

function SessionDetails({
  open,
  onOpenChange,
  session,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  session: ChatSession
}) {
  const { toast } = useToast()
  const setStatus = useChatStore((s) => s.setSessionStatus)
  const updateMeta = useChatStore((s) => s.updateSessionMeta)
  const addTag = useChatStore((s) => s.addTag)
  const removeTag = useChatStore((s) => s.removeTag)
  const [assignee, setAssignee] = useState(session.assignee ?? "")
  const [userEmail, setUserEmail] = useState(session.userEmail ?? "")
  const [userName, setUserName] = useState(session.userName ?? "")
  const [newTag, setNewTag] = useState("")

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
    ].join("\n")
    const blob = new Blob([lines], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `session-${session.id}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-balance">{session.title || "Session"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <div className="flex items-center gap-2">
                <StatusBadge status={session.status} />
                {session.status === "active" ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setStatus(session.id, "resolved")}
                    aria-label="Close session"
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Close
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setStatus(session.id, "active")}
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
              <Select value={session.priority} onValueChange={(v: any) => updateMeta(session.id, { priority: v })}>
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
              <span className="text-sm text-muted-foreground">Assignee</span>
              <div className="flex gap-2">
                <Input
                  value={assignee}
                  placeholder="Agent name"
                  onChange={(e) => setAssignee(e.target.value)}
                  className="w-40"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    updateMeta(session.id, { assignee: assignee || null })
                    toast({ title: "Assignee updated" })
                  }}
                >
                  Save
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-sm text-muted-foreground">User</span>
              <div className="grid grid-cols-1 gap-2">
                <Input value={userName} placeholder="User name" onChange={(e) => setUserName(e.target.value)} />
                <div className="flex gap-2">
                  <Input
                    value={userEmail}
                    placeholder="user@example.com"
                    onChange={(e) => setUserEmail(e.target.value)}
                  />
                  <Button asChild variant="secondary" aria-label="Contact user">
                    <a href={userEmail ? `mailto:${userEmail}` : "#"} onClick={(e) => !userEmail && e.preventDefault()}>
                      <Mail className="mr-2 h-4 w-4" />
                      Email
                    </a>
                  </Button>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    updateMeta(session.id, { userEmail: userEmail || null, userName: userName || null })
                    toast({ title: "User info saved" })
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
                <Input value={newTag} placeholder="Add tag" onChange={(e) => setNewTag(e.target.value)} />
                <Button
                  size="sm"
                  onClick={() => {
                    const tag = newTag.trim()
                    if (!tag) return
                    addTag(session.id, tag)
                    setNewTag("")
                  }}
                >
                  Add
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Transcript</span>
              <Button size="sm" variant="secondary" onClick={exportTranscript} aria-label="Export transcript">
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

          <div className="flex min-h-64 flex-col rounded-md border p-3">
            <div className="mb-2 text-sm font-medium">Messages</div>
            <div className="flex-1 space-y-3 overflow-auto pr-1">
              {session.messages.length === 0 ? (
                <div className="text-sm text-muted-foreground">No messages yet.</div>
              ) : (
                session.messages.map((m) => <MessageBubble key={m.id} message={m} />)
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function SessionsTable({
  sessions,
  onOpenSession,
}: {
  sessions: ChatSession[]
  onOpenSession: (s: ChatSession) => void
}) {
  const setStatus = useChatStore((s) => s.setSessionStatus)
  const deleteChat = useChatStore((s) => s.deleteChat)

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
              <TableCell className="text-sm">{s.assignee || "-"}</TableCell>
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
                        <DropdownMenuItem onClick={() => setStatus(s.id, "resolved")}>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Close session
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => setStatus(s.id, "active")}>
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
              <TableCell colSpan={8} className="text-center text-muted-foreground">
                No sessions.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}

export default function AdminPage() {
  const chats = useChatStore((s) => s.chats)
  const [tab, setTab] = useState<"active" | "resolved">("active")
  const [query, setQuery] = useState("")
  const [priorityFilter, setPriorityFilter] = useState<"all" | "low" | "medium" | "high">("all")
  const [selected, setSelected] = useState<ChatSession | null>(null)

  const stats = useMemo(() => {
    const total = chats.length
    const active = chats.filter((c) => c.status === "active").length
    const resolved = chats.filter((c) => c.status === "resolved").length
    const users = new Set(chats.map((c) => c.userEmail || "unknown")).size
    return { total, active, resolved, users }
  }, [chats])

  const filtered = useMemo(() => {
    const list = chats.filter((c) => c.status === tab)
    const q = query.trim().toLowerCase()
    const byQuery = q
      ? list.filter(
          (c) =>
            c.title.toLowerCase().includes(q) ||
            (c.userEmail || "").toLowerCase().includes(q) ||
            (c.userName || "").toLowerCase().includes(q) ||
            c.tags.some((t) => t.toLowerCase().includes(q)),
        )
      : list
    const byPriority = priorityFilter === "all" ? byQuery : byQuery.filter((c) => c.priority === priorityFilter)
    return byPriority.sort((a, b) => b.updatedAt - a.updatedAt)
  }, [chats, tab, query, priorityFilter])

  const usersList = useMemo(() => {
    const map = new Map<
      string,
      { userEmail: string; userName: string | null; active: number; resolved: number; total: number }
    >()
    chats.forEach((c) => {
      const key = c.userEmail || "unknown"
      const item = map.get(key) || { userEmail: key, userName: c.userName || null, active: 0, resolved: 0, total: 0 }
      item.total += 1
      if (c.status === "active") item.active += 1
      else item.resolved += 1
      item.userName = item.userName || c.userName || null
      map.set(key, item)
    })
    return Array.from(map.values()).sort((a, b) => b.total - a.total)
  }, [chats])

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
          <TabsTrigger value="active">Active Sessions</TabsTrigger>
          <TabsTrigger value="resolved">Resolved Sessions</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
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
          <SessionsTable sessions={filtered} onOpenSession={(s) => setSelected(s)} />
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
          <SessionsTable sessions={filtered} onOpenSession={(s) => setSelected(s)} />
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
                        <a href={u.userEmail !== "unknown" ? `mailto:${u.userEmail}` : "#"}>
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
        <SessionDetails open={!!selected} onOpenChange={(v) => !v && setSelected(null)} session={selected} />
      )}
    </main>
  )
}
