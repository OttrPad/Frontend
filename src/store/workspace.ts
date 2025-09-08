import { create } from "zustand";
import { devtools, persist, createJSONStorage } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";
import { socket} from "../lib/socket";


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
}

// Milestones Store
interface MilestonesState {
  milestones: Milestone[];
  selectedMilestoneId: string | null;
  saveMilestone: (name: string, notes?: string) => void;
  restoreMilestone: (id: string) => void;
  deleteMilestone: (id: string) => void;
  selectMilestone: (id: string | null) => void;
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
  addOutput: (output: Omit<RunOutput, "id" | "timestamp">) => void;
  clearOutputs: () => void;
  updateOutput: (id: string, updates: Partial<RunOutput>) => void;
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
  sendMessage: (content: string) => void;
}

// Chat Store
interface ChatState {
  messages: Record<string, ChatMessage[]>; // keyed by room_id (stringified)
  sendChat: (roomId: string | number, uid: string, message: string, email?: string) => void;
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
      blocks: [
        {
          id: "welcome-block",
          lang: "python",
          content:
            '# Welcome to OttrPad!\n# Start coding collaboratively\nprint("Hello, World!")',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          position: 0,
        },
      ],
      selectedBlockId: null,

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
            // Update positions
            blocks.forEach((block, index) => {
              block.position = index;
            });
          } else {
            blocks.push(newBlock);
          }
          return { blocks };
        });

        return newBlock.id;
      },

      updateBlock: (id, updates) => {
        set((state) => ({
          blocks: state.blocks.map((block) =>
            block.id === id
              ? { ...block, ...updates, updatedAt: Date.now() }
              : block
          ),
        }));
      },

      deleteBlock: (id) => {
        set((state) => {
          const blocks = state.blocks.filter((block) => block.id !== id);
          // Update positions
          blocks.forEach((block, index) => {
            block.position = index;
          });
          return {
            blocks,
            selectedBlockId:
              state.selectedBlockId === id ? null : state.selectedBlockId,
          };
        });
      },

      reorderBlocks: (sourceIndex, destinationIndex) => {
        set((state) => {
          const blocks = [...state.blocks];
          const [movedBlock] = blocks.splice(sourceIndex, 1);
          blocks.splice(destinationIndex, 0, movedBlock);

          // Update positions
          blocks.forEach((block, index) => {
            block.position = index;
          });

          return { blocks };
        });
      },

      duplicateBlock: (id) => {
        const block = get().getBlockById(id);
        if (block) {
          const newBlock: Block = {
            ...block,
            id: uuidv4(),
            createdAt: Date.now(),
            updatedAt: Date.now(),
            position: block.position + 1,
          };

          set((state) => {
            const blocks = [...state.blocks];
            blocks.splice(block.position + 1, 0, newBlock);
            // Update positions
            blocks.forEach((block, index) => {
              block.position = index;
            });
            return { blocks };
          });
        }
      },

      runBlock: (id) => {
        // Mock implementation - will be replaced with real execution
        get().updateBlock(id, { isRunning: true, output: "", error: "" });

        setTimeout(() => {
          const block = get().getBlockById(id);
          if (block) {
            const mockOutput = `Executed ${block.lang} code:\n${block.content}\n\nOutput: Success`;
            get().updateBlock(id, {
              isRunning: false,
              output: mockOutput,
            });
          }
        }, 1000);
      },

      runAllBlocks: () => {
        get().blocks.forEach((block) => {
          get().runBlock(block.id);
        });
      },

      stopBlock: (id) => {
        get().updateBlock(id, { isRunning: false });
      },

      selectBlock: (id) => {
        set({ selectedBlockId: id });
      },

      getBlockById: (id) => {
        return get().blocks.find((block) => block.id === id);
      },
    }),
    { name: "blocks-store" }
  )
);

