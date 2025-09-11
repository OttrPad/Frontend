/* eslint-disable @typescript-eslint/no-explicit-any */
import io from "socket.io-client";
import * as Y from "yjs";

export interface NotebookInfo {
  id: string;
  title: string;
  roomId: string;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface BlockInfo {
  id: string;
  type: "code" | "markdown" | "output";
  language?: string;
  position: number;
  createdAt: number;
  updatedAt: number;
}

export interface CursorPosition {
  line: number;
  column: number;
}

export interface CodeChangeData {
  content: string;
  cursorPosition: CursorPosition;
  notebookId?: string;
  blockId?: string;
  changeId?: string;
}

export interface UserPresence {
  userId: string;
  userEmail: string;
  notebookId?: string;
  blockId?: string;
  position?: CursorPosition;
  isTyping?: boolean;
}

export class SocketCollaborationService {
  private socket: any = null;
  private token: string | null = null;
  private roomId: string | null = null;
  private notebooks: Map<string, Y.Doc> = new Map();
  private activeUsers: Map<string, UserPresence> = new Map();
  private eventHandlers: Map<string, any[]> = new Map();

  constructor() {
    this.setupEventHandlers();
  }

  private getApiBaseUrl(): string {
    return process.env.NODE_ENV === "production"
      ? "https://api.ottrpad.com"
      : "http://localhost:4000";
  }

  private setupEventHandlers() {
    // Initialize event handler maps
    this.eventHandlers.set("connected", []);
    this.eventHandlers.set("disconnected", []);
    this.eventHandlers.set("notebook:created", []);
    this.eventHandlers.set("notebook:deleted", []);
    this.eventHandlers.set("code-changed", []);
    this.eventHandlers.set("cursor-moved", []);
    this.eventHandlers.set("selection-changed", []);
    this.eventHandlers.set("typing-start", []);
    this.eventHandlers.set("typing-stop", []);
    this.eventHandlers.set("language-change", []);
    this.eventHandlers.set("yjs-update", []);
    this.eventHandlers.set("yjs-state", []);
    this.eventHandlers.set("error", []);
  }

  // Connection management
  async connect(roomId: string, token: string): Promise<void> {
    this.roomId = roomId;
    this.token = token;

    // Socket.IO connection URL (different from REST API)
    const socketUrl =
      process.env.NODE_ENV === "production"
        ? "https://collab.ottrpad.com"
        : "http://localhost:5002";

    this.socket = io(socketUrl, {
      auth: {
        token: token,
        roomId: roomId,
      },
      transports: ["websocket", "polling"],
    });

    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error("Failed to create socket"));
        return;
      }

      this.socket.on("connect", () => {
        console.log("✅ Socket.IO connected to collaboration server");
        this.emit("connected");
        resolve();
      });

      this.socket.on("disconnect", (reason: any) => {
        console.log("🔌 Socket.IO disconnected:", reason);
        this.emit("disconnected", reason);
      });

      this.socket.on("connect_error", (error: any) => {
        console.error("🚨 Socket.IO connection error:", error);
        reject(error);
      });

