import React, { createContext, useEffect, useState, useCallback } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "react-toastify";
import type { Block } from "@/types/workspace";

// Yjs type definitions
type YBlockMap = Y.Map<string | number | boolean | Y.Text>;
type YCursorMap = Y.Map<string | number | object>;

interface CollaborationUser {
  userId: string;
  userName: string;
  userEmail: string;
  userColor: string;
  status: "active" | "inactive";
  cursor?: {
    blockId: string;
    position: number;
    selection?: { start: number; end: number };
  };
}

interface CollaborationContextType {
  // Yjs document and provider
  yjsDoc: Y.Doc | null;
  provider: WebsocketProvider | null;
  isConnected: boolean;

  // Shared data structures
  blocksArray: Y.Array<YBlockMap> | null;
  cursorsMap: Y.Map<YCursorMap> | null;

  // Users and presence
  activeUsers: CollaborationUser[];
  currentUserId: string | null;

  // Connection management
  connect: (roomId: string) => Promise<void>;
  disconnect: () => void;

  // Block operations
  addBlock: (block: Omit<Block, "id">, position?: number) => string;
  updateBlock: (blockId: string, updates: Partial<Block>) => void;
  deleteBlock: (blockId: string) => void;
  moveBlock: (blockId: string, newPosition: number) => void;

  // Cursor operations
  updateCursor: (
    blockId: string,
    position: number,
    selection?: { start: number; end: number }
  ) => void;
  clearCursor: () => void;
}

const CollaborationContext = createContext<CollaborationContextType | null>(
  null
);

interface CollaborationProviderProps {
  children: React.ReactNode;
}

