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
  // type CodeChangeData,
} from "../lib/socketCollaborationService";
import type { Block, Lang } from "../types/workspace";
import * as Y from "yjs";

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

  isLoadingNotebooks: boolean;
  isCreatingNotebook: boolean;

  setLocalPresence: (
    blockId: string | null,
    cursor?: { line: number; column: number }
  ) => void;

  hydratingNotebookId: string | null;
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

  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [notebooks, setNotebooks] = useState<NotebookInfo[]>([]);
  const [activeNotebookId, setActiveNotebookId] = useState<string | null>(null);
  const [activeUsers, setActiveUsers] = useState<UserPresence[]>([]);
  const [isLoadingNotebooks, setIsLoadingNotebooks] = useState(false);
  const [isCreatingNotebook, setIsCreatingNotebook] = useState(false);
  const [hydratingNotebookId, setHydratingNotebookId] = useState<string | null>(
    null
  );

  // Refs for stable handlers
  const activeNotebookIdRef = useRef<string | null>(null);
  useEffect(() => {
    activeNotebookIdRef.current = activeNotebookId;
  }, [activeNotebookId]);

  const updateBlockRef = useRef(updateBlock);
  useEffect(() => {
    updateBlockRef.current = updateBlock;
  }, [updateBlock]);

  const listenersBoundRef = useRef(false);

  /* ---------- REST loader ---------- */
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

  /* ---------- socket event handlers ---------- */

  const handleNotebookHistory = useCallback(
    (data: { roomId: string; notebooks: NotebookInfo[] }) => {
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

  const handleAwarenessUpdate = useCallback(
    (data: { notebookId: string; states: UserPresence[] }) => {
      setActiveUsers(data.states);
    },
    []
  );

  // Code changes now handled by Yjs CRDT; can optionally keep legacy fallback:
  // const handleCodeChanged = useCallback((data: CodeChangeData) => {
  //   if (data.blockId && data.notebookId === activeNotebookIdRef.current) {
  //     updateBlockRef.current(data.blockId, {
  //       content: data.content,
  //       updatedAt: Date.now(),
  //     });
  //   }
  // }, []);

  const handleError = useCallback((error: { message?: string }) => {
    console.error("Collaboration error:", error);
    setConnectionError(error.message || "Unknown collaboration error");
  }, []);

  /* ---------- connect -> join -> bind listeners ---------- */
  useEffect(() => {
    if (!roomIdentifier || !session?.access_token) return;
    let cancelled = false;

    (async () => {
      try {
        setConnectionError(null);
        await socketCollaborationService.connect(
          roomIdentifier,
          session.access_token
        );

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
          socketCollaborationService.on(
            "awareness-update",
            handleAwarenessUpdate
          ); // 🔵 NEW
          socketCollaborationService.on("error", handleError);
          listenersBoundRef.current = true;
        }

        await socketCollaborationService.joinRoom(roomIdentifier);
        if (cancelled) return;

        setIsConnected(true);
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
        socketCollaborationService.off(
          "awareness-update",
          handleAwarenessUpdate
        );
        socketCollaborationService.off("error", handleError);
        listenersBoundRef.current = false;
      }

      socketCollaborationService.disconnect();
      setIsConnected(false);
    };
  }, [
    roomIdentifier,
    session?.access_token,
    handleNotebookHistory,
    handleNotebookCreated,
    handleNotebookUpdated,
    handleNotebookDeleted,
    handleAwarenessUpdate,
    handleError,
    loadNotebooks,
  ]);

  /* ---------- Local presence setter ---------- */
  const setLocalPresence = useCallback(
    (blockId: string | null, cursor?: { line: number; column: number }) => {
      if (!session?.user?.id || !activeNotebookIdRef.current) return;
      socketCollaborationService.setPresence(
        activeNotebookIdRef.current,
        {
          userId: session.user.id,
          userEmail: session.user.email ?? "",
        },
        cursor,
        blockId || undefined
      );
    },
    [session?.user?.id, session?.user?.email]
  );

  /* ---------- Notebook CRUD ---------- */
  const createNotebook = useCallback(async (title: string) => {
    try {
      setIsCreatingNotebook(true);
      const nb = await socketCollaborationService.createNotebook(title);
      setActiveNotebookId(nb.id);
    } catch (error) {
      console.error("Failed to create notebook:", error);
      throw error;
    } finally {
      setIsCreatingNotebook(false);
    }
  }, []);

  const renameNotebook = useCallback(
    async (notebookId: string, title: string) => {
      const updated = await socketCollaborationService.renameNotebook(
        notebookId,
        title
      );
      setNotebooks((prev) => upsertNotebook(prev, updated));
    },
    []
  );

  const switchNotebook = useCallback(async (notebookId: string) => {
    try {
      setHydratingNotebookId(notebookId);
      setActiveNotebookId(notebookId);

      // 1️⃣ Ensure Y.Doc exists
      let ydoc = socketCollaborationService.getYjsDocument(notebookId);
      if (!ydoc) {
        ydoc = await socketCollaborationService.setupYjsDocument(notebookId);
        console.log("🧩 Created new Y.Doc for notebook:", notebookId);
      }

      // 2️⃣ Apply server state BEFORE updating blocks
      const stateBase64 = await socketCollaborationService.requestYjsState(
        notebookId
      );
      if (stateBase64) {
        const update = Uint8Array.from(atob(stateBase64), (c) =>
          c.charCodeAt(0)
        );
        Y.applyUpdate(ydoc, update);
        console.log("📥 Yjs state applied for notebook:", notebookId);
      } else {
        console.warn("⚠️ No Yjs state returned for notebook:", notebookId);
      }

      // 3️⃣ Load block structure (metadata only)
      const blockList = await socketCollaborationService.getBlocks(notebookId);
      const convertedBlocks: Block[] = blockList.map((b) => ({
        id: b.id,
        lang: (b.language as Lang) || "python",
        content: "", // hydrated by Y.Text later
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
        position: b.position,
      }));

      // 4️⃣ Update block store only AFTER Yjs snapshot applied
      useBlocksStore
        .getState()
        .setBlocks(convertedBlocks.sort((a, b) => a.position - b.position));

      // 5️⃣ Clean up old awareness (keeps memory safe)
      socketCollaborationService.cleanupAwarenessExcept(notebookId);

      console.log("🔄 Switched to notebook:", notebookId);
    } catch (error) {
      console.error("Failed to switch notebook:", error);
      setConnectionError("Failed to load notebook");
    } finally {
      setHydratingNotebookId(null);
    }
  }, []);

  const deleteNotebook = useCallback(async (notebookId: string) => {
    await socketCollaborationService.deleteNotebookREST(notebookId);
    setNotebooks((prev) => prev.filter((nb) => nb.id !== notebookId));
    setActiveNotebookId((id) => (id === notebookId ? null : id));
  }, []);

  /* ---------- Context value ---------- */
  const value: CollaborationContextType = {
    isConnected,
    connectionError,
    notebooks,
    activeNotebookId,
    hydratingNotebookId,
    createNotebook,
    renameNotebook,
    switchNotebook,
    deleteNotebook,
    activeUsers,
    isLoadingNotebooks,
    isCreatingNotebook,
    setLocalPresence, // 🔵 added
  };

  return (
    <CollaborationContext.Provider value={value}>
      {children}
    </CollaborationContext.Provider>
  );
}
