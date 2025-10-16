import { useAppStore } from "../../store/workspace";
import { NotebookSidebar } from "./NotebookSidebar";
import { UsersPane } from "./panels/UsersPane";
import { VersionsPane } from "./panels/VersionsPane";
import { AIAssistPane } from "./panels/AIAssistPane";
import { ChatPane } from "./panels/ChatPane";

export function LeftSidebar() {
  const { activeActivity, currentRoom } = useAppStore();

  const renderActivePanel = () => {
    switch (activeActivity) {
      case "files":
        return <NotebookSidebar />;
      case "users":
        return (
          <div className="h-full">
            <UsersPane roomId={currentRoom || ""} />
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
        return <NotebookSidebar />;
    }
  };

  return (
    <div className="h-full bg-card/40 backdrop-blur-xl border-r border-border overflow-hidden">
      {renderActivePanel()}
    </div>
  );
}
