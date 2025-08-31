import io from "socket.io-client";

export const socket = io("http://localhost:4001", {
  autoConnect: false, // connect manually after setting token
});

// Call this after you have a valid JWT token (from Supabase)
export async function connectSocketWithToken(token: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (socket as any).auth = { token };
  if (!socket.connected) {
    socket.connect();
  }
}