import { useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Play,
  Square,
  ChevronDown,
  ChevronRight,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  GripVertical,
  Plus,
  MoreVertical,
} from "lucide-react";
import { Button } from "../ui/button";
import { CodePreview } from "../monaco/CodePreview";
import { BlockOutput } from "./BlockOutput";
import { useBlocksStore } from "../../store/workspace";
import type { Block as BlockType, Lang } from "../../types/workspace";
import type { Monaco } from "@monaco-editor/react";
import * as Y from "yjs";
import { useCollaboration } from "../../hooks/useCollaboration";
import { useExecution } from "../../hooks/useExecution";
import { useExecutionStatus } from "../../hooks/useExecutionStatus";
import { useParams } from "react-router-dom";
import { useRealtimeBlocks } from "../../hooks/useRealtimeBlocks";
import { socketCollaborationService } from "../../lib/socketCollaborationService";

interface OptimizedBlockProps {
  block: BlockType;
  isDragging: boolean;
  onAddBlockBelow: () => void;
  onFocus: (blockId: string) => void;
  isEditor: boolean;
  monaco?: Monaco | null;
}

const LANGUAGE_OPTIONS: { value: Lang; label: string }[] = [
  { value: "python", label: "Python" },
  { value: "json", label: "JSON" },
  { value: "markdown", label: "Markdown" },
];

const calculateBlockHeight = (content: string): number => {
  if (!content || content.trim() === "") return 120;
  const lines = content.split("\n").length;
  const lineHeight = 20;
  const padding = 32;
  const visible = Math.max(4, Math.min(lines + 1, 30));
  return visible * lineHeight + padding;
};

