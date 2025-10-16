import { useState, useCallback, useRef, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useBlocksStore } from "../../store/workspace";
import { OptimizedBlock } from "./OptimizedBlock";
import { SharedMonacoEditor } from "../monaco/SharedMonacoEditor";
import { useIntersectionVirtualization } from "../../hooks/useVirtualization";
import { Button } from "../ui/button";
import { Plus, FileText } from "lucide-react";
import type { Monaco } from "@monaco-editor/react";
import { useCollaboration } from "../../hooks/useCollaboration";
import { useRealtimeBlocks } from "../../hooks/useRealtimeBlocks";
import { socketCollaborationService } from "../../lib/socketCollaborationService";
import { apiClient } from "../../lib/apiClient";
import { useUser } from "../../hooks/useUser";
interface OptimizedNotebookAreaProps {
  roomId: string;
}

export function OptimizedNotebookArea({ roomId }: OptimizedNotebookAreaProps) {
  const { blocks, updateBlock } = useBlocksStore();
  const { session } = useUser();

  const { activeNotebookId } = useCollaboration();
  const { createBlockAt /*, deleteBlock*/ } =
    useRealtimeBlocks(activeNotebookId);
  const [isDragging, setIsDragging] = useState(false);
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);
  const [monaco, setMonaco] = useState<Monaco | null>(null);
  const [sharedEditor, setSharedEditor] = useState<HTMLDivElement | null>(null);
  const notebookContainerRef = useRef<HTMLDivElement>(null);
  const editorPositionRef = useRef<{ top: number; height: number }>({
    top: 0,
    height: 120,
  });

  // --- Content preservation shield -----------------------------------------

  // Visible workspace packages for the room
  const [workspacePackages, setWorkspacePackages] = useState<string[] | null>(
    null
  );

  // Fetch workspace requirements using /api/workspaces/{id}
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const roomsResp = await apiClient.getAllRooms();
        const target = roomsResp.rooms?.find(
          (r) => r.room_code === roomId || String(r.room_id) === roomId
        );
        const wsId = target?.workspace_id;
        if (wsId === undefined || wsId === null) {
          if (mounted) setWorkspacePackages([]);
          return;
        }
        const wsResp = await apiClient.getWorkspaceById(wsId);
        const req = wsResp.workspace?.requirements || "";
        const parsed = req
          .split(/\r?\n|,/) // newline or comma separated
          .map((s) => s.trim())
          .filter((s) => s.length > 0 && !s.startsWith("#"))
          .map((s) => s.replace(/\s+#.*$/, "")) // strip inline comments
          .filter((s) => s.length > 0);
        if (mounted) setWorkspacePackages(parsed);
      } catch {
        if (mounted) setWorkspacePackages([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [roomId]);

  // --------------------------------------------------------------------------

  // Virtualization for performance
  const { observeElement } = useIntersectionVirtualization(0.1);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setIsDragging(false);
      if (!over || active.id === over.id || !activeNotebookId) return;

      const oldIndex = blocks.findIndex((b) => b.id === active.id);
      const newIndex = blocks.findIndex((b) => b.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      try {
        await socketCollaborationService.moveBlock(
          activeNotebookId,
          String(active.id),
          newIndex
        );
      } catch (e) {
        console.error("Failed to move block:", e);
      }
    },
    [blocks, activeNotebookId]
  );

  const handleAddBlock = useCallback(() => {
    if (!activeNotebookId) return;

    const position = blocks.length; // append
    createBlockAt(position, "code", "python").catch((e) =>
      console.error("Failed to create block:", e)
    );
  }, [activeNotebookId, blocks, createBlockAt]);

  const handleAddBlockAt = useCallback(
    (position: number) => {
      if (!activeNotebookId) return;

      createBlockAt(position, "code", "python").catch((e) =>
        console.error("Failed to create block:", e)
      );
    },
    [activeNotebookId, createBlockAt]
  );

  const handleBlockFocus = useCallback((blockId: string) => {
    setFocusedBlockId(blockId);
  }, []);

  const handleContentChange = useCallback(
    (blockId: string, content: string) => {
      // Local UI update for snappy typing
      updateBlock(blockId, { content });

      // (Your YJS/socket emission should happen elsewhere in your pipeline)
    },
    [updateBlock]
  );

  const handleMonacoInit = useCallback((monacoInstance: Monaco) => {
    setMonaco(monacoInstance);
  }, []);

  // Position the shared editor over the focused block
  useEffect(() => {
    if (!focusedBlockId || !sharedEditor) return;

    const positionEditor = () => {
      const blockElement = document.querySelector(
        `[data-block-id="${focusedBlockId}"]`
      );
      const editorPlaceholder = blockElement?.querySelector(
        ".monaco-editor-placeholder"
      ) as HTMLElement;

      if (editorPlaceholder && notebookContainerRef.current) {
        const containerRect =
          notebookContainerRef.current.getBoundingClientRect();
        const placeholderRect = editorPlaceholder.getBoundingClientRect();

        const top =
          placeholderRect.top -
          containerRect.top +
          notebookContainerRef.current.scrollTop;
        const height = placeholderRect.height;

        editorPositionRef.current = { top, height };

        sharedEditor.style.position = "absolute";
        sharedEditor.style.top = `${top}px`;
        sharedEditor.style.left = `${
          placeholderRect.left - containerRect.left
        }px`;
        sharedEditor.style.width = `${placeholderRect.width}px`;
        sharedEditor.style.height = `${height}px`;
        sharedEditor.style.zIndex = "10";
        sharedEditor.style.borderRadius = "6px";
        sharedEditor.style.overflow = "hidden";
      }
    };

    positionEditor();

    const handleReposition = () => requestAnimationFrame(positionEditor);
    const container = notebookContainerRef.current;
    if (container) {
      container.addEventListener("scroll", handleReposition, { passive: true });
      window.addEventListener("resize", handleReposition, { passive: true });
      return () => {
        container.removeEventListener("scroll", handleReposition);
        window.removeEventListener("resize", handleReposition);
      };
    }
  }, [focusedBlockId, sharedEditor, blocks]);

  // Auto-focus first block if none is focused
  useEffect(() => {
    if (!focusedBlockId && blocks.length > 0) {
      setFocusedBlockId(blocks[0].id);
    }
  }, [focusedBlockId, blocks]);

  // When the focused block is deleted, move focus gracefully
  useEffect(() => {
    if (focusedBlockId && !blocks.find((b) => b.id === focusedBlockId)) {
      if (blocks.length > 0) {
        setFocusedBlockId(blocks[0].id);
      } else {
        setFocusedBlockId(null);
      }
    }
  }, [focusedBlockId, blocks]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!focusedBlockId) return;

      const currentIndex = blocks.findIndex((b) => b.id === focusedBlockId);

      if (event.key === "ArrowUp" && event.altKey) {
        event.preventDefault();
        if (currentIndex > 0) {
          setFocusedBlockId(blocks[currentIndex - 1].id);
        }
      } else if (event.key === "ArrowDown" && event.altKey) {
        event.preventDefault();
        if (currentIndex < blocks.length - 1) {
          setFocusedBlockId(blocks[currentIndex + 1].id);
        }
      } else if (event.key === "Enter" && event.shiftKey) {
        event.preventDefault();
        const block = blocks.find((b) => b.id === focusedBlockId);
        if (block && !block.isRunning) {
          console.log("Run block:", focusedBlockId);
        }
      } else if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        handleAddBlockAt(currentIndex + 1);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [focusedBlockId, blocks, handleAddBlockAt]);

  return (
    <div className="h-full bg-transparent flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-border bg-card/30 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-lg font-semibold text-foreground">Notebook</h2>
            {workspacePackages && (
              <div
                className="flex items-center gap-1 flex-wrap max-w-[50vw]"
                aria-label="Workspace packages"
                title={
                  workspacePackages.length > 0
                    ? `Packages: ${workspacePackages.join(", ")}`
                    : "No packages specified"
                }
              >
                {workspacePackages.length === 0 ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-muted text-muted-foreground border border-border">
                    No packages
                  </span>
                ) : (
                  <>
                    {workspacePackages.slice(0, 6).map((p) => (
                      <span
                        key={p}
                        className="px-2 py-0.5 rounded-full text-[10px] bg-orange-500/15 text-orange-300 border border-orange-500/30"
                      >
                        {p}
                      </span>
                    ))}
                    {workspacePackages.length > 6 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-orange-500/10 text-orange-200 border border-orange-500/20">
                        +{workspacePackages.length - 6} more
                      </span>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-muted-foreground">
              {blocks.length} blocks
            </span>
            <Button
              onClick={handleAddBlock}
              size="sm"
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/20 transition-all duration-200"
              disabled={!activeNotebookId}
              title={!activeNotebookId ? "No active notebook" : "Add Block"}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Block
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div
        ref={notebookContainerRef}
        className="flex-1 overflow-y-auto scrollbar-thin relative"
      >
        {blocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <FileText className="w-16 h-16 mb-4 text-orange-400/60" />
            <h3 className="text-xl font-semibold mb-2 text-foreground">
              No blocks yet
            </h3>
            <p className="text-muted-foreground mb-4 text-center max-w-md">
              Create your first code block to start building your project
            </p>
            <Button
              onClick={handleAddBlock}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/20 transition-all duration-200"
              disabled={!activeNotebookId}
              title={!activeNotebookId ? "No active notebook" : "Create Block"}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create First Block
            </Button>
          </div>
        ) : (
          <>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={blocks.map((block) => block.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="p-4 space-y-4">
                  {blocks
                    .sort((a, b) => a.position - b.position)
                    .map((block, index) => (
                      <div
                        key={block.id}
                        ref={(element) => observeElement(block.id, element)}
                        data-block-index={index}
                        data-block-id={block.id}
                      >
                        <OptimizedBlock
                          block={block}
                          isDragging={isDragging}
                          onAddBlockBelow={() => handleAddBlockAt(index + 1)}
                          onFocus={handleBlockFocus}
                          isEditor={focusedBlockId === block.id}
                          monaco={monaco}
                        />
                      </div>
                    ))}
                </div>
              </SortableContext>
            </DndContext>

            {/* Shared Monaco Editor */}
            {focusedBlockId && (
              <div
                ref={setSharedEditor}
                className="shared-monaco-editor-container"
              >
                <SharedMonacoEditor
                  focusedBlockId={focusedBlockId}
                  // keep this prop if your editor expects it
                  notebookId={activeNotebookId}
                  blocks={blocks}
                  onContentChange={handleContentChange}
                  onMonacoInit={handleMonacoInit}
                  height={editorPositionRef.current.height}
                  className="rounded-md overflow-hidden"
                  userId={session?.user?.id}
                  userEmail={session?.user?.email || ""}
                />
              </div>
            )}
          </>
        )}
      </div>

      {process.env.NODE_ENV === "development" && (
        <div className="absolute bottom-4 right-4 bg-black/50 text-white text-xs px-2 py-1 rounded">
          Focused:{" "}
          {focusedBlockId
            ? blocks.findIndex((b) => b.id === focusedBlockId) + 1
            : "None"}{" "}
          / {blocks.length}
        </div>
      )}
    </div>
  );
}
