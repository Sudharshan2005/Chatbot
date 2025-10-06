"use client"

import type React from "react"

import { useState } from "react"
import { useAuthStore } from "@/lib/store/auth-store"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

export default function ProfilePage() {
  const { toast } = useToast()
  const user = useAuthStore((s) => s.user)
  const updateProfile = useAuthStore((s) => s.updateProfile)

  if (!user) redirect("/login")

  const [displayName, setDisplayName] = useState(user?.displayName || "")
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || "")
  const [loading, setLoading] = useState(false)

  async function onSave(e: React.FormEvent) {
    e.preventDefault()
    try {
      setLoading(true)
      await updateProfile({ displayName, avatarUrl })
      toast({ title: "Profile updated" })
    } catch (e: any) {
      toast({ title: "Update failed", description: e.message || "Try again.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 space-y-6">
      <h2 className="text-xl font-semibold">Your Profile</h2>
      <form onSubmit={onSave} className="space-y-4">
        <div className="flex items-center gap-4">
          <Avatar className="size-16">
            <AvatarImage src={avatarUrl || ""} alt={displayName || user!.email} />
            <AvatarFallback>{(displayName || user!.email).slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <Label htmlFor="avatarUrl">Avatar URL</Label>
            <Input
              id="avatarUrl"
              placeholder="https://..."
              value={avatarUrl || ""}
              onChange={(e) => setAvatarUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Use any image URL as a placeholder.</p>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="displayName">Display name</Label>
          <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={user!.email} disabled />
        </div>
        <Button disabled={loading}>{loading ? "Saving..." : "Save changes"}</Button>
      </form>
    </main>
  )
}
