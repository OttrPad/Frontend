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

  private getSocketUrl(): string {
    return process.env.NODE_ENV === "production"
      ? "https://collab.ottrpad.com"
      : "http://localhost:5002";
  }

  private setupEventHandlers() {
    [
      // connection/room
      "connected",
      "disconnected",
      "room-joined",
      // notebooks
      "notebook-history",
      "notebook:created",
      "notebook:updated",
      "notebook:deleted",
      // blocks
      "block:created",
      "block:deleted",
      "block:moved",
      // realtime collab
      "code-changed",
      "cursor-moved",
      "selection-changed",
      "typing-start",
      "typing-stop",
      "language-change",
      // yjs
      "yjs-update",
      "yjs-state",
      // errors
      "error",
    ].forEach((evt) => this.eventHandlers.set(evt, []));
  }

  /* ===========================
     Connection & Room join
     =========================== */

  async connect(roomId: string, token: string): Promise<void> {
    this.roomId = roomId;
    this.token = token;

    if (this.socket?.connected) return;

    this.socket = io(this.getSocketUrl(), {
      auth: { token }, // room join is a separate step
      transports: ["websocket", "polling"],
    });

    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error("Failed to create socket"));
        return;
      }

      this.socket.once("connect", () => {
        console.log("✅ Socket.IO connected");
        this.emit("connected");
        // Listeners should be attached once connected
        this.setupCollaborationListeners();
        resolve();
      });

      this.socket.once("connect_error", (error: any) => {
        console.error("🚨 Socket.IO connection error:", error);
        reject(error);
      });

      this.socket.on("disconnect", (reason: any) => {
        console.log("🔌 Socket.IO disconnected:", reason);
        this.emit("disconnected", reason);
      });
    });
  }

  /**
   * Join the collaboration room. Your server currently does not ack or emit "room-joined".
   * We support ack/event if present, and otherwise resolve after a short delay so the UI can proceed.
   */
  async joinRoom(roomId: string): Promise<void> {
    if (!this.socket || !this.socket.connected) {
      throw new Error("Socket not connected");
    }
    this.roomId = roomId;

    const sock = this.socket;

    // Try ack if server supports it
    const ackPromise = new Promise<boolean>((resolve) => {
      try {
        sock.emit("join-room", { roomId }, (res?: { ok: boolean }) => {
          resolve(!!res?.ok);
        });
      } catch {
        resolve(false);
      }
    });

    // Try event if server emits it
    const evtPromise = new Promise<boolean>((resolve) => {
      const handler = (data: any) => {
        if (data?.roomId === roomId) {
          sock.off("room-joined", handler);
          resolve(true);
        }
      };
      sock.on("room-joined", handler);
      setTimeout(() => {
        sock.off("room-joined", handler);
        resolve(false);
      }, 600);
    });

    const [ackOk, evtOk] = await Promise.all([ackPromise, evtPromise]);
    if (!ackOk && !evtOk) {
      // Fallback: give the server a brief moment to add us to the room
      await new Promise((r) => setTimeout(r, 150));
    }

    this.emit("room-joined", { roomId });
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

  /* ===========================
     Socket listeners & emitters
     =========================== */

  private setupCollaborationListeners(): void {
    if (!this.socket) return;

    // --- Room / initial data
    this.socket.on("notebook-history", (data: any) => {
      // { roomId, notebooks }
      this.emit("notebook-history", data);
    });

    // --- Notebook events
    this.socket.on("notebook:created", (data: any) => {
      this.emit("notebook:created", data);
    });

    this.socket.on("notebook:updated", (data: any) => {
      this.emit("notebook:updated", data);
    });

    this.socket.on("notebook:deleted", (data: any) => {
      this.notebooks.delete(data.notebookId);
      this.emit("notebook:deleted", data);
    });

    // --- Block events
    this.socket.on("block:created", (data: any) => {
      console.log("📦 Block created:", data);
      this.emit("block:created", data);
    });

    this.socket.on("block:deleted", (data: any) => {
      console.log("🗑️ Block deleted:", data);
      this.emit("block:deleted", data);
    });

    this.socket.on("block:moved", (data: any) => {
      console.log("↕️ Block moved:", data);
      this.emit("block:moved", data);
    });

    // --- Realtime collaboration events
    this.socket.on("code-changed", (data: any) => {
      this.emit("code-changed", data);
    });

    this.socket.on("cursor-moved", (data: any) => {
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
      this.emit("selection-changed", data);
    });

    this.socket.on("typing-start", (data: any) => {
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
      const user = this.activeUsers.get(data.userId);
      if (user) {
        user.isTyping = false;
        this.activeUsers.set(data.userId, user);
      }
      this.emit("typing-stop", data);
    });

    this.socket.on("language-change", (data: any) => {
      this.emit("language-change", data);
    });

    // --- YJS events
    this.socket.on("yjs-update", (data: any) => {
      this.handleYjsUpdate(data);
    });

    this.socket.on("yjs-state", (data: any) => {
      this.handleYjsState(data);
    });

    // --- Errors
    this.socket.on("error", (error: any) => {
      this.emit("error", error);
    });
  }

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

  /* ===========================
     REST (server broadcasts changes)
     =========================== */

  async getNotebooks(): Promise<NotebookInfo[]> {
    if (!this.roomId || !this.token) {
      throw new Error("Not connected to collaboration service");
    }

    const response = await fetch(
      `${this.getApiBaseUrl()}/api/collaboration/rooms/${
        this.roomId
      }/notebooks`,
      {
        headers: {
          Authorization: `Bearer ${this.token}`, // ✅ include JWT
        },
      }
    );

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || "Failed to get notebooks");
    }

    return result.data;
  }

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

    // IMPORTANT: Do NOT emit "notebook:create" here.
    // The REST endpoint already broadcasts "notebook:created" to the room.

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

  /* ===========================
     Blocks
     =========================== */

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

  /* ===========================
     Live collaboration emits
     =========================== */

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

    // Server listens for "code-changed"
    this.socket.emit("code-changed", changeData);
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

  /* ===========================
     YJS integration
     =========================== */

  setupYjsDocument(notebookId: string): Y.Doc {
    if (this.socket) {
      this.socket.emit("request-yjs-state", { notebookId });
    }

    const ydoc = new Y.Doc();

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
    if (!ydoc) return;
    try {
      const update = Uint8Array.from(atob(data.update), (c) => c.charCodeAt(0));
      Y.applyUpdate(ydoc, update);
      this.emit("yjs-update", data);
    } catch (error) {
      console.error("Failed to apply YJS update:", error);
    }
  }

  private handleYjsState(data: any): void {
    const ydoc = this.notebooks.get(data.notebookId);
    if (!ydoc) return;
    try {
      const state = Uint8Array.from(atob(data.state), (c) => c.charCodeAt(0));
      Y.applyUpdate(ydoc, state);
      this.emit("yjs-state", data);
    } catch (error) {
      console.error("Failed to apply YJS state:", error);
    }
  }

  /* ===========================
     Getters
     =========================== */

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
