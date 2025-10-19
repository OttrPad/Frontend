import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { useMilestonesStore, useBlocksStore } from "../../../store/workspace";
import { useBranchStore } from "../../../store/branch";
import { Button } from "../../ui/button";
import {
  GitBranch,
  Clock,
  RotateCcw,
  Trash2,
  Loader2,
  GitCommit,
  Star,
} from "lucide-react";
import { MonacoDiff } from "../../monaco/MonacoDiff";
import type { Milestone } from "../../../types/workspace";
import type { MilestoneGroup } from "../../../lib/apiClient";
import { toast } from "react-toastify";

export function VersionsPane() {
  const { roomId, roomCode } = useParams<{
    roomId?: string;
    roomCode?: string;
  }>();
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
    revertLatestCommit,
  } = useMilestonesStore();
  const { blocks } = useBlocksStore();
  const { currentBranch, branches } = useBranchStore();

  const [viewMode, setViewMode] = useState<"list" | "diff">("list");
  const [branchView, setBranchView] = useState<"all" | "current">("all");
  const hasFetchedRef = useRef(false);

  // Fetch grouped timeline when component mounts
  useEffect(() => {
    if (currentRoomId && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchCommits(currentRoomId);
    }
  }, [currentRoomId, fetchCommits]);

  // The commits array now contains MilestoneGroup[] - groups of commits organized by milestones
  // Flatten it for display while maintaining the grouping structure
  const groupedTimeline: MilestoneGroup[] = Array.isArray(commits)
    ? (commits as unknown as MilestoneGroup[])
    : [];

  // Build a filtered view by branch if requested
  const currentBranchId = currentBranch?.branch_id;
  const branchNameMap = new Map(
    (branches || []).map((b) => [b.branch_id, b.branch_name])
  );

  const filteredTimeline: MilestoneGroup[] = Array.isArray(groupedTimeline)
    ? groupedTimeline
        .map((group: MilestoneGroup) => ({
          ...group,
          commits: Array.isArray(group.commits)
            ? group.commits.filter((c) =>
                branchView === "all" || !currentBranchId
                  ? true
                  : c.branch_id === currentBranchId
              )
            : [],
        }))
        // Drop groups with no commits after filtering
        .filter((g: MilestoneGroup) => g.commits && g.commits.length > 0)
    : [];

  // Calculate total counts
  const milestoneCount = Array.isArray(filteredTimeline)
    ? filteredTimeline.filter(
        (g: { milestone: unknown }) => g.milestone !== null
      ).length
    : 0;
  const commitCount = Array.isArray(filteredTimeline)
    ? filteredTimeline.reduce(
        (total: number, group: { commits: unknown[] }) =>
          total + (Array.isArray(group.commits) ? group.commits.length : 0),
        0
      )
    : 0;

  const selectedMilestone = milestones.find(
    (m) => m.id === selectedMilestoneId
  );

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

  // Confirmation toast helper
  const confirmAction = (message: string, onConfirm: () => void) => {
    const toastId = toast.warning(
      <div className="flex flex-col gap-3">
        <div className="whitespace-pre-wrap">{message}</div>
        <div className="flex gap-2 justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              toast.dismiss(toastId);
            }}
            className="h-8"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => {
              toast.dismiss(toastId);
              onConfirm();
            }}
            className="h-8 bg-orange-500 hover:bg-orange-600"
          >
            Confirm
          </Button>
        </div>
      </div>,
      {
        position: "top-center",
        autoClose: false,
        closeButton: false,
        draggable: false,
        closeOnClick: false,
      }
    );
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleRestoreCommit = async (commit: any) => {
    confirmAction(
      `⚠️ LOCAL RESTORE ONLY\n\nRestore commit: "${commit.message}"\n\nThis will restore to YOUR VIEW only.\nOther collaborators will NOT see this change.\nYour current work will be replaced.`,
      async () => {
        try {
          if (commit.snapshot_json?.blocks) {
            console.log(
              `[VersionsPane] Restoring ${commit.snapshot_json.blocks.length} blocks from commit`
            );
            useBlocksStore.setState({
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              blocks: commit.snapshot_json.blocks as any,
            });
            toast.success("✅ Commit restored locally");
          } else {
            await restoreCommit(currentRoomId, commit.id);
            toast.success("✅ Commit restored locally");
          }
        } catch (error) {
          console.error("Failed to restore commit:", error);
          toast.error("Failed to restore commit");
        }
      }
    );
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleDeleteMilestone = async (milestone: any) => {
    confirmAction(
      `Are you sure you want to delete milestone "${milestone.name}"?`,
      async () => {
        try {
          await deleteMilestone(currentRoomId, milestone.milestone_id);
          if (selectedMilestoneId === milestone.milestone_id) {
            selectMilestone(null);
            setViewMode("list");
          }
          toast.success("✅ Milestone deleted");
        } catch (error) {
          console.error("Failed to delete milestone:", error);
          toast.error("Failed to delete milestone");
        }
      }
    );
  };

  // Get the latest commit ID to check if a commit is the most recent
  const getLatestCommitId = () => {
    if (Array.isArray(filteredTimeline) && filteredTimeline.length > 0) {
      for (const group of filteredTimeline) {
        if (Array.isArray(group.commits) && group.commits.length > 0) {
          return group.commits[0].id;
        }
      }
    }
    return null;
  };

  const latestCommitId = getLatestCommitId();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleRevertCommit = async (commit: any) => {
    confirmAction(
      `⚠️ REVERT COMMIT\n\nRevert commit: "${commit.message}"\n\nThe commit will be permanently hidden from the timeline and cannot be recovered.\n\nThis action affects all collaborators.`,
      async () => {
        try {
          console.log("[VersionsPane] Reverting commit:", commit.id);
          await revertLatestCommit(currentRoomId);
          toast.success("✅ Commit reverted successfully");
        } catch (error) {
          console.error("[VersionsPane] Failed to revert commit:", error);
          const errorMessage =
            error instanceof Error ? error.message : String(error);

          // Check if it's a permission error
          if (
            errorMessage.includes("Only the room creator") ||
            errorMessage.includes("admin") ||
            errorMessage.includes("Not authorized")
          ) {
            toast.error(
              "🔒 Access Denied\n\nOnly the room creator can revert commits.",
              { autoClose: 5000 }
            );
          } else {
            toast.error(`Failed to revert commit: ${errorMessage}`, {
              autoClose: 5000,
            });
          }
        }
      }
    );
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
            <div className="flex items-center gap-4">
              <div className="text-xs text-muted-foreground">
                {commitCount} commit{commitCount !== 1 ? "s" : ""} •{" "}
                {milestoneCount} milestone{milestoneCount !== 1 ? "s" : ""}
              </div>
              <div className="flex items-center gap-1 bg-gray-800/60 border border-gray-700 rounded-md p-1">
                <Button
                  variant={branchView === "all" ? "default" : "ghost"}
                  size="sm"
                  className={`h-7 px-2 text-xs ${
                    branchView === "all"
                      ? "bg-gray-600 hover:bg-gray-500"
                      : "text-gray-300 hover:bg-gray-700"
                  }`}
                  onClick={() => setBranchView("all")}
                >
                  All branches
                </Button>
                <Button
                  variant={branchView === "current" ? "default" : "ghost"}
                  size="sm"
                  disabled={!currentBranchId}
                  className={`h-7 px-2 text-xs ${
                    branchView === "current"
                      ? "bg-gray-600 hover:bg-gray-500"
                      : "text-gray-300 hover:bg-gray-700"
                  } ${!currentBranchId ? "opacity-50 cursor-not-allowed" : ""}`}
                  onClick={() => setBranchView("current")}
                  title={
                    currentBranchId
                      ? `Show only commits on "${currentBranch?.branch_name}"`
                      : "Checkout a branch to enable"
                  }
                >
                  Current branch
                </Button>
              </div>
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
                <p className="text-sm">Loading version history...</p>
              </div>
            ) : !Array.isArray(filteredTimeline) ||
              filteredTimeline.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <GitBranch className="w-12 h-12 mb-4" />
                <p className="text-sm">No version history</p>
                <p className="text-xs text-gray-600">
                  Create commits and milestones to track your progress
                </p>
              </div>
            ) : (
              <div className="p-4 space-y-6">
                {/* Render each milestone group */}
                {filteredTimeline.map(
                  (group: MilestoneGroup, groupIndex: number) => (
                    <div
                      key={
                        group.milestone?.milestone_id ||
                        `ungrouped-${groupIndex}`
                      }
                      className="space-y-3"
                    >
                      {/* Milestone Header (if exists) */}
                      {group.milestone && (
                        <div className="bg-gradient-to-r from-yellow-900/40 to-gray-700/60 border border-yellow-600/50 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-start space-x-3 flex-1 min-w-0">
                              <Star className="w-5 h-5 text-yellow-400 fill-yellow-400 flex-shrink-0 mt-1" />
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-white text-lg">
                                  {group.milestone.name}
                                </h3>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleDeleteMilestone(group.milestone)
                              }
                              className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-400/20 flex-shrink-0 ml-3"
                              title="Delete Milestone"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="flex items-center space-x-3 text-xs text-gray-400 mb-3">
                            <span className="flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>
                                {new Date(
                                  group.milestone.created_at
                                ).toLocaleString()}
                              </span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <GitCommit className="w-3 h-3" />
                              <span>
                                {group.commits.length} commit
                                {group.commits.length !== 1 ? "s" : ""}
                              </span>
                            </span>
                          </div>
                          {group.milestone.notes && (
                            <div className="border-t border-gray-600/50 pt-3">
                              <p className="text-gray-300 text-sm leading-relaxed">
                                {group.milestone.notes}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Ungrouped commits header */}
                      {!group.milestone && group.commits.length > 0 && (
                        <div className="flex items-center space-x-2 text-gray-400 text-sm px-2">
                          <GitCommit className="w-4 h-4" />
                          <span>Earlier commits (before any milestone)</span>
                        </div>
                      )}

                      {/* Commits in this group */}
                      {group.commits.length > 0 && (
                        <div className="space-y-2 pl-8">
                          {group.commits.map((commit) => {
                            const isLatestCommit = commit.id === latestCommitId;
                            const branchLabel = commit.branch_id
                              ? branchNameMap.get(commit.branch_id) ||
                                commit.branch_id.substring(0, 8)
                              : undefined;

                            return (
                              <div
                                key={commit.id}
                                className="bg-gray-700/50 border border-gray-600/50 hover:bg-gray-700/70 rounded-lg p-3 transition-colors"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                                    <GitCommit className="w-4 h-4 text-blue-400 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-medium text-white text-sm mb-1 truncate">
                                        {commit.message}
                                        {isLatestCommit && (
                                          <span className="ml-2 text-xs text-yellow-400">
                                            (Latest)
                                          </span>
                                        )}
                                        {branchLabel && (
                                          <span className="ml-2 inline-flex items-center text-[10px] px-1.5 py-0.5 rounded bg-gray-600 text-gray-100 border border-gray-500 align-middle">
                                            {branchLabel}
                                          </span>
                                        )}
                                      </h4>
                                      <div className="flex items-center space-x-3 text-xs text-gray-400">
                                        <span className="flex items-center space-x-1">
                                          <Clock className="w-3 h-3" />
                                          <span>
                                            {new Date(
                                              commit.created_at
                                            ).toLocaleString()}
                                          </span>
                                        </span>
                                        {commit.snapshot_json?.blocks && (
                                          <span className="flex items-center space-x-1">
                                            <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                                            <span>
                                              {
                                                commit.snapshot_json.blocks
                                                  .length
                                              }{" "}
                                              blocks
                                            </span>
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center space-x-1 flex-shrink-0 ml-3">
                                    {isLatestCommit ? (
                                      <>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() =>
                                            handleRestoreCommit(commit)
                                          }
                                          className="h-7 w-7 p-0 text-green-400 hover:text-green-300 hover:bg-green-400/20"
                                          title="Restore this commit"
                                        >
                                          <RotateCcw className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() =>
                                            handleRevertCommit(commit)
                                          }
                                          className="h-7 px-2 text-xs bg-red-900/30 border-red-600/50 text-red-400 hover:bg-red-900/50 hover:text-red-300"
                                          title="Revert this commit (will hide it from timeline)"
                                        >
                                          Revert
                                        </Button>
                                      </>
                                    ) : (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          handleRestoreCommit(commit)
                                        }
                                        className="h-7 w-7 p-0 text-green-400 hover:text-green-300 hover:bg-green-400/20"
                                        title="Restore this commit"
                                      >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )
                )}
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
