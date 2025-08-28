import { useState } from "react";
import {
  useMilestonesStore,
  useBlocksStore,
  useFilesStore,
} from "../../../store/workspace";
import { Button } from "../../ui/button";
import { GitBranch, Clock, Eye, RotateCcw, Trash2 } from "lucide-react";
import { MonacoDiff } from "../../monaco/MonacoDiff";
import type { Milestone } from "../../../types/workspace";

export function VersionsPane() {
  const {
    milestones,
    selectedMilestoneId,
    selectMilestone,
    restoreMilestone,
    deleteMilestone,
  } = useMilestonesStore();
  const { blocks } = useBlocksStore();
  const { files } = useFilesStore();

  const [viewMode, setViewMode] = useState<"list" | "diff">("list");
  const [diffTarget, setDiffTarget] = useState<"blocks" | "files">("blocks");

  const selectedMilestone = milestones.find(
    (m) => m.id === selectedMilestoneId
  );

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getCurrentContent = () => {
    if (diffTarget === "blocks") {
      return blocks
        .map(
          (block) =>
            `# Block ${block.id}\n# Language: ${block.lang}\n${block.content}`
        )
        .join("\n\n---\n\n");
    } else {
      // Simplified file content representation
      const fileContents = files
        .map((file) => {
          if (file.type === "file" && file.content) {
            return `# ${file.path}\n${file.content}`;
          }
          return null;
        })
        .filter(Boolean);
      return fileContents.join("\n\n---\n\n");
    }
  };

  const getMilestoneContent = (milestone: Milestone) => {
    if (diffTarget === "blocks") {
      return milestone.snapshot.blocks
        .map(
          (block) =>
            `# Block ${block.id}\n# Language: ${block.lang}\n${block.content}`
        )
        .join("\n\n---\n\n");
    } else {
      const fileContents = milestone.snapshot.files
        .map((file) => {
          if (file.type === "file" && file.content) {
            return `# ${file.path}\n${file.content}`;
          }
          return null;
        })
        .filter(Boolean);
      return fileContents.join("\n\n---\n\n");
    }
  };

  const handleViewDiff = (milestone: Milestone) => {
    selectMilestone(milestone.id);
    setViewMode("diff");
  };

  const handleRestore = (milestone: Milestone) => {
    if (
      window.confirm(
        `Are you sure you want to restore to "${milestone.name}"? This will replace your current work.`
      )
    ) {
      restoreMilestone(milestone.id);
    }
  };

  const handleDelete = (milestone: Milestone) => {
    if (
      window.confirm(
        `Are you sure you want to delete milestone "${milestone.name}"?`
      )
    ) {
      deleteMilestone(milestone.id);
      if (selectedMilestoneId === milestone.id) {
        selectMilestone(null);
        setViewMode("list");
      }
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <GitBranch className="w-5 h-5 text-orange-400" />
            <h3 className="font-semibold text-foreground">Version Control</h3>
          </div>

          {viewMode === "list" && (
            <div className="text-xs text-muted-foreground">
              {milestones.length} milestone{milestones.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>

        {viewMode === "diff" && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex bg-accent rounded-md p-1">
                <button
                  onClick={() => setDiffTarget("blocks")}
                  className={`px-3 py-1.5 text-xs rounded transition-colors ${
                    diffTarget === "blocks"
                      ? "bg-orange-500 text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  }`}
                >
                  Code Blocks
                </button>
                <button
                  onClick={() => setDiffTarget("files")}
                  className={`px-3 py-1.5 text-xs rounded transition-colors ${
                    diffTarget === "files"
                      ? "bg-orange-500 text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  }`}
                >
                  Project Files
                </button>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setViewMode("list");
                selectMilestone(null);
              }}
              className="bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600"
            >
              ← Back to List
            </Button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {viewMode === "list" ? (
          <div className="h-full overflow-y-auto scrollbar-thin">
            {milestones.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <GitBranch className="w-12 h-12 mb-4" />
                <p className="text-sm">No milestones saved</p>
                <p className="text-xs text-gray-600">
                  Save milestones to track your progress
                </p>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {milestones
                  .sort((a, b) => b.createdAt - a.createdAt)
                  .map((milestone) => (
                    <div
                      key={milestone.id}
                      className="bg-gray-700/50 border border-gray-600/50 rounded-lg p-4 hover:bg-gray-700/70 transition-colors"
                    >
                      {/* Header with title and actions */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          <GitBranch className="w-4 h-4 text-orange-400 flex-shrink-0" />
                          <h4 className="font-medium text-white truncate">
                            {milestone.name}
                          </h4>
                        </div>

                        <div className="flex items-center space-x-1 flex-shrink-0 ml-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDiff(milestone)}
                            className="h-7 w-7 p-0 text-blue-400 hover:text-blue-300 hover:bg-blue-400/20"
                            title="View Diff"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRestore(milestone)}
                            className="h-7 w-7 p-0 text-green-400 hover:text-green-300 hover:bg-green-400/20"
                            title="Restore"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(milestone)}
                            className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-400/20"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Notes */}
                      {milestone.notes && (
                        <p className="text-gray-400 text-sm mb-3 leading-relaxed">
                          {milestone.notes}
                        </p>
                      )}

                      {/* Metadata in grid layout */}
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="flex items-center space-x-1 text-gray-500">
                          <Clock className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">
                            {formatTimestamp(milestone.createdAt)}
                          </span>
                        </div>
                        <div className="flex items-center justify-end space-x-3 text-gray-500">
                          <span className="flex items-center space-x-1">
                            <span className="w-2 h-2 bg-orange-400 rounded-full"></span>
                            <span>
                              {milestone.snapshot.blocks.length} blocks
                            </span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                            <span>
                              {
                                milestone.snapshot.files.filter(
                                  (f) => f.type === "file"
                                ).length
                              }{" "}
                              files
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        ) : (
          // Diff View
          <div className="h-full flex flex-col">
            {selectedMilestone && (
              <>
                <div className="flex-shrink-0 p-4 border-b border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-white mb-1">
                        Comparing: {selectedMilestone.name} → Current
                      </h4>
                      <p className="text-sm text-gray-400">
                        {diffTarget === "blocks"
                          ? "Code Blocks"
                          : "Project Files"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex-1">
                  <MonacoDiff
                    original={getMilestoneContent(selectedMilestone)}
                    modified={getCurrentContent()}
                    language="python"
                    height="100%"
                    options={{
                      fontSize: 12,
                      lineHeight: 18,
                      renderSideBySide: true,
                    }}
                  />
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
