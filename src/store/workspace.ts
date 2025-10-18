import { create } from "zustand";
import { devtools, persist, createJSONStorage } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";
import { socket } from "../lib/socket";
import {
  apiClient,
  type Commit,
  type Milestone as APIMilestone,
} from "../lib/apiClient";

import type {
  Block,
  FileNode,
  Milestone,
  User,
  TestFile,
  RunOutput,
  AIMessage,
  Lang,
  ChatMessage,
} from "../types/workspace";

// Files Store
interface FilesState {
  files: FileNode[];
  selectedFileId: string | null;
  addFile: (name: string, type: "file") => void;
  deleteFile: (id: string) => void;
  renameFile: (id: string, newName: string) => void;
  updateFileContent: (id: string, content: string) => void;
  selectFile: (id: string | null) => void;
  moveFile: (sourceId: string, targetId: string) => void;
  getFileById: (id: string) => FileNode | undefined;
  getFilePath: (id: string) => string;
}

// Blocks Store
interface BlocksState {
  blocks: Block[];
  selectedBlockId: string | null;
  addBlock: (position?: number, lang?: Lang) => string;
  updateBlock: (id: string, updates: Partial<Block>) => void;
  deleteBlock: (id: string) => void;
  reorderBlocks: (sourceIndex: number, destinationIndex: number) => void;
  duplicateBlock: (id: string) => void;
  runBlock: (id: string) => void;
  runAllBlocks: () => void;
  stopBlock: (id: string) => void;
  selectBlock: (id: string | null) => void;
  getBlockById: (id: string) => Block | undefined;
  setBlocks: (blocks: Block[]) => void;
  upsertBlock: (block: Block) => void;
  removeBlock: (id: string) => void;
}

// Milestones Store
interface MilestonesState {
  milestones: Milestone[];
  selectedMilestoneId: string | null;
  commits: Array<{
    commit_id: string;
    commit_message: string;
    created_at: string;
    author_id: string;
  }>;
  isLoading: boolean;
  saveMilestone: (
    roomId: string,
    name: string,
    notes?: string
  ) => Promise<void>;
  restoreMilestone: (roomId: string, commitId: string) => Promise<void>;
  deleteMilestone: (roomId: string, milestoneId: string) => Promise<void>;
  selectMilestone: (id: string | null) => void;
  fetchMilestones: (roomId: string) => Promise<void>;
  createCommit: (
    roomId: string,
    notebookId: string,
    message: string
  ) => Promise<void>;
  fetchCommits: (roomId: string) => Promise<void>;
  restoreCommit: (roomId: string, commitId: string) => Promise<void>;
  setMilestones: (milestones: Milestone[]) => void;
  setCommits: (commits: Commit[]) => void;
}

// Presence Store
interface PresenceState {
  users: User[];
  currentUser: User | null;
  updateUserCursor: (userId: string, blockId: string, position: number) => void;
  addUser: (user: User) => void;
  removeUser: (userId: string) => void;
  setCurrentUser: (user: User) => void;
}

// Run State Store
interface RunState {
  outputs: RunOutput[];
  isRunning: boolean;
  addOutput: (output: Omit<RunOutput, "id" | "timestamp">) => string;
  clearOutputs: () => void;
  updateOutput: (id: string, updates: Partial<RunOutput>) => void;
  setIsRunning: (running: boolean) => void;
  // in-memory container state (not persisted)
  containerAlive: Record<string, boolean>;
  setContainerAlive: (roomId: string, alive: boolean) => void;
  // executionStarted removed (stateless exec model)
}

// Tests Store
interface TestsState {
  testFiles: TestFile[];
  isRunningTests: boolean;
  addTestFile: (file: Omit<TestFile, "id">) => void;
  runTests: () => void;
  runSingleTest: (id: string) => void;
  updateTestFile: (id: string, updates: Partial<TestFile>) => void;
}

