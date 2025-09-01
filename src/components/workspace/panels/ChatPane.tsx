// import { useState, useMemo } from "react";
// import { useAppStore, useChatStore } from "../../../store/workspace";
// import { useAuth } from "../../../hooks/useAuth";
// import { Button } from "../../ui/button";
// import { Send, Trash2, MessageSquare } from "lucide-react";

// export function ChatPane() {
//   const { currentRoom } = useAppStore();
//   const { user } = useAuth();
//   const { messages, sendChat, clearChat } = useChatStore();
//   const [input, setInput] = useState("");

//   const roomId = currentRoom || "global";
//   const roomMessages = useMemo(() => messages[roomId] ?? [], [messages, roomId]);

//   const handleSend = () => {
//     if (!input.trim() || !user) return;
//     sendChat(roomId, user.id, user.email ?? "You", input.trim());
//     setInput("");
//   };

//   const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
//     if (e.key === "Enter" && !e.shiftKey) {
//       e.preventDefault();
//       handleSend();
//     }
//   };

//   return (
//     <div className="h-full flex flex-col">
//       {/* Header */}
//       <div className="flex-shrink-0 p-4 border-b border-gray-700">
//         <div className="flex items-center justify-between">
//           <div className="flex items-center space-x-2">
//             <MessageSquare className="w-5 h-5 text-orange-400" />
//             <h3 className="font-semibold text-foreground">Room Chat</h3>
//           </div>

//         {roomMessages.length > 0 && (
//           <Button
//             variant="ghost"
//             size="sm"
//             onClick={() => clearChat(roomId)}
//             className="text-muted-foreground hover:text-foreground"
//             title="Clear Chat"
//           >
//             <Trash2 className="w-4 h-4" />
//           </Button>
//         )}
//         </div>
//       </div>

//       {/* Messages */}
//       <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3">
//         {roomMessages.length === 0 ? (
//           <div className="text-sm text-muted-foreground">
//             No messages yet. Say hello!
//           </div>
//         ) : (
//           roomMessages.map((msg) => (
//             <div key={msg.id} className="flex flex-col">
//               <div className="text-xs text-gray-400">
//                 <span className="font-medium text-gray-300">{msg.senderName}</span>
//                 <span className="mx-1">•</span>
//                 {new Date(msg.timestamp).toLocaleTimeString()}
//               </div>
//               <div className="bg-card/50 border border-border rounded-md p-2 text-sm text-foreground">
//                 {msg.content}
//               </div>
//             </div>
//           ))
//         )}
//       </div>

//       {/* Input */}
//       <div className="flex-shrink-0 p-4 border-t border-gray-700">
//         <div className="flex space-x-2">
//           <textarea
//             value={input}
//             onChange={(e) => setInput(e.target.value)}
//             onKeyDown={handleKeyDown}
//             placeholder="Message the room..."
//             className="flex-1 px-3 py-2 bg-input border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:border-orange-400 focus:ring-1 focus:ring-orange-400/20 focus:outline-none resize-none"
//             rows={2}
//           />
//           <Button
//             onClick={handleSend}
//             disabled={!input.trim() || !user}
//             className="bg-orange-500 hover:bg-orange-600 text-white px-4"
//           >
//             <Send className="w-4 h-4" />
//           </Button>
//         </div>
//         <p className="text-xs text-gray-500 mt-2">Press Enter to send, Shift+Enter for new line</p>
//       </div>
//     </div>
//   );
// }


import { useState, useMemo, useEffect, useRef } from "react";
import { connectSocketWithToken, socket } from "../../../lib/socket";
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
  // --- End JWT Auth Socket.IO Connect ---

  // Ensure the socket joins the selected room before sending messages
  useEffect(() => {
    let active = true;
    (async () => {
      if (!user || !roomId) return;
      // Make sure we're authenticated and connected before joining
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) {
        await connectSocketWithToken(token);
      }
      if (active) {
        socket.emit("joinRoom", { roomId });
      }
    })();

    return () => {
      active = false;
      if (roomId) {
        socket.emit("leaveRoom", { roomId });
      }
    };
  }, [roomId, user]);

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


  // Uncomment and adjust this block if you have a socket.io backend for chat
  // useEffect(() => {
  //   const socket = io(); // Connect to the Socket.IO server
  //   socket.on("chat:new", (data) => {
  //     // Make sure the data shape matches ChatMessage
  //     sendChat(data.roomId, data.message.senderId, data.message.senderName, data.message.content);
  //   });
  //   return () => {
  //     socket.off("chat:new");
  //   };
  // }, [sendChat]);

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

  <div id="chat-container" ref={listRef} className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3">
        {roomMessages.length === 0 ? (
          <div className="text-sm text-muted-foreground">No messages yet. Say hello!</div>
        ) : (
          roomMessages.map((msg, i) => (
      <div key={("message_id" in msg && msg.message_id) ? String(msg.message_id) : `${msg.uid}-${msg.created_at}-${i}` } className="flex flex-col">
              <div className="text-xs text-gray-400">
    <span className="font-medium text-gray-300">{msg.email ?? msg.uid}</span>
                <span className="mx-1">•</span>
        {new Date(msg.created_at).toLocaleTimeString()}
              </div>
              <div className="bg-card/50 border border-border rounded-md p-2 text-sm text-foreground">
        {msg.message}
              </div>
            </div>
          ))
        )}
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