      // Set up collaboration event listeners
      this.setupCollaborationListeners();
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.notebooks.clear();
    this.activeUsers.clear();
    this.roomId = null;
    this.token = null;
  }

  private setupCollaborationListeners(): void {
    if (!this.socket) return;

    // Notebook management events
    this.socket.on("notebook:created", (data: any) => {
      console.log("📓 New notebook created:", data.notebook);
      this.emit("notebook:created", data);
    });

    this.socket.on("notebook:deleted", (data: any) => {
      console.log("🗑️ Notebook deleted:", data.notebookId);
      this.notebooks.delete(data.notebookId);
      this.emit("notebook:deleted", data);
    });

    // Code collaboration events
    this.socket.on("code-changed", (data: any) => {
      console.log("📝 Code changed by:", data.userEmail);
      this.emit("code-changed", data);
    });

    this.socket.on("cursor-moved", (data: any) => {
      console.log("🖱️ Cursor moved by:", data.userEmail);
      this.activeUsers.set(data.userId, {
        userId: data.userId,
        userEmail: data.userEmail,
        notebookId: data.notebookId,
        blockId: data.blockId,
        position: data.position,
      });
      this.emit("cursor-moved", data);
    });

    this.socket.on("selection-changed", (data: any) => {
      console.log("🔤 Selection changed by:", data.userEmail);
      this.emit("selection-changed", data);
    });

    this.socket.on("typing-start", (data: any) => {
      console.log("⌨️ User started typing:", data.userEmail);
      const user: UserPresence = this.activeUsers.get(data.userId) || {
        userId: data.userId,
        userEmail: data.userEmail,
      };
      user.isTyping = true;
      user.notebookId = data.notebookId;
      user.blockId = data.blockId;
      user.position = data.position;
      this.activeUsers.set(data.userId, user);
      this.emit("typing-start", data);
    });

    this.socket.on("typing-stop", (data: any) => {
      console.log("⏹️ User stopped typing:", data.userEmail);
      const user = this.activeUsers.get(data.userId);
      if (user) {
        user.isTyping = false;
        this.activeUsers.set(data.userId, user);
      }
      this.emit("typing-stop", data);
    });

    this.socket.on("language-change", (data: any) => {
      console.log("🔧 Language changed to:", data.language);
      this.emit("language-change", data);
    });

    // YJS events
    this.socket.on("yjs-update", (data: any) => {
      this.handleYjsUpdate(data);
    });

    this.socket.on("yjs-state", (data: any) => {
      this.handleYjsState(data);
    });

    // Error handling
    this.socket.on("error", (error: any) => {
      console.error("🚨 Collaboration error:", error);
      this.emit("error", error);
    });
  }

  // Event handling
  on(event: string, handler: (data?: any) => void): void {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.push(handler);
    this.eventHandlers.set(event, handlers);
  }

  off(event: string, handler: (data?: any) => void): void {
    const handlers = this.eventHandlers.get(event) || [];
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
      this.eventHandlers.set(event, handlers);
    }
  }

  private emit(event: string, data?: any): void {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.forEach((handler) => handler(data));
  }

  // Notebook management
  async createNotebook(title: string): Promise<NotebookInfo> {
    if (!this.roomId || !this.token) {
      throw new Error("Not connected to collaboration service");
    }

    const response = await fetch(
      `${this.getApiBaseUrl()}/api/collaboration/rooms/${
        this.roomId
      }/notebooks`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title }),
      }
    );

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || "Failed to create notebook");
    }

    return result.data;
  }

  async getNotebooks(): Promise<NotebookInfo[]> {
    if (!this.roomId) {
      throw new Error("Not connected to collaboration service");
    }

    const response = await fetch(
      `${this.getApiBaseUrl()}/api/collaboration/rooms/${this.roomId}/notebooks`
    );
    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || "Failed to get notebooks");
    }

    return result.data;
  }

  async renameNotebook(
    notebookId: string,
    title: string
  ): Promise<NotebookInfo> {
    if (!this.token) {
      throw new Error("Not connected to collaboration service");
    }

    const response = await fetch(
      `${this.getApiBaseUrl()}/api/collaboration/notebooks/${notebookId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title }),
      }
    );

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || "Failed to rename notebook");
    }

    return result.data;
  }

  async deleteNotebookREST(notebookId: string): Promise<void> {
    if (!this.token) {
      throw new Error("Not connected to collaboration service");
    }

    const response = await fetch(
      `${this.getApiBaseUrl()}/api/collaboration/notebooks/${notebookId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      }
    );

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || "Failed to delete notebook");
    }
  }

  async deleteNotebook(notebookId: string): Promise<void> {
    if (!this.socket) {
      throw new Error("Not connected to collaboration service");
    }

    this.socket.emit("notebook:delete", {
      roomId: this.roomId,
      notebookId: notebookId,
    });
  }

  // Block management
  async createBlock(
    notebookId: string,
    type: "code" | "markdown" | "output",
    position: number,
    language?: string
  ): Promise<BlockInfo> {
    if (!this.token) {
      throw new Error("Not connected to collaboration service");
    }

    const response = await fetch(
      `${this.getApiBaseUrl()}/api/collaboration/notebooks/${notebookId}/blocks`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ type, position, language }),
      }
    );

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || "Failed to create block");
    }

    return result.data;
  }

  async getBlocks(notebookId: string): Promise<BlockInfo[]> {
    const response = await fetch(
      `${this.getApiBaseUrl()}/api/collaboration/notebooks/${notebookId}/blocks`
    );
    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || "Failed to get blocks");
    }

    return result.data;
  }

  async deleteBlock(notebookId: string, blockId: string): Promise<void> {
    if (!this.token) {
      throw new Error("Not connected to collaboration service");
    }

    const response = await fetch(
      `${this.getApiBaseUrl()}/api/collaboration/notebooks/${notebookId}/blocks/${blockId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      }
    );

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || "Failed to delete block");
    }
  }

  async moveBlock(
    notebookId: string,
    blockId: string,
    position: number
  ): Promise<void> {
    if (!this.token) {
      throw new Error("Not connected to collaboration service");
    }

    const response = await fetch(
      `${this.getApiBaseUrl()}/api/collaboration/notebooks/${notebookId}/blocks/${blockId}/position`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ position }),
      }
    );

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || "Failed to move block");
    }
  }

  // Code collaboration
  sendCodeChange(data: CodeChangeData): void {
    if (!this.socket) {
      throw new Error("Not connected to collaboration service");
    }

    const changeData = {
      ...data,
      changeId:
        data.changeId ||
        `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    this.socket.emit("code-change", changeData);
  }

  sendCursorMove(
    position: CursorPosition,
    notebookId?: string,
    blockId?: string
  ): void {
    if (!this.socket) {
      throw new Error("Not connected to collaboration service");
    }

    this.socket.emit("cursor-move", {
      position,
      notebookId,
      blockId,
    });
  }

  sendTextSelection(
    startPos: CursorPosition,
    endPos: CursorPosition,
    notebookId?: string,
    blockId?: string
  ): void {
    if (!this.socket) {
      throw new Error("Not connected to collaboration service");
    }

    this.socket.emit("selection-change", {
      startPos,
      endPos,
      notebookId,
      blockId,
    });
  }

  startTyping(
    position: CursorPosition,
    notebookId?: string,
    blockId?: string
  ): void {
    if (!this.socket) {
      throw new Error("Not connected to collaboration service");
    }

    this.socket.emit("typing-start", {
      position,
      notebookId,
      blockId,
    });
  }

  stopTyping(): void {
    if (!this.socket) {
      throw new Error("Not connected to collaboration service");
    }

    this.socket.emit("typing-stop");
  }

  changeLanguage(language: string): void {
    if (!this.socket) {
      throw new Error("Not connected to collaboration service");
    }

    this.socket.emit("language-change", { language });
  }

  // YJS integration
  setupYjsDocument(notebookId: string): Y.Doc {
    // Request initial document state
    if (this.socket) {
      this.socket.emit("request-yjs-state", { notebookId });
    }

    // Setup YJS document
    const ydoc = new Y.Doc();

    // Listen for document updates and send to server
    ydoc.on("update", (update: Uint8Array) => {
      if (this.socket) {
        const updateBase64 = btoa(String.fromCharCode(...update));
        this.socket.emit("yjs-update", {
          notebookId,
          update: updateBase64,
        });
      }
    });

    this.notebooks.set(notebookId, ydoc);
    return ydoc;
  }

  getYjsDocument(notebookId: string): Y.Doc | null {
    return this.notebooks.get(notebookId) || null;
  }

  private handleYjsUpdate(data: any): void {
    const ydoc = this.notebooks.get(data.notebookId);
    if (ydoc && data.userId !== this.getCurrentUserId()) {
      try {
        const update = Uint8Array.from(atob(data.update), (c) =>
          c.charCodeAt(0)
        );
        Y.applyUpdate(ydoc, update);
        this.emit("yjs-update", data);
      } catch (error) {
        console.error("Failed to apply YJS update:", error);
      }
    }
  }

  private handleYjsState(data: any): void {
    const ydoc = this.notebooks.get(data.notebookId);
    if (ydoc) {
      try {
        const state = Uint8Array.from(atob(data.state), (c) => c.charCodeAt(0));
        Y.applyUpdate(ydoc, state);
        this.emit("yjs-state", data);
      } catch (error) {
        console.error("Failed to apply YJS state:", error);
      }
    }
  }

  private getCurrentUserId(): string | null {
    // This should be implemented based on your auth system
    // For now, return null to avoid filtering own updates
    return null;
  }

  // Getters
  getActiveUsers(): UserPresence[] {
    return Array.from(this.activeUsers.values());
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getRoomId(): string | null {
    return this.roomId;
  }
}

// Export singleton instance
export const socketCollaborationService = new SocketCollaborationService();
