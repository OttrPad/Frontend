import supabase from "./supabaseClient";
import { apiUrl } from "./constants";
import type {
  Branch,
  MergeConflict,
  Block,
  MergeResult,
} from "../types/branch";

const API_BASE_URL = apiUrl;

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

// Workspaces types (used by Rooms UI and workspace picker)
export interface WorkspaceSummary {
  workspace_id: number;
  name: string;
  requirements: string | null;
}

export interface WorkspacesResponse {
  message: string;
  workspaces: WorkspaceSummary[];
  total: number;
  hasMore: boolean;
}

export interface WorkspaceDetailResponse {
  message: string;
  workspace: {
    workspace_id: number;
    name: string;
    requirements: string | null;
  };
}

// Version Control System types
export interface CommitSnapshot {
  blocks: Array<{
    id: string;
    lang: string;
    content: string;
    position: number;
    createdAt: number;
    updatedAt: number;
  }>;
  [key: string]: unknown;
}

export interface Commit {
  commit_id: string;
  room_id: string;
  notebook_id: string;
  author_id: string;
  commit_message: string;
  commit_type: "normal" | "temp";
  hidden: boolean;
  created_at: string;
  snapshot_json?: CommitSnapshot;
}

export interface Milestone {
  milestone_id: string;
  room_id: string;
  name: string;
  notes: string;
  commit_id: string;
  created_by: string;
  created_at: string;
}

export interface CommitTimelineEntry {
  commit_id: string;
  block_id?: string;
  file_id?: string;
  commit_message: string;
  created_at: string;
  author_id: string;
  author?: string;
  milestone: boolean;
  isMilestone?: boolean;
  hidden: boolean;
  commit_type: string;
  snapshot_json?: CommitSnapshot;
  snapshot?: CommitSnapshot; // Alias for compatibility
}
export interface AiSuggestionRequest {
  contextBefore: string;
  contextAfter: string;
  language: string;
  cursor: {
    line: number;
    column: number;
  };
}

export interface AiSuggestionItem {
  text: string;
  language: string;
  cursor: {
    line: number;
    column: number;
  };
}

export interface AiSuggestionResponse {
  items?: AiSuggestionItem[];
  suggestion?: string;
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

