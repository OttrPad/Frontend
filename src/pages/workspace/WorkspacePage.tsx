import { useEffect, useState, useCallback } from "react";
import { useParams, Navigate } from "react-router-dom";
import { useAppStore, usePresenceStore } from "../../store/workspace";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
import { useUser } from "../../hooks/useUser";
import { EditorTopbar } from "../../components/workspace/EditorTopbar";
import { ActivityBar } from "../../components/workspace/ActivityBar";
import { LeftSidebar } from "../../components/workspace/LeftSidebar";
import { OptimizedNotebookArea } from "../../components/workspace/OptimizedNotebookArea";
import { RightPanel } from "../../components/workspace/RightPanel";
import { KeyboardShortcutsModal } from "../../components/modals/KeyboardShortcutsModal";
import { apiClient, ApiRequestError } from "../../lib/apiClient";
import { Button } from "../../components/ui/button";
import { CollaborationProvider } from "../../contexts/CollaborationContext";

// Helper function to generate consistent colors for users
function getColorForUser(userId: string): string {
  const colors = [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#96CEB4",
    "#FCEA2B",
    "#FF9FF3",
    "#54A0FF",
    "#5F27CD",
    "#00D2D3",
    "#FF9F43",
    "#10AC84",
    "#EE5A24",
    "#0ABDE3",
    "#3867D6",
    "#8854D0",
  ];

  // Simple hash function to get consistent color for user ID
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return colors[Math.abs(hash) % colors.length];
}

