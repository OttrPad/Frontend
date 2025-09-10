import { useState, useEffect, useCallback } from "react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../ui/card";
import { Users, Plus, Trash2, Crown } from "lucide-react";
import { apiClient } from "../../../lib/apiClient";
import { useUser } from "../../../hooks/useUser";

interface Participant {
  user_id: string;
  email?: string;
  status: "member" | "invited";
  user_type: "admin" | "editor" | "viewer";
  joined_at?: string;
  invited_at?: string;
  invited_by?: string;
}

interface UsersPaneProps {
  roomId: string; // Can be room ID or room code
}

export function UsersPane({ roomId }: UsersPaneProps) {
  const { user: currentUser, userProfile } = useUser();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserAccess, setNewUserAccess] = useState<"viewer" | "editor">(
    "viewer"
  );
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [roomCode, setRoomCode] = useState<string>("");
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);

  // Cache room information to avoid repeated API calls
  const [roomInfo, setRoomInfo] = useState<{
    id: string;
    created_by: string;
    room_code?: string;
    cached_at: number;
  } | null>(null);

  // Cache timeout (5 minutes)
  const CACHE_TIMEOUT = 5 * 60 * 1000;

  // Generate user display name - prefer full name, then email username, then fallback
  const getDisplayName = (participant: Participant, isCurrentUser: boolean) => {
    // If it's the current user and we have their profile name, use it
    if (isCurrentUser && userProfile?.name) {
      return userProfile.name;
    }

    // Extract name from email if available
    if (participant.email && participant.email.includes("@")) {
      const emailParts = participant.email.split("@");
      const username = emailParts[0];

      // Handle empty username (shouldn't happen but just in case)
      if (!username) {
        return participant.status === "invited" ? "Invited User" : "User";
      }

      // Convert common email patterns to readable names
      // e.g., "john.doe" -> "John Doe", "john_doe" -> "John Doe"
      const readableName = username
        .split(/[._-]/)
        .map(
          (part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
        )
        .join(" ");

      return readableName;
    }

    // Fallback for different user types
    if (participant.status === "invited") {
      return "Invited User";
    }

    // Fallback - show user ID if available
    if (participant.user_id && participant.user_id.length > 6) {
      return `User ${participant.user_id.slice(-6)}`; // Show last 6 chars of user ID
    }

    return "Anonymous User";
  }; // Generate user initials - prefer email, fallback to user ID or status
  const getInitials = (email: string, userId?: string, status?: string) => {
    if (email && email.includes("@")) {
      // Get first letter of email username
      const username = email.split("@")[0];
      return username.charAt(0).toUpperCase();
    } else if (userId && userId.length > 0) {
      // Get first letter of user ID as fallback
      return userId.charAt(0).toUpperCase();
    } else if (status === "invited") {
      return "I"; // For invited users
    }
    return "U"; // Ultimate fallback
  };

  // Generate consistent colors for users
  const getColorForUser = (userId: string): string => {
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

    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }

    return colors[Math.abs(hash) % colors.length];
  };

  const loadParticipants = useCallback(async () => {
    try {
      setLoading(true);
      console.log("🔍 UsersPane: Loading participants for roomId:", roomId);

      // Check cache first
      const now = Date.now();
      const needsRoomInfo =
        !roomInfo || now - roomInfo.cached_at > CACHE_TIMEOUT;

      let currentRoomInfo = roomInfo;

      // Get room info from cache or API
      if (needsRoomInfo) {
        console.log("🔍 UsersPane: Fetching room info from API...");
        const roomsResponse = await apiClient.getAllRooms();
        console.log("🔍 UsersPane: Rooms response:", roomsResponse);

        const currentRoom = roomsResponse.rooms?.find(
          (r) => r.room_code === roomId || r.room_id.toString() === roomId
        );
        console.log("🔍 UsersPane: Found current room:", currentRoom);

        if (currentRoom) {
          currentRoomInfo = {
            id: currentRoom.room_id.toString(),
            created_by: currentRoom.created_by,
            room_code: currentRoom.room_code,
            cached_at: now,
          };
          setRoomInfo(currentRoomInfo);
          setRoomCode(currentRoom.room_code || "");
        }
      }

      // Get all participants (members + invited users) - New unified API
      console.log("🔍 UsersPane: Fetching participants from API...");
      const participantsResponse = await apiClient.getRoomParticipants(roomId);
      console.log("🔍 UsersPane: Participants response:", participantsResponse);

      const isRoomCreator = currentRoomInfo?.created_by === currentUser?.id;

      // Process all participants from the unified API response
      const allUsers: Participant[] = [];

      // The new API returns both members and invited users in a single array
      (participantsResponse.participants || []).forEach(
        (p: {
          // Old format (legacy support)
          userId?: string;
          userEmail?: string;
          socketId?: string;
          joinedAt?: number;
          // New format (expected)
          user_id?: string | null;
          email?: string;
          status?: "member" | "invited";
          user_type?: "admin" | "editor" | "viewer";
          joined_at?: string;
          invited_at?: string;
          invited_by?: string;
        }) => {
          // Handle both old and new API response formats
          const userId = p.user_id || p.userId || "";
          const userEmail = p.email || p.userEmail || "";

          // Skip if we don't have valid email data
          if (!userEmail) {
            console.warn("Participant missing email:", p);
            return;
          }

          // Use the user_type from API response, with fallbacks
          let userType: "admin" | "editor" | "viewer" = p.user_type || "editor";

          // Ensure room creator is always admin (backup check)
          if (userId === currentRoomInfo?.created_by) {
            userType = "admin";
          }

          // Handle date formats (old uses timestamp, new uses ISO string)
          let joinedAt: string | undefined;
          if (p.joined_at) {
            joinedAt = p.joined_at;
          } else if (p.joinedAt) {
            joinedAt = new Date(p.joinedAt).toISOString();
          }

          // For current user, use profile data if available
          let finalEmail = userEmail;
          if (userId === currentUser?.id && userProfile?.email) {
            finalEmail = userProfile.email;
          }

          allUsers.push({
            user_id: userId,
            email: finalEmail,
            status: p.status || "member",
            user_type: userType,
            joined_at: joinedAt,
            invited_at: p.invited_at,
            invited_by: p.invited_by,
          });
        }
      );

      // Backup: Only add current user if not already in the list (shouldn't happen with proper API)
      if (currentUser && userProfile) {
        const currentUserExists = allUsers.some(
          (u) =>
            (u.user_id && u.user_id === currentUser.id) ||
            u.email === userProfile.email
        );

        if (!currentUserExists) {
          console.log(
            "Current user not found in participants, adding manually"
          );
          // Determine if current user is admin/creator
          const isCurrentUserAdmin =
            currentRoomInfo?.created_by === currentUser.id;

          allUsers.push({
            user_id: currentUser.id,
            email: userProfile.email,
            status: "member",
            user_type: isCurrentUserAdmin ? "admin" : "editor",
            joined_at: new Date().toISOString(),
            invited_at: undefined,
            invited_by: undefined,
          });
        }
      }

      setParticipants(allUsers);
      setIsAdmin(isRoomCreator);
      setError(null);
      console.log(
        "🔍 UsersPane: Successfully loaded participants:",
        allUsers.length
      );
    } catch (err) {
      console.error("🚨 UsersPane: Failed to load room participants:", err);
      if (err instanceof Error) {
        console.error("🚨 UsersPane: Error details:", {
          message: err.message,
          stack: err.stack,
          name: err.name,
        });
        // More specific error messages based on the updated API
        if (
          err.message.includes("403") ||
          err.message.includes("Access denied")
        ) {
          setError(
            "Access denied: You must be a room member to view participants"
          );
        } else if (err.message.includes("404")) {
          setError("Room not found");
        } else {
          setError(err.message || "Failed to load room participants");
        }
      } else {
        console.error("🚨 UsersPane: Unknown error type:", typeof err, err);
        setError("Failed to load room participants");
      }
      setParticipants([]);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  }, [roomId, currentUser, userProfile, roomInfo, CACHE_TIMEOUT]);

  useEffect(() => {
    if (roomId && currentUser) {
      loadParticipants();
    }
  }, [roomId, currentUser, loadParticipants]);

  const handleAddUser = useCallback(async () => {
    if (!newUserEmail.trim() || !currentUser?.id) return;

    try {
      setIsAddingUser(true);
      console.log("Adding user:", newUserEmail, "with access:", newUserAccess);

      await apiClient.addRoomAccess(
        roomId,
        newUserEmail,
        newUserAccess,
        currentUser.id
      );

      console.log("User added successfully, refreshing participants...");

      // Clear cache to force fresh data
      setRoomInfo(null);

      // Refresh participants
      await loadParticipants();

      setNewUserEmail("");
      setNewUserAccess("viewer");
      setShowAddUser(false);
      setError(null);

      console.log("Participants refreshed after adding user");
    } catch (err) {
      console.error("Failed to add user:", err);
      setError("Failed to add user");
    } finally {
      setIsAddingUser(false);
    }
  }, [roomId, newUserEmail, newUserAccess, currentUser?.id, loadParticipants]);

  const handleUpdateAccess = useCallback(
    async (userEmail: string, newAccess: "viewer" | "editor") => {
      if (!currentUser?.id) return;

      try {
        await apiClient.updateRoomAccess(
          roomId,
          userEmail,
          newAccess,
          currentUser.id
        );
        await loadParticipants();
        setError(null);
      } catch (err) {
        console.error("Failed to update user access:", err);
        setError("Failed to update user access");
      }
    },
    [roomId, currentUser?.id, loadParticipants]
  );

  const handleRemoveUser = useCallback(
    async (userEmail: string) => {
      try {
        await apiClient.removeRoomAccess(roomId, userEmail);
        await loadParticipants();
        setError(null);
      } catch (err) {
        console.error("Failed to remove user:", err);
        setError("Failed to remove user");
      }
    },
    [roomId, loadParticipants]
  );

  const handleJoinRoom = useCallback(async () => {
    if (!roomCode || !currentUser?.id) return;

    try {
      setIsJoiningRoom(true);
      console.log("Joining room with code:", roomCode);

      await apiClient.joinRoom(roomCode);
      console.log("Successfully joined room, refreshing participants...");

      // Clear cache to force fresh data
      setRoomInfo(null);

      // Refresh participants to show updated status
      await loadParticipants();

      setError(null);
    } catch (err) {
      console.error("Failed to join room:", err);
      setError("Failed to join room");
    } finally {
      setIsJoiningRoom(false);
    }
  }, [roomCode, currentUser?.id, loadParticipants]);

  const getAccessLevelBadge = (userType: "admin" | "editor" | "viewer") => {
    const baseClasses =
      "inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border";

    switch (userType) {
      case "admin":
        return `${baseClasses} bg-orange-400/20 text-orange-300 border-orange-400/40`;
      case "editor":
        return `${baseClasses} bg-blue-400/20 text-blue-300 border-blue-400/40`;
      case "viewer":
        return `${baseClasses} bg-gray-400/20 text-gray-300 border-gray-400/40`;
      default:
        return `${baseClasses} bg-gray-400/20 text-gray-300 border-gray-400/40`;
    }
  };

  const getStatusBadge = (status: "member" | "invited") => {
    const baseClasses =
      "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border";

    if (status === "member") {
      return `${baseClasses} bg-green-400/20 text-green-300 border-green-400/40`;
    } else {
      return `${baseClasses} bg-yellow-400/20 text-yellow-300 border-yellow-400/40`;
    }
  };

  return (
    <div className="h-full flex flex-col p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-orange-400" />
          <h2 className="text-lg font-semibold text-white">Room Users</h2>
        </div>
        {/* Add User button - Only admins can add users */}
        {isAdmin && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddUser(!showAddUser)}
            className="bg-white/[0.05] border-white/[0.1] text-orange-400 hover:bg-orange-400/10 hover:border-orange-400/30 transition-all duration-200"
          >
            <Plus className="h-4 w-4 mr-1" />
            Invite User
          </Button>
        )}
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/30 text-red-400 px-3 py-2 rounded-md text-sm backdrop-blur-md">
          {error}
        </div>
      )}

      {/* Join Room Invitation Banner - Show if current user is invited */}
      {currentUser?.email &&
        participants.some(
          (p) => p.email === currentUser.email && p.status === "invited"
        ) &&
        roomCode && (
          <div className="bg-green-500/20 border border-green-500/30 text-green-400 px-4 py-3 rounded-md text-sm backdrop-blur-md">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">You're invited to this room!</div>
                <div className="text-xs text-green-300 mt-1">
                  Click the button to join and start collaborating
                </div>
              </div>
              <Button
                onClick={handleJoinRoom}
                disabled={isJoiningRoom}
                size="sm"
                className="bg-gradient-to-r from-green-400 to-green-500 text-black hover:from-green-300 hover:to-green-400 font-medium ml-3"
              >
                {isJoiningRoom ? "Joining..." : "Join Now"}
              </Button>
            </div>
          </div>
        )}

      {/* Add User Section - Only show for admins */}
      {isAdmin && showAddUser && (
        <Card className="bg-black/20 backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-white">
              Invite New User
            </CardTitle>
            <CardDescription className="text-xs text-white/60">
              Invite someone to collaborate in this room
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-3">
              <div>
                <Label
                  htmlFor="userEmail"
                  className="text-xs text-white font-medium"
                >
                  Email Address
                </Label>
                <Input
                  id="userEmail"
                  type="email"
                  placeholder="user@example.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="mt-1 bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/50 focus:border-orange-400/60 focus:bg-white/[0.08] text-sm"
                />
              </div>
              <div>
                <Label
                  htmlFor="accessLevel"
                  className="text-xs text-white font-medium"
                >
                  Access Level
                </Label>
                <select
                  id="accessLevel"
                  value={newUserAccess}
                  onChange={(e) =>
                    setNewUserAccess(e.target.value as "viewer" | "editor")
                  }
                  className="w-full mt-1 p-2 bg-white/[0.05] border border-white/[0.1] rounded-md text-white focus:border-orange-400/60 focus:bg-white/[0.08] text-sm"
                >
                  <option value="viewer" className="bg-black text-white">
                    Viewer
                  </option>
                  <option value="editor" className="bg-black text-white">
                    Editor
                  </option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleAddUser}
                disabled={isAddingUser || !newUserEmail.trim()}
                size="sm"
                className="bg-gradient-to-r from-orange-400 to-orange-500 text-black hover:from-orange-300 hover:to-orange-400 font-medium"
              >
                {isAddingUser ? "Inviting..." : "Send Invitation"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddUser(false);
                  setNewUserEmail("");
                  setNewUserAccess("viewer");
                }}
                size="sm"
                className="bg-white/[0.05] border-white/[0.1] text-white hover:bg-white/[0.08] hover:border-white/[0.15]"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users List */}
      <div className="flex-1 overflow-y-auto space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">
            {loading
              ? "Loading users..."
              : `${participants.length} participant${
                  participants.length !== 1 ? "s" : ""
                }`}
          </span>
          {/* Info for non-admin users */}
          {!isAdmin && !loading && participants.length > 0 && (
            <span className="text-xs text-gray-500">
              View only • Admin can edit
            </span>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center gap-3 p-3 bg-card/40 rounded-lg border border-border">
                  <div className="w-10 h-10 bg-gray-600 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-600 rounded w-24 mb-1"></div>
                    <div className="h-3 bg-gray-700 rounded w-16"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : participants.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No participants in this room yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {participants.map((participant, index) => (
              <div
                key={participant.user_id || participant.email || index}
                className="flex items-center gap-3 p-3 bg-white/[0.02] backdrop-blur-md border border-white/[0.08] rounded-lg hover:bg-white/[0.04] hover:border-white/[0.12] transition-all duration-200"
              >
                {/* User Avatar */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium text-white border-2 ${
                    participant.user_id === currentUser?.id
                      ? "border-orange-400 ring-2 ring-orange-400/30"
                      : "border-gray-600"
                  }`}
                  style={{
                    backgroundColor: getColorForUser(
                      participant.user_id ||
                        participant.email ||
                        `user-${index}`
                    ),
                  }}
                >
                  {getInitials(
                    participant.email || "",
                    participant.user_id,
                    participant.status
                  )}
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-medium text-white truncate">
                      {getDisplayName(
                        participant,
                        participant.user_id === currentUser?.id
                      )}
                      {participant.user_id === currentUser?.id && (
                        <span className="text-orange-400 ml-1">(You)</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className={getAccessLevelBadge(participant.user_type)}
                    >
                      {participant.user_type.charAt(0).toUpperCase() +
                        participant.user_type.slice(1)}
                    </span>
                    <span className={getStatusBadge(participant.status)}>
                      {participant.status === "member" ? "Active" : "Invited"}
                    </span>
                  </div>
                  {/* Always show email for all users */}
                  <div className="text-xs text-gray-400 truncate mt-1">
                    {participant.email || "No email available"}
                  </div>
                </div>

                {/* Admin Controls - Only show for admins and not for current user */}
                {isAdmin &&
                  participant.user_id !== currentUser?.id &&
                  participant.status === "invited" &&
                  participant.email && (
                    <div className="flex items-center gap-1">
                      <select
                        value={participant.user_type}
                        onChange={(e) =>
                          handleUpdateAccess(
                            participant.email!,
                            e.target.value as "viewer" | "editor"
                          )
                        }
                        className="text-xs bg-white/[0.05] border border-white/[0.1] rounded px-2 py-1 text-white focus:border-orange-400/60"
                      >
                        <option value="viewer" className="bg-black text-white">
                          Viewer
                        </option>
                        <option value="editor" className="bg-black text-white">
                          Editor
                        </option>
                      </select>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveUser(participant.email!)}
                        className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-400/20 border border-red-400/30 hover:border-red-400/50"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}

                {/* Join Room Button - Show for current user if they are invited */}
                {participant.email === currentUser?.email &&
                  participant.status === "invited" &&
                  roomCode && (
                    <div className="flex items-center">
                      <Button
                        onClick={handleJoinRoom}
                        disabled={isJoiningRoom}
                        size="sm"
                        className="bg-gradient-to-r from-green-400 to-green-500 text-black hover:from-green-300 hover:to-green-400 font-medium"
                      >
                        {isJoiningRoom ? "Joining..." : "Join Room"}
                      </Button>
                    </div>
                  )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Permission Levels Info */}
      <div className="bg-card/20 border border-border rounded-lg p-3 text-xs">
        <div className="font-medium mb-2 text-white">Permission Levels:</div>
        <div className="space-y-1 text-gray-400">
          <div className="flex items-center gap-2">
            <Crown className="h-3 w-3 text-yellow-500" />
            <strong>Admin:</strong> Full control over room and user management
          </div>
          <div className="flex items-center gap-3">
            <span className={getAccessLevelBadge("editor")}>Editor</span>
            <span>Can view, edit, and run code blocks</span>
          </div>
          <div className="flex items-center gap-3">
            <span className={getAccessLevelBadge("viewer")}>Viewer</span>
            <span>Can view code and run blocks (read-only)</span>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-border/50 text-gray-500">
          All room members can view the participant list
        </div>
      </div>
    </div>
  );
}
