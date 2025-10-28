"use client"

import { useAuthStore } from "@/lib/store/auth-store"
import { redirect } from "next/navigation"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"


export default function ProfilePage() {
  const user = useAuthStore((s) => s.user)

  // If user not logged in, redirect to login page
  if (!user) redirect("/login")

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 space-y-6">
      <h2 className="text-xl font-semibold">Your Profile</h2>

      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Avatar className="size-16">
            <AvatarImage
              src={user?.avatarUrl || ""}
              alt={user?.displayName || user.email}
            />
            <AvatarFallback>
              {(user?.displayName || user.email)
                .slice(0, 2)
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-lg font-medium">
              {user?.displayName || "Anonymous User"}
            </h3>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input id="displayName" value={user?.displayName || ""} disabled />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user.email} disabled />
          </div>

          {user?.avatarUrl && (
            <div className="space-y-2">
              <Label htmlFor="avatarUrl">Avatar URL</Label>
              <Input id="avatarUrl" value={user.avatarUrl} disabled />
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