export const useMilestonesStore = create<MilestonesState>()(
  devtools(
    (set, get) => ({
      milestones: [],
      selectedMilestoneId: null,

      saveMilestone: (name, notes) => {
        const milestone: Milestone = {
          id: uuidv4(),
          name,
          notes,
          createdAt: Date.now(),
          snapshot: {
            blocks: useBlocksStore.getState().blocks,
            files: useFilesStore.getState().files,
          },
        };

        set((state) => ({
          milestones: [...state.milestones, milestone],
        }));
      },

      restoreMilestone: (id) => {
        const milestone = get().milestones.find((m) => m.id === id);
        if (milestone) {
          useBlocksStore.setState({ blocks: milestone.snapshot.blocks });
          useFilesStore.setState({ files: milestone.snapshot.files });
        }
      },

      deleteMilestone: (id) => {
        set((state) => ({
          milestones: state.milestones.filter((m) => m.id !== id),
          selectedMilestoneId:
            state.selectedMilestoneId === id ? null : state.selectedMilestoneId,
        }));
      },

      selectMilestone: (id) => {
        set({ selectedMilestoneId: id });
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

      addOutput: (output) => {
        const newOutput: RunOutput = {
          ...output,
          id: uuidv4(),
          timestamp: Date.now(),
        };

        set((state) => ({
          outputs: [...state.outputs, newOutput],
        }));
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
        const newMessage: AIMessage = {
          ...message,
          id: uuidv4(),
          timestamp: Date.now(),
        };

        set((state) => ({
          messages: [...state.messages, newMessage],
        }));
      },

      clearMessages: () => {
        set({ messages: [] });
      },

      sendMessage: (content) => {
        get().addMessage({ role: "user", content });

        set({ isLoading: true });

        // Mock AI response
        setTimeout(() => {
          const responses = [
            "I can help you with that! Here's a code suggestion:",
            "Let me analyze your code and provide some improvements:",
            "Based on your request, here's what I recommend:",
            "Great question! Here's how you can implement that:",
          ];

          const randomResponse =
            responses[Math.floor(Math.random() * responses.length)];

          get().addMessage({
            role: "assistant",
            content: randomResponse,
            actions: [
              {
                type: "insert_block",
                data: {
                  lang: "python",
                  content:
                    '# AI suggested code\nprint("This is an AI suggestion")',
                },
              },
            ],
          });

          set({ isLoading: false });
        }, 1500);
      },
    }),
    { name: "ai-store" }
  )
);




socket.on("connect", () => {
  console.log("Connected to socket.io server");
});


// Message from server
socket.on('message', (message: unknown) => {
  console.log(message);
  outputMessage(message);
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
    };
    roomId = m.room_id ?? m.roomId;
    uid = m.uid ?? m.userId ?? uid;
    email = m.email;
    text = m.message ?? m.content ?? m.text;
    created = m.created_at ?? m.createdAt ?? created;
  }

  // Fallback to current room if not provided
  if (roomId == null) {
    const current = useAppStore.getState().currentRoom ?? "global";
    roomId = current;
  }

  if (!text) return; // nothing to show

  const key = String(roomId);
  const entry: ChatMessage = {
    room_id: roomId,
    uid,
  email,
    message: text,
    created_at: created,
  };

  const s = useChatStore.getState();
  const current = s.messages[key] ?? [];
  useChatStore.setState({ messages: { ...s.messages, [key]: [...current, entry] } });
}

export const useChatStore = create<ChatState>()(
  devtools(
    persist(
      (set, get) => ({
        messages: {},

        sendChat: (roomId, uid, message, email) => {
          if (roomId === null || roomId === undefined || !String(message).trim()) {
            return;
          }
          // Emit using backend-expected keys
          socket.emit("chat:send", {
            roomId,
            uid,
            message,
            email,
          });
          // Optimistic append
          const key = String(roomId);
          const newMsg: ChatMessage = {
            room_id: roomId,
            uid,
            email,
            message,
            created_at: Date.now(),
          };
          const current = get().messages[key] ?? [];
          set({ messages: { ...get().messages, [key]: [...current, newMsg] } });
          console.log("Message sent:", { roomId, uid, message });
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
        set({ currentRoom: roomId });
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