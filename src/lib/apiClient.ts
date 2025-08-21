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
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  role: string;
}

export interface ApiResponse<T> {
  message?: string;
  room?: T;
  rooms?: T[];
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
  message: string;
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
      const errorData = await response.json().catch(() => ({
        error: "UNKNOWN_ERROR",
        message: `HTTP ${response.status}: ${response.statusText}`,
      }));
      throw new Error(
        errorData.message || `Request failed with status ${response.status}`
      );
    }

    return response.json();
  }

  // Room API methods
  async createRoom(name: string): Promise<ApiResponse<Room>> {
    return this.request<ApiResponse<Room>>("/api/rooms", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  }

  async getAllRooms(): Promise<ApiResponse<Room>> {
    return this.request<ApiResponse<Room>>("/api/rooms");
  }

  async getRoomDetails(id: string): Promise<ApiResponse<Room>> {
    return this.request<ApiResponse<Room>>(`/api/rooms/${id}`);
  }

  async deleteRoom(id: string): Promise<ApiResponse<Room>> {
    return this.request<ApiResponse<Room>>(`/api/rooms/${id}`, {
      method: "DELETE",
    });
  }

  async joinRoom(id: string): Promise<ApiResponse<Room>> {
    return this.request<ApiResponse<Room>>(`/api/rooms/${id}/join`, {
      method: "POST",
    });
  }

  async leaveRoom(id: string): Promise<ApiResponse<Room>> {
    return this.request<ApiResponse<Room>>(`/api/rooms/${id}/leave`, {
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
