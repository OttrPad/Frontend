import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { useMilestonesStore, useBlocksStore } from "../../../store/workspace";
import { Button } from "../../ui/button";
import { GitBranch, Clock, Eye, RotateCcw, Trash2, Loader2, GitCommit, Star } from "lucide-react";
import { MonacoDiff } from "../../monaco/MonacoDiff";
import type { Milestone } from "../../../types/workspace";

// Timeline item type (commit or milestone)
type CommitData = {
  commit_id: string;
  commit_message: string;
  created_at: string;
  author_id: string;
  snapshot?: { blocks: unknown[] };
  snapshot_json?: { blocks: unknown[] };
};

type TimelineItem = {
  id: string;
  type: "commit" | "milestone";
  message: string;
  timestamp: number;
  isMilestone: boolean;
  milestoneData?: Milestone;
  commitData?: CommitData;
};

export function VersionsPane() {
  const { roomId, roomCode } = useParams<{ roomId?: string; roomCode?: string }>();
  const currentRoomId = roomId || roomCode || "";
  
  const {
    milestones,
    commits,
    selectedMilestoneId,
    isLoading,
    selectMilestone,
    deleteMilestone,
    fetchCommits,
    restoreCommit,
  } = useMilestonesStore();
  const { blocks } = useBlocksStore();

  const [viewMode, setViewMode] = useState<"list" | "diff">("list");
  const hasFetchedRef = useRef(false);

  // Fetch unified timeline when component mounts
  useEffect(() => {
    if (currentRoomId && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchCommits(currentRoomId); // This fetches the unified timeline
    }
  }, [currentRoomId, fetchCommits]);

  // Create unified timeline from the commits array (which now includes milestones)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const timeline: TimelineItem[] = (commits || []).map((item: any): TimelineItem => {
    // Check if this is a milestone or commit based on the 'type' field from backend
    const isMilestone = item.isMilestone || item.type === 'milestone';
    
    return {
      id: isMilestone ? item.id : item.commit_id,
      type: isMilestone ? "milestone" : "commit",
      message: item.message || item.commit_message || "Untitled",
      timestamp: new Date(item.created_at).getTime(),
      isMilestone,
      milestoneData: isMilestone ? {
        id: item.id,
        name: item.message,
        notes: item.notes || '',
        createdAt: new Date(item.created_at).getTime(),
        snapshot: item.snapshot_json || { blocks: [] },
      } : undefined,
      commitData: !isMilestone ? {
        ...item,
        snapshot_json: item.snapshot_json,
      } : undefined,
    };
  }).sort((a, b) => b.timestamp - a.timestamp); // Sort by newest first

  // Calculate milestone and commit counts from timeline
  const milestoneCount = timeline.filter(item => item.isMilestone).length;
  const commitCount = timeline.filter(item => !item.isMilestone).length;

  const selectedMilestone = milestones.find(
    (m) => m.id === selectedMilestoneId
  );

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getCurrentContent = () => {
    return blocks
      .map(
        (block) =>
          `# Block ${block.id}\n# Language: ${block.lang}\n${block.content}`
      )
      .join("\n\n---\n\n");
  };

  const getMilestoneContent = (milestone: Milestone) => {
    return milestone.snapshot.blocks
      .map(
        (block) =>
          `# Block ${block.id}\n# Language: ${block.lang}\n${block.content}`
      )
      .join("\n\n---\n\n");
  };

  const handleViewDiff = (item: TimelineItem) => {
    if (item.isMilestone && item.milestoneData) {
      selectMilestone(item.milestoneData.id);
      setViewMode("diff");
    }
  };

  const handleRestoreItem = async (item: TimelineItem) => {
    const itemName = item.isMilestone 
      ? `milestone "${item.message}"` 
      : `commit "${item.message}"`;
    
    if (
      window.confirm(
        `⚠️ LOCAL RESTORE ONLY\n\nThis will restore ${itemName} to YOUR VIEW only.\n\nOther collaborators will NOT see this change.\nYour current work will be replaced.\n\nContinue?`
      )
    ) {
      try {
        if (item.isMilestone && item.milestoneData) {
          // For milestones, directly restore from the snapshot in the timeline data
          if (item.milestoneData.snapshot?.blocks) {
            console.log(`[VersionsPane] Restoring ${item.milestoneData.snapshot.blocks.length} blocks from milestone`);
            useBlocksStore.setState({ blocks: item.milestoneData.snapshot.blocks });
            console.log(`[VersionsPane] ✅ Restored milestone locally (not synced to other users)`);
          } else {
            console.error(`[VersionsPane] No snapshot data in milestone`);
          }
        } else if (item.commitData) {
          // For commits, check if we have snapshot data in the timeline, otherwise fetch it
          if (item.commitData.snapshot_json?.blocks) {
            console.log(`[VersionsPane] Restoring ${item.commitData.snapshot_json.blocks.length} blocks from commit`);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            useBlocksStore.setState({ blocks: item.commitData.snapshot_json.blocks as any });
            console.log(`[VersionsPane] ✅ Restored commit locally (not synced to other users)`);
          } else {
            // Fallback to API if snapshot not in timeline data
            const commitId = item.commitData.commit_id || item.id;
            await restoreCommit(currentRoomId, commitId);
            console.log(`[VersionsPane] ✅ Restored commit locally (not synced to other users)`);
          }
        }
      } catch (error) {
        console.error(`Failed to restore ${itemName}:`, error);
      }
    }
  };

  const handleDeleteItem = async (item: TimelineItem) => {
    if (!item.isMilestone || !item.milestoneData) {
      // Only milestones can be deleted for now
      return;
    }

    const milestone = item.milestoneData;
    if (
      window.confirm(
        `Are you sure you want to delete milestone "${milestone.name}"?`
      )
    ) {
      try {
        await deleteMilestone(currentRoomId, milestone.id);
        if (selectedMilestoneId === milestone.id) {
          selectMilestone(null);
          setViewMode("list");
        }
      } catch (error) {
        console.error("Failed to delete milestone:", error);
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
              {commitCount} commit{commitCount !== 1 ? "s" : ""} • {milestoneCount} milestone{milestoneCount !== 1 ? "s" : ""}
            </div>
          )}
        </div>

        {viewMode === "diff" && (
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-foreground">
                Comparing Code Blocks
              </h4>
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
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <Loader2 className="w-8 h-8 mb-4 animate-spin text-orange-400" />
                <p className="text-sm">Loading milestones...</p>
              </div>
            ) : timeline.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <GitBranch className="w-12 h-12 mb-4" />
                <p className="text-sm">No version history</p>
                <p className="text-xs text-gray-600">
                  Create commits and milestones to track your progress
                </p>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {timeline.map((item) => (
                  <div
                    key={item.id}
                    className={`border rounded-lg p-4 hover:bg-opacity-80 transition-colors ${
                      item.isMilestone
                        ? "bg-gradient-to-r from-yellow-900/30 to-gray-700/50 border-yellow-600/50"
                        : "bg-gray-700/50 border-gray-600/50 hover:bg-gray-700/70"
                    }`}
                  >
                    {/* Header with title and actions */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        {item.isMilestone ? (
                          <Star className="w-4 h-4 text-yellow-400 flex-shrink-0 fill-yellow-400" />
                        ) : (
                          <GitCommit className="w-4 h-4 text-blue-400 flex-shrink-0" />
                        )}
                        <h4 className="font-medium text-white truncate">
                          {item.message}
                        </h4>
                      </div>

                      <div className="flex items-center space-x-1 flex-shrink-0 ml-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDiff(item)}
                          className="h-7 w-7 p-0 text-blue-400 hover:text-blue-300 hover:bg-blue-400/20"
                          title="View Diff"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRestoreItem(item)}
                          className="h-7 w-7 p-0 text-green-400 hover:text-green-300 hover:bg-green-400/20"
                          title="Restore"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </Button>

                        {item.isMilestone && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteItem(item)}
                            className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-400/20"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Notes/Description */}
                    {item.isMilestone && item.milestoneData?.notes && (
                      <p className="text-gray-400 text-sm mb-3 leading-relaxed">
                        {item.milestoneData.notes}
                      </p>
                    )}

                    {/* Metadata in grid layout */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="flex items-center space-x-1 text-gray-500">
                        <Clock className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">
                          {formatTimestamp(item.timestamp)}
                        </span>
                      </div>
                      <div className="flex items-center justify-end space-x-3 text-gray-500">
                        {item.isMilestone && item.milestoneData ? (
                          <span className="flex items-center space-x-1">
                            <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
                            <span>Milestone • {item.milestoneData.snapshot.blocks.length} blocks</span>
                          </span>
                        ) : item.commitData ? (
                          <span className="flex items-center space-x-1">
                            <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                            <span>Commit • {(item.commitData.snapshot_json?.blocks?.length || item.commitData.snapshot?.blocks?.length || 0)} blocks</span>
                          </span>
                        ) : null}
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
                      <p className="text-sm text-gray-400">Code Blocks</p>
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
