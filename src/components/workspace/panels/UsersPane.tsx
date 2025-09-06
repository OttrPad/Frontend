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
import { Users, Plus, Trash2, Shield, Edit, Crown, User } from "lucide-react";
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

  // Cache room information to avoid repeated API calls
  const [roomInfo, setRoomInfo] = useState<{
    id: string;
    created_by: string;
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
            cached_at: now,
          };
          setRoomInfo(currentRoomInfo);
        }
      }

      // Get all participants (members + invited users) - New unified API
      const participantsResponse = await apiClient.getRoomParticipants(roomId);
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
    } catch (err) {
      console.error("Failed to load room participants:", err);
      if (err instanceof Error) {
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
      await apiClient.addRoomAccess(
        roomId,
        newUserEmail,
        newUserAccess,
        currentUser.id
      );
      await loadParticipants();
      setNewUserEmail("");
      setNewUserAccess("viewer");
      setShowAddUser(false);
      setError(null);
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

  const getRoleIcon = (userType: string) => {
    switch (userType) {
      case "admin":
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case "editor":
        return <Edit className="h-4 w-4 text-blue-500" />;
      case "viewer":
        return <Shield className="h-4 w-4 text-gray-500" />;
      default:
        return <User className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRoleColor = (userType: string) => {
    switch (userType) {
      case "admin":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "editor":
        return "text-blue-600 bg-blue-50 border-blue-200";
      case "viewer":
        return "text-gray-600 bg-gray-50 border-gray-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
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
            className="border-orange-400/30 text-orange-400 hover:bg-orange-400/10"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add User
          </Button>
        )}
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-500/50 text-red-200 px-3 py-2 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Add User Section - Only show for admins */}
      {isAdmin && showAddUser && (
        <Card className="bg-card/60 border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Add New User</CardTitle>
            <CardDescription className="text-xs">
              Invite someone to collaborate in this room
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-3">
              <div>
                <Label htmlFor="userEmail" className="text-xs">
                  Email Address
                </Label>
                <Input
                  id="userEmail"
                  type="email"
                  placeholder="user@example.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="bg-background/50 border-border text-sm"
                />
              </div>
              <div>
                <Label htmlFor="accessLevel" className="text-xs">
                  Access Level
                </Label>
                <select
                  id="accessLevel"
                  value={newUserAccess}
                  onChange={(e) =>
                    setNewUserAccess(e.target.value as "viewer" | "editor")
                  }
                  className="w-full p-2 border border-border rounded-md bg-background/50 text-sm"
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleAddUser}
                disabled={isAddingUser || !newUserEmail.trim()}
                size="sm"
                className="bg-orange-500 hover:bg-orange-600 text-black"
              >
                {isAddingUser ? "Adding..." : "Add User"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddUser(false);
                  setNewUserEmail("");
                  setNewUserAccess("viewer");
                }}
                size="sm"
                className="border-border"
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
                className="flex items-center gap-3 p-3 bg-card/40 rounded-lg border border-border hover:bg-card/60 transition-colors"
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
                    {getRoleIcon(participant.user_type)}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getRoleColor(
                        participant.user_type
                      )}`}
                    >
                      {participant.user_type}
                    </span>
                    <span
                      className={`text-xs ${
                        participant.status === "member"
                          ? "text-green-400"
                          : "text-yellow-400"
                      }`}
                    >
                      {participant.status}
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
                        className="text-xs border border-border rounded px-2 py-1 bg-background/50"
                      >
                        <option value="viewer">Viewer</option>
                        <option value="editor">Editor</option>
                      </select>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveUser(participant.email!)}
                        className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                      >
                        <Trash2 className="h-3 w-3" />
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
          <div className="flex items-center gap-2">
            <Edit className="h-3 w-3 text-blue-500" />
            <strong>Editor:</strong> Can view, edit, and run code blocks
          </div>
          <div className="flex items-center gap-2">
            <Shield className="h-3 w-3 text-gray-500" />
            <strong>Viewer:</strong> Can view code and run blocks (read-only)
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-border/50 text-gray-500">
          All room members can view the participant list
        </div>
      </div>
    </div>
  );
}
