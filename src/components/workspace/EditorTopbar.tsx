import { useState } from "react";
import { Button } from "../ui/button";
import {
  Play,
  Plus,
  Save,
  Settings,
  Share2,
  Moon,
  Sun,
  StopCircle,
  Menu,
  PanelRightOpen,
} from "lucide-react";
import {
  useAppStore,
  useBlocksStore,
  useMilestonesStore,
} from "../../store/workspace";
import { PresenceAvatars } from "./PresenceAvatars";
import { SaveMilestoneDialog } from "../modals/SaveMilestoneDialog";

interface EditorTopbarProps {
  roomId: string;
}

export function EditorTopbar({ roomId }: EditorTopbarProps) {
  const { theme, toggleTheme, toggleLeftSidebar, toggleRightSidebar } =
    useAppStore();
  const { addBlock, runAllBlocks, blocks } = useBlocksStore();
  const { saveMilestone } = useMilestonesStore();
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const handleRunAll = () => {
    setIsRunning(true);
    runAllBlocks();
    // Mock: Reset running state after 2 seconds
    setTimeout(() => setIsRunning(false), 2000);
  };

  const handleAddBlock = () => {
    addBlock();
  };

  const handleSaveMilestone = () => {
    setShowSaveDialog(true);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    // You could add a toast notification here
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
          <Button
            size="sm"
            variant="outline"
            onClick={handleAddBlock}
            className="bg-secondary border-border text-secondary-foreground hover:bg-secondary/80 hover:border-primary/50 transition-all duration-200"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Block
          </Button>

          <Button
            size="sm"
            onClick={handleRunAll}
            disabled={isRunning || blocks.length === 0}
            className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-primary-foreground shadow-lg shadow-green-500/20 transition-all duration-200"
          >
            {isRunning ? (
              <>
                <StopCircle className="w-4 h-4 mr-1" />
                Running...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-1" />
                Run All
              </>
            )}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleSaveMilestone}
            className="bg-secondary border-border text-secondary-foreground hover:bg-secondary/80"
          >
            <Save className="w-4 h-4 mr-1" />
            Save Milestone
          </Button>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-3">
          {/* Presence Avatars */}
          <PresenceAvatars />

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

          {/* Settings */}
          <Button
            size="sm"
            variant="ghost"
            className="text-foreground/60 hover:text-foreground hover:bg-accent"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Save Milestone Dialog */}
      <SaveMilestoneDialog
        open={showSaveDialog}
        onOpenChange={setShowSaveDialog}
        onSave={(name: string, notes?: string) => {
          saveMilestone(name, notes);
          setShowSaveDialog(false);
        }}
      />
    </>
  );
}
