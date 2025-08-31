export type Lang = "python" | "json" | "markdown";

export interface Block {
  id: string;
  lang: Lang;
  content: string;
  collapsed?: boolean;
  output?: string;
  error?: string;
  isRunning?: boolean;
  createdAt: number;
  updatedAt: number;
  position: number;
}

export interface FileNode {
  id: string;
  name: string;
  type: "file";
  content?: string;
  isOpen?: boolean;
  parentId?: string;
  path: string;
}

export interface Milestone {
  id: string;
  name: string;
  notes?: string;
  createdAt: number;
  snapshot: {
    blocks: Block[];
    files: FileNode[];
  };
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  color: string;
  cursor?: {
    blockId: string;
    position: number;
  };
}

export interface Room {
  id: string;
  name: string;
  description?: string;
  isPrivate: boolean;
  ownerId: string;
  createdAt: number;
  updatedAt: number;
}

export interface TestFile {
  id: string;
  name: string;
  content: string;
  path: string;
  lastRun?: number;
  status?: "passed" | "failed" | "running";
  output?: string;
}

export interface RunOutput {
  id: string;
  blockId?: string;
  command: string;
  output: string;
  error?: string;
  timestamp: number;
  duration?: number;
  status: "running" | "completed" | "failed";
}

export interface AIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  actions?: {
    type: "insert_block" | "create_file" | "update_block";
    data: Record<string, unknown>;
  }[];
}

// Basic room chat message type aligned with DB schema
export interface ChatMessage {
  message_id?: number; // optional locally until persisted
  room_id: number | string;
  uid: string; // user id (uuid)
  message: string;
  created_at: string | number; // ISO string or epoch ms
}
