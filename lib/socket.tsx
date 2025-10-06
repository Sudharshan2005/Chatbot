"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { io, Socket } from "socket.io-client"
import { useChatStore } from "./store/chat-store"

type SocketContextType = Socket | null

const SocketContext = createContext<SocketContextType>(null)

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const addBotMessage = useChatStore((s) => s.commitBotMessage)

  useEffect(() => {
    const s = io("http://localhost:5001")
    setSocket(s)

    s.on("connect", () => {
      console.log("Connected to SocketIO:", s.id)
    })

    s.on("message:ack", (data: any) => {
      // Bot response from server
      addBotMessage(data.response)
    })

    return () => {
      s.disconnect()
    }
  }, [addBotMessage])

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
}

export function useSocket() {
  return useContext(SocketContext)
}
