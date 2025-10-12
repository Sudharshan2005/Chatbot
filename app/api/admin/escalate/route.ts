import { NextRequest, NextResponse } from "next/server";
import { ChatMessage } from "@/models/ChatMessage";
import { connectDB } from "@/lib/mongoose";

export async function PATCH(req: NextRequest) {
  try {
    await connectDB();

    const { userId, sessionId } = req.body;
    if (!sessionId) {
      return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
    }

    const updatedChat = await ChatMessage.findAndUpdate(
      { session_id: sessionId, user_id: userId },
      {
        $setOnInsert: { ticket: { escalated: true }, user_id: userId },
        $set: { ticket: { escalated: true } },
      },
      { upsert: true, new: true }
    );
    if (!updatedChat) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ updatedChat }, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching user:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
