import { useState, useCallback } from "react";
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
import { MonacoEditor } from "../monaco/MonacoEditor";
import { BlockOutput } from "./BlockOutput";
import { useBlocksStore, useAppStore } from "../../store/workspace";
import type { Block as BlockType, Lang } from "../../types/workspace";

interface BlockProps {
  block: BlockType;
  isDragging: boolean;
  onAddBlockBelow: () => void;
}

const LANGUAGE_OPTIONS: { value: Lang; label: string }[] = [
  { value: "python", label: "Python" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "json", label: "JSON" },
  { value: "markdown", label: "Markdown" },
];

export function Block({ block, isDragging, onAddBlockBelow }: BlockProps) {
  const {
    updateBlock,
    deleteBlock,
    duplicateBlock,
    runBlock,
    stopBlock,
    blocks,
  } = useBlocksStore();
  const { theme } = useAppStore();

  const [showLanguageSelect, setShowLanguageSelect] = useState(false);
  const [contentBuffer, setContentBuffer] = useState(block.content);

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

  // Debounced content update
  const updateContentDebounced = useCallback(
    (newContent: string) => {
      setContentBuffer(newContent);
      const timeoutId = setTimeout(() => {
        updateBlock(block.id, { content: newContent });
      }, 300);

      return () => clearTimeout(timeoutId);
    },
    [block.id, updateBlock]
  );

  const handleLanguageChange = (lang: Lang) => {
    updateBlock(block.id, { lang });
    setShowLanguageSelect(false);
  };

  const handleRun = () => {
    if (block.isRunning) {
      stopBlock(block.id);
    } else {
      // Update content before running
      updateBlock(block.id, { content: contentBuffer });
      runBlock(block.id);
    }
  };

  const handleMoveUp = () => {
    const currentIndex = blocks.findIndex((b) => b.id === block.id);
    if (currentIndex > 0) {
      const targetIndex = currentIndex - 1;
      // This would be handled by the parent NotebookArea through DnD
      console.log("Move up", currentIndex, targetIndex);
    }
  };

  const handleMoveDown = () => {
    const currentIndex = blocks.findIndex((b) => b.id === block.id);
    if (currentIndex < blocks.length - 1) {
      const targetIndex = currentIndex + 1;
      // This would be handled by the parent NotebookArea through DnD
      console.log("Move down", currentIndex, targetIndex);
    }
  };

  const handleDuplicate = () => {
    duplicateBlock(block.id);
  };

  const handleDelete = () => {
    deleteBlock(block.id);
  };

  const handleToggleCollapse = () => {
    updateBlock(block.id, { collapsed: !block.collapsed });
  };

  const currentIndex = blocks.findIndex((b) => b.id === block.id);
  const canMoveUp = currentIndex > 0;
  const canMoveDown = currentIndex < blocks.length - 1;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        bg-gray-800/30 backdrop-blur-2xl border border-white/[0.08] rounded-lg overflow-hidden
        shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] ring-1 ring-orange-400/10
        ${
          isDragging
            ? "shadow-[0_16px_64px_0_rgba(251,146,61,0.2)]"
            : "shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]"
        }
        transition-all duration-200 hover:ring-orange-400/20
      `}
    >
      {/* Block Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-white/[0.03] backdrop-blur-md border-b border-white/[0.08]">
        {/* Left: Drag Handle & Language */}
        <div className="flex items-center space-x-2">
          <button
            {...attributes}
            {...listeners}
            className="text-white/40 hover:text-orange-400 cursor-grab active:cursor-grabbing transition-colors"
            title="Drag to reorder"
          >
            <GripVertical className="w-4 h-4" />
          </button>

          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowLanguageSelect(!showLanguageSelect)}
              className="text-orange-400 hover:text-orange-300 hover:bg-white/[0.05] font-mono text-xs"
            >
              {LANGUAGE_OPTIONS.find((lang) => lang.value === block.lang)
                ?.label || "Python"}
            </Button>

            {showLanguageSelect && (
              <div className="absolute top-full left-0 z-10 bg-gray-800/90 backdrop-blur-xl border border-white/[0.08] rounded-md shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] mt-1">
                {LANGUAGE_OPTIONS.map((lang) => (
                  <button
                    key={lang.value}
                    onClick={() => handleLanguageChange(lang.value)}
                    className={`
                      block w-full px-3 py-2 text-left text-sm hover:bg-white/[0.05] transition-colors
                      ${
                        block.lang === lang.value
                          ? "text-orange-400 bg-white/[0.05]"
                          : "text-white/80 hover:text-white"
                      }
                    `}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleToggleCollapse}
            className="text-white/40 hover:text-orange-400 transition-colors"
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
            disabled={!contentBuffer.trim()}
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
            className="h-7 w-7 p-0 text-white/40 hover:text-orange-400 hover:bg-white/[0.05] disabled:opacity-30 transition-colors"
            title="Move Up (Alt+↑)"
          >
            <ArrowUp className="w-3 h-3" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleMoveDown}
            disabled={!canMoveDown}
            className="h-7 w-7 p-0 text-white/40 hover:text-orange-400 hover:bg-white/[0.05] disabled:opacity-30 transition-colors"
            title="Move Down (Alt+↓)"
          >
            <ArrowDown className="w-3 h-3" />
          </Button>

          <div className="relative group">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-white/40 hover:text-orange-400 hover:bg-white/[0.05] transition-colors"
            >
              <MoreVertical className="w-3 h-3" />
            </Button>

            <div className="absolute right-0 top-full mt-1 bg-gray-800/90 backdrop-blur-xl border border-white/[0.08] rounded-md shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] opacity-0 group-hover:opacity-100 transition-opacity z-10 min-w-[140px]">
              <button
                onClick={onAddBlockBelow}
                className="w-full px-3 py-2 text-left text-sm text-white/80 hover:bg-white/[0.05] hover:text-white transition-colors flex items-center space-x-2"
              >
                <Plus className="w-3 h-3" />
                <span>Add Below</span>
              </button>
              <button
                onClick={handleDuplicate}
                className="w-full px-3 py-2 text-left text-sm text-white/80 hover:bg-white/[0.05] hover:text-white transition-colors flex items-center space-x-2"
              >
                <Copy className="w-3 h-3" />
                <span>Duplicate</span>
              </button>
              <div className="h-px bg-white/10 my-1" />
              <button
                onClick={handleDelete}
                className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-white/[0.05] hover:text-red-300 transition-colors flex items-center space-x-2"
              >
                <Trash2 className="w-3 h-3" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Block Content */}
      {!block.collapsed && (
        <div className="flex flex-col">
          {/* Monaco Editor */}
          <div className="min-h-[120px] bg-gray-900/40 backdrop-blur-sm rounded-md m-2">
            <MonacoEditor
              value={contentBuffer}
              onChange={updateContentDebounced}
              language={block.lang}
              theme={theme}
              height={120}
              options={{
                minimap: { enabled: false },
                lineNumbers: "on",
                fontSize: 14,
                lineHeight: 20,
                wordWrap: "on",
                padding: { top: 12, bottom: 12 },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                readOnly: false,
              }}
              className="rounded-md overflow-hidden"
            />
          </div>

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
