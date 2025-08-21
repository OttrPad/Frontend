import { useState, useCallback } from "react";
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
import { Block } from "./Block";
import { Button } from "../ui/button";
import { Plus, FileText } from "lucide-react";

export function NotebookArea() {
  const { blocks, addBlock, reorderBlocks } = useBlocksStore();
  const [isDragging, setIsDragging] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setIsDragging(false);

      if (over && active.id !== over.id) {
        const oldIndex = blocks.findIndex((block) => block.id === active.id);
        const newIndex = blocks.findIndex((block) => block.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
          reorderBlocks(oldIndex, newIndex);
        }
      }
    },
    [blocks, reorderBlocks]
  );

  const handleAddBlock = () => {
    addBlock();
  };

  const handleAddBlockAt = (position: number) => {
    addBlock(position);
  };

  return (
    <div className="h-full bg-transparent flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-white/[0.08] bg-gray-800/30 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Notebook</h2>
          <Button
            onClick={handleAddBlock}
            size="sm"
            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/20 transition-all duration-200"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Block
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {blocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-white/60">
            <FileText className="w-16 h-16 mb-4 text-orange-400/60" />
            <h3 className="text-xl font-semibold mb-2 text-white">
              No blocks yet
            </h3>
            <p className="text-white/40 mb-4 text-center max-w-md">
              Create your first code block to start building your project
            </p>
            <Button
              onClick={handleAddBlock}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/20 transition-all duration-200"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create First Block
            </Button>
          </div>
        ) : (
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
                    <div key={block.id}>
                      <Block
                        block={block}
                        isDragging={isDragging}
                        onAddBlockBelow={() => handleAddBlockAt(index + 1)}
                      />
                    </div>
                  ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
