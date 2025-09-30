import { useEffect, useCallback } from "react";
import {
  socketCollaborationService,
  type BlockInfo,
} from "../lib/socketCollaborationService";
import { useBlocksStore } from "../store/workspace";
import type { Lang } from "../types/workspace";

type Block = {
  id: string;
  lang: Lang;
  content: string;
  createdAt: number;
  updatedAt: number;
  position: number;
};

function mapBlockInfo(b: BlockInfo): Block {
  return {
    id: b.id,
    lang: (b.language as Lang) || "python",
    content: "", // YJS/editor will hydrate content
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
    position: b.position,
  };
}

export function useRealtimeBlocks(activeNotebookId: string | null) {
  const { setBlocks, upsertBlock, removeBlock } =
    useBlocksStore() as unknown as {
      setBlocks: (blocks: Block[]) => void;
      upsertBlock: (block: Block) => void;
      removeBlock: (id: string) => void;
      reorderBlocks: (from: number, to: number) => void;
    };

  // Load current blocks when notebook changes (source of truth = server)
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!activeNotebookId) return;
      try {
        const list = await socketCollaborationService.getBlocks(
          activeNotebookId
        );
        if (!cancelled) {
          setBlocks(
            list.sort((a, b) => a.position - b.position).map(mapBlockInfo)
          );
        }
      } catch (e) {
        console.error("Failed to load blocks:", e);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [activeNotebookId, setBlocks]);

  // Socket -> Store
  useEffect(() => {
    if (!activeNotebookId) return;

    const onCreated = (data: { notebookId: string; block: BlockInfo }) => {
      if (data.notebookId !== activeNotebookId) return;
      upsertBlock(mapBlockInfo(data.block));
    };

    const onDeleted = (data: { notebookId: string; blockId: string }) => {
      if (data.notebookId !== activeNotebookId) return;
      removeBlock(data.blockId);
    };

    const onMoved = (data: {
      notebookId: string;
      blockId: string;
      newPosition: number;
    }) => {
      if (data.notebookId !== activeNotebookId) return;
      // simplest: reload order from server (avoids local index math)
      socketCollaborationService
        .getBlocks(activeNotebookId)
        .then((list) =>
          setBlocks(
            list.sort((a, b) => a.position - b.position).map(mapBlockInfo)
          )
        )
        .catch((err) => console.error("Failed to refresh after move:", err));
    };

    socketCollaborationService.on("block:created", onCreated);
    socketCollaborationService.on("block:deleted", onDeleted);
    socketCollaborationService.on("block:moved", onMoved);

    return () => {
      socketCollaborationService.off("block:created", onCreated);
      socketCollaborationService.off("block:deleted", onDeleted);
      socketCollaborationService.off("block:moved", onMoved);
    };
  }, [activeNotebookId, upsertBlock, removeBlock, setBlocks]);

  // Actions (REST -> server will broadcast -> this hook upserts/deletes)
  const createBlockAt = useCallback(
    async (
      position: number,
      type: "code" | "markdown" | "output" = "code",
      language = "python"
    ) => {
      if (!activeNotebookId) return;
      try {
        await socketCollaborationService.createBlock(
          activeNotebookId,
          type,
          position,
          language
        );
        // no local insert here — we rely on server `block:created` to avoid dupes
      } catch (e) {
        console.error("Failed to create block:", e);
      }
    },
    [activeNotebookId]
  );

  const deleteBlock = useCallback(
    async (blockId: string) => {
      if (!activeNotebookId) return;
      try {
        await socketCollaborationService.deleteBlock(activeNotebookId, blockId);
        // no local removal here — server will emit `block:deleted`
      } catch (e) {
        console.error("Failed to delete block:", e);
      }
    },
    [activeNotebookId]
  );

  return { createBlockAt, deleteBlock };
}
