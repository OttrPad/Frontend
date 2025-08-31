import React from "react";
import { useAppStore } from "../../store/workspace";
import { Users, TestTube, GitBranch, Bot, Files, Terminal, MessageSquare } from "lucide-react";
import { cn } from "../../lib/utils";

type ActivityType = "files" | "users" | "tests" | "versions" | "ai" | "chat";

interface ActivityItem {
  id: ActivityType;
  icon: React.ElementType;
  label: string;
  tooltip: string;
}

const activities: ActivityItem[] = [
  {
    id: "files",
    icon: Files,
    label: "Files",
    tooltip: "Explorer",
  },
  {
    id: "users",
    icon: Users,
    label: "Users",
    tooltip: "Room Users & Access",
  },
  {
    id: "tests",
    icon: TestTube,
    label: "Tests",
    tooltip: "Test Explorer",
  },
  {
    id: "versions",
    icon: GitBranch,
    label: "Versions",
    tooltip: "Version Control",
  },
  {
    id: "ai",
    icon: Bot,
    label: "AI",
    tooltip: "AI Assistant",
  },
  {
    id: "chat",
    icon: MessageSquare,
    label: "Chat",
    tooltip: "Room Chat",
  },
];

export function ActivityBar() {
  const {
    activeActivity,
    setActiveActivity,
    isLeftSidebarCollapsed,
    toggleLeftSidebar,
    toggleRightSidebar,
  } = useAppStore();

  const handleActivityClick = (activityId: ActivityType) => {
    if (activeActivity === activityId && !isLeftSidebarCollapsed) {
      // If clicking the same activity and sidebar is open, close it
      toggleLeftSidebar();
    } else {
      // Open the activity and sidebar
      setActiveActivity(activityId);
      if (isLeftSidebarCollapsed) {
        toggleLeftSidebar();
      }
    }
  };

  const handleOutputToggle = () => {
    toggleRightSidebar();
  };

  return (
    <div className="w-12 bg-card/60 backdrop-blur-xl border-r border-border flex flex-col items-center py-2 z-50">
      {/* Activity Icons */}
      <div className="flex flex-col gap-1">
        {activities.map((activity) => {
          const Icon = activity.icon;
          const isActive =
            activeActivity === activity.id && !isLeftSidebarCollapsed;

          return (
            <button
              key={activity.id}
              onClick={() => handleActivityClick(activity.id)}
              className={cn(
                "group relative flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200",
                "hover:bg-accent/50",
                isActive
                  ? "bg-orange-400/20 text-orange-400 border border-orange-400/30"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title={activity.tooltip}
            >
              <Icon className="w-5 h-5" />

              {/* Active indicator */}
              {isActive && (
                <div className="absolute -left-[1px] top-1/2 -translate-y-1/2 w-0.5 h-6 bg-orange-400 rounded-r" />
              )}

              {/* Tooltip */}
              <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded-md border shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                {activity.tooltip}
              </div>
            </button>
          );
        })}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom actions - Run Output toggle */}
      <div className="flex flex-col gap-1">
        <button
          onClick={handleOutputToggle}
          className={cn(
            "group relative flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200",
            "hover:bg-accent/50 text-muted-foreground hover:text-foreground"
          )}
          title="Toggle Output Panel"
        >
          <Terminal className="w-5 h-5" />

          {/* Tooltip */}
          <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded-md border shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
            Toggle Output Panel
          </div>
        </button>
      </div>
    </div>
  );
}
