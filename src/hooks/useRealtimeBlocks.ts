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
  const { setBlocks, upsertBlock, removeBlock, updateBlock } =
    useBlocksStore() as unknown as {
      setBlocks: (blocks: Block[]) => void;
      upsertBlock: (block: Block) => void;
      removeBlock: (id: string) => void;
      updateBlock: (id: string, data: Partial<Block>) => void;
      reorderBlocks: (from: number, to: number) => void;
    };

  // DISABLED: This conflicts with switchNotebook in CollaborationContext
  // which already loads blocks with Yjs content. This hook was overwriting
  // content with empty strings, causing the "content clears" bug.
  //
  // The switchNotebook flow now handles initial block loading with Yjs content.
  // This hook still handles real-time updates (block:created, block:deleted, block:moved)

  // Load current blocks when notebook changes (source of truth = server)
  // useEffect(() => {
  //   let cancelled = false;
  //   const load = async () => {
  //     if (!activeNotebookId) return;
  //     try {
  //       const list = await socketCollaborationService.getBlocks(
  //         activeNotebookId
  //       );
  //       if (!cancelled) {
  //         setBlocks(
  //           list.sort((a, b) => a.position - b.position).map(mapBlockInfo)
  //         );
  //       }
  //     } catch (e) {
  //       console.error("Failed to load blocks:", e);
  //     }
  //   };
  //   load();
  //   return () => {
  //     cancelled = true;
  //   };
  // }, [activeNotebookId, setBlocks]);

  // Socket -> Store
  useEffect(() => {
    if (!activeNotebookId) return;

    const onCreated = (data: { notebookId: string; block: BlockInfo }) => {
      if (data.notebookId !== activeNotebookId) return;

      // Get Yjs content for the newly created block so other users can see it immediately
      const ydoc = socketCollaborationService.getYjsDocument(activeNotebookId);
      let content = "";

      if (ydoc) {
        const blockContent = ydoc.getMap("blockContent");
        const ytext = blockContent.get(data.block.id);
        if (ytext && typeof ytext.toString === "function") {
          content = ytext.toString();
        }
      }

      // Create block with actual Yjs content instead of empty string
      upsertBlock({
        id: data.block.id,
        lang: (data.block.language as Lang) || "python",
        content: content,
        createdAt: data.block.createdAt,
        updatedAt: data.block.updatedAt,
        position: data.block.position,
      });
    };

    const onUpdated = (data: {
      notebookId: string;
      blockId: string;
      language?: string;
    }) => {
      console.log("🔔 block:updated event received:", data);
      if (data.notebookId !== activeNotebookId) {
        console.log(
          "⚠️ Ignoring update for different notebook:",
          data.notebookId,
          "vs",
          activeNotebookId
        );
        return;
      }
      if (data.language) {
        console.log(
          "✅ Updating block language:",
          data.blockId,
          "to",
          data.language
        );
        updateBlock(data.blockId, { lang: data.language as Lang });
      } else {
        console.log("⚠️ No language in update data");
      }
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
    socketCollaborationService.on("block:updated", onUpdated);
    socketCollaborationService.on("block:deleted", onDeleted);
    socketCollaborationService.on("block:moved", onMoved);

    return () => {
      socketCollaborationService.off("block:created", onCreated);
      socketCollaborationService.off("block:updated", onUpdated);
      socketCollaborationService.off("block:deleted", onDeleted);
      socketCollaborationService.off("block:moved", onMoved);
    };
  }, [activeNotebookId, upsertBlock, removeBlock, setBlocks, updateBlock]);

  // Listen to Yjs updates for block content to update the preview
  // This ensures that when other users type in blocks, the preview shows their changes
  useEffect(() => {
    if (!activeNotebookId) return;

    const ydoc = socketCollaborationService.getYjsDocument(activeNotebookId);
    if (!ydoc) return;

    const blockContentMap = ydoc.getMap("blockContent");
    const observers = new Map<string, () => void>();

    // Attach observer to a Y.Text for preview updates
    const attachObserver = (blockId: string, ytext: Y.Text) => {
      if (observers.has(blockId)) return;
      if (!ytext || typeof ytext.toString !== "function") return;

      const observer = () => {
        const content = ytext.toString();
        // Update the store so the preview shows the latest content
        updateBlock(blockId, { content });
      };

      ytext.observe(observer);
      observers.set(blockId, observer);

      // Immediately sync initial content
      const initial = ytext.toString();
      if (initial) {
        updateBlock(blockId, { content: initial });
      }
    };

    // Attach to existing Y.Text entries
    blockContentMap.forEach((ytext, key) => {
      if (ytext instanceof Y.Text) {
        attachObserver(key, ytext);
      }
    });

    // Watch for new Y.Text entries being added (new blocks)
    const mapObserver = (event: Y.YMapEvent<unknown>) => {
      event.changes.keys.forEach((change, key) => {
        if (change.action === "add" || change.action === "update") {
          const ytext = blockContentMap.get(key);
          if (ytext instanceof Y.Text) {
            attachObserver(key, ytext);
          }
        } else if (change.action === "delete") {
          const fn = observers.get(key);
          if (fn) {
            const ytext = blockContentMap.get(key);
            if (ytext instanceof Y.Text) {
              ytext.unobserve(fn);
            }
            observers.delete(key);
          }
        }
      });
    };

    blockContentMap.observe(mapObserver);

    return () => {
      blockContentMap.unobserve(mapObserver);
      observers.forEach((fn, key) => {
        const ytext = blockContentMap.get(key);
        if (ytext instanceof Y.Text) {
          ytext.unobserve(fn);
        }
      });
      observers.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeNotebookId]);

  // DISABLED: Initial Yjs setup and content observation was causing duplicate hydration
  // The above lightweight observer only updates preview content when Yjs changes
  // The MonacoBinding in SharedMonacoEditor handles Y.Text <-> Monaco sync

  // DISABLED: Yjs setup and content observation is now handled in SharedMonacoEditor
  // This was causing duplicate hydration and potential race conditions.
  // The MonacoBinding in SharedMonacoEditor handles Y.Text <-> Monaco sync,
  // and the store is updated via Monaco's onDidChangeContent listener.

  // useEffect(() => {
  //   if (!activeNotebookId) return;
  //
  //   (async () => {
  //     let ydoc = socketCollaborationService.getYjsDocument(activeNotebookId);
  //     if (!ydoc) {
  //       ydoc = await socketCollaborationService.setupYjsDocument(
  //         activeNotebookId
  //       );
  //     }
  //
  //     if (!ydoc) return; // Safety check
  //
  //     const stateBase64 = await socketCollaborationService.requestYjsState(
  //       activeNotebookId
  //     );
  //     if (stateBase64) {
  //       const update = Uint8Array.from(atob(stateBase64), (c) =>
  //         c.charCodeAt(0)
  //       );
  //       Y.applyUpdate(ydoc, update);
  //       console.log("📥 Hydrated Yjs doc for", activeNotebookId);
  //     }
  //
  //     const blockContentMap = ydoc.getMap<Y.Text>("blockContent");
  //     const observers = new Map<string, (e: Y.YTextEvent) => void>();
  //
  //     // Attach observer to a Y.Text
  //     const attachObserver = (blockId: string, ytext: Y.Text) => {
  //       if (observers.has(blockId)) return;
  //
  //       const observer = () => {
  //         const content = ytext.toString();
  //         // keep React store mirrored with Yjs content
  //         useBlocksStore.getState().updateBlock(blockId, { content });
  //       };
  //
  //       ytext.observe(observer);
  //       observers.set(blockId, observer);
  //
  //       // Seed the store once when attaching
  //       const initial = ytext.toString();
  //       useBlocksStore.getState().updateBlock(blockId, { content: initial });
  //     };
  //
  //     // Attach to existing Y.Text entries
  //     blockContentMap.forEach((ytext, key) => {
  //       if (ytext instanceof Y.Text) attachObserver(key, ytext);
  //     });
  //
  //     // Watch for adds/updates/deletes of entries in the map
  //     const mapObserver = (event: Y.YMapEvent<Y.Text>) => {
  //       event.changes.keys.forEach((change, key) => {
  //         if (change.action === "add" || change.action === "update") {
  //           const ytext = blockContentMap.get(key);
  //           if (ytext instanceof Y.Text) attachObserver(key, ytext);
  //         } else if (change.action === "delete") {
  //           const ytext = blockContentMap.get(key);
  //           const fn = observers.get(key);
  //           if (ytext && fn) ytext.unobserve(fn);
  //           observers.delete(key);
  //           // also remove content from store if you want:
  //           // useBlocksStore.getState().removeBlock(key);
  //         }
  //       });
  //     };
  //
  //     blockContentMap.observe(mapObserver);
  //
  //     return () => {
  //       blockContentMap.unobserve(mapObserver);
  //       observers.forEach((fn, key) => {
  //         const ytext = blockContentMap.get(key);
  //         if (ytext) ytext.unobserve(fn);
  //       });
  //       observers.clear();
  //
  //       socketCollaborationService.cleanupAwarenessExcept(activeNotebookId);
  //     };
  //   })();
  // }, [activeNotebookId]);

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
