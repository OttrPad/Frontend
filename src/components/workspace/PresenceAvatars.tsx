import { useEffect, useState } from "react";
import { usePresenceStore } from "../../store/workspace";
import { useAuth } from "../../hooks/useAuth";
import { apiClient } from "../../lib/apiClient";

interface Participant {
  userId: string;
  userEmail: string;
  socketId: string;
  joinedAt: number;
}

interface PresenceAvatarsProps {
  roomId?: string; // Can be room ID or room code
}

export function PresenceAvatars({ roomId }: PresenceAvatarsProps) {
  const { users, currentUser } = usePresenceStore();
  const { user: authUser } = useAuth();
  const [participants, setParticipants] = useState<Participant[]>([]);

  // Fetch real participants if roomId is provided
  useEffect(() => {
    if (roomId) {
      const fetchParticipants = async () => {
        try {
          const response = await apiClient.getRoomParticipants(roomId);
          // Map to expected format
          const mappedParticipants = (response.participants || []).map(
            (p: {
              userId?: string;
              user_id?: string;
              userEmail?: string;
              email?: string;
              joinedAt?: number;
            }) => ({
              userId: p.userId || p.user_id || "",
              userEmail: p.userEmail || p.email || "",
              socketId: "", // Not needed for display
              joinedAt: p.joinedAt || Date.now(),
            })
          );
          setParticipants(mappedParticipants);
        } catch (error) {
          console.error("Failed to fetch room participants:", error);
          // Fallback to empty array
          setParticipants([]);
        }
      };

      fetchParticipants();

      // Optionally set up polling to refresh participants
      const interval = setInterval(fetchParticipants, 30000); // Refresh every 30 seconds

      return () => clearInterval(interval);
    }
  }, [roomId]);

  // Mock users for demo when no roomId or participants
  const mockUsers = [
    {
      id: "1",
      name: "Alice Johnson",
      email: "alice@example.com",
      color: "#FF6B6B",
      avatar: null,
    },
    {
      id: "2",
      name: "Bob Smith",
      email: "bob@example.com",
      color: "#4ECDC4",
      avatar: null,
    },
    {
      id: "3",
      name: "Carol Davis",
      email: "carol@example.com",
      color: "#45B7D1",
      avatar: null,
    },
  ];

  // Convert participants to user format or use existing users/mock data
  let displayUsers;
  if (roomId && participants.length > 0) {
    displayUsers = participants.map((participant) => ({
      id: participant.userId,
      name: participant.userEmail.split("@")[0], // Use email prefix as name
      email: participant.userEmail,
      color: getColorForUser(participant.userId),
      avatar: null,
    }));
  } else if (users.length > 0) {
    displayUsers = users;
  } else {
    displayUsers = mockUsers;
  }

  // Ensure current user is included and highlighted
  const currentUserId = authUser?.id || currentUser?.id;
  if (currentUserId && !displayUsers.find((u) => u.id === currentUserId)) {
    const currentUserData = {
      id: currentUserId,
      name: authUser?.email?.split("@")[0] || "You",
      email: authUser?.email || "",
      color: getColorForUser(currentUserId),
      avatar: null,
    };
    displayUsers = [currentUserData, ...displayUsers];
  }

  const visibleUsers = displayUsers.slice(0, 3);
  const hiddenCount = Math.max(0, displayUsers.length - 3);

  const getInitials = (name: string) => {
    if (!name) return "U";
    // Just get the first letter of the name/email
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className="flex items-center space-x-1">
      {visibleUsers.map((user) => (
        <div key={user.id} className="relative group" title={user.name}>
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white border-2 cursor-pointer transition-transform hover:scale-110 ${
              currentUserId === user.id
                ? "border-orange-400 ring-2 ring-orange-400/30"
                : "border-gray-600"
            }`}
            style={{ backgroundColor: user.color }}
          >
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              getInitials(user.name)
            )}
          </div>

          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 whitespace-nowrap">
            {user.name}
            {currentUserId === user.id && " (You)"}
          </div>
        </div>
      ))}

      {hiddenCount > 0 && (
        <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-xs font-medium text-gray-300 border-2 border-gray-500">
          +{hiddenCount}
        </div>
      )}
    </div>
  );
}

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
