import Header from "@/components/header"
import Sidebar from "@/components/chat/sidebar"
import ChatWindow from "@/components/chat/chat-window"

export default function Page() {
  return (
    <main className="h-dvh flex">
      <Sidebar />
      <section className="flex-1 flex flex-col">
        <Header />
        <ChatWindow />
      </section>
    </main>
  )
}
