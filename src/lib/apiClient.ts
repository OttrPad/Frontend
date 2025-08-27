import { createClient } from "@supabase/supabase-js";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = createClient(supabaseUrl, supabaseKey);

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
  async createRoom(name: string, description: string): Promise<ApiResponse> {
    return this.request<ApiResponse>("/api/rooms", {
      method: "POST",
      body: JSON.stringify({ name, description }),
    });
  }

  async getAllRooms(): Promise<ApiResponse> {
    return this.request<ApiResponse>("/api/rooms");
  }

  async getRoomDetails(id: string): Promise<ApiResponse> {
    return this.request<ApiResponse>(`/api/rooms/${id}`);
  }

  async deleteRoom(id: string): Promise<ApiResponse> {
    return this.request<ApiResponse>(`/api/rooms/${id}`, {
      method: "DELETE",
    });
  }

  async joinRoom(roomIdOrCode: string): Promise<ApiResponse> {
    // If it looks like a room code (format: xxx-xxx-xxx), use the room code endpoint
    if (roomIdOrCode.includes("-") && roomIdOrCode.length === 11) {
      return this.request<ApiResponse>(`/api/rooms/code/${roomIdOrCode}/join`, {
        method: "POST",
      });
    }
    // Otherwise, treat it as a room ID
    return this.request<ApiResponse>(`/api/rooms/${roomIdOrCode}/join`, {
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

  // Health check methods
  async checkHealth(): Promise<HealthResponse> {
    return this.request("/health");
  }

  async checkServicesHealth(): Promise<ServicesHealthResponse> {
    return this.request("/health/services");
  }
}

// Export singleton instance
export const apiClient = new ApiClient(API_BASE_URL);
