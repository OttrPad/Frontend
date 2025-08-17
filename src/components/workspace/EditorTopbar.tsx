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
      <div className="h-14 bg-gray-800/40 backdrop-blur-xl border-b border-white/[0.08] shadow-[0_4px_16px_0_rgba(0,0,0,0.2)] flex items-center justify-between px-4">
        {/* Left Section */}
        <div className="flex items-center space-x-4">
          {/* Sidebar Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleLeftSidebar}
            className="text-white/40 hover:text-orange-400 hover:bg-white/[0.05] transition-colors"
            title="Toggle Files Sidebar"
          >
            <Menu className="w-4 h-4" />
          </Button>

          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-orange-400 to-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-black font-bold text-sm">O</span>
            </div>
            <div>
              <h1 className="text-sm font-semibold text-white">
                Room {roomId}
              </h1>
              <p className="text-xs text-white/60">Collaborative Workspace</p>
            </div>
          </div>
        </div>

        {/* Center Section - Actions */}
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleAddBlock}
            className="bg-white/[0.05] backdrop-blur-md border-white/[0.1] text-white hover:bg-white/[0.08] hover:border-orange-400/50 transition-all duration-200"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Block
          </Button>

          <Button
            size="sm"
            onClick={handleRunAll}
            disabled={isRunning || blocks.length === 0}
            className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg shadow-green-500/20 transition-all duration-200"
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
            className="bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600"
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
            className="bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600"
          >
            <Share2 className="w-4 h-4 mr-1" />
            Share
          </Button>

          {/* Right Panel Toggle */}
          <Button
            size="sm"
            variant="ghost"
            onClick={toggleRightSidebar}
            className="text-gray-400 hover:text-white hover:bg-gray-700"
            title="Toggle Right Panel"
          >
            <PanelRightOpen className="w-4 h-4" />
          </Button>

          {/* Theme Toggle */}
          <Button
            size="sm"
            variant="ghost"
            onClick={toggleTheme}
            className="text-gray-400 hover:text-white hover:bg-gray-700"
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
            className="text-gray-400 hover:text-white hover:bg-gray-700"
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
