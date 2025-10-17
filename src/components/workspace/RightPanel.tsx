import { useAppStore } from "../../store/workspace";
import { Button } from "../ui/button";
import { Terminal, X, GitBranch } from "lucide-react";
import { RunOutputPane } from "./panels/RunOutputPane";
import BranchPane from "./panels/BranchPane";
import { useState } from "react";
import { useParams } from "react-router-dom";

export function RightPanel() {
  const { toggleRightSidebar } = useAppStore();
  const [activeTab, setActiveTab] = useState<"output" | "branches">("output");
  const { roomId, roomCode } = useParams<{ roomId?: string; roomCode?: string }>();
  const roomIdentifier = roomId || roomCode || "";

  const handleClose = () => {
    toggleRightSidebar();
  };

  return (
    <div className="h-full bg-card flex flex-col overflow-hidden z-0">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1 px-2 py-2">
            <Button
              variant={activeTab === "output" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("output")}
              className="h-8 px-3"
            >
              <Terminal className="w-4 h-4 mr-1.5" />
              <span className="text-xs font-medium">Output</span>
            </Button>
            <Button
              variant={activeTab === "branches" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("branches")}
              className="h-8 px-3"
            >
              <GitBranch className="w-4 h-4 mr-1.5" />
              <span className="text-xs font-medium">Branches</span>
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="flex-shrink-0 m-2 h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            title="Close Panel"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden min-h-0">
        {activeTab === "output" ? (
          <RunOutputPane />
        ) : (
          <BranchPane roomId={roomIdentifier} />
        )}
      </div>
    </div>
  );
}
