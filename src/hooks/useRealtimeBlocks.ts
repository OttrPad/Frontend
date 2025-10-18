import { useEffect, useCallback } from "react";
import {
  socketCollaborationService,
  type BlockInfo,
} from "../lib/socketCollaborationService";
import { useBlocksStore } from "../store/workspace";
import type { Lang } from "../types/workspace";
import * as Y from "yjs";

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
      updateBlock: (id: string, data: Partial<Block>) => void;
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

  useEffect(() => {
    if (!activeNotebookId) return;

    (async () => {
      let ydoc = socketCollaborationService.getYjsDocument(activeNotebookId);
      if (!ydoc) {
        ydoc = await socketCollaborationService.setupYjsDocument(
          activeNotebookId
        );
      }

      if (!ydoc) return; // Safety check

      const stateBase64 = await socketCollaborationService.requestYjsState(
        activeNotebookId
      );
      if (stateBase64) {
        const update = Uint8Array.from(atob(stateBase64), (c) =>
          c.charCodeAt(0)
        );
        Y.applyUpdate(ydoc, update);
        console.log("📥 Hydrated Yjs doc for", activeNotebookId);
      }

      const blockContentMap = ydoc.getMap<Y.Text>("blockContent");
      const observers = new Map<string, (e: Y.YTextEvent) => void>();

      // Attach observer to a Y.Text
      const attachObserver = (blockId: string, ytext: Y.Text) => {
        if (observers.has(blockId)) return;

        const observer = () => {
          const content = ytext.toString();
          // keep React store mirrored with Yjs content
          useBlocksStore.getState().updateBlock(blockId, { content });
        };

        ytext.observe(observer);
        observers.set(blockId, observer);

        // Seed the store once when attaching
        const initial = ytext.toString();
        useBlocksStore.getState().updateBlock(blockId, { content: initial });
      };

      // Attach to existing Y.Text entries
      blockContentMap.forEach((ytext, key) => {
        if (ytext instanceof Y.Text) attachObserver(key, ytext);
      });

      // Watch for adds/updates/deletes of entries in the map
      const mapObserver = (event: Y.YMapEvent<Y.Text>) => {
        event.changes.keys.forEach((change, key) => {
          if (change.action === "add" || change.action === "update") {
            const ytext = blockContentMap.get(key);
            if (ytext instanceof Y.Text) attachObserver(key, ytext);
          } else if (change.action === "delete") {
            const ytext = blockContentMap.get(key);
            const fn = observers.get(key);
            if (ytext && fn) ytext.unobserve(fn);
            observers.delete(key);
            // also remove content from store if you want:
            // useBlocksStore.getState().removeBlock(key);
          }
        });
      };

      blockContentMap.observe(mapObserver);

      return () => {
        blockContentMap.unobserve(mapObserver);
        observers.forEach((fn, key) => {
          const ytext = blockContentMap.get(key);
          if (ytext) ytext.unobserve(fn);
        });
        observers.clear();

        socketCollaborationService.cleanupAwarenessExcept(activeNotebookId);
      };
    })();
  }, [activeNotebookId]);

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
