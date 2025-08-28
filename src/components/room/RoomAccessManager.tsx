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
import { Users, Plus, Trash2, Mail, Shield, Edit } from "lucide-react";
import { apiClient } from "../../lib/apiClient";

interface RoomUser {
  id: number;
  email: string;
  access_level: "viewer" | "editor";
  invited_by: string;
  invited_at: string;
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
  const [users, setUsers] = useState<RoomUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserAccess, setNewUserAccess] = useState<"viewer" | "editor">(
    "viewer"
  );
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.getRoomAccess(roomId);
      setUsers(response.allowed_emails || []);
      setError(null);
    } catch (err) {
      console.error("Failed to load room users:", err);
      setError("Failed to load room users");
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    if (isCreator) {
      loadUsers();
    }
  }, [isCreator, loadUsers]);

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
      await loadUsers();
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
  }, [roomId, newUserEmail, newUserAccess, currentUserId, loadUsers]);

  const handleUpdateAccess = useCallback(
    async (userEmail: string, newAccess: "viewer" | "editor") => {
      try {
        await apiClient.updateRoomAccess(
          roomId,
          userEmail,
          newAccess,
          currentUserId
        );
        await loadUsers();
        setError(null);
      } catch (err) {
        console.error("Failed to update user access:", err);
        setError("Failed to update user access");
      }
    },
    [roomId, currentUserId, loadUsers]
  );

  const handleRemoveUser = useCallback(
    async (userEmail: string) => {
      try {
        await apiClient.removeRoomAccess(roomId, userEmail);
        await loadUsers();
        setError(null);
      } catch (err) {
        console.error("Failed to remove user:", err);
        setError("Failed to remove user");
      }
    },
    [roomId, loadUsers]
  );

  if (!isCreator) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Room Access Management
        </CardTitle>
        <CardDescription>
          Manage who can access this room and their permission levels.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm">
            {error}
          </div>
        )}

        {/* Add User Section */}
        <div className="border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Add New User</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddUser(!showAddUser)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add User
            </Button>
          </div>

          {showAddUser && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="userEmail">Email Address</Label>
                  <Input
                    id="userEmail"
                    type="email"
                    placeholder="user@example.com"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="accessLevel">Access Level</Label>
                  <select
                    id="accessLevel"
                    value={newUserAccess}
                    onChange={(e) =>
                      setNewUserAccess(e.target.value as "viewer" | "editor")
                    }
                    className="w-full p-2 border rounded-md"
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
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Users List */}
        <div className="space-y-2">
          <h3 className="font-medium">Current Users ({users.length})</h3>

          {loading ? (
            <div className="text-sm text-gray-500">Loading users...</div>
          ) : users.length === 0 ? (
            <div className="text-sm text-gray-500">
              No users have access to this room yet.
            </div>
          ) : (
            <div className="space-y-2">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <div>
                      <div className="font-medium text-sm">{user.email}</div>
                      <div className="text-xs text-gray-500">
                        Invited {new Date(user.invited_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={user.access_level}
                      onChange={(e) =>
                        handleUpdateAccess(
                          user.email,
                          e.target.value as "viewer" | "editor"
                        )
                      }
                      className="text-sm border rounded px-2 py-1"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                    </select>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveUser(user.email)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Permission Levels Info */}
        <div className="bg-gray-50 border rounded-lg p-3 text-sm">
          <div className="font-medium mb-2">Permission Levels:</div>
          <div className="space-y-1 text-gray-600">
            <div className="flex items-center gap-2">
              <Shield className="h-3 w-3" />
              <strong>Viewer:</strong> Can view code and run blocks (read-only)
            </div>
            <div className="flex items-center gap-2">
              <Edit className="h-3 w-3" />
              <strong>Editor:</strong> Can view, edit, and run code blocks
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RoomAccessManager;
