import { useAppStore } from "../../store/workspace";
import { Button } from "../ui/button";
import { Terminal, TestTube, GitBranch, Bot, X } from "lucide-react";
import { RunOutputPane } from "./panels/RunOutputPane";
import { TestsPane } from "./panels/TestsPane";
import { VersionsPane } from "./panels/VersionsPane";
import { AIAssistPane } from "./panels/AIAssistPane";

type TabType = "output" | "tests" | "versions" | "ai";

interface Tab {
  id: TabType;
  label: string;
  icon: React.ElementType;
}

const tabs: Tab[] = [
  { id: "output", label: "Run Output", icon: Terminal },
  { id: "tests", label: "Tests", icon: TestTube },
  { id: "versions", label: "Versions", icon: GitBranch },
  { id: "ai", label: "AI Assist", icon: Bot },
];

export function RightPanel() {
  const { rightPanelTab, setRightPanelTab, toggleRightSidebar } = useAppStore();

  const handleTabClick = (tabId: TabType) => {
    setRightPanelTab(tabId);
  };

  const handleClose = () => {
    toggleRightSidebar();
  };

  const renderActivePane = () => {
    switch (rightPanelTab) {
      case "output":
        return <RunOutputPane />;
      case "tests":
        return <TestsPane />;
      case "versions":
        return <VersionsPane />;
      case "ai":
        return <AIAssistPane />;
      default:
        return <RunOutputPane />;
    }
  };

  return (
    <div className="h-full bg-gray-800 flex flex-col overflow-hidden">
      {/* Tab Headers */}
      <div className="flex-shrink-0 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex overflow-x-auto scrollbar-none">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = rightPanelTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={`
                    flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                    ${
                      isActive
                        ? "text-orange-400 border-orange-400 bg-gray-700/50"
                        : "text-gray-400 border-transparent hover:text-white hover:bg-gray-700/30"
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="flex-shrink-0 m-2 h-8 w-8 p-0 text-gray-400 hover:text-white"
            title="Close Panel"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Active Pane Content */}
      <div className="flex-1 overflow-hidden min-h-0">{renderActivePane()}</div>
    </div>
  );
}
