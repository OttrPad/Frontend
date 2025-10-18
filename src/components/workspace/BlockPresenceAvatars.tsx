import { useEffect, useState } from "react";
import type { Awareness } from "y-protocols/awareness";

interface BlockPresenceAvatarsProps {
  awareness: Awareness | null;
  blockId: string;
}

interface User {
  id: number;
  name: string;
  color: string;
  blockId: string;
}

export function BlockPresenceAvatars({
  awareness,
  blockId,
}: BlockPresenceAvatarsProps) {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    if (!awareness) return;

    const updateUsers = () => {
      const states = Array.from(awareness.getStates().entries());
      const filtered = states
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map(([clientId, state]: [number, any]) => {
          if (!state?.user || !state?.blockId) return null;
          return {
            id: clientId,
            name: state.user.name || "User",
            color: state.user.color || "#fb923d",
            blockId: state.blockId,
          };
        })
        .filter(Boolean) as User[];

      setUsers(filtered.filter((u) => u.blockId === blockId));
    };

    updateUsers();
    awareness.on("change", updateUsers);

    return () => {
      awareness.off("change", updateUsers);
    };
  }, [awareness, blockId]);

  if (!users.length) return null;

  return (
    <div className="absolute -top-3 right-3 flex -space-x-1 z-40">
      {users.map((user) => (
        <div
          key={user.id}
          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold text-white border border-white/20 shadow-md"
          style={{
            backgroundColor: user.color,
          }}
          title={user.name}
        >
          {user.name.charAt(0).toUpperCase()}
        </div>
      ))}
    </div>
  );
}
