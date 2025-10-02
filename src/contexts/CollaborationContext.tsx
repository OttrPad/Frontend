import React, {
  createContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
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

/* ---------- helpers ---------- */
function upsertNotebook(list: NotebookInfo[], item: NotebookInfo) {
  const i = list.findIndex((nb) => nb.id === item.id);
  if (i === -1) return [...list, item];
  const next = list.slice();
  next[i] = { ...next[i], ...item };
  return next;
}

interface CollaborationContextType {
  isConnected: boolean;
  connectionError: string | null;

  notebooks: NotebookInfo[];
  activeNotebookId: string | null;
  createNotebook: (title: string) => Promise<void>;
  renameNotebook: (notebookId: string, title: string) => Promise<void>;
  switchNotebook: (notebookId: string) => Promise<void>;
  deleteNotebook: (notebookId: string) => Promise<void>;

  activeUsers: UserPresence[];
  sendCodeChange: (
    blockId: string,
    content: string,
    cursorPosition: CursorPosition
  ) => void;
  sendCursorUpdate: (blockId: string, position: CursorPosition) => void;

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
  const roomIdentifier = roomId || roomCode;
  const { session } = useUser();
  const { updateBlock } = useBlocksStore();

  // state
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [notebooks, setNotebooks] = useState<NotebookInfo[]>([]);
  const [activeNotebookId, setActiveNotebookId] = useState<string | null>(null);
  const [activeUsers, setActiveUsers] = useState<UserPresence[]>([]);
  const [isLoadingNotebooks, setIsLoadingNotebooks] = useState(false);
  const [isCreatingNotebook, setIsCreatingNotebook] = useState(false);
  // Removed execution session lifecycle (only /exec is used during runs)

  // refs for stable usage in handlers
  const activeNotebookIdRef = useRef<string | null>(null);
  useEffect(() => {
    activeNotebookIdRef.current = activeNotebookId;
  }, [activeNotebookId]);

  const updateBlockRef = useRef(updateBlock);
  useEffect(() => {
    updateBlockRef.current = updateBlock;
  }, [updateBlock]);

  // bind-once flag so we don’t double-attach listeners
  const listenersBoundRef = useRef(false);

  /* ---------- REST loader (uses JWT inside service now) ---------- */
  const loadNotebooks = useCallback(async () => {
    try {
      setIsLoadingNotebooks(true);
      const list = await socketCollaborationService.getNotebooks();
      setNotebooks(list);
      if (list.length && !activeNotebookIdRef.current) {
        setActiveNotebookId(list[0].id);
      }
    } catch (err) {
      console.error("Failed to load notebooks:", err);
      setConnectionError("Failed to load notebooks");
    } finally {
      setIsLoadingNotebooks(false);
    }
  }, []);

  /* ---------- stable socket handlers ---------- */
  const handleNotebookHistory = useCallback(
    (data: { roomId: string; notebooks: NotebookInfo[] }) => {
      // initial snapshot pushed by server on join
      setNotebooks(data.notebooks || []);
      if (data.notebooks?.length && !activeNotebookIdRef.current) {
        setActiveNotebookId(data.notebooks[0].id);
      }
    },
    []
  );

  const handleNotebookCreated = useCallback(
    (data: { notebook: NotebookInfo }) => {
      setNotebooks((prev) => upsertNotebook(prev, data.notebook));
    },
    []
  );

  const handleNotebookUpdated = useCallback(
    (data: { notebook: NotebookInfo }) => {
      setNotebooks((prev) => upsertNotebook(prev, data.notebook));
    },
    []
  );

  const handleNotebookDeleted = useCallback((data: { notebookId: string }) => {
    setNotebooks((prev) => prev.filter((nb) => nb.id !== data.notebookId));
    setActiveNotebookId((id) => (id === data.notebookId ? null : id));
  }, []);

  const handleCodeChanged = useCallback((data: CodeChangeData) => {
    if (data.blockId && data.notebookId === activeNotebookIdRef.current) {
      updateBlockRef.current(data.blockId, {
        content: data.content,
        updatedAt: Date.now(),
      });
    }
  }, []);

  const handleCursorMoved = useCallback((data: UserPresence) => {
    setActiveUsers((prev) => {
      const filtered = prev.filter((u) => u.userId !== data.userId);
      return [...filtered, data];
    });
  }, []);

  const handleTypingStart = useCallback((data: UserPresence) => {
    setActiveUsers((prev) => {
      const updated = prev.map((u) =>
        u.userId === data.userId
          ? { ...u, isTyping: true, position: data.position }
          : u
      );
      if (!updated.find((u) => u.userId === data.userId)) {
        updated.push({ ...data, isTyping: true });
      }
      return updated;
    });
  }, []);

  const handleTypingStop = useCallback((data: { userId: string }) => {
    setActiveUsers((prev) =>
      prev.map((u) =>
        u.userId === data.userId ? { ...u, isTyping: false } : u
      )
    );
  }, []);

  const handleError = useCallback((error: { message?: string }) => {
    console.error("Collaboration error:", error);
    setConnectionError(error.message || "Unknown collaboration error");
  }, []);

  /* ---------- connect -> bind listeners -> join -> load ---------- */
  useEffect(() => {
    if (!roomIdentifier || !session?.access_token) return;

    let cancelled = false;

    (async () => {
      try {
        setConnectionError(null);

        // 1) connect socket
        await socketCollaborationService.connect(
          roomIdentifier,
          session.access_token
        );

        // 2) bind listeners BEFORE join to avoid missing early notebook-history/notebook:created
        if (!listenersBoundRef.current) {
          socketCollaborationService.on(
            "notebook-history",
            handleNotebookHistory
          );
          socketCollaborationService.on(
            "notebook:created",
            handleNotebookCreated
          );
          socketCollaborationService.on(
            "notebook:updated",
            handleNotebookUpdated
          );
          socketCollaborationService.on(
            "notebook:deleted",
            handleNotebookDeleted
          );
          socketCollaborationService.on("code-changed", handleCodeChanged);
          socketCollaborationService.on("cursor-moved", handleCursorMoved);
          socketCollaborationService.on("typing-start", handleTypingStart);
          socketCollaborationService.on("typing-stop", handleTypingStop);
          socketCollaborationService.on("error", handleError);
          listenersBoundRef.current = true;
        }

        // 3) join room (server will emit notebook-history; if room empty,
        //    it will create default and emit notebook:created)
        await socketCollaborationService.joinRoom(roomIdentifier);

        if (cancelled) return;

        // 4) mark connected now that we’re in the room
        setIsConnected(true);

        // (executor auto-start removed)

        // 5) REST fallback (auth header now included in service)
        //    If socket push didn’t arrive yet, this ensures the list appears.
        await loadNotebooks();
      } catch (err) {
        console.error("❌ Collaboration init failed:", err);
        if (!cancelled) {
          setConnectionError(
            err instanceof Error ? err.message : "Connection failed"
          );
          setIsConnected(false);
        }
      }
    })();

    return () => {
      cancelled = true;

      // unbind listeners
      if (listenersBoundRef.current) {
        socketCollaborationService.off(
          "notebook-history",
          handleNotebookHistory
        );
        socketCollaborationService.off(
          "notebook:created",
          handleNotebookCreated
        );
        socketCollaborationService.off(
          "notebook:updated",
          handleNotebookUpdated
        );
        socketCollaborationService.off(
          "notebook:deleted",
          handleNotebookDeleted
        );
        socketCollaborationService.off("code-changed", handleCodeChanged);
        socketCollaborationService.off("cursor-moved", handleCursorMoved);
        socketCollaborationService.off("typing-start", handleTypingStart);
        socketCollaborationService.off("typing-stop", handleTypingStop);
        socketCollaborationService.off("error", handleError);
        listenersBoundRef.current = false;
      }

      socketCollaborationService.disconnect();
      setIsConnected(false);
      // (executor stop removed)
    };
  }, [
    roomIdentifier,
    session?.access_token,
    handleNotebookHistory,
    handleNotebookCreated,
    handleNotebookUpdated,
    handleNotebookDeleted,
    handleCodeChanged,
    handleCursorMoved,
    handleTypingStart,
    handleTypingStop,
    handleError,
    loadNotebooks,
  ]);

  /* ---------- CRUD methods ---------- */

  const createNotebook = useCallback(async (title: string) => {
    if (!socketCollaborationService.isConnected()) {
      throw new Error("Not connected to collaboration service");
    }
    try {
      setIsCreatingNotebook(true);
      const nb = await socketCollaborationService.createNotebook(title);
      // optimistic: set active to what server returned
      setActiveNotebookId(nb.id);
      // server will broadcast notebook:created -> upsert will keep list consistent
    } catch (error) {
      console.error("Failed to create notebook:", error);
      throw error;
    } finally {
      setIsCreatingNotebook(false);
    }
  }, []);

  const renameNotebook = useCallback(
    async (notebookId: string, title: string) => {
      if (!socketCollaborationService.isConnected()) {
        throw new Error("Not connected to collaboration service");
      }
      try {
        const updated = await socketCollaborationService.renameNotebook(
          notebookId,
          title
        );
        setNotebooks((prev) => upsertNotebook(prev, updated));
      } catch (error) {
        console.error("Failed to rename notebook:", error);
        throw error;
      }
    },
    []
  );

  const switchNotebook = useCallback(async (notebookId: string) => {
    if (!socketCollaborationService.isConnected()) return;

    try {
      setActiveNotebookId(notebookId);
      const blockList = await socketCollaborationService.getBlocks(notebookId);
      const convertedBlocks: Block[] = blockList.map((b) => ({
        id: b.id,
        lang: (b.language as Lang) || "python",
        content: "",
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
        position: b.position,
      }));
      console.log("Loaded blocks for notebook:", notebookId, convertedBlocks);
    } catch (error) {
      console.error("Failed to switch notebook:", error);
      setConnectionError("Failed to load notebook");
    }
  }, []);

  const deleteNotebook = useCallback(async (notebookId: string) => {
    if (!socketCollaborationService.isConnected()) return;
    try {
      await socketCollaborationService.deleteNotebookREST(notebookId);
      setNotebooks((prev) => prev.filter((nb) => nb.id !== notebookId));
      setActiveNotebookId((id) => (id === notebookId ? null : id));
    } catch (error) {
      console.error("Failed to delete notebook:", error);
      throw error;
    }
  }, []);

  const sendCodeChange = useCallback(
    (blockId: string, content: string, cursorPosition: CursorPosition) => {
      const nbId = activeNotebookIdRef.current;
      if (!socketCollaborationService.isConnected() || !nbId) return;

      socketCollaborationService.sendCodeChange({
        content,
        cursorPosition,
        notebookId: nbId,
        blockId,
      });
    },
    []
  );

  const sendCursorUpdate = useCallback(
    (blockId: string, position: CursorPosition) => {
      const nbId = activeNotebookIdRef.current;
      if (!socketCollaborationService.isConnected() || !nbId) return;

      socketCollaborationService.sendCursorMove(position, nbId, blockId);
    },
    []
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
