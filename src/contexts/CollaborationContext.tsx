import React, { createContext, useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useUser } from "../hooks/useUser";
import { useBlocksStore } from "../store/workspace";
import {
  socketCollaborationService,
  type NotebookInfo,
  type UserPresence,
  type CodeChangeData,
  type CursorPosition,
} from "../lib/socketCollaborationService";
import type { Block, Lang } from "../types/workspace";

interface CollaborationContextType {
  // Connection state
  isConnected: boolean;
  connectionError: string | null;

  // Notebooks
  notebooks: NotebookInfo[];
  activeNotebookId: string | null;
  createNotebook: (title: string) => Promise<void>;
  renameNotebook: (notebookId: string, title: string) => Promise<void>;
  switchNotebook: (notebookId: string) => Promise<void>;
  deleteNotebook: (notebookId: string) => Promise<void>;

  // Real-time collaboration
  activeUsers: UserPresence[];
  sendCodeChange: (
    blockId: string,
    content: string,
    cursorPosition: CursorPosition
  ) => void;
  sendCursorUpdate: (blockId: string, position: CursorPosition) => void;

  // Loading states
  isLoadingNotebooks: boolean;
  isCreatingNotebook: boolean;
}

const CollaborationContext = createContext<CollaborationContextType | null>(
  null
);

export { CollaborationContext };

interface CollaborationProviderProps {
  children: React.ReactNode;
}