// AI Assist Store
interface AIState {
  messages: AIMessage[];
  isLoading: boolean;
  addMessage: (message: Omit<AIMessage, "id" | "timestamp">) => void;
  clearMessages: () => void;
  sendMessage: (content: string) => Promise<void>;
}

// Chat Store
interface ChatState {
  messages: Record<string, ChatMessage[]>; // keyed by room_id (stringified)
  sendChat: (
    roomId: string | number,
    _uid: string,
    message: string,
    _email?: string
  ) => void;
  clearChat: (roomId: string | number) => void;
}

// App Store (general settings)
interface AppState {
  theme: "light" | "dark";
  currentRoom: string | null;
  sidebarWidth: number;
  rightPanelWidth: number;
  activeActivity: "files" | "users" | "tests" | "versions" | "ai" | "chat";
  isLeftSidebarCollapsed: boolean;
  isRightSidebarCollapsed: boolean;
  toggleTheme: () => void;
  setCurrentRoom: (roomId: string) => void;
  setSidebarWidth: (width: number) => void;
  setRightPanelWidth: (width: number) => void;
  setActiveActivity: (
    activity: "files" | "users" | "tests" | "versions" | "ai" | "chat"
  ) => void;
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
}

// Helper functions
const generatePath = (files: FileNode[], fileId: string): string => {
  const file = files.find((f) => f.id === fileId);
  return file ? file.name : "";
};

const findFileById = (files: FileNode[], id: string): FileNode | undefined => {
  return files.find((file) => file.id === id);
};

const removeFileById = (files: FileNode[], id: string): FileNode[] => {
  return files.filter((file) => file.id !== id);
};

// Create stores
export const useFilesStore = create<FilesState>()(
  devtools(
    (set, get) => ({
      files: [
        {
          id: "main-py",
          name: "main.py",
          type: "file",
          path: "main.py",
          content: '# Welcome to your workspace\nprint("Hello, World!")\n',
        },
      ],
      selectedFileId: null,

      addFile: (name, type) => {
        const newFile: FileNode = {
          id: uuidv4(),
          name,
          type,
          path: "",
          content: "",
        };

        set((state) => {
          newFile.path = name;
          return { files: [...state.files, newFile] };
        });
      },

      deleteFile: (id) => {
        set((state) => ({
          files: removeFileById(state.files, id),
          selectedFileId:
            state.selectedFileId === id ? null : state.selectedFileId,
        }));
      },

      renameFile: (id, newName) => {
        set((state) => ({
          files: state.files.map((file) =>
            file.id === id ? { ...file, name: newName, path: newName } : file
          ),
        }));
      },

      updateFileContent: (id, content) => {
        set((state) => ({
          files: state.files.map((file) =>
            file.id === id ? { ...file, content } : file
          ),
        }));
      },

      selectFile: (id) => {
        set({ selectedFileId: id });
      },

      moveFile: (sourceId, targetId) => {
        // Implementation for drag & drop file movement
        console.log("Moving file", sourceId, "to", targetId);
      },

      getFileById: (id) => {
        return findFileById(get().files, id);
      },

      getFilePath: (id) => {
        return generatePath(get().files, id);
      },
    }),
    { name: "files-store" }
  )
);

