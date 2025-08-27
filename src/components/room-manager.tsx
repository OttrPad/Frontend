import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient, type Room, ApiRequestError } from "@/lib/apiClient";
import { toast } from "react-toastify";

// Remove mock data - will be replaced with API data

export function RoomManager() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"join" | "create">("join");
  const [roomCode, setRoomCode] = useState("");
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomDesc, setNewRoomDesc] = useState("");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [formErrors, setFormErrors] = useState<{
    roomName?: string;
    roomDesc?: string;
    roomCode?: string;
  }>({});

  // Fetch rooms on component mount
  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.getAllRooms();

      // Ensure we have a valid array
      if (response && Array.isArray(response.rooms)) {
        setRooms(response.rooms);
      } else if (response && response.rooms) {
        // If rooms is not an array but exists, try to handle it
        console.warn("Unexpected rooms format:", response.rooms);
        setRooms([]);
      } else {
        setRooms([]);
      }
    } catch (error) {
      console.error("Failed to fetch rooms:", error);

      if (error instanceof ApiRequestError) {
        switch (error.statusCode) {
          case 401:
            toast.error("Authentication required. Please log in again.");
            break;
          case 403:
            toast.error("Access denied. Please check your permissions.");
            break;
          case 500:
            toast.error("Server error. Please try again later.");
            break;
          default:
            toast.error(
              error.message || "Failed to load rooms. Please try again."
            );
        }
      } else {
        toast.error("Failed to load rooms. Please check your connection.");
      }

      // Set empty array on error to show "No rooms available" message
      setRooms([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    // Validate room code format (xxx-xxx-xxx)
    const roomCodePattern = /^[a-z0-9]{3}-[a-z0-9]{3}-[a-z0-9]{3}$/;
    if (!roomCodePattern.test(roomCode)) {
      setFormErrors({ roomCode: "Room code must be in format: abc-123-def" });
      toast.error("Invalid room code format. Expected format: abc-123-def");
      return;
    }

    try {
      setIsJoining(true);
      setFormErrors({});

      await apiClient.joinRoom(roomCode);
      toast.success("Successfully joined the room!");

      // Navigate using room code route
      navigate(`/room/${roomCode}`);
    } catch (error) {
      console.error("Failed to join room:", error);

      if (error instanceof ApiRequestError) {
        switch (error.errorCode) {
          case "ROOM_NOT_FOUND":
            setFormErrors({ roomCode: "Room not found with this code" });
            toast.error("Room not found. Please check the room code.");
            break;
          case "ALREADY_MEMBER":
            toast.info("You are already a member of this room!");
            navigate(`/room/${roomCode}`);
            break;
          case "ROOM_FULL":
            toast.error("This room is full. Cannot join.");
            break;
          default:
            toast.error(
              error.message || "Failed to join room. Please try again."
            );
        }
      } else {
        toast.error("Failed to join room. Please try again.");
      }
    } finally {
      setIsJoining(false);
    }
  };

  const handleCreateRoom = async () => {
    // Reset form errors
    setFormErrors({});

    // Validate inputs
    const errors: typeof formErrors = {};
    if (!newRoomName.trim()) {
      errors.roomName = "Room name is required";
    }
    if (!newRoomDesc.trim()) {
      errors.roomDesc = "Room description is required";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setIsCreating(true);

      const response = await apiClient.createRoom(
        newRoomName.trim(),
        newRoomDesc.trim()
      );

      toast.success(`Room "${newRoomName}" created successfully!`);

      // Clear form
      setNewRoomName("");
      setNewRoomDesc("");

      // Navigate to the new room using room code if available, otherwise use room ID
      if (response.room?.room_code) {
        navigate(`/room/${response.room.room_code}`);
      } else if (response.room?.id) {
        navigate(`/workspace/${response.room.id}`);
      }

      // Refresh rooms list
      fetchRooms();
    } catch (error) {
      console.error("Failed to create room:", error);

      if (error instanceof ApiRequestError) {
        switch (error.errorCode) {
          case "Room name is required":
            setFormErrors({ roomName: "Room name is required" });
            toast.error("Room name is required");
            break;
          case "You already created a room with this name":
            setFormErrors({
              roomName: "You already have a room with this name",
            });
            toast.error(
              "You already have a room with this name. Please choose a different name."
            );
            break;
          case "Room with this name already exists":
            setFormErrors({ roomName: "Room name already exists" });
            toast.error(
              "A room with this name already exists. Please choose a different name."
            );
            break;
          case "User authentication required":
            toast.error("Authentication required. Please log in again.");
            break;
          default:
            toast.error(
              error.message || "Failed to create room. Please try again."
            );
        }
      } else {
        toast.error("Failed to create room. Please try again.");
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinExistingRoom = async (room: Room) => {
    try {
      await apiClient.joinRoom(room.id);
      toast.success("Successfully joined the room!");

      // Navigate using room code if available, otherwise use room ID
      if (room.room_code) {
        navigate(`/room/${room.room_code}`);
      } else {
        navigate(`/workspace/${room.id}`);
      }
    } catch (error) {
      console.error("Failed to join room:", error);

      if (error instanceof ApiRequestError) {
        switch (error.errorCode) {
          case "ALREADY_MEMBER":
            toast.info("You are already a member of this room!");
            if (room.room_code) {
              navigate(`/room/${room.room_code}`);
            } else {
              navigate(`/workspace/${room.id}`);
            }
            break;
          case "ROOM_FULL":
            toast.error("This room is full. Cannot join.");
            break;
          default:
            toast.error(
              error.message || "Failed to join room. Please try again."
            );
        }
      } else {
        toast.error("Failed to join room. Please try again.");
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* Main Action Container */}
      <Card className="bg-black/20 backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] ring-1 ring-orange-400/10 max-w-2xl mx-auto">
        <CardContent className="p-8">
          {/* Tab Headers */}
          <div className="flex mb-8">
            <button
              onClick={() => setActiveTab("join")}
              className={`flex-1 px-6 py-3 text-sm font-medium rounded-l-xl transition-all duration-200 ${
                activeTab === "join"
                  ? "bg-gradient-to-r from-orange-400 to-orange-500 text-black shadow-lg"
                  : "bg-white/[0.05] text-white/70 hover:text-white hover:bg-white/[0.08]"
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                  />
                </svg>
                <span>Join Room</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab("create")}
              className={`flex-1 px-6 py-3 text-sm font-medium rounded-r-xl transition-all duration-200 ${
                activeTab === "create"
                  ? "bg-gradient-to-r from-orange-400 to-orange-500 text-black shadow-lg"
                  : "bg-white/[0.05] text-white/70 hover:text-white hover:bg-white/[0.08]"
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                <span>Create Room</span>
              </div>
            </button>
          </div>

          {/* Tab Content */}
          <div className="space-y-6">
            {activeTab === "join" && (
              <div className="space-y-6 animate-fade-in">
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 bg-white/[0.08] backdrop-blur-md rounded-2xl mx-auto flex items-center justify-center border border-white/[0.12] shadow-xl">
                    <svg
                      className="w-8 h-8 text-orange-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                      />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-white">
                    Join Existing Room
                  </h2>
                  <p className="text-white/60">
                    Enter a room code to join an existing collaboration
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label
                      htmlFor="room-code"
                      className="text-white font-medium"
                    >
                      Room Code
                    </Label>
                    <Input
                      id="room-code"
                      type="text"
                      placeholder="abc-123-def"
                      value={roomCode}
                      onChange={(e) => {
                        setRoomCode(e.target.value.toLowerCase());
                        setFormErrors({ ...formErrors, roomCode: undefined });
                      }}
                      className={`mt-2 bg-white/[0.05] backdrop-blur-md border-white/[0.1] text-white placeholder:text-white/50 focus:border-orange-400/60 focus:bg-white/[0.08] focus:ring-1 focus:ring-orange-400/20 transition-all lowercase tracking-widest text-center text-lg font-mono ${
                        formErrors.roomCode
                          ? "border-red-400 focus:border-red-400"
                          : ""
                      }`}
                      maxLength={11}
                      pattern="[a-z0-9]{3}-[a-z0-9]{3}-[a-z0-9]{3}"
                    />
                    {formErrors.roomCode && (
                      <p className="mt-1 text-xs text-red-400">
                        {formErrors.roomCode}
                      </p>
                    )}
                  </div>

                  <Button
                    className="w-full bg-gradient-to-r from-orange-400 to-orange-500 text-black hover:from-orange-300 hover:to-orange-400 font-medium py-2.5 shadow-lg hover:shadow-xl transition-all duration-200"
                    disabled={!roomCode.trim() || isJoining}
                    onClick={handleJoinRoom}
                  >
                    {isJoining ? "Joining..." : "Join Room"}
                  </Button>
                </div>
              </div>
            )}

            {activeTab === "create" && (
              <div className="space-y-6 animate-fade-in">
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 bg-white/[0.08] backdrop-blur-md rounded-2xl mx-auto flex items-center justify-center border border-white/[0.12] shadow-xl">
                    <svg
                      className="w-8 h-8 text-orange-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-white">
                    Create New Room
                  </h2>
                  <p className="text-white/60">
                    Start a new collaboration space for your team
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label
                      htmlFor="room-name"
                      className="text-white font-medium"
                    >
                      Room Name
                    </Label>
                    <Input
                      id="room-name"
                      type="text"
                      placeholder="My Awesome Project"
                      value={newRoomName}
                      onChange={(e) => {
                        setNewRoomName(e.target.value);
                        setFormErrors({ ...formErrors, roomName: undefined });
                      }}
                      className={`mt-2 bg-white/[0.05] backdrop-blur-md border-white/[0.1] text-white placeholder:text-white/50 focus:border-orange-400/60 focus:bg-white/[0.08] focus:ring-1 focus:ring-orange-400/20 transition-all ${
                        formErrors.roomName
                          ? "border-red-400 focus:border-red-400"
                          : ""
                      }`}
                      required
                    />
                    {formErrors.roomName && (
                      <p className="mt-1 text-xs text-red-400">
                        {formErrors.roomName}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label
                      htmlFor="room-desc"
                      className="text-white font-medium"
                    >
                      Description
                    </Label>
                    <Input
                      id="room-desc"
                      type="text"
                      placeholder="Brief description of your project"
                      value={newRoomDesc}
                      onChange={(e) => {
                        setNewRoomDesc(e.target.value);
                        setFormErrors({ ...formErrors, roomDesc: undefined });
                      }}
                      className={`mt-2 bg-white/[0.05] backdrop-blur-md border-white/[0.1] text-white placeholder:text-white/50 focus:border-orange-400/60 focus:bg-white/[0.08] focus:ring-1 focus:ring-orange-400/20 transition-all ${
                        formErrors.roomDesc
                          ? "border-red-400 focus:border-red-400"
                          : ""
                      }`}
                      required
                    />
                    {formErrors.roomDesc && (
                      <p className="mt-1 text-xs text-red-400">
                        {formErrors.roomDesc}
                      </p>
                    )}
                  </div>

                  {/* <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="private-room"
                      checked={isPrivate}
                      onChange={(e) => setIsPrivate(e.target.checked)}
                      className="w-4 h-4 text-orange-400 bg-white/[0.05] border-white/[0.1] rounded focus:ring-orange-400/20"
                    />
                    <Label htmlFor="private-room" className="text-white">
                      Make this room private
                    </Label>
                  </div> */}

                  <Button
                    className="w-full bg-gradient-to-r from-orange-400 to-orange-500 text-black hover:from-orange-300 hover:to-orange-400 font-medium py-2.5 shadow-lg hover:shadow-xl transition-all duration-200"
                    disabled={isCreating}
                    onClick={handleCreateRoom}
                  >
                    {isCreating ? "Creating..." : "Create Room"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Rooms Section */}
      <Card className="bg-black/15 backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
        <CardContent className="p-8">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-white">
                Available Rooms
              </h3>
              <Button
                variant="outline"
                size="sm"
                className="bg-white/[0.05] backdrop-blur-md border-white/[0.1] text-white hover:bg-white/[0.08] hover:border-white/[0.15] transition-all duration-200"
                onClick={fetchRooms}
                disabled={isLoading}
              >
                {isLoading ? "Loading..." : "Refresh"}
              </Button>
            </div>

            <div className="grid gap-4">
              {isLoading ? (
                <div className="text-center py-8 text-white/60">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-400"></div>
                    <span>Loading rooms...</span>
                  </div>
                </div>
              ) : rooms.length === 0 ? (
                <div className="text-center py-8 text-white/60">
                  <div className="space-y-2">
                    <svg
                      className="w-12 h-12 text-white/30 mx-auto"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                    <p>No rooms available.</p>
                    <p className="text-sm">Create a new room to get started!</p>
                  </div>
                </div>
              ) : (
                rooms.map((room) => (
                  <div
                    key={room.id}
                    className="flex items-center justify-between p-4 bg-white/[0.03] backdrop-blur-md border border-white/[0.08] rounded-xl hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-200 cursor-pointer group"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-orange-400/20 to-orange-500/20 rounded-xl flex items-center justify-center border border-orange-400/20">
                        <svg
                          className="w-6 h-6 text-orange-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                          />
                        </svg>
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-white group-hover:text-orange-400 transition-colors">
                            {room.name}
                          </h4>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-white/50">
                          <span>
                            {room.room_code
                              ? `Code: ${room.room_code}`
                              : `ID: ${room.id}`}
                          </span>
                          <span>•</span>
                          <span>
                            Created{" "}
                            {new Date(room.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-orange-400 to-orange-500 text-black hover:from-orange-300 hover:to-orange-400 font-medium shadow-lg hover:shadow-xl transition-all duration-200 opacity-0 group-hover:opacity-100"
                      onClick={() => handleJoinExistingRoom(room)}
                    >
                      Join
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
