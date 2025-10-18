import { useRef, useEffect, useCallback, useState } from "react";
import Editor, { type Monaco } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import * as Y from "yjs";
import { MonacoBinding } from "y-monaco";
import type { Block, Lang } from "../../types/workspace";
import { useAppStore } from "../../store/workspace";
import { socketCollaborationService } from "../../lib/socketCollaborationService";
import { apiClient } from "../../lib/apiClient";

interface ModelInfo {
  model: editor.ITextModel;
  language: Lang;
  lastAccessed: number;
}

const getMonacoLanguage = (lang: Lang): string => {
  const languageMap: Record<Lang, string> = {
    python: "python",
    markdown: "markdown",
  };
  return languageMap[lang] || "plaintext";
};

const PERFORMANCE_OPTIONS: editor.IStandaloneEditorConstructionOptions = {
  minimap: { enabled: false },
  codeLens: false,
  occurrencesHighlight: "off",
  renderWhitespace: "none",
  renderLineHighlight: "none",
  wordWrap: "on",
  bracketPairColorization: { enabled: false },
  matchBrackets: "near",
  automaticLayout: true,
  scrollBeyondLastLine: false,
  fontSize: 14,
  lineHeight: 20,
  fontFamily: "JetBrains Mono, Fira Code, Monaco, monospace",
  lineNumbers: "on",
  folding: false,
  readOnly: false,
  selectOnLineNumbers: true,
  roundedSelection: false,
  cursorStyle: "line",
  contextmenu: true,
  mouseWheelZoom: false,
  quickSuggestions: true,
  acceptSuggestionOnEnter: "on",
  tabCompletion: "on",
  wordBasedSuggestions: "matchingDocuments",
  parameterHints: { enabled: true },
  autoIndent: "advanced",
  formatOnPaste: true,
  formatOnType: true,
  scrollbar: {
    vertical: "auto",
    horizontal: "hidden",
    verticalHasArrows: false,
    horizontalHasArrows: false,
    verticalScrollbarSize: 8,
    horizontalScrollbarSize: 0,
  },
  padding: { top: 16, bottom: 16 },
};

class MonacoModelManager {
  private monaco: Monaco | null = null;
  private models = new Map<string, ModelInfo>();
  private disposables: { dispose(): void }[] = [];
  private static readonly MAX_CACHED_MODELS = 50;
  private static readonly CLEANUP_INTERVAL = 30000;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(monaco: Monaco) {
    this.monaco = monaco;
    this.startCleanupTimer();
  }

  private startCleanupTimer() {
    this.cleanupTimer = setInterval(() => {
      this.cleanupOldModels();
    }, MonacoModelManager.CLEANUP_INTERVAL);
  }

  private cleanupOldModels() {
    if (this.models.size <= MonacoModelManager.MAX_CACHED_MODELS) return;

    const sortedModels = Array.from(this.models.entries()).sort(
      ([, a], [, b]) => a.lastAccessed - b.lastAccessed
    );
    const modelsToRemove = sortedModels.slice(
      0,
      this.models.size - MonacoModelManager.MAX_CACHED_MODELS
    );

    modelsToRemove.forEach(([blockId, modelInfo]) => {
      modelInfo.model.dispose();
      this.models.delete(blockId);
    });

    console.log(
      `Cleaned up ${modelsToRemove.length} old models. Remaining: ${this.models.size}`
    );
  }

  getOrCreateModel(
    blockId: string,
    content: string,
    language: Lang
  ): editor.ITextModel {
    const existingModel = this.models.get(blockId);

    if (existingModel) {
      existingModel.lastAccessed = Date.now();
      if (existingModel.language !== language && this.monaco) {
        this.monaco.editor.setModelLanguage(
          existingModel.model,
          getMonacoLanguage(language)
        );
        existingModel.language = language;
      }
      if (existingModel.model.getValue() !== content) {
        existingModel.model.setValue(content);
      }
      return existingModel.model;
    }

    if (!this.monaco) throw new Error("Monaco not initialized");

    const uri = this.monaco.Uri.parse(
      `inmemory://block-${blockId}.${this.getFileExtension(language)}`
    );
    const model = this.monaco.editor.createModel(
      content,
      getMonacoLanguage(language),
      uri
    );

    const modelInfo: ModelInfo = {
      model,
      language,
      lastAccessed: Date.now(),
    };

    this.models.set(blockId, modelInfo);
    return model;
  }

