import { useEffect, useState, useCallback } from "react";
import { useParams, Navigate } from "react-router-dom";
import { useAppStore } from "../../store/workspace";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
import { useAuth } from "../../hooks/useAuth";
import { EditorTopbar } from "../../components/workspace/EditorTopbar";
import { FilesSidebar } from "../../components/workspace/FilesSidebar";
import { NotebookArea } from "../../components/workspace/NotebookArea";
import { RightPanel } from "../../components/workspace/RightPanel";
import { KeyboardShortcutsModal } from "../../components/modals/KeyboardShortcutsModal";

export default function WorkspacePage() {
  const { roomId, roomCode } = useParams<{
    roomId?: string;
    roomCode?: string;
  }>();
  const { user, loading } = useAuth();
  const {
    setCurrentRoom,
    sidebarWidth,
    rightPanelWidth,
    isLeftSidebarCollapsed,
    isRightSidebarCollapsed,
    setSidebarWidth,
    setRightPanelWidth,
  } = useAppStore();

  // Get the actual room identifier (either roomId or roomCode)
  const roomIdentifier = roomId || roomCode;

  // Enable keyboard shortcuts
  const { showShortcutsModal, setShowShortcutsModal } = useKeyboardShortcuts();

  // Resize state
  const [isResizing, setIsResizing] = useState(false);
  const [resizeType, setResizeType] = useState<"left" | "right" | null>(null);

  // Mouse handlers for resizing
  const handleMouseDown = useCallback(
    (type: "left" | "right") => (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
      setResizeType(type);
    },
    []
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing || !resizeType) return;

      if (resizeType === "left") {
        const newWidth = Math.max(200, Math.min(500, e.clientX));
        setSidebarWidth(newWidth);
      } else if (resizeType === "right") {
        const newWidth = Math.max(
          300,
          Math.min(600, window.innerWidth - e.clientX)
        );
        setRightPanelWidth(newWidth);
      }
    },
    [isResizing, resizeType, setSidebarWidth, setRightPanelWidth]
  );

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
    setResizeType(null);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    if (roomIdentifier) {
      setCurrentRoom(roomIdentifier);
    }
  }, [roomIdentifier, setCurrentRoom]);

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-orange-400 to-orange-500 rounded-xl animate-pulse mb-4 mx-auto"></div>
          <p className="text-foreground/70">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (!roomIdentifier) {
    return <Navigate to="/join" replace />;
  }

  return (
    <>
      {/* Fixed Profile Header */}
      {/* <ProfileHeader fixed className="z-50" /> */}

      <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
        {/* Background effects matching login page */}
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/95 via-black/90 to-slate-900/95 pointer-events-none"></div>

        {/* Dotted grid pattern */}
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            backgroundImage: `
              radial-gradient(circle, rgba(255, 255, 255, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: "30px 30px",
          }}
        ></div>

        {/* Subtle animated gradients */}
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-orange-400/[0.05] rounded-full blur-3xl animate-pulse pointer-events-none"></div>
        <div
          className="absolute bottom-0 right-1/4 w-80 h-80 bg-amber-400/[0.04] rounded-full blur-3xl animate-pulse pointer-events-none"
          style={{ animationDelay: "2s" }}
        ></div>
        <div
          className="absolute top-1/2 left-0 w-64 h-64 bg-orange-300/[0.03] rounded-full blur-3xl animate-pulse pointer-events-none"
          style={{ animationDelay: "4s" }}
        ></div>

        {/* Content layer */}
        <div className="relative z-10 flex flex-col h-full">
          {/* Top Bar */}
          <EditorTopbar roomId={roomIdentifier} />

          {/* Main Layout */}
          <div className="flex flex-1 overflow-hidden">
            {/* Files Sidebar */}
            {!isLeftSidebarCollapsed && (
              <>
                <div
                  className="flex-shrink-0 border-r border-border bg-card/40 backdrop-blur-xl z-50"
                  style={{ width: sidebarWidth }}
                >
                  <FilesSidebar />
                </div>
                {/* Left Resize Handle */}
                <div
                  className="w-1 bg-border hover:bg-orange-400 cursor-col-resize transition-colors"
                  onMouseDown={handleMouseDown("left")}
                />
              </>
            )}

            {/* Notebook Area */}
            <div className="flex-1 min-w-0 bg-background backdrop-blur-sm">
              <NotebookArea />
            </div>

            {/* Right Panel */}
            {!isRightSidebarCollapsed && rightPanelWidth > 0 && (
              <>
                {/* Right Resize Handle */}
                <div
                  className="w-1 bg-border hover:bg-orange-400 cursor-col-resize transition-colors"
                  onMouseDown={handleMouseDown("right")}
                />
                <div
                  className="flex-shrink-0 border-l border-border bg-card/40 backdrop-blur-xl"
                  style={{ width: rightPanelWidth }}
                >
                  <RightPanel />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        open={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />
    </>
  );
}
