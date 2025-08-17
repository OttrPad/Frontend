import { usePresenceStore } from "../../store/workspace";

export function PresenceAvatars() {
  const { users, currentUser } = usePresenceStore();

  // Mock users for demo
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

  const displayUsers = users.length > 0 ? users : mockUsers;
  const visibleUsers = displayUsers.slice(0, 3);
  const hiddenCount = Math.max(0, displayUsers.length - 3);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex items-center space-x-1">
      {visibleUsers.map((user) => (
        <div key={user.id} className="relative group" title={user.name}>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white border-2 border-gray-600 cursor-pointer transition-transform hover:scale-110"
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
            {currentUser?.id === user.id && " (You)"}
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