  private getFileExtension(language: Lang): string {
    switch (language) {
      case "python":
        return "py";
      case "markdown":
        return "md";
      default:
        return "txt";
    }
  }

  updateModelContent(blockId: string, content: string) {
    const modelInfo = this.models.get(blockId);
    if (modelInfo && modelInfo.model.getValue() !== content) {
      modelInfo.model.setValue(content);
      modelInfo.lastAccessed = Date.now();
    }
  }

  disposeModel(blockId: string) {
    const modelInfo = this.models.get(blockId);
    if (modelInfo) {
      modelInfo.model.dispose();
      this.models.delete(blockId);
    }
  }

  dispose() {
    this.models.forEach((modelInfo) => modelInfo.model.dispose());
    this.models.clear();
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  getModelCount(): number {
    return this.models.size;
  }

  getMonaco(): Monaco | null {
    return this.monaco;
  }
}

interface SharedMonacoEditorProps {
  focusedBlockId: string | null;
  notebookId?: string | null; // <<< NEW (required for Yjs)
  blocks: Block[];
  onContentChange: (blockId: string, content: string) => void;
  onMonacoInit?: (monaco: Monaco) => void;
  height?: number;
  className?: string;
  userId?: string;
  userEmail?: string;
}

export function SharedMonacoEditor({
  focusedBlockId,
  notebookId, // <<< NEW
  blocks,
  onContentChange,
  onMonacoInit,
  height = 120,
  className = "",
  userId,
  userEmail,
}: SharedMonacoEditorProps) {
  const {
    theme,
    isLeftSidebarCollapsed,
    isRightSidebarCollapsed,
    sidebarWidth,
    rightPanelWidth,
  } = useAppStore();
  const [monaco, setMonaco] = useState<Monaco | null>(null);
  const [editor, setEditor] = useState<editor.IStandaloneCodeEditor | null>(
    null
  );
  const modelManagerRef = useRef<MonacoModelManager | null>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const currentContentListenerRef = useRef<{ dispose(): void } | null>(null);
  const inlineCompletionDisposableRef = useRef<{ dispose(): void } | null>(
    null
  );

  // Keep current binding so we can dispose when switching blocks/notebooks
  const bindingRef = useRef<MonacoBinding | null>(null);
  // Note: MonacoBinding manages selection/cursor awareness; no local tracking needed.

  // Ensure Y.Doc exists for this notebook
  useEffect(() => {
    if (!notebookId) return;

    (async () => {
      let ydoc = socketCollaborationService.getYjsDocument(notebookId);
      if (!ydoc) {
        ydoc = await socketCollaborationService.setupYjsDocument(notebookId);
      }
    })();
  }, [notebookId]);

  // Define themes BEFORE editor mounts to prevent beforeMountRef error
  const handleBeforeMount = useCallback((monacoInstance: Monaco) => {
    monacoInstance.editor.defineTheme("ottrpad-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "#94a3b8", fontStyle: "italic" },
        { token: "keyword", foreground: "#fb923d", fontStyle: "bold" },
        { token: "string", foreground: "#fbbf24" },
        { token: "number", foreground: "#60a5fa" },
        { token: "function", foreground: "#34d399" },
        { token: "variable", foreground: "#e5e5e5" },
        { token: "type", foreground: "#a78bfa" },
        { token: "operator", foreground: "#fb923d" },
      ],
      colors: {
        "editor.background": "#1f2937",
        "editor.foreground": "#e5e5e5",
        "editor.lineHighlightBackground": "#374151",
        "editor.selectionBackground": "#fb923d33",
        "editor.inactiveSelectionBackground": "#fb923d1a",
        "editorCursor.foreground": "#fb923d",
        "editorLineNumber.foreground": "#94a3b8",
        "editorLineNumber.activeForeground": "#fb923d",
        "editor.findMatchBackground": "#fb923d4d",
        "editor.findMatchHighlightBackground": "#fb923d26",
        "editorWidget.background": "#1f2937",
        "editorWidget.border": "#374151",
        "editorHoverWidget.background": "#1f2937",
        "editorHoverWidget.border": "#374151",
        "editorSuggestWidget.background": "#1f2937",
        "editorSuggestWidget.border": "#374151",
        "editorSuggestWidget.selectedBackground": "#fb923d33",
      },
    });

    monacoInstance.editor.defineTheme("ottrpad-light", {
      base: "vs",
      inherit: true,
      rules: [
        { token: "comment", foreground: "#64748b", fontStyle: "italic" },
        { token: "keyword", foreground: "#ea580c", fontStyle: "bold" },
        { token: "string", foreground: "#d97706" },
        { token: "number", foreground: "#2563eb" },
        { token: "function", foreground: "#059669" },
        { token: "variable", foreground: "#1f2937" },
        { token: "type", foreground: "#7c3aed" },
        { token: "operator", foreground: "#ea580c" },
      ],
      colors: {
        "editor.background": "#ffffff",
        "editor.foreground": "#1f2937",
        "editor.lineHighlightBackground": "#fb923d0d",
        "editor.selectionBackground": "#fb923d33",
        "editor.inactiveSelectionBackground": "#fb923d1a",
        "editorCursor.foreground": "#ea580c",
        "editorLineNumber.foreground": "#64748b",
        "editorLineNumber.activeForeground": "#ea580c",
        "editor.findMatchBackground": "#fb923d4d",
        "editor.findMatchHighlightBackground": "#fb923d26",
        "editorWidget.background": "#ffffff",
        "editorWidget.border": "#e5e7eb",
        "editorHoverWidget.background": "#ffffff",
        "editorHoverWidget.border": "#e5e7eb",
      },
    });
  }, []);

  // Initialize Monaco - themes are defined in beforeMount
  const handleEditorDidMount = useCallback(
    (editorInstance: editor.IStandaloneCodeEditor, monacoInstance: Monaco) => {
      setMonaco(monacoInstance);
      setEditor(editorInstance);
      onMonacoInit?.(monacoInstance);
      modelManagerRef.current = new MonacoModelManager(monacoInstance);

      // Set the theme (themes are already defined in beforeMount)
      monacoInstance.editor.setTheme(
        theme === "dark" ? "ottrpad-dark" : "ottrpad-light"
      );

      inlineCompletionDisposableRef.current?.dispose();
      inlineCompletionDisposableRef.current =
        monacoInstance.languages.registerInlineCompletionsProvider("python", {
          async provideInlineCompletions(model, position, _context, token) {
            const textBefore = model.getValueInRange({
              startLineNumber: 1,
              startColumn: 1,
              endLineNumber: position.lineNumber,
              endColumn: position.column,
            });

            const textAfter = model.getValueInRange({
              startLineNumber: position.lineNumber,
              startColumn: position.column,
              endLineNumber: model.getLineCount(),
              endColumn: model.getLineMaxColumn(model.getLineCount()),
            });

            const languageId = model.getLanguageId();

            let cancellationRequested = token.isCancellationRequested;
            let cancellationDisposable: { dispose(): void } | null = null;

            try {
              cancellationDisposable = token.onCancellationRequested(() => {
                cancellationRequested = true;
              });

              if (cancellationRequested) {
                return { items: [] };
              }

              const data = await apiClient.getAiSuggestion({
                contextBefore: textBefore,
                contextAfter: textAfter,
                language: languageId,
                cursor: {
                  line: position.lineNumber,
                  column: position.column,
                },
              });

              if (cancellationRequested || token.isCancellationRequested) {
                return { items: [] };
              }

              const suggestionTexts: string[] = [];

              if (Array.isArray(data.items)) {
                data.items.forEach((item) => {
                  if (typeof item?.text === "string" && item.text.trim()) {
                    suggestionTexts.push(item.text);
                  }
                });
              }

              if (
                !suggestionTexts.length &&
                typeof data.suggestion === "string"
              ) {
                suggestionTexts.push(data.suggestion);
              }

              if (!suggestionTexts.length) {
                return { items: [] };
              }

              return {
                items: suggestionTexts.map((text) => ({
                  insertText: text,
                  range: new monacoInstance.Range(
                    position.lineNumber,
                    position.column,
                    position.lineNumber,
                    position.column
                  ),
                })),
              };
            } catch (error) {
              console.error("Inline suggestion failed", error);
              return { items: [] };
            } finally {
              cancellationDisposable?.dispose();
            }
          },
          disposeInlineCompletions() {},
        });

      if (editorContainerRef.current) {
        resizeObserverRef.current = new ResizeObserver(() => {
          editorInstance.layout();
        });
        resizeObserverRef.current.observe(editorContainerRef.current);
      }

      monacoInstance.languages.registerCompletionItemProvider("python", {
        provideCompletionItems: (model, position) => {
          const word = model.getWordUntilPosition(position);
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          };
          return {
            suggestions: [
              {
                label: "print",
                kind: monacoInstance.languages.CompletionItemKind.Function,
                insertText: "print(${1})",
                insertTextRules:
                  monacoInstance.languages.CompletionItemInsertTextRule
                    .InsertAsSnippet,
                documentation: "Print function",
                range,
              },
              {
                label: "def",
                kind: monacoInstance.languages.CompletionItemKind.Keyword,
                insertText: "def ${1:function_name}(${2}):\n    ${3:pass}",
                insertTextRules:
                  monacoInstance.languages.CompletionItemInsertTextRule
                    .InsertAsSnippet,
                documentation: "Function definition",
                range,
              },
            ],
          };
        },
      });
    },
    [theme, onMonacoInit]
  );

  // Update theme on change
  useEffect(() => {
    if (monaco && editor) {
      monaco.editor.setTheme(
        theme === "dark" ? "ottrpad-dark" : "ottrpad-light"
      );
      editor.layout();
    }
  }, [theme, monaco, editor]);

  // Force layout update when container size changes (e.g., sidebar resize)
  useEffect(() => {
    if (!editor) return;

    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      // Debounce to avoid excessive layout calls
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        editor.layout();
      }, 100);
    };

    // Listen for window resize events
    window.addEventListener("resize", handleResize);

    // Trigger layout when sidebar state or width changes
    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(resizeTimeout);
    };
  }, [
    editor,
    isLeftSidebarCollapsed,
    isRightSidebarCollapsed,
    sidebarWidth,
    rightPanelWidth,
  ]);

  // Switch editor model when focused block changes (keeps your shared editor UX)
  useEffect(() => {
    if (
      !focusedBlockId ||
      !editor ||
      !modelManagerRef.current ||
      !monaco ||
      !notebookId
    )
      return;

    const block = blocks.find((b) => b.id === focusedBlockId);
    if (!block) return;

    // We no longer return early here. We'll always set the model for the new block,
    // and let the Yjs binding hydrate Monaco content shortly after.
    // This avoids races that could leave the editor with no model bound.

    try {
      // stop previous model -> store sync listener
      if (currentContentListenerRef.current) {
        currentContentListenerRef.current.dispose();
        currentContentListenerRef.current = null;
      }

      // get / create a model for this block (local cache)
      const model = modelManagerRef.current.getOrCreateModel(
        block.id,
        block.content,
        block.lang
      );

      editor.setModel(model);
      editor.setScrollTop(0);
      editor.revealLine(1);

      // keep store in sync for previews (focused block typing)
      currentContentListenerRef.current = model.onDidChangeContent(() => {
        const content = model.getValue();
        onContentChange(focusedBlockId, content);
      });

      editor.focus();
    } catch (error) {
      console.error("Error switching editor model:", error);
    }
  }, [focusedBlockId, blocks, editor, monaco, onContentChange, notebookId]);

  // Yjs <-> Monaco binding for the focused block
  useEffect(() => {
    if (!focusedBlockId || !notebookId || !editor || !userId || !userEmail)
      return;

    // Ensure doc exists
    (async () => {
      // Ensure doc exists
      let ydoc = socketCollaborationService.getYjsDocument(notebookId);
      if (!ydoc) {
        ydoc = await socketCollaborationService.setupYjsDocument(notebookId);
      }

      if (!ydoc) return;

      // Block content map
      const blockContent = ydoc.getMap<Y.Text>("blockContent");

      // Ensure Y.Text exists for this block
      let ytext = blockContent.get(focusedBlockId);
      if (!ytext) {
        ytext = new Y.Text();
        blockContent.set(focusedBlockId, ytext);
      }

      const awareness = socketCollaborationService.getAwareness(notebookId);

      if (!awareness) return;

      // Bind Y.Text <-> current Monaco model FIRST
      const model = editor.getModel();
      if (!model) return;

      const latestFromY = ytext.toString();
      const modelValue = model.getValue();

      // Only replace if Yjs has real content
      if (latestFromY && modelValue.trim() === "") {
        console.log("🧠 Hydrating Monaco from Yjs state for", focusedBlockId);
        model.setValue(latestFromY);
      } else if (!latestFromY && modelValue.trim()) {
        console.log("⚠️ Yjs empty but model not — keeping Monaco content");
      } else if (
        latestFromY &&
        modelValue.trim() &&
        modelValue !== latestFromY
      ) {
        console.log("🔁 Reconciling Yjs <> Monaco difference");
        model.setValue(latestFromY);
      }
      // Dispose previous binding first
      bindingRef.current?.destroy();
      // bindingRef.current = null;

      // Generate consistent color for this user
      const palette = [
        "#ef4444",
        "#3b82f6",
        "#22c55e",
        "#eab308",
        "#a855f7",
        "#f97316",
      ];
      let hash = 0;
      for (let i = 0; i < userId.length; i++) {
        hash = (hash << 5) - hash + userId.charCodeAt(i);
      }
      const color = palette[Math.abs(hash) % palette.length];
      const colorIndex = Math.abs(hash) % palette.length;

      console.log(
        "🎯 Setting up awareness for",
        userEmail,
        "in block",
        focusedBlockId
      );
      console.log("   Current awareness clientID:", awareness.clientID);

      // CRITICAL: MonacoBinding requires ONLY { user: { name, color } } in awareness
      // Additional fields like userId/email/blockId can break it!
      // Set this BEFORE creating the binding so MonacoBinding can read it
      awareness.setLocalStateField("user", {
        name: userEmail.split("@")[0] || "User",
        color,
        colorIndex, // <-- NEW
      });

      console.log(
        "   Set initial awareness state (MonacoBinding format):",
        awareness.getLocalState()
      );

      // TEMPORARILY DISABLED: Test if cursors work without Proxy filtering
      // If cursors appear, we know the Proxy was the issue
      console.log(
        "⚠️  TESTING: Using UNFILTERED awareness to debug cursor rendering"
      );

      if (bindingRef.current) {
        bindingRef.current.destroy();
        bindingRef.current = null;
      }

      bindingRef.current = new MonacoBinding(
        ytext,
        model,
        new Set([editor]),
        awareness
      );

      // decorateRemoteCursors(editor, awareness);

      editor.onDidChangeCursorSelection(() => {
        const selection = editor.getSelection();
        if (selection) {
          const start = model.getOffsetAt(selection.getStartPosition());
          const end = model.getOffsetAt(selection.getEndPosition());
          awareness.setLocalStateField("cursor", { start, end });
        }
      });

      console.log(
        "   MonacoBinding created with filtered awareness for block:",
        focusedBlockId
      );

      // CRITICAL: MonacoBinding only updates selections when cursor moves
      // We need to manually trigger a selection change after binding is created
      // Give MonacoBinding a moment to set up its selection listeners
      setTimeout(() => {
        // First, add our custom metadata
        const currentState = awareness.getLocalState() || {};
        awareness.setLocalState({
          ...currentState,
          userId,
          email: userEmail,
          blockId: focusedBlockId,
        });

        console.log("   Added custom metadata to awareness state");

        // Force a cursor movement to trigger MonacoBinding's selection tracking
        // This is a workaround: MonacoBinding doesn't set initial selections without an event
        const currentPosition = editor.getPosition() || {
          lineNumber: 1,
          column: 1,
        };

        // Trigger selection change by programmatically selecting and deselecting
        editor.setSelection({
          startLineNumber: currentPosition.lineNumber,
          startColumn: currentPosition.column,
          endLineNumber: currentPosition.lineNumber,
          endColumn: currentPosition.column,
        });

        // Ensure focus to activate cursor
        editor.focus();

        // Force a tiny cursor move and back to trigger the listener
        setTimeout(() => {
          const pos = editor.getPosition() || { lineNumber: 1, column: 1 };
          editor.setPosition({
            lineNumber: pos.lineNumber,
            column: pos.column + 1,
          });
          setTimeout(() => {
            editor.setPosition(pos);
          }, 10);
        }, 50);

        // Check state after everything
        setTimeout(() => {
          console.log("   ✅ Final awareness state with selections:");
          const finalState = awareness.getLocalState();
          console.log("   My state:", finalState);
          console.log(
            "   All states:",
            Array.from(awareness.getStates().entries()).map(([id, state]) => {
              const s = state as Record<string, unknown>;
              return {
                clientId: id,
                hasSelections: !!s?.selections,
                user: s?.user,
              };
            })
          );
        }, 150);
      }, 100);

      // Let MonacoBinding manage selections/cursors in awareness to ensure proper relative positions.
      // We only seed identity and blockId above; MonacoBinding will update 'selections' field.

      // Debug: Listen to awareness changes to see what MonacoBinding is doing
      const debugAwarenessListener = () => {
        console.log("🔔 Awareness changed!");
        const allStates = awareness.getStates();
        console.log(`   Total states: ${allStates.size}`);
        allStates.forEach((state, clientId) => {
          const s = state as Record<string, unknown>;
          console.log(`   Client ${clientId}:`, {
            userId: s?.userId,
            blockId: s?.blockId,
            hasUser: !!s?.user,
            hasSelections: !!s?.selections,
            selectionsDetail: s?.selections,
          });
        });
      };
      awareness.on("change", debugAwarenessListener);
      awareness.on("change", () => {
        editor.layout();
      });

      // Listen to cursor/selection changes in the editor
      const cursorListener = editor.onDidChangeCursorPosition((e) => {
        console.log("🖱️ Cursor position changed:", e.position);
        // Check awareness state after cursor moves
        setTimeout(() => {
          const state = awareness.getLocalState();
          console.log("   Local awareness after cursor move:", state);
        }, 10);
      });

      // Seed store once (so previews render content from Yjs)
      onContentChange(focusedBlockId, ytext.toString());

      return () => {
        bindingRef.current?.destroy();
        bindingRef.current = null;
        awareness.off("change", debugAwarenessListener);
        cursorListener.dispose?.();
      };
    })();
  }, [focusedBlockId, notebookId, editor, onContentChange, userId, userEmail]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      currentContentListenerRef.current?.dispose();
      modelManagerRef.current?.dispose();
      resizeObserverRef.current?.disconnect();
      bindingRef.current?.destroy();
      inlineCompletionDisposableRef.current?.dispose();
    };
  }, []);

  // Keep models in sync if external block content changes
  useEffect(() => {
    if (!modelManagerRef.current) return;
    blocks.forEach((block) => {
      // Avoid clearing Monaco content with empty strings when Yjs is the source of truth
      // If we have a Yjs document for the current notebook and incoming content is empty,
      // skip forced updates here; the Yjs binding will manage the content.
      // This primarily protects the focused block from being cleared during notebook switches.
      const shouldSkipEmptyUpdate =
        !!notebookId &&
        (!block.content || block.content.length === 0) &&
        !!socketCollaborationService.getYjsDocument(notebookId);

      if (!shouldSkipEmptyUpdate) {
        modelManagerRef.current?.updateModelContent(block.id, block.content);
      }
    });
  }, [blocks, notebookId]);

  if (!focusedBlockId) return null;

  return (
    <div
      ref={editorContainerRef}
      className={`shared-monaco-editor ${className}`}
      style={{ height, width: "100%", maxWidth: "100%", overflow: "hidden" }}
    >
      <Editor
        height={height}
        width="100%"
        defaultLanguage="python"
        defaultValue=""
        beforeMount={handleBeforeMount}
        onMount={handleEditorDidMount}
        options={PERFORMANCE_OPTIONS}
        loading={
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-400" />
          </div>
        }
      />
    </div>
  );
}

export { MonacoModelManager };