      // Log the error for debugging
      console.error("[API Client] Request failed:", {
        endpoint,
        status: response.status,
        statusText: response.statusText,
        errorData,
      });

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
    description: string,
    workspaceId?: number
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
    const payload: Record<string, unknown> = { name, description };
    if (typeof workspaceId === "number") payload.workspace_id = workspaceId;
    return this.request("/api/rooms", {
      method: "POST",
      body: JSON.stringify(payload),
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
      workspace_id?: number;
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
    console.log("[API Client] Resolving room identifier:", identifier);

    // If it's already a numeric ID, return as is
    if (/^\d+$/.test(identifier)) {
      console.log("[API Client] Already numeric ID:", identifier);
      return identifier;
    }

    // If it's a room code (format: xxx-xxx-xxx), find the room and get its ID
    if (/^[a-z0-9]{3}-[a-z0-9]{3}-[a-z0-9]{3}$/.test(identifier)) {
      try {
        console.log(
          "[API Client] Fetching all rooms to resolve code:",
          identifier
        );
        const response = await this.getAllRooms();
        const room = response.rooms?.find((r) => r.room_code === identifier);
        if (room) {
          console.log(
            "[API Client] Resolved room code to ID:",
            identifier,
            "→",
            room.room_id
          );
          return room.room_id.toString();
        } else {
          console.error("[API Client] Room not found for code:", identifier);
          throw new ApiRequestError("Room not found", "ROOM_NOT_FOUND", 404);
        }
      } catch (error) {
        console.error("[API Client] Error resolving room identifier:", error);
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
    console.log("[API Client] Unknown format, assuming room ID:", identifier);
    return identifier;
  }

  // Health check methods
  async checkHealth(): Promise<HealthResponse> {
    return this.request("/health");
  }

  async checkServicesHealth(): Promise<ServicesHealthResponse> {
    return this.request("/health/services");
  }

  // Workspaces API method
  async getWorkspaces(params?: {
    limit?: number;
    offset?: number;
  }): Promise<WorkspacesResponse> {
    const limit = params?.limit ?? 50;
    const offset = params?.offset ?? 0;
    const qp = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    });
    return this.request(`/api/workspaces?${qp.toString()}`);
  }

  async getWorkspaceById(id: number): Promise<WorkspaceDetailResponse> {
    return this.request(`/api/workspaces/${id}`);
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

  // AI generation method
  async generateAiContent(
    prompt: string,
    options: Record<string, unknown> = {}
  ): Promise<{
    prompt: string;
    texts: string[];
    images: unknown[];
    cached: boolean;
  }> {
    return this.request(`/api/ai/chat`, {
      method: "POST",
      body: JSON.stringify({ prompt, options }),
    });
  }

  // Version Control System (VCS) methods

  /**
   * Create a commit for a notebook
   */
  async createCommit(params: {
    roomId: string;
    notebookId: string;
    message: string;
    snapshot?: CommitSnapshot;
  }): Promise<{
    message: string;
    commit: {
      commit_id: string;
      room_id: string;
      notebook_id: string;
      commit_message: string;
      created_at: string;
    };
    gitSha?: string;
  }> {
    const resolvedRoomId = await this.resolveRoomIdentifier(params.roomId);
    return this.request("/api/version-control/commits", {
      method: "POST",
      body: JSON.stringify({ ...params, roomId: resolvedRoomId }),
    });
  }

  /**
   * Get commits for a room with pagination
   */
  async getCommits(params: {
    roomId: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    commits: Commit[];
    total: number;
  }> {
    const { roomId, limit = 50, offset = 0 } = params;
    const qp = new URLSearchParams({
      roomId,
      limit: String(limit),
      offset: String(offset),
    });
    return this.request(`/api/version-control/commits?${qp.toString()}`);
  }

  /**
   * Get a commit's snapshot
   */
  async getCommitSnapshot(commitId: string): Promise<CommitSnapshot> {
    return this.request(`/api/version-control/commits/${commitId}/snapshot`);
  }

  /**
   * Restore a commit
   */
  async restoreCommit(params: { roomId: string; commitId: string }): Promise<{
    message: string;
    snapshot: CommitSnapshot;
  }> {
    const resolvedRoomId = await this.resolveRoomIdentifier(params.roomId);
    return this.request("/api/version-control/restore", {
      method: "POST",
      body: JSON.stringify({ ...params, roomId: resolvedRoomId }),
    });
  }

  /**
   * Delete a commit
   */
  async deleteCommit(commitId: string): Promise<{ message: string }> {
    return this.request(`/api/version-control/commits/${commitId}`, {
      method: "DELETE",
    });
  }

  /**
   * Get commit timeline for a room
   */
  async getCommitTimeline(roomId: string): Promise<CommitTimelineEntry[]> {
    const resolvedRoomId = await this.resolveRoomIdentifier(roomId);
    const response = await this.request<{
      message: string;
      timeline: CommitTimelineEntry[];
    }>(`/api/version-control/timeline/${resolvedRoomId}`);
    return response.timeline;
  }

  /**
   * Create a milestone (special commit by owner)
   */
  async createMilestone(params: {
    roomId: string;
    milestoneName: string;
    milestoneNotes?: string;
    commitId?: string;
  }): Promise<{
    message: string;
    milestone: {
      milestone_id: string;
      room_id: string;
      name: string;
      notes: string;
      commit_id: string;
      created_at: string;
    };
    tag: string;
  }> {
    const resolvedRoomId = await this.resolveRoomIdentifier(params.roomId);
    return this.request("/api/version-control/milestones", {
      method: "POST",
      body: JSON.stringify({ ...params, roomId: resolvedRoomId }),
    });
  }

  /**
   * Get milestones for a room
   */
  async getMilestones(roomId: string): Promise<{
    message: string;
    milestones: Milestone[];
  }> {
    const resolvedRoomId = await this.resolveRoomIdentifier(roomId);
    return this.request(`/api/version-control/milestones/${resolvedRoomId}`);
  }

  /**
   * Delete a milestone
   */
  async deleteMilestone(params: {
    roomId: string;
    milestoneId: string;
  }): Promise<{ message: string }> {
    const { roomId, milestoneId } = params;
    const resolvedRoomId = await this.resolveRoomIdentifier(roomId);
    return this.request(
      `/api/version-control/milestones/${resolvedRoomId}/${milestoneId}`,
      {
        method: "DELETE",
      }
    );
  }

  // ============================================
  // Branch System API Methods
  // ============================================

  /**
   * Create a new branch
   * Optionally creates an initial commit with current blocks
   */
  async createBranch(params: {
    roomId: string;
    branchName: string;
    description?: string;
    parentBranchId?: string;
    initialSnapshot?: { blocks: unknown[] };
  }): Promise<{ message: string; branch: Branch; initialCommitId?: string }> {
    const { roomId, branchName, description, parentBranchId, initialSnapshot } =
      params;
    const resolvedRoomId = await this.resolveRoomIdentifier(roomId);

    return this.request("/api/version-control/branches", {
      method: "POST",
      body: JSON.stringify({
        roomId: resolvedRoomId,
        branchName,
        description,
        parentBranchId,
        initialSnapshot,
      }),
    });
  }

  /**
   * Get all branches for a room
   */
  async getBranches(roomId: string): Promise<{ branches: Branch[] }> {
    const resolvedRoomId = await this.resolveRoomIdentifier(roomId);
    return this.request(`/api/version-control/branches/${resolvedRoomId}`);
  }

  /**
   * Get user's current branch
   */
  async getCurrentBranch(roomId: string): Promise<{ branch: Branch | null }> {
    const resolvedRoomId = await this.resolveRoomIdentifier(roomId);
    return this.request(
      `/api/version-control/branches/${resolvedRoomId}/current`
    );
  }

  /**
   * Get main branch for a room
   */
  async getMainBranch(roomId: string): Promise<{ branch: Branch }> {
    const resolvedRoomId = await this.resolveRoomIdentifier(roomId);
    return this.request(`/api/version-control/branches/${resolvedRoomId}/main`);
  }

  /**
   * Checkout (switch to) a branch
   * Auto-saves current work before switching if currentSnapshot provided
   */
  async checkoutBranch(params: {
    branchId: string;
    roomId: string;
    currentSnapshot?: { blocks: unknown[] };
  }): Promise<{
    message: string;
    branch: Branch;
    snapshot: CommitSnapshot;
    autoCommitId?: string;
  }> {
    const { branchId, roomId, currentSnapshot } = params;
    const resolvedRoomId = await this.resolveRoomIdentifier(roomId);

    return this.request(`/api/version-control/branches/${branchId}/checkout`, {
      method: "POST",
      body: JSON.stringify({ roomId: resolvedRoomId, currentSnapshot }),
    });
  }

  /**
   * Delete a branch
   */
  async deleteBranch(branchId: string): Promise<{ message: string }> {
    return this.request(`/api/version-control/branches/${branchId}`, {
      method: "DELETE",
    });
  }

  /**
   * Pull changes from main branch into the specified branch
   */
  async pullFromMain(params: {
    branchId: string;
    roomId: string;
    commitMessage?: string;
  }): Promise<{
    message: string;
    mergeCommitId?: string;
    conflicts?: MergeConflict[];
  }> {
    const { branchId, roomId, commitMessage } = params;
    const resolvedRoomId = await this.resolveRoomIdentifier(roomId);

    return this.request(`/api/version-control/branches/${branchId}/pull`, {
      method: "POST",
      body: JSON.stringify({
        roomId: resolvedRoomId,
        commitMessage,
      }),
    });
  }

  /**
   * Push changes from the specified branch to main branch
   * Requires owner/admin permissions
   */
  async pushToMain(params: {
    branchId: string;
    roomId: string;
    commitMessage?: string;
  }): Promise<{
    message: string;
    mergeCommitId?: string;
    conflicts?: MergeConflict[];
  }> {
    const { branchId, roomId, commitMessage } = params;
    const resolvedRoomId = await this.resolveRoomIdentifier(roomId);

    return this.request(`/api/version-control/branches/${branchId}/push`, {
      method: "POST",
      body: JSON.stringify({
        roomId: resolvedRoomId,
        commitMessage,
      }),
    });
  }

  /**
   * Merge two branches
   */
  async mergeBranches(params: {
    sourceBranchId: string;
    targetBranchId: string;
    commitMessage?: string;
  }): Promise<{
    message: string;
    success?: boolean;
    mergeCommitId?: string;
    hasConflicts?: boolean;
    conflicts?: MergeConflict[];
  }> {
    const { sourceBranchId, targetBranchId, commitMessage } = params;

    return this.request("/api/version-control/merge", {
      method: "POST",
      body: JSON.stringify({
        sourceBranchId,
        targetBranchId,
        commitMessage,
      }),
    });
  }

  /**
   * Get merge conflicts
   */
  async getMergeConflicts(params: {
    roomId: string;
    sourceBranchId?: string;
    targetBranchId?: string;
  }): Promise<{ conflicts: MergeConflict[] }> {
    const { roomId, sourceBranchId, targetBranchId } = params;
    const resolvedRoomId = await this.resolveRoomIdentifier(roomId);

    let url = `/api/version-control/merge/conflicts/${resolvedRoomId}`;
    const queryParams = new URLSearchParams();
    if (sourceBranchId) queryParams.append("sourceBranchId", sourceBranchId);
    if (targetBranchId) queryParams.append("targetBranchId", targetBranchId);

    if (queryParams.toString()) {
      url += `?${queryParams.toString()}`;
    }

    return this.request(url);
  }

  /**
   * Resolve a merge conflict
   */
  async resolveConflict(params: {
    conflictId: string;
    resolution: Block | null;
  }): Promise<{ message: string; success: boolean }> {
    const { conflictId, resolution } = params;

    return this.request(
      `/api/version-control/merge/conflicts/${conflictId}/resolve`,
      {
        method: "POST",
        body: JSON.stringify({ resolution }),
      }
    );
  }

  /**
   * Apply merge after all conflicts are resolved
   */
  async applyMerge(params: {
    roomId: string;
    sourceBranchId: string;
    targetBranchId: string;
    commitMessage?: string;
  }): Promise<{ message: string; success: boolean; mergeCommitId: string }> {
    const { roomId, sourceBranchId, targetBranchId, commitMessage } = params;
    const resolvedRoomId = await this.resolveRoomIdentifier(roomId);

    return this.request("/api/version-control/merge/apply", {
      method: "POST",
      body: JSON.stringify({
        roomId: resolvedRoomId,
        sourceBranchId,
        targetBranchId,
        commitMessage,
      }),
    });
  }

  /**
   * Get merge preview (diff without actually merging)
   */
  async getMergeDiff(params: {
    sourceBranchId: string;
    targetBranchId: string;
  }): Promise<{ diff: MergeResult }> {
    const { sourceBranchId, targetBranchId } = params;

    const queryParams = new URLSearchParams({
      sourceBranchId,
      targetBranchId,
    });

    return this.request(
      `/api/version-control/merge/diff?${queryParams.toString()}`
    );
  }
  async getAiSuggestion(
    payload: AiSuggestionRequest
  ): Promise<AiSuggestionResponse> {
    return this.request(`/api/ai/suggest`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }
}

// Export singleton instance
export const apiClient = new ApiClient(API_BASE_URL);
