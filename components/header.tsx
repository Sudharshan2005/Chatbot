"use client"

import Link from "next/link"
import { ThemeToggle } from "./theme-toggle"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuthStore } from "@/lib/store/auth-store"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"

interface User {
  id: string;
  name: string;
  email: string;
  initials: string;
}

export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
      const fetchProfile = async () => {
        const userData = localStorage.getItem("support-chat-user");
        console.log("Fetching user from localStorage:", userData);
        if (!userData) {
          console.log("No user data in localStorage");
          return;
        }
  
        const storedUser = JSON.parse(userData);
        const userEmailData = storedUser.user;
        try {
          const res = await fetch(`/api/user?user_id=${userEmailData.email}`);
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || "Failed to fetch profile");
          }
          const { user } = await res.json();
          console.log("Fetched user from API:", user);
          setUser(user);
          localStorage.setItem("support-chat-user", JSON.stringify(user));
          console.log("Updated localStorage with user:", localStorage.getItem("support-chat-user"));
        } catch (e: any) {
          console.error("Fetch profile error:", e.message);
          // Do not clear localStorage here to prevent accidental data loss
          setUser(null);
        }
      };
  
      if (!user) fetchProfile();
    }, [user]);
  const logout = useAuthStore((s) => s.logout)

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-7 rounded-md bg-primary" aria-hidden />
          <h1 className="text-sm md:text-base font-medium text-pretty">Gemini Support</h1>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <div className="flex items-center gap-2">
              <Link href="/profile" className="flex items-center gap-2">
                <Avatar className="size-8">
                  <AvatarImage src={user.email} />
                  <AvatarFallback>{(user.name|| "U").slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
              </Link>
              <Button variant="secondary" size="sm" onClick={logout}>
                Logout
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Log in
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="sm">Sign up</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
