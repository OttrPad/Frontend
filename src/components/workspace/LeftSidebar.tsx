import { useAppStore } from "../../store/workspace";
import { FilesSidebar } from "./FilesSidebar";
import { UsersPane } from "./panels/UsersPane";
import { TestsPane } from "./panels/TestsPane";
import { VersionsPane } from "./panels/VersionsPane";
import { AIAssistPane } from "./panels/AIAssistPane";
import { ChatPane } from "./panels/ChatPane";

export function LeftSidebar() {
  const { activeActivity, currentRoom } = useAppStore();

  const renderActivePanel = () => {
    switch (activeActivity) {
      case "files":
        return <FilesSidebar />;
      case "users":
        return (
          <div className="h-full">
            <UsersPane roomId={currentRoom || ""} />
          </div>
        );
      case "tests":
        return (
          <div className="h-full">
            <TestsPane />
          </div>
        );
      case "versions":
        return (
          <div className="h-full">
            <VersionsPane />
          </div>
        );
      case "ai":
        return (
          <div className="h-full">
            <AIAssistPane />
          </div>
        );
      case "chat":
        return (
          <div className="h-full">
            <ChatPane />
          </div>
        );
      default:
        return <FilesSidebar />;
    }
  };

  return (
    <div className="h-full bg-card/40 backdrop-blur-xl border-r border-border overflow-hidden">
      {renderActivePanel()}
    </div>
  );
}
