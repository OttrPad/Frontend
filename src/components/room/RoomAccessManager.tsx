import React, { useState, useEffect, useCallback } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Users, Plus, Trash2, Mail, UserCheck } from "lucide-react";
import { apiClient } from "../../lib/apiClient";

interface Participant {
  user_id?: string;
  email?: string;
  status: "member" | "invited";
  user_type: "admin" | "editor" | "viewer";
  joined_at?: string;
  invited_at?: string;
  invited_by?: string;
}

interface RoomAccessManagerProps {
  roomId: string;
  isCreator: boolean;
  currentUserId: string;
}

const RoomAccessManager: React.FC<RoomAccessManagerProps> = ({
  roomId,
  isCreator,
  currentUserId,
}) => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserAccess, setNewUserAccess] = useState<"viewer" | "editor">(
    "viewer"
  );
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);

  const loadParticipants = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.getRoomParticipants(roomId);
      setParticipants(response.participants || []);
      setError(null);
    } catch (err) {
      console.error("Failed to load room participants:", err);
      setError("Failed to load room participants");
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    if (isCreator) {
      loadParticipants();
    }
  }, [isCreator, loadParticipants]);

  const handleAddUser = useCallback(async () => {
    if (!newUserEmail.trim()) return;

    try {
      setIsAddingUser(true);
      await apiClient.addRoomAccess(
        roomId,
        newUserEmail,
        newUserAccess,
        currentUserId
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
  }, [roomId, newUserEmail, newUserAccess, currentUserId, loadParticipants]);

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

  const getAccessLevelBadge = (userType: "admin" | "editor" | "viewer") => {
    const baseClasses =
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";

    switch (userType) {
      case "admin":
        return `${baseClasses} bg-orange-400/20 text-orange-400 border border-orange-400/30`;
      case "editor":
        return `${baseClasses} bg-blue-400/20 text-blue-400 border border-blue-400/30`;
      case "viewer":
        return `${baseClasses} bg-gray-400/20 text-gray-400 border border-gray-400/30`;
      default:
        return `${baseClasses} bg-gray-400/20 text-gray-400 border border-gray-400/30`;
    }
  };

  const getStatusBadge = (status: "member" | "invited") => {
    const baseClasses =
      "inline-flex items-center px-2 py-1 rounded-md text-xs font-medium";

    if (status === "member") {
      return `${baseClasses} bg-green-400/20 text-green-400 border border-green-400/30`;
    } else {
      return `${baseClasses} bg-yellow-400/20 text-yellow-400 border border-yellow-400/30`;
    }
  };

  if (!isCreator) {
    return null;
  }

  const members = participants.filter((p) => p.status === "member");
  const invited = participants.filter((p) => p.status === "invited");

  return (
    <Card className="bg-black/20 backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Users className="h-5 w-5 text-orange-400" />
          Room Participants
        </CardTitle>
        <CardDescription className="text-white/60">
          Manage who can access this room and their permission levels.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 text-red-400 px-3 py-2 rounded-md text-sm backdrop-blur-md">
            {error}
          </div>
        )}

        {/* Add User Section */}
        <div className="border border-white/[0.08] rounded-xl p-4 space-y-3 bg-white/[0.02] backdrop-blur-md">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-white">Invite New User</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddUser(!showAddUser)}
              className="bg-white/[0.05] border-white/[0.1] text-white hover:bg-white/[0.08] hover:border-white/[0.15]"
            >
              <Plus className="h-4 w-4 mr-1" />
              Invite User
            </Button>
          </div>

          {showAddUser && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="userEmail" className="text-white font-medium">
                    Email Address
                  </Label>
                  <Input
                    id="userEmail"
                    type="email"
                    placeholder="user@example.com"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="mt-1 bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/50 focus:border-orange-400/60 focus:bg-white/[0.08]"
                  />
                </div>
                <div>
                  <Label
                    htmlFor="accessLevel"
                    className="text-white font-medium"
                  >
                    Access Level
                  </Label>
                  <select
                    id="accessLevel"
                    value={newUserAccess}
                    onChange={(e) =>
                      setNewUserAccess(e.target.value as "viewer" | "editor")
                    }
                    className="w-full mt-1 p-2 bg-white/[0.05] border border-white/[0.1] rounded-md text-white focus:border-orange-400/60 focus:bg-white/[0.08]"
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
                  className="bg-gradient-to-r from-orange-400 to-orange-500 text-black hover:from-orange-300 hover:to-orange-400"
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
                  className="bg-white/[0.05] border-white/[0.1] text-white hover:bg-white/[0.08]"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-8 text-white/60">
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-400"></div>
              <span>Loading participants...</span>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Current Members */}
            <div className="space-y-3">
              <h3 className="font-medium text-white flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                Active Members ({members.length})
              </h3>

              {members.length === 0 ? (
                <div className="text-sm text-white/50 py-4 text-center border border-white/[0.08] rounded-lg bg-white/[0.02]">
                  No active members yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {members.map((participant, index) => (
                    <div
                      key={`member-${participant.user_id || index}`}
                      className="flex items-center justify-between p-3 border border-white/[0.08] rounded-lg bg-white/[0.02] backdrop-blur-md hover:bg-white/[0.04] transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-400/20 rounded-full flex items-center justify-center border border-green-400/30">
                          <UserCheck className="h-4 w-4 text-green-400" />
                        </div>
                        <div>
                          <div className="font-medium text-sm text-white">
                            {participant.email || `User ${participant.user_id}`}
                          </div>
                          <div className="text-xs text-white/50">
                            {participant.joined_at
                              ? `Joined ${new Date(
                                  participant.joined_at
                                ).toLocaleDateString()}`
                              : "Active member"}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={getStatusBadge(participant.status)}>
                          Member
                        </span>
                        <span
                          className={getAccessLevelBadge(participant.user_type)}
                        >
                          {participant.user_type.charAt(0).toUpperCase() +
                            participant.user_type.slice(1)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Invited Users */}
            <div className="space-y-3">
              <h3 className="font-medium text-white flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                Pending Invitations ({invited.length})
              </h3>

              {invited.length === 0 ? (
                <div className="text-sm text-white/50 py-4 text-center border border-white/[0.08] rounded-lg bg-white/[0.02]">
                  No pending invitations.
                </div>
              ) : (
                <div className="space-y-2">
                  {invited.map((participant, index) => (
                    <div
                      key={`invited-${participant.email || index}`}
                      className="flex items-center justify-between p-3 border border-white/[0.08] rounded-lg bg-white/[0.02] backdrop-blur-md hover:bg-white/[0.04] transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-yellow-400/20 rounded-full flex items-center justify-center border border-yellow-400/30">
                          <Mail className="h-4 w-4 text-yellow-400" />
                        </div>
                        <div>
                          <div className="font-medium text-sm text-white">
                            {participant.email}
                          </div>
                          <div className="text-xs text-white/50">
                            {participant.invited_at
                              ? `Invited ${new Date(
                                  participant.invited_at
                                ).toLocaleDateString()}`
                              : "Pending invitation"}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={getStatusBadge(participant.status)}>
                          Invited
                        </span>
                        <span
                          className={getAccessLevelBadge(participant.user_type)}
                        >
                          {participant.user_type.charAt(0).toUpperCase() +
                            participant.user_type.slice(1)}
                        </span>

                        {/* Only show remove button for invited users */}
                        {participant.email && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveUser(participant.email!)}
                            className="text-red-400 hover:text-red-300 border-red-400/30 hover:border-red-400/50 bg-red-400/10 hover:bg-red-400/20"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Permission Levels Info */}
        <div className="bg-white/[0.02] border border-white/[0.08] rounded-lg p-4 text-sm backdrop-blur-md">
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
      </CardContent>
    </Card>
  );
};

export default RoomAccessManager;
