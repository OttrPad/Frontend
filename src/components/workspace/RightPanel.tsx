import { useAppStore } from "../../store/workspace";
import { Button } from "../ui/button";
import { Terminal, X } from "lucide-react";
import { RunOutputPane } from "./panels/RunOutputPane";

export function RightPanel() {
  const { toggleRightSidebar } = useAppStore();

  const handleClose = () => {
    toggleRightSidebar();
  };

  return (
    <div className="h-full bg-card flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 px-4 py-3">
            <Terminal className="w-4 h-4 text-orange-400" />
            <span className="text-sm font-medium text-foreground">
              Run Output
            </span>
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
        <RunOutputPane />
      </div>
    </div>
  );
}