export default function WorkspacePage() {
  const { roomId, roomCode } = useParams<{
    roomId?: string;
    roomCode?: string;
  }>();
  const { user, userProfile, loading } = useUser();
  const {
    setCurrentRoom,
    sidebarWidth,
    rightPanelWidth,
    activeActivity,
    isLeftSidebarCollapsed,
    isRightSidebarCollapsed,
    setSidebarWidth,
    setRightPanelWidth,
  } = useAppStore();
  const { setCurrentUser } = usePresenceStore();

  // Get the actual room identifier (either roomId or roomCode)
  const roomIdentifier = roomId || roomCode;

  // Room access validation state
  const [roomAccessLoading, setRoomAccessLoading] = useState(true);
  const [hasRoomAccess, setHasRoomAccess] = useState(false);
  const [roomAccessError, setRoomAccessError] = useState<string | null>(null);

  // Cache for room access validation to avoid re-validating on tab switches
  const [roomAccessCache, setRoomAccessCache] = useState<{
    roomId: string;
    userId: string;
    hasAccess: boolean;
    validatedAt: number;
  } | null>(null);

  // Cache timeout (10 minutes for room access)
  const ROOM_ACCESS_CACHE_TIMEOUT = 10 * 60 * 1000;

  // Enable keyboard shortcuts
  const { showShortcutsModal, setShowShortcutsModal } = useKeyboardShortcuts();

  // Determine if current activity needs fixed width
  const needsFixedWidth =
    activeActivity === "users" || activeActivity === "versions";
  const currentSidebarWidth = needsFixedWidth ? 450 : sidebarWidth;

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

      if (resizeType === "left" && !needsFixedWidth) {
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
    [
      isResizing,
      resizeType,
      needsFixedWidth,
      setSidebarWidth,
      setRightPanelWidth,
    ]
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

      // Clear cache if navigating to a different room
      if (roomAccessCache && roomAccessCache.roomId !== roomIdentifier) {
        setRoomAccessCache(null);
      }
    }
  }, [roomIdentifier, setCurrentRoom, roomAccessCache]);

  // Validate room access when user and roomIdentifier are available
  useEffect(() => {
    let isMounted = true;

    const validateRoomAccess = async () => {
      if (!user || !roomIdentifier) {
        setRoomAccessLoading(false);
        return;
      }

      // Check cache first
      const now = Date.now();

      if (
        roomAccessCache &&
        roomAccessCache.roomId === roomIdentifier &&
        roomAccessCache.userId === user.id &&
        now - roomAccessCache.validatedAt < ROOM_ACCESS_CACHE_TIMEOUT
      ) {
        // Use cached result
        setHasRoomAccess(roomAccessCache.hasAccess);
        setRoomAccessError(roomAccessCache.hasAccess ? null : "access_denied");
        setRoomAccessLoading(false);
        return;
      }

      try {
        setRoomAccessLoading(true);
        setRoomAccessError(null);

        // Try to get room participants to validate access
        // If this fails, we'll fall back to checking with the room list
        try {
          await apiClient.getRoomParticipants(roomIdentifier);
        } catch (participantsError) {
          // If participants check fails, try a different validation approach
          // We can try to get all rooms and see if this room exists and user has access
          const roomsResponse = await apiClient.getAllRooms();
          const hasAccess = roomsResponse.rooms?.some(
            (room) =>
              room.room_code === roomIdentifier ||
              room.room_id.toString() === roomIdentifier
          );

          if (!hasAccess) {
            throw participantsError; // Re-throw the original error
          }
        }

        if (isMounted) {
          setHasRoomAccess(true);
          setRoomAccessError(null);

          // Cache the successful validation
          setRoomAccessCache({
            roomId: roomIdentifier,
            userId: user.id,
            hasAccess: true,
            validatedAt: now,
          });
        }
      } catch (error) {
        if (isMounted) {
          setHasRoomAccess(false);

          let errorType = "unknown_error";
          if (error instanceof ApiRequestError) {
            switch (error.statusCode) {
              case 403:
                errorType = "access_denied";
                break;
              case 404:
                errorType = "room_not_found";
                break;
              default:
                errorType = "unknown_error";
            }
          }

          setRoomAccessError(errorType);

          // Cache the failed validation (with shorter timeout)
          setRoomAccessCache({
            roomId: roomIdentifier,
            userId: user.id,
            hasAccess: false,
            validatedAt: now,
          });
        }
      } finally {
        if (isMounted) {
          setRoomAccessLoading(false);
        }
      }
    };

    validateRoomAccess();

    return () => {
      isMounted = false;
    };
  }, [user, roomIdentifier, roomAccessCache, ROOM_ACCESS_CACHE_TIMEOUT]);

  // Set current user in presence store
  useEffect(() => {
    if (userProfile) {
      setCurrentUser({
        id: userProfile.id,
        name: userProfile.name,
        email: userProfile.email,
        color: getColorForUser(userProfile.id),
        avatar: userProfile.avatar || undefined,
      });
    }
  }, [userProfile, setCurrentUser]);

  // Show loading while checking auth or room access
  if (loading || roomAccessLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-orange-400 to-orange-500 rounded-xl animate-pulse mb-4 mx-auto"></div>
          <p className="text-foreground/70">
            {loading ? "Loading..." : "Validating room access..."}
          </p>
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

  // Show 404-like page for room access errors (similar to GitHub's approach)
  if (roomAccessError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-black to-slate-900">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 bg-gray-700 rounded-xl flex items-center justify-center mb-6 mx-auto">
            <div className="text-4xl">🔒</div>
          </div>

          {roomAccessError === "room_not_found" ? (
            <>
              <h1 className="text-2xl font-bold text-white mb-2">
                Room not found
              </h1>
              <p className="text-gray-400 mb-6">
                The room you're looking for doesn't exist or has been deleted.
              </p>
            </>
          ) : roomAccessError === "access_denied" ? (
            <>
              <h1 className="text-2xl font-bold text-white mb-2">
                Access denied
              </h1>
              <p className="text-gray-400 mb-6">
                You don't have permission to access this room. Contact the room
                owner to request access.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-white mb-2">
                Something went wrong
              </h1>
              <p className="text-gray-400 mb-6">
                We encountered an error while trying to access this room.
              </p>
            </>
          )}

          <Button
            onClick={() => (window.location.href = "/join")}
            className="bg-gradient-to-r from-orange-400 to-orange-500 text-black hover:from-orange-300 hover:to-orange-400"
          >
            Go to Rooms
          </Button>
        </div>
      </div>
    );
  }

  // Only render the workspace if user has access
  if (!hasRoomAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-orange-400 to-orange-500 rounded-xl animate-pulse mb-4 mx-auto"></div>
          <p className="text-foreground/70">Checking room access...</p>
        </div>
      </div>
    );
  }

  return (
    <CollaborationProvider>
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
          <div className="flex flex-1 overflow-hidden z-0">
            {/* Activity Bar (always visible) */}
            <ActivityBar />

            {/* Left Sidebar */}
            {!isLeftSidebarCollapsed && (
              <>
                <div
                  className="flex-shrink-0 border-r border-border bg-card/40 backdrop-blur-xl z-50"
                  style={{ width: currentSidebarWidth }}
                >
                  <LeftSidebar />
                </div>
                {/* Left Resize Handle - only show for files, tests, and ai panels */}
                {!needsFixedWidth && (
                  <div
                    className="w-1 bg-border hover:bg-orange-400 cursor-col-resize transition-colors"
                    onMouseDown={handleMouseDown("left")}
                  />
                )}
              </>
            )}

            {/* Notebook Area */}
            <div className="flex-1 min-w-0 bg-background backdrop-blur-sm">
              <OptimizedNotebookArea roomId={roomIdentifier} />
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
    </CollaborationProvider>
  );
}
