import { NextResponse } from "next/server"

export async function GET() {
  // In a real app, we'd validate the token and fetch user
  return NextResponse.json({ user: null })
}

export async function PATCH(req: Request) {
  const patch = await req.json().catch(() => ({}))
  // echo updated user back
  const user = {
    id: "demo",
    email: "user@example.com",
    displayName: patch.displayName || "User",
    avatarUrl: patch.avatarUrl || null,
  }
  return NextResponse.json({ user })
}