export const CollaborationProvider: React.FC<CollaborationProviderProps> = ({
  children,
}) => {
  const { user, session } = useAuth();
  const [yjsDoc, setYjsDoc] = useState<Y.Doc | null>(null);
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);
  const [webSocket, setWebSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [lastConnectionAttempt, setLastConnectionAttempt] = useState<number>(0);
  const [activeUsers, setActiveUsers] = useState<CollaborationUser[]>([]);
  const [blocksArray, setBlocksArray] = useState<Y.Array<YBlockMap> | null>(
    null
  );
  const [cursorsMap, setCursorsMap] = useState<Y.Map<YCursorMap> | null>(null);

  const connect = useCallback(
    async (roomId: string) => {
      // Rate limiting: prevent connections closer than 3 seconds apart to handle unexpected disconnects
      const now = Date.now();
      if (now - lastConnectionAttempt < 3000) {
        console.log(
          "⚠️ Rate limiting: Too many connection attempts, waiting 3 seconds between attempts"
        );
        return;
      }
      setLastConnectionAttempt(now);

      // Prevent multiple connections to the same room
      if (isConnecting || (isConnected && currentRoomId === roomId)) {
        console.log("⚠️ Already connected/connecting to room:", roomId);
        return;
      }

      // Prevent connecting to different room while connected
      if (isConnected && currentRoomId !== roomId) {
        console.log(
          "🔄 Switching rooms - disconnecting from:",
          currentRoomId,
          "connecting to:",
          roomId
        );
        // Disconnect inline to avoid dependency cycle
        if (webSocket) {
          webSocket.close();
          setWebSocket(null);
        }
        if (yjsDoc) {
          yjsDoc.destroy();
          setYjsDoc(null);
        }
        setIsConnected(false);
        setCurrentRoomId(null);
        setActiveUsers([]);
        setBlocksArray(null);
        setCursorsMap(null);
      }

      if (!user || !session) {
        console.error("❌ User authentication required for collaboration");
        toast.error("User must be authenticated to join collaboration");
        return;
      }

      setIsConnecting(true);
      console.log("� Connecting to collaboration room:", roomId);

      try {
        // Create new Yjs document
        const doc = new Y.Doc();

        // Get shared data structures
        const blocks = doc.getArray<YBlockMap>("blocks");
        const cursors = doc.getMap<YCursorMap>("cursors");

        // WebSocket URL from backend documentation
        const wsUrl =
          process.env.NODE_ENV === "production"
            ? "wss://api.ottrpad.com/collaboration"
            : "ws://localhost:4002/yjs";

        // Create Yjs WebSocket provider with authentication params
        const wsProvider = new WebsocketProvider(wsUrl, `room-${roomId}`, doc, {
          // Pass auth token and room info as URL params
          params: {
            token: session.access_token,
            roomId: roomId,
          },
        });

        // Set up provider event handlers
        wsProvider.on("status", ({ status }) => {
          console.log("🔗 Yjs WebSocket provider status:", status);
          if (status === "connected") {
            console.log("✅ Yjs provider connected successfully");
            setIsConnected(true);
            setIsConnecting(false);
            toast.success("Connected to real-time collaboration");
          } else if (status === "disconnected") {
            console.log("🔌 Yjs provider disconnected");
            setIsConnected(false);
            if (!wsProvider.shouldConnect) {
              // Only show error if disconnect was unexpected
              toast.error("Disconnected from collaboration");
            }
          }
        });

        wsProvider.on("sync", (isSynced) => {
          console.log("📄 Yjs document synced:", isSynced);
          if (isSynced) {
            console.log("✅ Document fully synchronized with server");
          }
        });

        wsProvider.on("connection-error", (error) => {
          console.error("🚨 Yjs WebSocket connection error:", error);
          setIsConnecting(false);
          setIsConnected(false);
          toast.error("Failed to connect to collaboration server");
        });

        // Set up state with Yjs provider
        setYjsDoc(doc);
        setProvider(wsProvider);
        setWebSocket(null); // No separate auth WebSocket needed
        setBlocksArray(blocks);
        setCursorsMap(cursors);
        setCurrentRoomId(roomId);

        console.log("📄 Yjs collaboration initialized for room:", roomId);

        console.log("Initializing collaboration for room:", roomId);
      } catch (error) {
        console.error("Failed to initialize collaboration:", error);
        toast.error("Failed to initialize real-time collaboration");
        setIsConnecting(false);
      }
    },
    [
      user,
      session,
      yjsDoc,
      currentRoomId,
      isConnected,
      isConnecting,
      webSocket,
      lastConnectionAttempt,
    ]
  );

  const disconnect = useCallback(() => {
    if (!isConnected && !isConnecting) {
      console.log("⚠️ Already disconnected, skipping disconnect");
      return;
    }

    console.log("🔄 Disconnecting from collaboration...");

    if (provider) {
      provider.destroy();
      setProvider(null);
    }
    if (webSocket) {
      webSocket.close();
      setWebSocket(null);
    }
    if (yjsDoc) {
      yjsDoc.destroy();
      setYjsDoc(null);
    }

    setIsConnected(false);
    setIsConnecting(false);
    setCurrentRoomId(null);
    setActiveUsers([]);
    setBlocksArray(null);
    setCursorsMap(null);

    console.log("✅ Collaboration disconnected");
  }, [provider, webSocket, yjsDoc, isConnected, isConnecting]);

  // Block operations
  const addBlock = useCallback(
    (block: Omit<Block, "id">, position?: number): string => {
      if (!blocksArray || !yjsDoc) {
        throw new Error("Collaboration not initialized");
      }

      const blockId = `block-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      const blockMap = new Y.Map() as YBlockMap;

      // Set block properties
      blockMap.set("id", blockId);
      blockMap.set("lang", block.lang);
      blockMap.set("content", new Y.Text(block.content));
      blockMap.set("collapsed", block.collapsed || false);
      blockMap.set("position", block.position);
      blockMap.set("createdAt", block.createdAt);
      blockMap.set("updatedAt", block.updatedAt);

      // Add to shared array
      yjsDoc.transact(() => {
        if (
          position !== undefined &&
          position >= 0 &&
          position <= blocksArray.length
        ) {
          blocksArray.insert(position, [blockMap]);
        } else {
          blocksArray.push([blockMap]);
        }
      });

      return blockId;
    },
    [blocksArray, yjsDoc]
  );

  const updateBlock = useCallback(
    (blockId: string, updates: Partial<Block>) => {
      if (!blocksArray || !yjsDoc) return;

      yjsDoc.transact(() => {
        // Find the block
        for (let i = 0; i < blocksArray.length; i++) {
          const blockMap = blocksArray.get(i);
          if (blockMap.get("id") === blockId) {
            // Update properties
            Object.entries(updates).forEach(([key, value]) => {
              if (key === "content" && typeof value === "string") {
                // Handle content updates specially for Y.Text
                const yText = blockMap.get("content") as Y.Text;
                if (yText && yText.toString() !== value) {
                  yText.delete(0, yText.length);
                  yText.insert(0, value);
                }
              } else if (key !== "content") {
                blockMap.set(key, value);
              }
            });
            break;
          }
        }
      });
    },
    [blocksArray, yjsDoc]
  );

  const deleteBlock = useCallback(
    (blockId: string) => {
      if (!blocksArray || !yjsDoc) return;

      yjsDoc.transact(() => {
        // Find and remove the block
        for (let i = 0; i < blocksArray.length; i++) {
          const blockMap = blocksArray.get(i);
          if (blockMap.get("id") === blockId) {
            blocksArray.delete(i, 1);
            break;
          }
        }
      });
    },
    [blocksArray, yjsDoc]
  );

  const moveBlock = useCallback(
    (blockId: string, newPosition: number) => {
      if (!blocksArray || !yjsDoc) return;

      yjsDoc.transact(() => {
        // Find the block
        let blockMap: YBlockMap | null = null;
        let currentIndex = -1;

        for (let i = 0; i < blocksArray.length; i++) {
          if (blocksArray.get(i).get("id") === blockId) {
            blockMap = blocksArray.get(i);
            currentIndex = i;
            break;
          }
        }

        if (blockMap && currentIndex !== -1) {
          // Remove from current position
          blocksArray.delete(currentIndex, 1);

          // Insert at new position
          const insertPos = Math.min(newPosition, blocksArray.length);
          blocksArray.insert(insertPos, [blockMap]);

          // Update position property
          blockMap.set("position", newPosition);
        }
      });
    },
    [blocksArray, yjsDoc]
  );

  // Cursor operations
  const updateCursor = useCallback(
    (
      blockId: string,
      position: number,
      selection?: { start: number; end: number }
    ) => {
      if (!webSocket || !user || webSocket.readyState !== WebSocket.OPEN)
        return;

      // Send cursor update via WebSocket to backend
      const cursorMessage = {
        type: "cursor",
        data: {
          blockId,
          position,
          selection,
        },
      };
      webSocket.send(JSON.stringify(cursorMessage));
    },
    [webSocket, user]
  );

  const clearCursor = useCallback(() => {
    if (webSocket && webSocket.readyState === WebSocket.OPEN) {
      const cursorMessage = {
        type: "cursor",
        data: {
          blockId: null,
          position: null,
          selection: null,
        },
      };
      webSocket.send(JSON.stringify(cursorMessage));
    }
  }, [webSocket]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  const value: CollaborationContextType = {
    yjsDoc,
    provider,
    isConnected,
    blocksArray,
    cursorsMap,
    activeUsers,
    currentUserId: user?.id || null,
    connect,
    disconnect,
    addBlock,
    updateBlock,
    deleteBlock,
    moveBlock,
    updateCursor,
    clearCursor,
  };

  return (
    <CollaborationContext.Provider value={value}>
      {children}
    </CollaborationContext.Provider>
  );
};

export default CollaborationContext;