export function OptimizedBlock({
  block,
  isDragging,
  onAddBlockBelow,
  onFocus,
  isEditor,
  monaco,
}: OptimizedBlockProps) {
  const { blocks, updateBlock } = useBlocksStore();
  const { activeNotebookId } = useCollaboration();
  const { roomId, roomCode } = useParams();
  const roomIdentifier = (roomId || roomCode || "") as string;
  const { runSingle, isRunning: globalRunning } = useExecution(roomIdentifier);
  const { isReady: execReady } = useExecutionStatus(roomIdentifier);
  const { deleteBlock: deleteBlockRT, createBlockAt } =
    useRealtimeBlocks(activeNotebookId);

  const [showLanguageSelect, setShowLanguageSelect] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [moreMenuPosition, setMoreMenuPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const languageButtonRef = useRef<HTMLButtonElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  };

  const handleLanguageChange = (lang: Lang) => {
    updateBlock(block.id, { lang });
    setShowLanguageSelect(false);
  };

  const calculatePosition = useCallback(
    (ref: React.RefObject<HTMLButtonElement | null>) => {
      const r = ref.current?.getBoundingClientRect();
      return r
        ? { top: r.bottom + window.scrollY, left: r.left + window.scrollX }
        : { top: 0, left: 0 };
    },
    []
  );

  const handleLanguageToggle = useCallback(() => {
    if (!showLanguageSelect)
      setDropdownPosition(calculatePosition(languageButtonRef));
    setShowLanguageSelect((v) => !v);
  }, [showLanguageSelect, calculatePosition]);

  const handleMoreMenuToggle = useCallback(() => {
    if (!showMoreMenu) setMoreMenuPosition(calculatePosition(moreButtonRef));
    setShowMoreMenu((v) => !v);
  }, [showMoreMenu, calculatePosition]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        showLanguageSelect &&
        languageButtonRef.current &&
        !languageButtonRef.current.contains(t)
      ) {
        setShowLanguageSelect(false);
      }
      if (
        showMoreMenu &&
        moreButtonRef.current &&
        !moreButtonRef.current.contains(t)
      ) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [showLanguageSelect, showMoreMenu]);

  const handleRun = () => {
    if (!block.content.trim()) return;
    if (block.isRunning || globalRunning) return; // simple guard
    if (!execReady) return; // block execution while setting up
    runSingle(block.id);
  };

  // Server-side reordering
  const handleMoveUp = async () => {
    if (!activeNotebookId) return;
    const idx = blocks.findIndex((b) => b.id === block.id);
    if (idx <= 0) return;
    try {
      await socketCollaborationService.moveBlock(
        activeNotebookId,
        block.id,
        idx - 1
      );
    } catch (e) {
      console.error("Move up failed:", e);
    }
  };

  const handleMoveDown = async () => {
    if (!activeNotebookId) return;
    const idx = blocks.findIndex((b) => b.id === block.id);
    if (idx === -1 || idx >= blocks.length - 1) return;
    try {
      await socketCollaborationService.moveBlock(
        activeNotebookId,
        block.id,
        idx + 1
      );
    } catch (e) {
      console.error("Move down failed:", e);
    }
  };

  // Realtime delete
  const handleDelete = async () => {
    setShowMoreMenu(false);
    if (!activeNotebookId) return;
    try {
      await deleteBlockRT(block.id); // server will broadcast; hook removes locally
    } catch (e) {
      console.error("Delete failed:", e);
    }
  };

  const handleDuplicate = async () => {
    setShowMoreMenu(false);
    if (!activeNotebookId) return;
    const idx = blocks.findIndex((b) => b.id === block.id);
    const insertAt = idx === -1 ? blocks.length : idx + 1;

    try {
      await createBlockAt(insertAt, "code", block.lang || "python");
      setTimeout(() => {
        // Find the newest block at that position (store is refreshed by hook)
        const latest = useBlocksStore
          .getState()
          .blocks.slice()
          .sort((a, b) => a.position - b.position)[insertAt];
        if (latest) {
          useBlocksStore
            .getState()
            .updateBlock(latest.id, { content: block.content });
          // Update Yjs content for the duplicated block so peers receive it
          if (activeNotebookId) {
            const ydoc =
              socketCollaborationService.getYjsDocument(activeNotebookId) ||
              socketCollaborationService.setupYjsDocument(activeNotebookId);
            const blockContent = ydoc.getMap<Y.Text>("blockContent");
            let ytext = blockContent.get(latest.id);
            if (!ytext) {
              ytext = new Y.Text();
              blockContent.set(latest.id, ytext);
            }
            ydoc.transact(() => {
              ytext!.delete(0, ytext!.length);
              ytext!.insert(0, block.content);
            });
          }
        }
      }, 150);
    } catch (e) {
      console.error("Duplicate failed:", e);
    }
  };

  const handleToggleCollapse = () => {
    updateBlock(block.id, { collapsed: !block.collapsed });
  };

  const handleBlockFocus = () => {
    if (!isEditor) onFocus(block.id);
  };

  const currentIndex = blocks.findIndex((b) => b.id === block.id);
  const canMoveUp = currentIndex > 0;
  const canMoveDown = currentIndex < blocks.length - 1;
  const blockHeight = calculateBlockHeight(block.content);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        bg-card/30 backdrop-blur-2xl border border-border rounded-lg overflow-hidden
        shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] ring-1 ring-orange-400/10
        ${
          isDragging
            ? "shadow-[0_16px_64px_0_rgba(251,146,61,0.2)]"
            : "shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]"
        }
        ${isEditor ? "ring-2 ring-orange-400/30" : ""}
        transition-all duration-200 hover:ring-orange-400/20
      `}
      data-block-id={block.id}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-white/[0.03] backdrop-blur-md border-b border-white/[0.08] z-50">
        <div className="flex items-center space-x-2">
          <button
            {...attributes}
            {...listeners}
            className="text-muted-foreground hover:text-orange-400 cursor-grab active:cursor-grabbing transition-colors"
            title="Drag to reorder"
          >
            <GripVertical className="w-4 h-4" />
          </button>

          <div className="relative">
            <Button
              ref={languageButtonRef}
              variant="ghost"
              size="sm"
              onClick={handleLanguageToggle}
              className="text-orange-400 hover:text-orange-300 hover:bg-white/[0.05] font-mono text-xs"
            >
              {LANGUAGE_OPTIONS.find((l) => l.value === block.lang)?.label ||
                "Python"}
            </Button>

            {showLanguageSelect &&
              dropdownPosition &&
              createPortal(
                <div
                  className="fixed z-[99999] bg-popover/90 backdrop-blur-xl border border-border rounded-md shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] mt-1 block-dropdown-menu"
                  style={{
                    top: dropdownPosition.top,
                    left: dropdownPosition.left,
                  }}
                >
                  {LANGUAGE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleLanguageChange(option.value)}
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors
                        ${
                          block.lang === option.value
                            ? "bg-accent text-orange-400"
                            : "text-foreground/80"
                        }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>,
                document.body
              )}
          </div>

          <button
            onClick={handleToggleCollapse}
            className="text-muted-foreground hover:text-orange-400 transition-colors"
            title={block.collapsed ? "Expand" : "Collapse"}
          >
            {block.collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>

        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRun}
            disabled={!block.content.trim() || !execReady}
            className={`h-7 px-2 text-xs ${
              block.isRunning
                ? "text-red-400 hover:text-red-300"
                : "text-green-400 hover:text-green-300"
            }`}
            title={block.isRunning ? "Stop" : "Run Block (Shift+Enter)"}
          >
            {block.isRunning ? (
              <Square className="w-3 h-3" />
            ) : (
              <Play className="w-3 h-3" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleMoveUp}
            disabled={!canMoveUp}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-orange-400 hover:bg-accent disabled:opacity-30 transition-colors"
            title="Move Up (Alt+↑)"
          >
            <ArrowUp className="w-3 h-3" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleMoveDown}
            disabled={!canMoveDown}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-orange-400 hover:bg-accent disabled:opacity-30 transition-colors"
            title="Move Down (Alt+↓)"
          >
            <ArrowDown className="w-3 h-3" />
          </Button>

          <div className="relative">
            <Button
              ref={moreButtonRef}
              variant="ghost"
              size="sm"
              onClick={handleMoreMenuToggle}
              className="h-7 w-7 p-0 text-muted-foreground hover:text-orange-400 hover:bg-accent transition-colors"
            >
              <MoreVertical className="w-3 h-3" />
            </Button>

            {showMoreMenu &&
              moreMenuPosition &&
              createPortal(
                <div
                  className="fixed z-[99999] bg-popover/90 backdrop-blur-xl border border-border rounded-md shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] min-w-[140px] block-dropdown-menu"
                  style={{
                    top: moreMenuPosition.top,
                    left: moreMenuPosition.left - 140,
                  }}
                >
                  <button
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowMoreMenu(false);
                      onAddBlockBelow();
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-foreground/80 hover:bg-accent hover:text-foreground transition-colors flex items-center space-x-2"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Below</span>
                  </button>
                  <button
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDuplicate();
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-foreground/80 hover:bg-accent hover:text-foreground transition-colors flex items-center space-x-2"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Duplicate</span>
                  </button>
                  <div className="h-px bg-white/10 my-1" />
                  <button
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDelete();
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-white/[0.05] hover:text-red-300 transition-colors flex items-center space-x-2"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Delete</span>
                  </button>
                </div>,
                document.body
              )}
          </div>
        </div>
      </div>

      {/* Content */}
      {!block.collapsed && (
        <div className="flex flex-col">
          {isEditor ? (
            <div
              className="bg-muted/40 backdrop-blur-sm rounded-md m-2 relative z-10 isolate"
              style={{ minHeight: blockHeight }}
            >
              <div
                className="monaco-editor-placeholder"
                style={{ minHeight: blockHeight }}
                data-block-id={block.id}
              />
            </div>
          ) : (
            <div
              className="bg-muted/40 backdrop-blur-sm rounded-md m-2 relative z-10 isolate"
              style={{ minHeight: blockHeight }}
            >
              <CodePreview
                content={block.content}
                language={block.lang}
                onClick={handleBlockFocus}
                monaco={monaco}
                minHeight={blockHeight}
                className="rounded-md overflow-hidden"
              />
            </div>
          )}

          {(block.output || block.error || block.isRunning) && (
            <BlockOutput
              output={block.output}
              error={block.error}
              isRunning={block.isRunning}
            />
          )}
        </div>
      )}
    </div>
  );
}
