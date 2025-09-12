import { useState, useMemo, useEffect, useRef } from "react";
import { connectSocketWithToken } from "../../../lib/socket";
import supabase from "../../../lib/supabaseClient";
import { useAppStore, useChatStore } from "../../../store/workspace";
import { useAuth } from "../../../hooks/useAuth";
import { Button } from "../../ui/button";
import { Send, Trash2, MessageSquare } from "lucide-react";

export function ChatPane() {
  const { currentRoom } = useAppStore();
  const { user } = useAuth();
  const { messages, sendChat, clearChat } = useChatStore();
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);
  const scrollToBottom = (smooth = false) => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  };

  const roomId = currentRoom || "global";
  const roomMessages = useMemo(() => messages[String(roomId)] ?? [], [messages, roomId]);

  // --- JWT Auth Socket.IO Connect (keep or undo as needed) ---
  useEffect(() => {
    async function connectWithJWT() {
      if (!user) return;
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) {
        await connectSocketWithToken(token);
      }
    }
    connectWithJWT();
  }, [user]);


  // Always jump to bottom when entering/switching rooms
  useEffect(() => {
   
    requestAnimationFrame(() => scrollToBottom(false));
  }, [roomId]);

  // Auto-scroll to bottom when new messages arrive if user is near bottom
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (nearBottom) {
  scrollToBottom(true);
    }
  }, [roomMessages.length, roomId]);
  // Handle sending chat messages
  const handleSend = () => {
    if (!input.trim() || !user) return;
    // sendChat(roomId, user.id, user.email ?? "You", input.trim());
    sendChat(roomId, user.id, input.trim(), user.email ?? undefined);
    setInput(""); // Clear the input after sending the message
  // Scroll to bottom right after sending (post-render guard)
  requestAnimationFrame(() => scrollToBottom(true));
  setTimeout(() => scrollToBottom(true), 60);
  };

  // Handle Enter key to send message
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };



  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MessageSquare className="w-5 h-5 text-orange-400" />
            <h3 className="font-semibold text-foreground">Room Chat</h3>
          </div>

          {roomMessages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => clearChat(roomId)}
              className="text-muted-foreground hover:text-foreground"
              title="Clear Chat"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

  <div id="chat-container" ref={listRef} className="flex-1 overflow-y-auto scrollbar-thin p-4">
        <div className="min-h-full flex flex-col">
          {/* Static pinned welcome caption */}
          <div className="mb-4 mt-1 flex justify-center">
            <div className="px-3 py-1 text-xs rounded-full border bg-orange-500/10 border-orange-400/30 text-orange-300 shadow-[0_0_0_1px_rgba(251,146,60,0.08)]" role="note" aria-label="Welcome banner">
              Welcome to the collaboration room!
            </div>
          </div>
          {roomMessages.length === 0 ? (
            <div className="flex-1 flex items-center justify-center pb-24">
              <div className="text-sm text-muted-foreground select-none">
                No messages yet. <span className="text-orange-400">Say hello!</span>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
          {roomMessages.map((msg, i) => {
            const key = ("message_id" in msg && msg.message_id)
              ? String(msg.message_id)
              : `${msg.uid}-${msg.created_at}-${i}`;

            // System caption chip (centered, orange background with white text)
    if ('uid' in msg && msg.uid === "system") {
              return (
                <div key={key} className="my-3 flex justify-center">
      <div className="px-3 py-1 text-xs rounded-full border bg-orange-500/10 border-orange-400/30 text-orange-300 shadow-[0_0_0_1px_rgba(251,146,60,0.08)]">
                    {msg.message}
                  </div>
                </div>
              );
            }

            // WhatsApp-like bubbles: outgoing (self) right with subtle orange tint (not highlight), incoming left/dark
            const isSelf = !!(user && 'uid' in msg && msg.uid === user.id);
            const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const senderEmail = msg.email ?? ('uid' in msg ? msg.uid : '');

            return (
              <div key={key} className={`flex ${isSelf ? 'justify-end' : 'justify-start'}`}>
        <div
                  className={[
                    'relative max-w-[78%] px-3 py-2 text-sm break-words',
                    'rounded-2xl',
                    isSelf
            ? 'text-white rounded-br-sm border shadow-sm'
                      : 'bg-zinc-800 text-zinc-100 rounded-bl-sm border border-zinc-700/30',
                  ].join(' ')}
                  style={isSelf ? { backgroundColor: '#FF7A00', borderColor: '#CC6400' } : undefined}
                >
                  <div className={`text-[11px] mb-1 ${isSelf ? 'text-white/90' : 'text-zinc-200/90'}`}>
                    {senderEmail}
                  </div>
                  <div>{msg.message}</div>
                  <div className={`mt-1 text-[10px] opacity-70 text-right ${isSelf ? 'text-white/80' : 'text-zinc-300/70'}`}>
                    {time}
                  </div>
                </div>
              </div>
            );
          })}
            </div>
          )}
        </div>
      </div>

      <div className="flex-shrink-0 p-4 border-t border-gray-700">
        <div className="flex space-x-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message the room..."
            className="flex-1 px-3 py-2 bg-input border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:border-orange-400 focus:ring-1 focus:ring-orange-400/20 focus:outline-none resize-none"
            rows={2}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || !user}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-2">Press Enter to send, Shift+Enter for new line</p>
      </div>
    </div>
  );
}
