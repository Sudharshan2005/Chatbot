// lib/store/auth-store.ts
"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AuthState, User } from "@/lib/types";

type AuthActions = {
  login: (email: string, password: string) => Promise<void>;
  // fetchProfile: () => Promise<void>;
  // updateProfile: (patch: Partial<User>) => Promise<void>;
  logout: () => void;
};

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      login: async (email, password) => {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || "Login failed");
        }
        const data = await res.json();
        localStorage.setItem("support-chat-token", data.token);
        set({ user: data.user, token: data.token });
      },
      // fetchProfile: async () => {
      //   try {
      //     const token = localStorage.getItem("support-chat-user");
      //     if (!token) throw new Error("No token available");
      //     const userData = JSON.parse(token);
      //     console.log("Data", userData);
      //     const res = await fetch(`api/user/user_id=${userData.user.email}`, {
      //       method: "GET",
      //       headers: {
      //         "Content-Type": "application/json",
      //       },
      //     });
      //     if (!res.ok) {
      //       const err = await res.json().catch(() => ({}));
      //       throw new Error(err.message || "Failed to fetch profile");
      //     }
      //     const { user } = await res.json();
      //     set({ user, token });
      //   } catch (e: any) {
      //     console.error("Fetch profile error:", e.message);
      //     localStorage.removeItem("support-chat-token");
      //     set({ user: null, token: null });
      //   }
      // },
      // updateProfile: async (patch) => {
      //   const token = localStorage.getItem("support-chat-token");
      //   if (!token) throw new Error("No token available");
      //   const res = await fetch("/api/user", {
      //     method: "PATCH",
      //     headers: {
      //       "Content-Type": "application/json",
      //       Authorization: `Bearer ${token}`,
      //     },
      //     body: JSON.stringify(patch),
      //   });
      //   if (!res.ok) {
      //     const err = await res.json().catch(() => ({}));
      //     throw new Error(err.message || "Update failed");
      //   }
      //   const { user } = await res.json();
      //   set({ user, token });
      // },
      logout: () => {
        localStorage.removeItem("support-chat-user");
        set({ user: null, token: null });
      },
    }),
    {
      name: "support-chat-auth",
      partialize: (s) => ({ user: s.user }),
    }
  )
);