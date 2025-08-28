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
import { Users, Plus, Trash2 } from "lucide-react";
import { apiClient } from "../../../lib/apiClient";
import { useAuth } from "../../../hooks/useAuth";

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
  const { user: currentUser } = useAuth();
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

  // Generate user initials - prefer email, fallback to user ID
  const getInitials = (email: string, userId?: string) => {
    if (email && email.includes("@")) {
      // Get first letter of email username
      return email.charAt(0).toUpperCase();
    } else if (userId) {
      // Get first letter of user ID as fallback
      return userId.charAt(0).toUpperCase();
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

      // Check cache first
      const now = Date.now();
      const needsRoomInfo =
        !roomInfo || now - roomInfo.cached_at > CACHE_TIMEOUT;

      let currentRoomInfo = roomInfo;

      // Get room info from cache or API
      if (needsRoomInfo) {
        const roomsResponse = await apiClient.getAllRooms();
        const currentRoom = roomsResponse.rooms?.find(
          (r) => r.room_code === roomId || r.room_id.toString() === roomId
        );

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

      // Try to get participants using the new API endpoint first
      try {
        console.log("Fetching participants for room:", roomId);
        const participantsResponse = await apiClient.getRoomParticipants(
          roomId
        );
        console.log("Participants response:", participantsResponse);

        // Map the response to ensure consistency
        const allUsers: Participant[] = (
          participantsResponse.participants || []
        ).map((p) => {
          // For members, determine if they're admin based on creator status
          let userType = p.user_type;
          if (
            p.status === "member" &&
            p.user_id === currentRoomInfo?.created_by
          ) {
            userType = "admin";
          }

          return {
            user_id: p.user_id || "",
            email: p.email || "",
            status: p.status,
            user_type: userType,
            joined_at: p.joined_at,
            invited_at: p.invited_at,
            invited_by: p.invited_by,
          };
        });

        console.log("Mapped participants:", allUsers);
        setParticipants(allUsers);
        setIsAdmin(currentRoomInfo?.created_by === currentUser?.id);
        setError(null);
      } catch (participantsError) {
        console.warn(
          "New participants endpoint failed, falling back to old method:",
          participantsError
        );

        // Fallback to old method
        console.log(
          "Using fallback method to fetch participants and invited users"
        );
        const participantsResponse = await apiClient.getRoomParticipants(
          roomId
        );

        // Get invited users (allowed_emails) if user is admin
        let invitedUsers: Array<{
          id: number;
          email: string;
          access_level: "viewer" | "editor";
          invited_by: string;
          invited_at: string;
        }> = [];
        const isRoomCreator = currentRoomInfo?.created_by === currentUser?.id;

        if (isRoomCreator) {
          try {
            const accessResponse = await apiClient.getRoomAccess(roomId);
            console.log(
              "Invited users (allowed_emails):",
              accessResponse.allowed_emails
            );
            invitedUsers = accessResponse.allowed_emails || [];
          } catch (err) {
            console.log(
              "Could not fetch invited users (might not be admin):",
              err
            );
          }
        }

        // Combine participants and invited users
        const allUsers: Participant[] = [];

        // Add active participants (members)
        (participantsResponse.participants || []).forEach(
          (p: {
            userId?: string;
            user_id?: string;
            userEmail?: string;
            email?: string;
            joinedAt?: number;
            joined_at?: string;
          }) => {
            const userId = p.userId || p.user_id || "";
            const userEmail = p.userEmail || p.email || "";

            // Determine user type based on whether they're the creator
            let userType: "admin" | "editor" | "viewer" = "editor"; // Default
            if (userId === currentRoomInfo?.created_by) {
              userType = "admin"; // Room creator is admin
            }

            allUsers.push({
              user_id: userId,
              email: userEmail,
              status: "member",
              user_type: userType,
              joined_at: p.joinedAt
                ? new Date(p.joinedAt).toISOString()
                : p.joined_at,
              invited_at: undefined,
              invited_by: undefined,
            });
          }
        );

        // Add invited users (not yet members)
        invitedUsers.forEach((invitedUser) => {
          // Check if this email is already a member
          const isAlreadyMember = allUsers.some(
            (u) => u.email === invitedUser.email
          );

          if (!isAlreadyMember) {
            allUsers.push({
              user_id: "", // No user ID for invited users
              email: invitedUser.email,
              status: "invited",
              user_type: invitedUser.access_level,
              joined_at: undefined,
              invited_at: invitedUser.invited_at,
              invited_by: invitedUser.invited_by,
            });
          }
        });

        console.log("Combined participants (fallback method):", allUsers);
        setParticipants(allUsers);
        setIsAdmin(isRoomCreator);
      }

      setError(null);
    } catch (err) {
      console.error("Failed to load room participants:", err);
      if (err instanceof Error) {
        setError(err.message || "Failed to load room participants");
      } else {
        setError("Failed to load room participants");
      }
      setParticipants([]);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  }, [roomId, currentUser?.id, roomInfo, CACHE_TIMEOUT]);

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
        <div className="text-sm text-gray-400">
          {loading
            ? "Loading users..."
            : `${participants.length} participant${
                participants.length !== 1 ? "s" : ""
              }`}
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
                  {getInitials(participant.email || "", participant.user_id)}
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-medium text-white truncate">
                      {participant.email?.split("@")[0] || "User"}
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
                  {/* Always show email */}
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
      <div className="bg-white/[0.02] border border-white/[0.08] rounded-lg p-3 text-xs backdrop-blur-md">
        <div className="font-medium mb-3 text-white">Permission Levels:</div>
        <div className="space-y-2 text-white/70">
          <div className="flex items-center gap-3">
            <span className={getAccessLevelBadge("admin")}>Admin</span>
            <span>Full room control including user management</span>
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
      </div>
    </div>
  );
}
