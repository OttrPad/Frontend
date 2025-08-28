import { useRef, useEffect, useCallback, useState } from "react";
import { Editor, type Monaco } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import type { Block, Lang } from "../../types/workspace";
import { useAppStore } from "../../store/workspace";

interface ModelInfo {
  model: editor.ITextModel;
  language: Lang;
  lastAccessed: number;
}

const getMonacoLanguage = (lang: Lang): string => {
  const languageMap: Record<Lang, string> = {
    python: "python",
    json: "json",
    markdown: "markdown",
  };
  return languageMap[lang] || "plaintext";
};

const PERFORMANCE_OPTIONS: editor.IStandaloneEditorConstructionOptions = {
  // Disable expensive features by default
  minimap: { enabled: false },
  codeLens: false,
  occurrencesHighlight: "off",
  renderWhitespace: "none",
  renderLineHighlight: "none",
  wordWrap: "on", // Enable word wrap to prevent horizontal scrolling
  bracketPairColorization: { enabled: false },
  matchBrackets: "near",
  automaticLayout: true, // Enable automatic layout for dynamic height

  // Keep essential features
  scrollBeyondLastLine: false,
  fontSize: 14,
  lineHeight: 20,
  fontFamily: "JetBrains Mono, Fira Code, Monaco, monospace",
  lineNumbers: "on",
  folding: false, // Disable for performance
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
    vertical: "auto", // Allow vertical scrollbar if needed
    horizontal: "hidden", // Hide horizontal scrollbar with word wrap
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

  // Constants for memory management
  private static readonly MAX_CACHED_MODELS = 50;
  private static readonly CLEANUP_INTERVAL = 30000; // 30 seconds

  private cleanupTimer: NodeJS.Timeout | null = null;

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
    if (this.models.size <= MonacoModelManager.MAX_CACHED_MODELS) {
      return;
    }

    // Sort by last accessed time and remove old models
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
      // Update last accessed time
      existingModel.lastAccessed = Date.now();

      // Update language if changed
      if (existingModel.language !== language && this.monaco) {
        this.monaco.editor.setModelLanguage(
          existingModel.model,
          getMonacoLanguage(language)
        );
        existingModel.language = language;
      }

      // Update content if different
      if (existingModel.model.getValue() !== content) {
        existingModel.model.setValue(content);
      }

      return existingModel.model;
    }

    // Create new model
    if (!this.monaco) {
      throw new Error("Monaco not initialized");
    }

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
      case "json":
        return "json";
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
    // Dispose all models
    this.models.forEach((modelInfo) => {
      modelInfo.model.dispose();
    });
    this.models.clear();

    // Dispose all disposables
    this.disposables.forEach((disposable) => disposable.dispose());
    this.disposables = [];

    // Clear cleanup timer
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
  blocks: Block[];
  onContentChange: (blockId: string, content: string) => void;
  onMonacoInit?: (monaco: Monaco) => void;
  height?: number;
  className?: string;
}

export function SharedMonacoEditor({
  focusedBlockId,
  blocks,
  onContentChange,
  onMonacoInit,
  height = 120,
  className = "",
}: SharedMonacoEditorProps) {
  const { theme } = useAppStore();
  const [monaco, setMonaco] = useState<Monaco | null>(null);
  const [editor, setEditor] = useState<editor.IStandaloneCodeEditor | null>(
    null
  );
  const modelManagerRef = useRef<MonacoModelManager | null>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const currentContentListenerRef = useRef<{ dispose(): void } | null>(null);

  // Initialize Monaco and themes
  const handleEditorDidMount = useCallback(
    (editorInstance: editor.IStandaloneCodeEditor, monacoInstance: Monaco) => {
      setMonaco(monacoInstance);
      setEditor(editorInstance);

      // Notify parent about Monaco initialization
      onMonacoInit?.(monacoInstance);

      // Initialize model manager
      modelManagerRef.current = new MonacoModelManager(monacoInstance);

      // Configure themes (same as original MonacoEditor)
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

      // Set initial theme
      const selectedTheme = theme === "dark" ? "ottrpad-dark" : "ottrpad-light";
      monacoInstance.editor.setTheme(selectedTheme);

      // Setup ResizeObserver for manual layout
      if (editorContainerRef.current) {
        resizeObserverRef.current = new ResizeObserver(() => {
          editorInstance.layout();
        });
        resizeObserverRef.current.observe(editorContainerRef.current);
      }

      // Add Python completions if needed
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

  // Update theme when it changes
  useEffect(() => {
    if (monaco && editor) {
      const selectedTheme = theme === "dark" ? "ottrpad-dark" : "ottrpad-light";
      monaco.editor.setTheme(selectedTheme);
      editor.layout();
    }
  }, [theme, monaco, editor]);

  // Handle focused block changes
  useEffect(() => {
    if (!focusedBlockId || !editor || !modelManagerRef.current || !monaco) {
      return;
    }

    const block = blocks.find((b) => b.id === focusedBlockId);
    if (!block) return;

    try {
      // Dispose previous content listener
      if (currentContentListenerRef.current) {
        currentContentListenerRef.current.dispose();
        currentContentListenerRef.current = null;
      }

      // Get or create model for the focused block
      const model = modelManagerRef.current.getOrCreateModel(
        block.id,
        block.content,
        block.lang
      );

      // Set the model on the editor
      editor.setModel(model);

      // Reset scroll position to top
      editor.setScrollTop(0);
      editor.revealLine(1);

      // Setup content change listener
      currentContentListenerRef.current = model.onDidChangeContent(() => {
        const content = model.getValue();
        onContentChange(focusedBlockId, content);
      });

      // Focus the editor
      editor.focus();
    } catch (error) {
      console.error("Error switching editor model:", error);
    }
  }, [focusedBlockId, blocks, editor, monaco, onContentChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (currentContentListenerRef.current) {
        currentContentListenerRef.current.dispose();
      }
      if (modelManagerRef.current) {
        modelManagerRef.current.dispose();
      }
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, []);

  // Update model content when block content changes externally
  useEffect(() => {
    if (!modelManagerRef.current) return;

    blocks.forEach((block) => {
      modelManagerRef.current?.updateModelContent(block.id, block.content);
    });
  }, [blocks]);

  if (!focusedBlockId) {
    return null;
  }

  return (
    <div
      ref={editorContainerRef}
      className={`shared-monaco-editor ${className}`}
      style={{ height }}
    >
      <Editor
        height={height}
        language="python" // This will be managed by the model
        value="" // Content is managed by the model
        onMount={handleEditorDidMount}
        options={PERFORMANCE_OPTIONS}
        theme={theme === "dark" ? "ottrpad-dark" : "ottrpad-light"}
        loading={
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-400"></div>
          </div>
        }
      />
    </div>
  );
}

// Export the model manager for external access if needed
export { MonacoModelManager };
