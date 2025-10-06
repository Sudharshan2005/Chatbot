"use client"

import type React from "react"

export default function TypingIndicator() {
  return (
    <div className="flex items-center gap-2">
      <div className="size-7 rounded-full bg-muted grid place-items-center">
        <span className="sr-only">Assistant typing</span>
        <div className="flex gap-0.5">
          <Dot />
          <Dot style={{ animationDelay: "100ms" }} />
          <Dot style={{ animationDelay: "200ms" }} />
        </div>
      </div>
      <div className="h-7 w-40 rounded-md bg-muted animate-pulse" />
    </div>
  )
}

function Dot(props: React.HTMLAttributes<HTMLSpanElement>) {
  return <span {...props} className="size-1.5 rounded-full bg-foreground/60 animate-bounce [animation-duration:1.1s]" />
}