export const useBlocksStore = create<BlocksState>()(
  devtools(
    (set, get) => ({
      // Start with empty blocks; notebooks will load their content via Yjs
      blocks: [],
      selectedBlockId: null,

      // Create a new block locally (used for non-realtime flows/UI convenience)
      addBlock: (position, lang = "python") => {
        const newBlock: Block = {
          id: uuidv4(),
          lang,
          content: "",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          position: position ?? get().blocks.length,
        };

        set((state) => {
          const blocks = [...state.blocks];
          if (position !== undefined) {
            blocks.splice(position, 0, newBlock);
          } else {
            blocks.push(newBlock);
          }
          // normalize positions
          blocks
            .sort((a, b) => a.position - b.position)
            .forEach((b, i) => (b.position = i));
          return { blocks };
        });

        return newBlock.id;
      },

      // Update a block’s fields
      updateBlock: (id, updates) => {
        set((state) => ({
          blocks: state.blocks.map((b) =>
            b.id === id ? { ...b, ...updates, updatedAt: Date.now() } : b
          ),
        }));
      },

      deleteBlock: (id) => {
        set((state) => {
          const next = state.blocks.filter((b) => b.id !== id);
          next.forEach((b, i) => (b.position = i));
          return {
            blocks: next,
            selectedBlockId:
              state.selectedBlockId === id ? null : state.selectedBlockId,
          };
        });
      },

      reorderBlocks: (sourceIndex, destinationIndex) => {
        set((state) => {
          const blocks = [...state.blocks];
          const [moved] = blocks.splice(sourceIndex, 1);
          blocks.splice(destinationIndex, 0, moved);
          blocks.forEach((b, i) => (b.position = i));
          return { blocks };
        });
      },

      duplicateBlock: (id) => {
        const original = get().getBlockById(id);
        if (!original) return;

        const clone: Block = {
          ...original,
          id: uuidv4(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
          position: original.position + 1,
        };

        set((state) => {
          const blocks = [...state.blocks];
          blocks.splice(original.position + 1, 0, clone);
          blocks.forEach((b, i) => (b.position = i));
          return { blocks };
        });
      },

      // Mock run helpers (unchanged)
      runBlock: (id) => {
        get().updateBlock(id, { isRunning: true, output: "", error: "" });
        setTimeout(() => {
          const b = get().getBlockById(id);
          if (b) {
            const out = `Executed ${b.lang} code:\n${b.content}\n\nOutput: Success`;
            get().updateBlock(id, { isRunning: false, output: out });
          }
        }, 1000);
      },

      runAllBlocks: () => {
        get().blocks.forEach((b) => get().runBlock(b.id));
      },

      stopBlock: (id) => {
        get().updateBlock(id, { isRunning: false });
      },

      selectBlock: (id) => set({ selectedBlockId: id }),

      getBlockById: (id) => get().blocks.find((b) => b.id === id),

      setBlocks: (blocks) => {
        const next = [...blocks]
          .sort((a, b) => a.position - b.position)
          .map((b, i) => ({ ...b, position: i })); // normalize positions
        set({ blocks: next });
      },

      upsertBlock: (incoming) => {
        set((state) => {
          const idx = state.blocks.findIndex((b) => b.id === incoming.id);
          const next = [...state.blocks];
          if (idx === -1) next.push(incoming);
          else next[idx] = { ...next[idx], ...incoming };
          next
            .sort((a, b) => a.position - b.position)
            .forEach((b, i) => (b.position = i));
          return { blocks: next };
        });
      },

      removeBlock: (id) => {
        set((state) => {
          const next = state.blocks.filter((b) => b.id !== id);
          next.forEach((b, i) => (b.position = i));
          return {
            blocks: next,
            selectedBlockId:
              state.selectedBlockId === id ? null : state.selectedBlockId,
          };
        });
      },
    }),
    { name: "blocks-store" }
  )
);

// Persistence for blocks store - prevent data loss on reload
const BLOCKS_STORAGE_KEY = "ottrpad-blocks-backup";

// DISABLED: localStorage restore interferes with Yjs-based notebook loading
// Blocks are now loaded from the collaboration service per notebook

if (typeof window !== "undefined") {
  // Subscribe to changes and auto-save to localStorage
  useBlocksStore.subscribe((state) => {
    try {
      // Only save if we have blocks (don't save empty state)
      if (state.blocks && state.blocks.length > 0) {
        localStorage.setItem(
          BLOCKS_STORAGE_KEY,
          JSON.stringify({
            blocks: state.blocks,
            timestamp: Date.now(),
          })
        );
      }
    } catch (err) {
      console.error("[BlocksStore] Failed to save to localStorage:", err);
    }
  });
}

export const useMilestonesStore = create<MilestonesState>()(
  devtools(
    (set, get) => ({
      milestones: [],
      selectedMilestoneId: null,
      commits: [],
      isLoading: false,

      saveMilestone: async (roomId, name, notes) => {
        set({ isLoading: true });
        try {
          await apiClient.createMilestone({
            roomId,
            milestoneName: name,
            milestoneNotes: notes || "",
          });

          // Fetch updated milestones
          await get().fetchMilestones(roomId);
        } catch (error) {
          console.error("Failed to save milestone:", error);
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      restoreMilestone: async (roomId, commitId) => {
        set({ isLoading: true });
        try {
          const response = await apiClient.restoreCommit({
            roomId,
            commitId,
          });

          // Update blocks with restored snapshot
          if (response.snapshot?.blocks) {
            const blocks = response.snapshot.blocks.map((block) => ({
              ...block,
              lang: (block.lang as Lang) || "python",
            }));
            useBlocksStore.setState({ blocks });
          }
        } catch (error) {
          console.error("Failed to restore milestone:", error);
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      deleteMilestone: async (roomId, milestoneId) => {
        set({ isLoading: true });
        try {
          await apiClient.deleteMilestone({ roomId, milestoneId });

          // Remove from local state
          set((state) => ({
            milestones: state.milestones.filter((m) => m.id !== milestoneId),
            selectedMilestoneId:
              state.selectedMilestoneId === milestoneId
                ? null
                : state.selectedMilestoneId,
          }));
        } catch (error) {
          console.error("Failed to delete milestone:", error);
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      selectMilestone: (id) => {
        set({ selectedMilestoneId: id });
      },

      fetchMilestones: async (roomId) => {
        set({ isLoading: true });
        try {
          const response = await apiClient.getMilestones(roomId);
          const milestones: Milestone[] = response.milestones.map(
            (m: APIMilestone) => ({
              id: m.milestone_id,
              name: m.name,
              notes: m.notes,
              createdAt: new Date(m.created_at).getTime(),
              snapshot: { blocks: [], files: [] }, // Snapshot will be fetched when needed
            })
          );
          set({ milestones });
        } catch (error) {
          console.error("Failed to fetch milestones:", error);
        } finally {
          set({ isLoading: false });
        }
      },

      createCommit: async (roomId, notebookId, message) => {
        set({ isLoading: true });
        try {
          // Get current blocks snapshot
          const blocks = useBlocksStore.getState().blocks;
          const snapshot = { blocks };

          await apiClient.createCommit({
            roomId,
            notebookId,
            message,
            snapshot,
          });

          // Fetch updated commits
          await get().fetchCommits(roomId);
        } catch (error) {
          console.error("Failed to create commit:", error);
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      fetchCommits: async (roomId) => {
        set({ isLoading: true });
        try {
          const timeline = await apiClient.getCommitTimeline(roomId);
          set({ commits: timeline });
        } catch (error) {
          console.error("Failed to fetch commits:", error);
        } finally {
          set({ isLoading: false });
        }
      },

      restoreCommit: async (roomId, commitId) => {
        set({ isLoading: true });
        try {
          const response = await apiClient.restoreCommit({
            roomId,
            commitId,
          });

          // Update blocks with restored snapshot
          if (response.snapshot?.blocks) {
            const blocks = response.snapshot.blocks.map((block) => ({
              ...block,
              lang: (block.lang as Lang) || "python",
            }));
            useBlocksStore.setState({ blocks });
          }
        } catch (error) {
          console.error("Failed to restore commit:", error);
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      setMilestones: (milestones) => {
        set({ milestones });
      },

      setCommits: (commits) => {
        set({ commits });
      },
    }),
    { name: "milestones-store" }
  )
);

export const usePresenceStore = create<PresenceState>()(
  devtools(
    (set) => ({
      users: [],
      currentUser: null,

      updateUserCursor: (userId, blockId, position) => {
        set((state) => ({
          users: state.users.map((user) =>
            user.id === userId
              ? { ...user, cursor: { blockId, position } }
              : user
          ),
        }));
      },

      addUser: (user) => {
        set((state) => ({
          users: [...state.users.filter((u) => u.id !== user.id), user],
        }));
      },

      removeUser: (userId) => {
        set((state) => ({
          users: state.users.filter((u) => u.id !== userId),
        }));
      },

      setCurrentUser: (user) => {
        set({ currentUser: user });
      },
    }),
    { name: "presence-store" }
  )
);

export const useRunStore = create<RunState>()(
  devtools(
    (set) => ({
      outputs: [],
      isRunning: false,
      containerAlive: {},

      addOutput: (output) => {
        const newOutput: RunOutput = {
          ...output,
          id: uuidv4(),
          timestamp: Date.now(),
        };

        set((state) => ({
          outputs: [...state.outputs, newOutput],
        }));
        return newOutput.id;
      },

      clearOutputs: () => {
        set({ outputs: [] });
      },

      updateOutput: (id, updates) => {
        set((state) => ({
          outputs: state.outputs.map((output) =>
            output.id === id ? { ...output, ...updates } : output
          ),
        }));
      },
      setIsRunning: (running) => set({ isRunning: running }),
      setContainerAlive: (roomId, alive) =>
        set((state) => ({
          containerAlive: { ...state.containerAlive, [roomId]: alive },
        })),
    }),
    { name: "run-store" }
  )
);

export const useTestsStore = create<TestsState>()(
  devtools(
    (set, get) => ({
      testFiles: [
        {
          id: "test-example",
          name: "test_example.py",
          content:
            'def test_example():\n    assert 1 + 1 == 2\n    print("Test passed!")',
          path: "tests/test_example.py",
        },
      ],
      isRunningTests: false,

      addTestFile: (file) => {
        const newFile: TestFile = {
          ...file,
          id: uuidv4(),
        };

        set((state) => ({
          testFiles: [...state.testFiles, newFile],
        }));
      },

      runTests: () => {
        set({ isRunningTests: true });

        // Mock test execution
        setTimeout(() => {
          set((state) => ({
            isRunningTests: false,
            testFiles: state.testFiles.map((file) => ({
              ...file,
              status: Math.random() > 0.3 ? "passed" : ("failed" as const),
              lastRun: Date.now(),
              output: "Test execution completed",
            })),
          }));
        }, 2000);
      },

      runSingleTest: (id) => {
        const file = get().testFiles.find((f) => f.id === id);
        if (file) {
          set((state) => ({
            testFiles: state.testFiles.map((f) =>
              f.id === id ? { ...f, status: "running" as const } : f
            ),
          }));

          setTimeout(() => {
            set((state) => ({
              testFiles: state.testFiles.map((f) =>
                f.id === id
                  ? {
                      ...f,
                      status:
                        Math.random() > 0.3 ? "passed" : ("failed" as const),
                      lastRun: Date.now(),
                      output: "Single test execution completed",
                    }
                  : f
              ),
            }));
          }, 1000);
        }
      },

      updateTestFile: (id, updates) => {
        set((state) => ({
          testFiles: state.testFiles.map((file) =>
            file.id === id ? { ...file, ...updates } : file
          ),
        }));
      },
    }),
    { name: "tests-store" }
  )
);

export const useAIStore = create<AIState>()(
  devtools(
    (set, get) => ({
      messages: [],
      isLoading: false,

      addMessage: (message) => {
        // Translate some technical AI error text into helpful friendlier explanation for the user.
        const translateProviderMessage = (text: string) => {
          if (!text) return text;
          const t = String(text);
          if (
            t.includes("Direct access to Core service is not allowed") ||
            t.includes("Core service is not allowed")
          ) {
            return (
              "AI provider rejected the request: Direct access to Core service is not allowed. " +
              "Check server-side AI configuration (GEMINI_API_KEY / credentials) and gateway routing."
            );
          }
          if (
            t.toLowerCase().includes("bearer token") ||
            t.toLowerCase().includes("provide a valid bearer") ||
            t.toLowerCase().includes("invalid bearer")
          ) {
            return "AI request failed: Missing or invalid Bearer token. Ensure your server sets GEMINI_API_KEY and forwards an Authorization: Bearer <token> header to the AI gateway.";
          }
          return text;
        };

        const newMessage: AIMessage = {
          ...message,
          id: uuidv4(),
          timestamp: Date.now(),
          content:
            message.role === "assistant"
              ? translateProviderMessage(message.content)
              : message.content,
        };

        set((state) => ({
          messages: [...state.messages, newMessage],
        }));
      },

      clearMessages: () => {
        set({ messages: [] });
      },

      sendMessage: async (content) => {
        // optimistic add user message
        get().addMessage({ role: "user", content });
        set({ isLoading: true }); // to show a loading state.

        const mod = await import("../lib/apiClient");
        const apiClient = mod.apiClient;

        const maxAttempts = 3;
        const delays = [1000, 2000, 4000]; // ms
        let attempt = 0;
        let lastError: unknown = null;

        // Provide a transient retry hint message which we'll add between attempts
        const addRetryHint = (msg: string) =>
          get().addMessage({ role: "assistant", content: msg });

        while (attempt < maxAttempts) {
          try {
            attempt += 1;
            if (attempt > 1) {
              addRetryHint(
                `Retrying AI request (attempt ${attempt}/${maxAttempts})...`
              );
            }

            const payload = await apiClient.generateAiContent(content);
            const texts: string[] = Array.isArray(payload?.texts)
              ? payload.texts
              : [String(payload)];
            for (const t of texts) {
              get().addMessage({ role: "assistant", content: t });
            }

            // success
            lastError = null;
            break;
          } catch (err) {
            console.warn(`AI attempt ${attempt} failed`, err);
            lastError = err;

            // If it's a client/validation error or rate-limit, don't retry
            const e = err as unknown as { statusCode?: number };
            const status =
              e?.statusCode ??
              (err && typeof err === "object" && (err as Error).message
                ? undefined
                : undefined);
            // Retry only on server-side 5xx
            const isServerError =
              typeof status === "number" ? status >= 500 && status < 600 : true;

            if (attempt >= maxAttempts || !isServerError) {
              break;
            }

            // wait before next attempt
            const delay = delays[Math.min(attempt - 1, delays.length - 1)];
            await new Promise((r) => setTimeout(r, delay));
          }
        }

        if (lastError) {
          console.error("AI request failed after retries", lastError);
          const e = lastError as unknown as {
            statusCode?: number;
            message?: string;
          };
          const msg = e?.message || String(lastError);
          get().addMessage({
            role: "assistant",
            content: `AI request failed after ${maxAttempts} attempts: ${msg}. Try again later.`,
          });
        }

        set({ isLoading: false });
      },
    }),
    { name: "ai-store" }
  )
);

socket.on("connect", () => {
  console.log("Connected to socket.io server");
});

socket.on("connect_error", (error: Error) => {
  console.error("Connection failed:", error.message);
  // Handle authentication failures
  if (
    error.message.includes("Authentication") ||
    error.message.includes("token")
  ) {
    console.error("Authentication failed - redirecting to login");
    // You might want to redirect to login or refresh token here
    // window.location.href = "/login";
  }
});

// Message from server
socket.on("message", (message: unknown) => {
  console.log("Received message:", message);
  outputMessage(message);
});

// Chat history from server
socket.on("chat-history", (data: { roomId: string; messages: unknown[] }) => {
  console.log("Received chat history:", data);
  const roomKey = String(data.roomId);
  const historicalMessages = data.messages
    .map((msg) => {
      // Convert server message format to our ChatMessage format
      if (typeof msg === "object" && msg) {
        const m = msg as Record<string, unknown>;
        return {
          room_id: data.roomId,
          uid: (m.uid as string) || "system",
          email: m.email as string | undefined,
          message: (m.content as string) || (m.message as string) || "",
          created_at:
            (m.timestamp as string | number) ||
            (m.created_at as string | number) ||
            Date.now(),
          message_id: m.message_id as number | undefined,
        };
      }
      return null;
    })
    .filter(Boolean); //removes any null values (so only valid message objects remain)

  // Replace existing messages for this room with history
  const chatStore = useChatStore.getState();
  useChatStore.setState({
    messages: {
      ...chatStore.messages,
      [roomKey]: historicalMessages as ChatMessage[],
    },
  });
});

// Chat errors from server
socket.on("chat:error", (error: { message: string }) => {
  console.error("Chat error:", error.message);

  // toast.error(error.message);
});

function outputMessage(message: unknown) {
  // Normalize payload
  let roomId: string | number | undefined;
  let uid: string = "system";
  let email: string | undefined;
  let text: string | undefined;
  let created: string | number = Date.now();

  if (typeof message === "string") {
    text = message;
  } else if (message && typeof message === "object") {
    const m = message as {
      room_id?: string | number;
      roomId?: string | number;
      uid?: string;
      userId?: string;
      email?: string;
      message?: string;
      content?: string;
      text?: string;
      created_at?: string | number;
      createdAt?: string | number;
      timestamp?: string | number;
    };
    roomId = m.room_id ?? m.roomId;
    uid = m.uid ?? m.userId ?? uid;
    email = m.email;
    text = m.message ?? m.content ?? m.text;
    created = m.created_at ?? m.createdAt ?? m.timestamp ?? created;
  }

  // Fallback to current room if not provided
  if (roomId == null) {
    const current = useAppStore.getState().currentRoom ?? "global";
    roomId = current;
  }

  if (!text) return; // nothing to show

  const key = String(roomId);

  // Check for duplicates - prevent messages with same content from same user within 1 second
  const chatState = useChatStore.getState();
  const existingMessages = chatState.messages[key] ?? [];
  const isDuplicate = existingMessages.some(
    (msg) =>
      msg.uid === uid &&
      msg.message === text &&
      Math.abs(Number(msg.created_at) - Number(created)) < 1000 // within 1 second
  );

  if (isDuplicate) {
    console.log("Duplicate message detected, skipping:", {
      uid,
      text,
      created,
    });
    return;
  }

  const entry: ChatMessage = {
    room_id: roomId,
    uid,
    email,
    message: text,
    created_at: created,
  };

  const chatStore = useChatStore.getState();
  const currentMessages = chatStore.messages[key] ?? [];
  useChatStore.setState({
    messages: { ...chatStore.messages, [key]: [...currentMessages, entry] },
  });
}

export const useChatStore = create<ChatState>()(
  devtools(
    persist(
      (set, get) => ({
        messages: {},

        sendChat: (roomId, _uid, message, _email) => {
          // Note: _uid and _email parameters are kept for interface compatibility
          // but not sent to server as it determines user from JWT token
          void _email; // Suppress unused parameter warning

          if (
            roomId === null ||
            roomId === undefined ||
            !String(message).trim()
          ) {
            return;
          }

          // Send message to server without optimistic update
          // The message will appear when the server echoes it back
          // Note: uid and email are not sent as the server determines user from JWT token
          socket.emit(
            "chat:send",
            {
              roomId,
              message,
            },
            (response: { ok: boolean; error?: string }) => {
              if (!response.ok && response.error) {
                console.error("Failed to send message:", response.error);
                // Show error to user (you might want to add a toast notification here)
              } else {
                console.log("Message sent successfully:", {
                  roomId,
                  uid: _uid,
                  message,
                });
              }
            }
          );
        },

        clearChat: (roomId) => {
          const next = { ...get().messages } as Record<string, ChatMessage[]>;
          next[String(roomId)] = [];
          set({ messages: next });
        },
      }),
      {
        name: "chat-history", // localStorage key
        version: 1,
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({ messages: state.messages }),
      }
    ),
    { name: "chat-store-devtools" }
  )
);

export const useAppStore = create<AppState>()(
  devtools(
    (set) => ({
      theme: "dark",
      currentRoom: null,
      sidebarWidth: 280,
      rightPanelWidth: 350,
      activeActivity: "files",
      isLeftSidebarCollapsed: false,
      isRightSidebarCollapsed: false,

      toggleTheme: () => {
        set((state) => ({ theme: state.theme === "light" ? "dark" : "light" }));
      },

      setCurrentRoom: (roomId) => {
        // Normalize and set currentRoom synchronously
        const normalized = roomId == null ? null : String(roomId);
        const prevRoom = useAppStore.getState().currentRoom;
        set({ currentRoom: normalized });
        // If a user had previously persisted the "versions" panel as active,
        // don't open it automatically when joining a room — default back to files.
        const currActivity = useAppStore.getState().activeActivity;
        if (currActivity === "versions") {
          set({ activeActivity: "files" });
        }
        // Clear run outputs whenever leaving a room or switching rooms (including re-selecting same after auth refresh)
        if (
          normalized === null || // leaving
          (prevRoom && normalized && prevRoom !== normalized) || // switching
          (normalized && normalized === prevRoom) // same room re-set (e.g., after re-login)
        ) {
          try {
            const runStore = useRunStore.getState();
            runStore.clearOutputs();
            runStore.setIsRunning(false);
          } catch (e) {
            console.warn("Failed to clear run outputs on room change", e);
          }
        }

        // Perform socket lifecycle actions asynchronously
        queueMicrotask(async () => {
          try {
            const supMod = await import("../lib/supabaseClient");
            const supabase = supMod.default;
            const { data } = await supabase.auth.getSession();
            const token = data.session?.access_token;

            if (!token) return;

            // Use centralized connect helper from lib/socket
            const sockHelpers = await import("../lib/socket");
            const { connectSocketWithToken, socket: s } = sockHelpers;
            await connectSocketWithToken(token);

            const sockAny = s as unknown as {
              __lastJoinedRoom?: string | null;
              emit: (...args: unknown[]) => void;
            };
            const prev = sockAny.__lastJoinedRoom ?? null;
            const next = normalized;

            // If there's a previous different room, explicitly leave it if server supports it
            if (prev && prev !== next) {
              try {
                sockAny.emit("leave-room", { roomId: prev });
              } catch {
                // ignore
              }
            }

            // Only emit join if we're not already in the same room
            if (next && prev !== next) {
              sockAny.__lastJoinedRoom = next;
              sockAny.emit("join-room", { roomId: next });
              // Proactively start execution container for this room; backend returns 200 if already started
              try {
                const execMod = await import("../lib/codeExecutionClient");
                const { startExecution } = execMod;
                await startExecution(next);
                // Mark container alive in-memory
                const runStore = useRunStore.getState();
                runStore.setContainerAlive(next, true);
              } catch (e) {
                console.warn("Failed to start execution container on join", e);
              }
              // s.emit("request-chat-history", { roomId: next });
            }
          } catch (e) {
            console.warn("Room join socket setup failed", e);
          }
        });
      },

      setSidebarWidth: (width) => {
        set({ sidebarWidth: Math.max(200, Math.min(500, width)) });
      },

      setRightPanelWidth: (width) => {
        set({ rightPanelWidth: Math.max(300, Math.min(600, width)) });
      },

      setActiveActivity: (activity) => {
        set({ activeActivity: activity });
      },

      toggleLeftSidebar: () => {
        set((state) => ({
          isLeftSidebarCollapsed: !state.isLeftSidebarCollapsed,
        }));
      },

      toggleRightSidebar: () => {
        set((state) => ({
          isRightSidebarCollapsed: !state.isRightSidebarCollapsed,
        }));
      },
    }),
    { name: "app-store" }
  )
);
