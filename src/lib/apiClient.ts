import supabase from "./supabaseClient";


const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";



// Types for API responses
export interface Room {
  id: string;
  name: string;
  description?: string;
  room_code?: string; // Added room_code field
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface User {
  id: string;
  email: string;
  role: string;
}

export interface ApiResponse {
  message?: string;
  room?: Room;
  rooms?: Room[];
  creator?: User;
  user?: User;
  deletedBy?: User;
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  uptime: number;
  version: string;
}

export interface ServicesHealthResponse {
  gateway: Record<string, unknown>;
  services: Record<string, unknown>;
}

export interface ApiError {
  error: string;
  message?: string;
}

// Custom error class for API errors
export class ApiRequestError extends Error {
  public errorCode: string;
  public statusCode: number;

  constructor(message: string, errorCode: string, statusCode: number) {
    super(message);
    this.name = "ApiRequestError";
    this.errorCode = errorCode;
    this.statusCode = statusCode;
  }
}

// Helper function to get auth token
async function getAuthToken(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token || null;
}

// API Client class
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await getAuthToken();

    const config: RequestInit = {
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(`${this.baseUrl}${endpoint}`, config);

    if (!response.ok) {
      let errorData: ApiError;
      try {
        errorData = await response.json();
      } catch {
        errorData = {
          error: "UNKNOWN_ERROR",
          message: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      // Throw custom error with proper error codes
      throw new ApiRequestError(
        errorData.message ||
          errorData.error ||
          `Request failed with status ${response.status}`,
        errorData.error || "UNKNOWN_ERROR",
        response.status
      );
    }

    return response.json();
  }

  // Room API methods
  async createRoom(
    name: string,
    description: string
  ): Promise<{
    message: string;
    room: {
      id: string;
      name: string;
      description: string;
      room_code: string;
      created_at: string;
      created_by: string;
    };
    creator: {
      id: string;
      email: string;
    };
  }> {
    return this.request("/api/rooms", {
      method: "POST",
      body: JSON.stringify({ name, description }),
    });
  }

  async getAllRooms(): Promise<{
    message: string;
    rooms: Array<{
      room_id: number;
      name: string;
      description: string;
      room_code: string;
      created_by: string;
      created_at: string;
      user_access: {
        is_member: boolean;
        is_creator: boolean;
        user_type: "admin" | "editor" | "viewer" | null;
      };
    }>;
    total: number;
    hasMore: boolean;
  }> {
    return this.request("/api/rooms");
  }

  async getRoomDetails(id: string): Promise<ApiResponse> {
    return this.request<ApiResponse>(`/api/rooms/${id}`);
  }

  async deleteRoom(id: string): Promise<ApiResponse> {
    return this.request<ApiResponse>(`/api/rooms/${id}`, {
      method: "DELETE",
    });
  }

  async joinRoom(roomIdOrCode: string): Promise<{
    message: string;
    room: {
      id: string;
      name: string;
      room_code?: string;
    };
    user: {
      id: string;
      email: string;
    };
    transition_info: {
      user_type: "admin" | "editor" | "viewer";
      transition_type: "creator_join" | "email_to_member";
    };
  }> {
    // If it looks like a room code (format: xxx-xxx-xxx), use the room code endpoint
    if (roomIdOrCode.includes("-") && roomIdOrCode.length === 11) {
      return this.request(`/api/rooms/join`, {
        method: "POST",
        body: JSON.stringify({ room_code: roomIdOrCode }),
      });
    }
    // Otherwise, treat it as a room ID
    return this.request(`/api/rooms/${roomIdOrCode}/join`, {
      method: "POST",
    });
  }

  async getRoomByCode(roomCode: string): Promise<ApiResponse> {
    return this.request<ApiResponse>(`/api/rooms/code/${roomCode}`);
  }

  async leaveRoom(id: string): Promise<ApiResponse> {
    return this.request<ApiResponse>(`/api/rooms/${id}/leave`, {
      method: "DELETE",
    });
  }

  // Room access management methods
  async getRoomAccess(roomIdentifier: string): Promise<{
    message: string;
    room: { id: string; name: string };
    allowed_emails: Array<{
      id: number;
      email: string;
      access_level: "viewer" | "editor";
      invited_by: string;
      invited_at: string;
    }>;
    total_count: number;
  }> {
    const roomId = await this.resolveRoomIdentifier(roomIdentifier);
    return this.request(`/api/rooms/${roomId}/access`);
  }

  async addRoomAccess(
    roomIdentifier: string,
    email: string,
    accessLevel: "viewer" | "editor",
    userId: string
  ): Promise<{
    message: string;
    allowed_email: {
      id: number;
      email: string;
      access_level: string;
      invited_at: string;
    };
  }> {
    const roomId = await this.resolveRoomIdentifier(roomIdentifier);
    return this.request(`/api/rooms/${roomId}/access/add`, {
      method: "POST",
      body: JSON.stringify({
        email,
        access_level: accessLevel,
        user_id: userId,
      }),
    });
  }

  async updateRoomAccess(
    roomIdentifier: string,
    email: string,
    accessLevel: "viewer" | "editor",
    userId: string
  ): Promise<{
    message: string;
    allowed_email: {
      id: number;
      email: string;
      access_level: string;
      invited_at: string;
    };
  }> {
    const roomId = await this.resolveRoomIdentifier(roomIdentifier);
    return this.request(`/api/rooms/${roomId}/access/update`, {
      method: "PUT",
      body: JSON.stringify({
        email,
        access_level: accessLevel,
        user_id: userId,
      }),
    });
  }

  async removeRoomAccess(
    roomIdentifier: string,
    email: string
  ): Promise<{ message: string }> {
    const roomId = await this.resolveRoomIdentifier(roomIdentifier);
    return this.request(`/api/rooms/${roomId}/access/remove`, {
      method: "DELETE",
      body: JSON.stringify({ email }),
    });
  }

  // Participants methods - Get all participants and invited users in a room
  async getRoomParticipants(roomIdentifier: string): Promise<{
    message: string;
    room: { id: string; name: string };
    participants: Array<{
      user_id?: string;
      email?: string;
      status: "member" | "invited";
      user_type: "admin" | "editor" | "viewer";
      joined_at?: string;
      invited_at?: string;
      invited_by?: string;
    }>;
    total_count: number;
  }> {
    // First try to resolve the room identifier to get the numeric room ID
    const roomId = await this.resolveRoomIdentifier(roomIdentifier);
    return this.request(`/api/rooms/${roomId}/participants`);
  }

  // Helper method to resolve room code to room ID
  private async resolveRoomIdentifier(identifier: string): Promise<string> {
    // If it's already a numeric ID, return as is
    if (/^\d+$/.test(identifier)) {
      return identifier;
    }

    // If it's a room code (format: xxx-xxx-xxx), find the room and get its ID
    if (/^[a-z0-9]{3}-[a-z0-9]{3}-[a-z0-9]{3}$/.test(identifier)) {
      try {
        const response = await this.getAllRooms();
        const room = response.rooms?.find((r) => r.room_code === identifier);
        if (room) {
          return room.room_id.toString();
        } else {
          throw new ApiRequestError("Room not found", "ROOM_NOT_FOUND", 404);
        }
      } catch (error) {
        if (error instanceof ApiRequestError) {
          throw error;
        }
        throw new ApiRequestError(
          "Failed to resolve room identifier",
          "RESOLUTION_ERROR",
          500
        );
      }
    }

    // If we can't determine the format, assume it's a room ID
    return identifier;
  }

  // Health check methods
  async checkHealth(): Promise<HealthResponse> {
    return this.request("/health");
  }

  async checkServicesHealth(): Promise<ServicesHealthResponse> {
    return this.request("/health/services");
  }

  // User profile methods
  async getUserProfile(): Promise<{
    message: string;
    user: {
      id: string;
      email: string;
      name?: string;
    };
  }> {
    return this.request("/api/users/profile");
  }
}

// Export singleton instance
export const apiClient = new ApiClient(API_BASE_URL);