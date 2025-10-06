import { NextResponse } from "next/server"

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const message: string | undefined = body?.message
  if (!message) {
    return NextResponse.json({ message: "Missing message" }, { status: 400 })
  }
  // Simulate thinking delay
  await sleep(900 + Math.random() * 900)
  const reply =
    "Thanks for reaching out! Here’s what I found about: " +
    message.slice(0, 120) +
    ". If you need more details, just ask another question."

  return NextResponse.json({ reply })
}
