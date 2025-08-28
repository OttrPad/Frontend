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

interface OptimizedBlockProps {
  block: BlockType;
  isDragging: boolean;
  onAddBlockBelow: () => void;
  onFocus: (blockId: string) => void;
  isEditor: boolean; // Whether this block should show the editor or preview
  monaco?: Monaco | null;
}

const LANGUAGE_OPTIONS: { value: Lang; label: string }[] = [
  { value: "python", label: "Python" },
  { value: "json", label: "JSON" },
  { value: "markdown", label: "Markdown" },
];

// Calculate height based on content lines
const calculateBlockHeight = (content: string): number => {
  if (!content || content.trim() === "") {
    return 120; // Fixed height for empty content
  }

  const lines = content.split("\n");
  const actualLines = lines.length;
  const lineHeight = 20; // Height per line in Monaco
  const padding = 32; // Top and bottom padding for Monaco

  // Calculate height: at least 4 lines visible, max 30 lines
  const visibleLines = Math.max(4, Math.min(actualLines + 1, 30)); // +1 for cursor line
  return visibleLines * lineHeight + padding;
};

export function OptimizedBlock({
  block,
  isDragging,
  onAddBlockBelow,
  onFocus,
  isEditor,
  monaco,
}: OptimizedBlockProps) {
  const {
    updateBlock,
    deleteBlock,
    duplicateBlock,
    runBlock,
    stopBlock,
    blocks,
  } = useBlocksStore();

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
    (buttonRef: React.RefObject<HTMLButtonElement | null>) => {
      if (!buttonRef.current) return { top: 0, left: 0 };

      const rect = buttonRef.current.getBoundingClientRect();
      return {
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
      };
    },
    []
  );

  const handleLanguageToggle = useCallback(() => {
    if (!showLanguageSelect) {
      setDropdownPosition(calculatePosition(languageButtonRef));
    }
    setShowLanguageSelect(!showLanguageSelect);
  }, [showLanguageSelect, calculatePosition]);

  const handleMoreMenuToggle = useCallback(() => {
    if (!showMoreMenu) {
      setMoreMenuPosition(calculatePosition(moreButtonRef));
    }
    setShowMoreMenu(!showMoreMenu);
  }, [showMoreMenu, calculatePosition]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (
        showLanguageSelect &&
        languageButtonRef.current &&
        !languageButtonRef.current.contains(target)
      ) {
        setShowLanguageSelect(false);
      }

      if (
        showMoreMenu &&
        moreButtonRef.current &&
        !moreButtonRef.current.contains(target)
      ) {
        setShowMoreMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showLanguageSelect, showMoreMenu]);

  const handleRun = () => {
    if (block.isRunning) {
      stopBlock(block.id);
    } else {
      runBlock(block.id);
    }
  };

  const handleMoveUp = () => {
    const currentIndex = blocks.findIndex((b) => b.id === block.id);
    if (currentIndex > 0) {
      console.log("Move up", currentIndex, currentIndex - 1);
    }
  };

  const handleMoveDown = () => {
    const currentIndex = blocks.findIndex((b) => b.id === block.id);
    if (currentIndex < blocks.length - 1) {
      console.log("Move down", currentIndex, currentIndex + 1);
    }
  };

  const handleDuplicate = () => {
    console.log("Duplicating block:", block.id);
    setShowMoreMenu(false); // Close menu first
    duplicateBlock(block.id);
  };

  const handleDelete = () => {
    console.log("Deleting block:", block.id);
    setShowMoreMenu(false); // Close menu first
    deleteBlock(block.id);
  };

  const handleToggleCollapse = () => {
    updateBlock(block.id, { collapsed: !block.collapsed });
  };

  const handleBlockFocus = () => {
    if (!isEditor) {
      onFocus(block.id);
    }
  };

  const currentIndex = blocks.findIndex((b) => b.id === block.id);
  const canMoveUp = currentIndex > 0;
  const canMoveDown = currentIndex < blocks.length - 1;

  // Calculate dynamic height based on content
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
      {/* Block Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-white/[0.03] backdrop-blur-md border-b border-white/[0.08] z-50">
        {/* Left: Drag Handle & Language */}
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
              {LANGUAGE_OPTIONS.find((lang) => lang.value === block.lang)
                ?.label || "Python"}
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
                      className={`
                      w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors
                      ${
                        block.lang === option.value
                          ? "bg-accent text-orange-400"
                          : "text-foreground/80"
                      }
                    `}
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

        {/* Right: Actions */}
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRun}
            disabled={!block.content.trim()}
            className={`
              h-7 px-2 text-xs
              ${
                block.isRunning
                  ? "text-red-400 hover:text-red-300"
                  : "text-green-400 hover:text-green-300"
              }
            `}
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

      {/* Block Content */}
      {!block.collapsed && (
        <div className="flex flex-col">
          {/* Editor or Preview */}
          {isEditor ? (
            <div
              className="bg-muted/40 backdrop-blur-sm rounded-md m-2 relative z-10 isolate"
              style={{ minHeight: blockHeight }}
            >
              {/* The actual Monaco editor will be positioned here by the parent component */}
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

          {/* Block Output */}
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