export function CollaborationProvider({
  children,
}: CollaborationProviderProps) {
  const { roomId, roomCode } = useParams<{
    roomId?: string;
    roomCode?: string;
  }>();
  const { session } = useUser();
  const { updateBlock } = useBlocksStore();

  // State
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [notebooks, setNotebooks] = useState<NotebookInfo[]>([]);
  const [activeNotebookId, setActiveNotebookId] = useState<string | null>(null);
  const [activeUsers, setActiveUsers] = useState<UserPresence[]>([]);
  const [isLoadingNotebooks, setIsLoadingNotebooks] = useState(false);
  const [isCreatingNotebook, setIsCreatingNotebook] = useState(false);

  const roomIdentifier = roomId || roomCode;

  // Load notebooks from server
  const loadNotebooks = useCallback(async () => {
    if (!isConnected) return;

    try {
      setIsLoadingNotebooks(true);
      const notebookList = await socketCollaborationService.getNotebooks();
      setNotebooks(notebookList);

      // Auto-select first notebook if none selected
      if (notebookList.length > 0 && !activeNotebookId) {
        setActiveNotebookId(notebookList[0].id);
      }
    } catch (error) {
      console.error("Failed to load notebooks:", error);
      setConnectionError("Failed to load notebooks");
    } finally {
      setIsLoadingNotebooks(false);
    }
  }, [isConnected, activeNotebookId]);

  // Initialize collaboration service
  useEffect(() => {
    if (!roomIdentifier || !session?.access_token) {
      return;
    }

    const initCollaboration = async () => {
      try {
        setConnectionError(null);

        // Connect to collaboration service
        await socketCollaborationService.connect(
          roomIdentifier,
          session.access_token
        );
        setIsConnected(true);

        console.log("✅ Collaboration service initialized");
      } catch (error) {
        console.error("❌ Failed to initialize collaboration:", error);
        setConnectionError(
          error instanceof Error ? error.message : "Connection failed"
        );
        setIsConnected(false);
      }
    };

    initCollaboration();

    return () => {
      socketCollaborationService.disconnect();
      setIsConnected(false);
    };
  }, [roomIdentifier, session?.access_token]);

  // Load notebooks when connected
  useEffect(() => {
    if (isConnected) {
      loadNotebooks();
    }
  }, [isConnected, loadNotebooks]);

  // Set up event listeners
  useEffect(() => {
    if (!isConnected) return;

    const handleDisconnected = () => {
      setIsConnected(false);
      setConnectionError("Connection lost");
    };

    const handleNotebookCreated = (data: { notebook: NotebookInfo }) => {
      setNotebooks((prev) => [...prev, data.notebook]);
    };

    const handleNotebookDeleted = (data: { notebookId: string }) => {
      setNotebooks((prev) => prev.filter((nb) => nb.id !== data.notebookId));
      if (activeNotebookId === data.notebookId) {
        setActiveNotebookId(null);
      }
    };

    const handleCodeChanged = (data: CodeChangeData) => {
      if (data.blockId && data.notebookId === activeNotebookId) {
        // Update the block content in local state
        updateBlock(data.blockId, {
          content: data.content,
          updatedAt: Date.now(),
        });
      }
    };

    const handleCursorMoved = (data: UserPresence) => {
      setActiveUsers((prev) => {
        const filtered = prev.filter((u) => u.userId !== data.userId);
        return [...filtered, data];
      });
    };

    const handleTypingStart = (data: UserPresence) => {
      setActiveUsers((prev) => {
        const updated = prev.map((u) =>
          u.userId === data.userId
            ? { ...u, isTyping: true, position: data.position }
            : u
        );

        // Add user if not exists
        if (!updated.find((u) => u.userId === data.userId)) {
          updated.push({ ...data, isTyping: true });
        }

        return updated;
      });
    };

    const handleTypingStop = (data: { userId: string }) => {
      setActiveUsers((prev) =>
        prev.map((u) =>
          u.userId === data.userId ? { ...u, isTyping: false } : u
        )
      );
    };

    const handleError = (error: { message?: string }) => {
      console.error("Collaboration error:", error);
      setConnectionError(error.message || "Unknown collaboration error");
    };

    // Register event listeners
    socketCollaborationService.on("disconnected", handleDisconnected);
    socketCollaborationService.on("notebook:created", handleNotebookCreated);
    socketCollaborationService.on("notebook:deleted", handleNotebookDeleted);
    socketCollaborationService.on("code-changed", handleCodeChanged);
    socketCollaborationService.on("cursor-moved", handleCursorMoved);
    socketCollaborationService.on("typing-start", handleTypingStart);
    socketCollaborationService.on("typing-stop", handleTypingStop);
    socketCollaborationService.on("error", handleError);

    return () => {
      socketCollaborationService.off("disconnected", handleDisconnected);
      socketCollaborationService.off("notebook:created", handleNotebookCreated);
      socketCollaborationService.off("notebook:deleted", handleNotebookDeleted);
      socketCollaborationService.off("code-changed", handleCodeChanged);
      socketCollaborationService.off("cursor-moved", handleCursorMoved);
      socketCollaborationService.off("typing-start", handleTypingStart);
      socketCollaborationService.off("typing-stop", handleTypingStop);
      socketCollaborationService.off("error", handleError);
    };
  }, [isConnected, activeNotebookId, updateBlock]);

  // Create new notebook
  const createNotebook = useCallback(
    async (title: string) => {
      if (!isConnected) {
        throw new Error("Not connected to collaboration service");
      }

      try {
        setIsCreatingNotebook(true);
        const notebook = await socketCollaborationService.createNotebook(title);
        setNotebooks((prev) => [...prev, notebook]);
        setActiveNotebookId(notebook.id);
      } catch (error) {
        console.error("Failed to create notebook:", error);
        throw error;
      } finally {
        setIsCreatingNotebook(false);
      }
    },
    [isConnected]
  );

  // Rename notebook
  const renameNotebook = useCallback(
    async (notebookId: string, title: string) => {
      if (!isConnected) {
        throw new Error("Not connected to collaboration service");
      }

      try {
        const updatedNotebook = await socketCollaborationService.renameNotebook(
          notebookId,
          title
        );
        setNotebooks((prev) =>
          prev.map((nb) => (nb.id === notebookId ? updatedNotebook : nb))
        );
      } catch (error) {
        console.error("Failed to rename notebook:", error);
        throw error;
      }
    },
    [isConnected]
  );

  // Switch to different notebook
  const switchNotebook = useCallback(
    async (notebookId: string) => {
      if (!isConnected) return;

      try {
        setActiveNotebookId(notebookId);

        // Load blocks for this notebook
        const blockList = await socketCollaborationService.getBlocks(
          notebookId
        );

        // Convert BlockInfo to Block format for the store
        // Note: This is a simplified conversion - you may need to adjust based on your Block interface
        const convertedBlocks: Block[] = blockList.map((blockInfo) => ({
          id: blockInfo.id,
          lang: (blockInfo.language as Lang) || "python",
          content: "", // Will be loaded from YJS document
          createdAt: blockInfo.createdAt,
          updatedAt: blockInfo.updatedAt,
          position: blockInfo.position,
        }));

        // Replace current blocks with notebook blocks
        // Note: You might want to add a method to replace all blocks in your store
        console.log("Loaded blocks for notebook:", notebookId, convertedBlocks);
      } catch (error) {
        console.error("Failed to switch notebook:", error);
        setConnectionError("Failed to load notebook");
      }
    },
    [isConnected]
  );

  // Delete notebook
  const deleteNotebook = useCallback(
    async (notebookId: string) => {
      if (!isConnected) return;

      try {
        await socketCollaborationService.deleteNotebookREST(notebookId);

        // Update local state
        setNotebooks((prev) => prev.filter((nb) => nb.id !== notebookId));

        // If deleted notebook was active, clear active notebook
        if (activeNotebookId === notebookId) {
          setActiveNotebookId(null);
        }
      } catch (error) {
        console.error("Failed to delete notebook:", error);
        throw error;
      }
    },
    [isConnected, activeNotebookId]
  );

  // Send code changes
  const sendCodeChange = useCallback(
    (blockId: string, content: string, cursorPosition: CursorPosition) => {
      if (!isConnected || !activeNotebookId) return;

      socketCollaborationService.sendCodeChange({
        content,
        cursorPosition,
        notebookId: activeNotebookId,
        blockId,
      });
    },
    [isConnected, activeNotebookId]
  );

  // Send cursor updates
  const sendCursorUpdate = useCallback(
    (blockId: string, position: CursorPosition) => {
      if (!isConnected || !activeNotebookId) return;

      socketCollaborationService.sendCursorMove(
        position,
        activeNotebookId,
        blockId
      );
    },
    [isConnected, activeNotebookId]
  );

  const value: CollaborationContextType = {
    isConnected,
    connectionError,
    notebooks,
    activeNotebookId,
    createNotebook,
    renameNotebook,
    switchNotebook,
    deleteNotebook,
    activeUsers,
    sendCodeChange,
    sendCursorUpdate,
    isLoadingNotebooks,
    isCreatingNotebook,
  };

  return (
    <CollaborationContext.Provider value={value}>
      {children}
    </CollaborationContext.Provider>
  );
}
