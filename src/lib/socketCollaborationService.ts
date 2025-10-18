/* eslint-disable @typescript-eslint/no-explicit-any */
import io from "socket.io-client";
import { apiUrl, socketUrl } from "./constants";
import * as Y from "yjs";
import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
} from "y-protocols/awareness";
import { IndexeddbPersistence } from "y-indexeddb";

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
  private awarenessMap: Map<string, Awareness> = new Map();
  private activeUsers: Map<string, UserPresence> = new Map();
  private eventHandlers: Map<string, any[]> = new Map();

  // Pending awareness updates
  private pendingAwareness: { notebookId: string; update: Uint8Array }[] = [];
  private initializedDocs: Set<string> = new Set();

  constructor() {
    this.setupEventHandlers();
  }

  private getApiBaseUrl(): string {
    return apiUrl;
  }

  private getSocketUrl(): string {
    return socketUrl;
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
      // yjs
      "yjs-update",
      "yjs-state",
      // awareness updates
      "awareness-update",
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

    //awareness clear
    this.awarenessMap.forEach((a) => a.destroy?.());
    this.awarenessMap.clear();

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

    // --- YJS events
    this.socket.on("yjs-update", (data: any) => {
      this.handleYjsUpdate(data);
    });

    this.socket.on("yjs-state", (data: any) => {
      this.handleYjsState(data);
      this.initializedDocs.add(data.notebookId);

      // Apply any pending awareness updates now that doc is synced
      const pending = this.pendingAwareness.filter(
        (a) => a.notebookId === data.notebookId
      );
      pending.forEach(({ notebookId, update }) => {
        try {
          const awareness = this.getAwareness(notebookId);
          applyAwarenessUpdate(awareness, update, "remote");
        } catch (err) {
          console.warn("⚠️ Skipped pending awareness:", err);
        }
      });
      this.pendingAwareness = this.pendingAwareness.filter(
        (a) => a.notebookId !== data.notebookId
      );
    });

    // --- Awareness updates
    this.socket.on("awareness-update", (data: any) => {
      const update = Uint8Array.from(atob(data.update), (c) => c.charCodeAt(0));

      // If doc not initialized yet, buffer the awareness update
      if (
        !this.notebooks.get(data.notebookId) ||
        !this.initializedDocs.has(data.notebookId)
      ) {
        console.warn(
          `⏳ Buffering awareness for ${data.notebookId} until Y.Doc ready`
        );
        this.pendingAwareness.push({ notebookId: data.notebookId, update });
        return;
      }

      try {
        const awareness = this.getAwareness(data.notebookId);
        const ydoc = this.notebooks.get(data.notebookId);

        // Skip applying if blocks not yet present
        const blocks = ydoc?.getMap("blocks");
        if (!blocks || blocks.size === 0) {
          console.warn(
            `⏳ Skipping awareness (no blocks yet) for ${data.notebookId}`
          );
          this.pendingAwareness.push({ notebookId: data.notebookId, update });
          return;
        }

        applyAwarenessUpdate(awareness, update, "remote");

        const states = Array.from(awareness.getStates().values());
        console.log("📥 Received awareness update:", {
          notebookId: data.notebookId,
          states,
        });
        this.emit("awareness-update", { notebookId: data.notebookId, states });
      } catch (err) {
        console.error("Failed to apply awareness update:", err);
      }
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
     Awareness helpers
     =========================== */

  getAwareness(notebookId: string): Awareness {
    if (!this.awarenessMap.has(notebookId)) {
      const ydoc = this.notebooks.get(notebookId);
      if (!ydoc) throw new Error("Notebook Y.Doc not initialized");

      const awareness = new Awareness(ydoc);
      awareness.on("update", ({ added, updated, removed }: any) => {
        const update = encodeAwarenessUpdate(awareness, [
          ...added,
          ...updated,
          ...removed,
        ]);
        const updateBase64 = btoa(String.fromCharCode(...update));

        // Only emit to server when OUR client changed (avoid echo loops)
        const changed = new Set<number>([...added, ...updated, ...removed]);
        if (changed.has(ydoc.clientID)) {
          // Log what we're sending
          const states = Array.from(awareness.getStates().values());
          console.log("📤 Sending awareness update:", {
            notebookId,
            clientId: ydoc.clientID,
            localState: awareness.getLocalState(),
            allStates: states,
          });

          this.socket?.emit("awareness-update", {
            notebookId,
            update: updateBase64,
          });
        }

        const statesForEmit = Array.from(awareness.getStates().values());
        this.emit("awareness-update", { notebookId, states: statesForEmit });
      });

      this.awarenessMap.set(notebookId, awareness);
    }
    return this.awarenessMap.get(notebookId)!;
  }

  setPresence(
    notebookId: string,
    user: { userId: string; userEmail: string },
    cursor?: CursorPosition,
    blockId?: string
  ): void {
    const awareness = this.getAwareness(notebookId);
    awareness.setLocalState({
      userId: user.userId,
      userEmail: user.userEmail,
      notebookId,
      blockId,
      cursor,
    });
  }

  cleanupAwarenessExcept(activeNotebookId: string) {
    for (const [nbId, awareness] of this.awarenessMap.entries()) {
      if (nbId !== activeNotebookId) {
        try {
          awareness.destroy?.();
        } catch (err) {
          console.warn("Error destroying awareness:", err);
        }
        this.awarenessMap.delete(nbId);
        console.log("🧹 Destroyed stale awareness for", nbId);
      }
    }
  }

  /* ===========================
     YJS integration
     =========================== */

  async setupYjsDocument(notebookId: string): Promise<Y.Doc> {
    let ydoc = this.notebooks.get(notebookId);
    if (ydoc) return ydoc;

    ydoc = new Y.Doc();
    this.notebooks.set(notebookId, ydoc);

    const persistence = new IndexeddbPersistence(
      `notebook-${notebookId}`,
      ydoc
    );
    persistence.once("synced", () => {
      console.log(`💾 IndexedDB loaded for ${notebookId}`);
    });

    this.socket?.emit("request-yjs-state", { notebookId });

    // Keep broadcasting changes to the server
    ydoc.on("update", (update: Uint8Array) => {
      const updateBase64 = btoa(String.fromCharCode(...update));
      this.socket?.emit("yjs-update", { notebookId, update: updateBase64 });
    });

    return new Promise((resolve) => {
      const onState = (data: any) => {
        if (data.notebookId !== notebookId) return;
        const state = Uint8Array.from(atob(data.state), (c) => c.charCodeAt(0));
        Y.applyUpdate(ydoc!, state);
        this.initializedDocs.add(notebookId); // <-- add this line
        this.socket?.off("yjs-state", onState);
        resolve(ydoc!);
      };
      this.socket?.on("yjs-state", onState);
    });
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

  async requestYjsState(notebookId: string): Promise<string | null> {
    if (!this.socket) return null;

    return new Promise((resolve) => {
      const handler = (data: { notebookId: string; state: string }) => {
        if (data.notebookId === notebookId) {
          this.socket?.off("yjs-state", handler);
          resolve(data.state || null);
        }
      };

      this.socket.on("yjs-state", handler);
      this.socket.emit("request-yjs-state", { notebookId });

      // Fallback timeout to avoid hanging
      setTimeout(() => {
        this.socket?.off("yjs-state", handler);
        resolve(null);
      }, 3000);
    });
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
