import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import {
  Play,
  Settings,
  Share2,
  Moon,
  Sun,
  StopCircle,
  Menu,
  PanelRightOpen,
  LogOut,
  Loader2,
  Lock,
  GitCommit,
  GitBranch,
} from "lucide-react";
import { useAppStore, useMilestonesStore } from "../../store/workspace";
import { useExecution } from "../../hooks/useExecution";
import { useExecutionStatus } from "../../hooks/useExecutionStatus";
import { PresenceAvatars } from "./PresenceAvatars";
import { SaveMilestoneDialog } from "../modals/SaveMilestoneDialog";
import { CommitDialog } from "../modals/CommitDialog";
import { toast } from "react-toastify";

interface EditorTopbarProps {
  roomId: string;
}

export function EditorTopbar({ roomId }: EditorTopbarProps) {
  const { theme, toggleTheme, toggleLeftSidebar, toggleRightSidebar } =
    useAppStore();
  const { saveMilestone, createCommit } = useMilestonesStore();
  const { runAll, isRunning, stop } = useExecution(roomId);
  const navigate = useNavigate();
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showCommitDialog, setShowCommitDialog] = useState(false);
  const [showMilestoneDialog, setShowMilestoneDialog] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });
  const { isReady, isVenvSettingUp } = useExecutionStatus(roomId);

  // Handle click outside to close menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const settingsButton = document.querySelector("[data-settings-button]");
      const settingsMenu = document.querySelector("[data-settings-menu]");

      if (
        showSettingsMenu &&
        !settingsButton?.contains(target) &&
        !settingsMenu?.contains(target)
      ) {
        setShowSettingsMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showSettingsMenu]);

  // Workspace info is shown directly in Notebook header now; remove fetch here.

  const handleSettingsClick = (event: React.MouseEvent) => {
    const button = event.currentTarget as HTMLElement;
    const rect = button.getBoundingClientRect();

    setMenuPosition({
      top: rect.bottom + 8, // 8px below the button
      right: window.innerWidth - rect.right, // align right edge
    });

    setShowSettingsMenu(!showSettingsMenu);
  };

  const handleLeaveRoom = () => {
    setShowSettingsMenu(false);
    // Optionally stop the execution container on leave (idle reaper also exists)
    try {
      stop();
    } catch {
      // ignore stop errors on leave
    }
    toast.success("Left room successfully");
    navigate("/join");
  };

  const handleRunAll = () => {
    if (isRunning) {
      stop();
      return;
    }
    runAll();
  };

  // const handleAddBlock = () => {
  //   addBlock();
  // };

  const handleSaveMilestone = () => {
    setShowMilestoneDialog(true);
  };

  const handleCommit = () => {
    setShowCommitDialog(true);
  };

  const handleCreateCommit = async (message: string) => {
    try {
      const notebookId = `notebook-${roomId}-default`;
      await createCommit(roomId, notebookId, message);
      toast.success("Commit created successfully!");
    } catch {
      toast.error("Failed to create commit");
    }
  };

  const handleCreateMilestone = async (message: string) => {
    try {
      await saveMilestone(roomId, message);
      toast.success("Milestone created successfully!");
    } catch {
      toast.error("Failed to create milestone");
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Room link copied to clipboard!");
  };

  return (
    <>
      <div className="h-14 bg-card/80 backdrop-blur-xl border-b border-border shadow-lg flex items-center justify-between px-4">
        {/* Left Section */}
        <div className="flex items-center space-x-4">
          {/* Sidebar Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleLeftSidebar}
            className="text-foreground/60 hover:text-primary hover:bg-accent transition-colors"
            title="Toggle Files Sidebar"
          >
            <Menu className="w-4 h-4" />
          </Button>

          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-orange-400 to-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-black font-bold text-sm">O</span>
            </div>
            <div>
              <h1 className="text-sm font-semibold text-foreground">
                Room {roomId}
              </h1>
              <p className="text-xs text-muted-foreground">
                Collaborative Workspace
              </p>
            </div>
          </div>
        </div>

        {/* Center Section - Actions */}
        <div className="flex items-center space-x-2">
          {/* <Button
            size="sm"
            variant="outline"
            onClick={handleAddBlock}
            className="bg-secondary border-border text-secondary-foreground hover:bg-secondary/80 hover:border-primary/50 transition-all duration-200"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Block
          </Button> */}

          {isVenvSettingUp && (
            <div className="flex items-center text-xs text-muted-foreground mr-2">
              <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
              Setting up environment…
            </div>
          )}
          <Button
            size="sm"
            onClick={handleRunAll}
            disabled={!isReady && !isRunning}
            className={
              isRunning
                ? "bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20 transition-all duration-200"
                : "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-primary-foreground shadow-lg shadow-green-500/20 transition-all duration-200"
            }
          >
            {isRunning ? (
              <>
                <StopCircle className="w-4 h-4 mr-1" />
                Stop
              </>
            ) : (
              <>
                {isReady ? (
                  <Play className="w-4 h-4 mr-1" />
                ) : (
                  <Lock className="w-4 h-4 mr-1" />
                )}
                Run All
              </>
            )}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleCommit}
            disabled={!isReady}
            className="bg-secondary border-border text-secondary-foreground hover:bg-secondary/80 disabled:opacity-60"
          >
            <GitCommit className="w-4 h-4 mr-1" />
            Commit
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleSaveMilestone}
            disabled={!isReady}
            className="bg-secondary border-border text-secondary-foreground hover:bg-secondary/80 disabled:opacity-60"
          >
            <GitBranch className="w-4 h-4 mr-1" />
            Milestone
          </Button>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-3">
          {/* Presence Avatars */}
          <PresenceAvatars roomId={roomId} />

          {/* Workspace info */}
          {/* <Button
            size="sm"
            variant="ghost"
            className="text-foreground/60 hover:text-foreground hover:bg-accent"
            title={
              workspaceInfo
                ? `Workspace: ${workspaceInfo.name || "Unknown"} — Packages: ${
                    workspaceInfo.requirements || "None"
                  }`
                : "Workspace info not available"
            }
          >
            <Info className="w-4 h-4" />
          </Button> */}

          {/* Share Button */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleShare}
            className="bg-secondary border-border text-secondary-foreground hover:bg-secondary/80"
          >
            <Share2 className="w-4 h-4 mr-1" />
            Share
          </Button>

          {/* Right Panel Toggle */}
          <Button
            size="sm"
            variant="ghost"
            onClick={toggleRightSidebar}
            className="text-foreground/60 hover:text-foreground hover:bg-accent"
            title="Toggle Right Panel"
          >
            <PanelRightOpen className="w-4 h-4" />
          </Button>

          {/* Theme Toggle */}
          <Button
            size="sm"
            variant="ghost"
            onClick={toggleTheme}
            className="text-foreground/60 hover:text-foreground hover:bg-accent"
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </Button>

          {/* Settings Dropdown */}
          <div className="relative">
            <Button
              size="sm"
              variant="ghost"
              data-settings-button
              onClick={handleSettingsClick}
              className={`text-foreground/60 hover:text-foreground hover:bg-accent ${
                showSettingsMenu ? "bg-accent text-foreground" : ""
              }`}
            >
              <Settings className="w-4 h-4" />
            </Button>

            {showSettingsMenu &&
              createPortal(
                <div
                  data-settings-menu
                  className="fixed w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-xl z-[9999]"
                  style={{
                    top: `${menuPosition.top}px`,
                    right: `${menuPosition.right}px`,
                  }}
                >
                  <div className="py-1">
                    <button
                      onClick={handleLeaveRoom}
                      className="flex items-center w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Leave Room
                    </button>
                  </div>
                </div>,
                document.body
              )}
          </div>
        </div>
      </div>

      {/* Commit Dialog */}
      <CommitDialog
        isOpen={showCommitDialog}
        onClose={() => setShowCommitDialog(false)}
        onCommit={handleCreateCommit}
        isMilestone={false}
      />

      {/* Milestone Dialog */}
      <CommitDialog
        isOpen={showMilestoneDialog}
        onClose={() => setShowMilestoneDialog(false)}
        onCommit={handleCreateMilestone}
        isMilestone={true}
      />

      {/* Legacy Save Milestone Dialog (can be removed if not used) */}
      <SaveMilestoneDialog
        open={showSaveDialog}
        onOpenChange={setShowSaveDialog}
        onSave={(name: string, notes?: string) => {
          saveMilestone(roomId, name, notes || "");
          setShowSaveDialog(false);
        }}
      />
    </>
  );
}
