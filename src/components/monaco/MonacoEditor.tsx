import { useEffect, useRef, useState } from "react";
import { Editor, type Monaco } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import type { Lang } from "../../types/workspace";
import { useAppStore } from "../../store/workspace";

interface MonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: Lang;
  height?: string | number;
  options?: editor.IStandaloneEditorConstructionOptions;
  onMount?: (editor: editor.IStandaloneCodeEditor) => void;
  readOnly?: boolean;
  className?: string;
}

const getMonacoLanguage = (lang: Lang): string => {
  const languageMap: Record<Lang, string> = {
    python: "python",
    json: "json",
    markdown: "markdown",
  };
  return languageMap[lang] || "plaintext";
};

export function MonacoEditor({
  value,
  onChange,
  language,
  height = "200px",
  options = {},
  onMount,
  readOnly = false,
  className = "",
}: MonacoEditorProps) {
  const { theme } = useAppStore();
  const [isReady, setIsReady] = useState(false);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);

  const defaultOptions: editor.IStandaloneEditorConstructionOptions = {
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "JetBrains Mono, Fira Code, Monaco, monospace",
    automaticLayout: true,
    wordWrap: "on",
    lineNumbers: "on",
    folding: true,
    readOnly,
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
      horizontal: "auto",
      verticalScrollbarSize: 8,
      horizontalScrollbarSize: 8,
    },
    padding: { top: 16, bottom: 16 },
    ...options,
  };

  const handleEditorDidMount = (
    editor: editor.IStandaloneCodeEditor,
    monaco: Monaco
  ) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Configure themes
    monaco.editor.defineTheme("ottrpad-dark", {
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

    monaco.editor.defineTheme("ottrpad-light", {
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

    // Set theme immediately
    const selectedTheme = theme === "dark" ? "ottrpad-dark" : "ottrpad-light";
    monaco.editor.setTheme(selectedTheme);

    // Force editor to refresh and focus
    setTimeout(() => {
      editor.layout();
      editor.focus();
    }, 100);

    // Configure language features
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    });

    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    });

    // Add custom completions for Python
    if (language === "python") {
      monaco.languages.registerCompletionItemProvider("python", {
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
                kind: monaco.languages.CompletionItemKind.Function,
                insertText: "print(${1})",
                insertTextRules:
                  monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: "Print function",
                range,
              },
              {
                label: "def",
                kind: monaco.languages.CompletionItemKind.Keyword,
                insertText: "def ${1:function_name}(${2}):\n    ${3:pass}",
                insertTextRules:
                  monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: "Function definition",
                range,
              },
              {
                label: "class",
                kind: monaco.languages.CompletionItemKind.Class,
                insertText:
                  "class ${1:ClassName}:\n    def __init__(self${2}):\n        ${3:pass}",
                insertTextRules:
                  monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: "Class definition",
                range,
              },
              {
                label: "if",
                kind: monaco.languages.CompletionItemKind.Keyword,
                insertText: "if ${1:condition}:\n    ${2:pass}",
                insertTextRules:
                  monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: "If statement",
                range,
              },
              {
                label: "for",
                kind: monaco.languages.CompletionItemKind.Keyword,
                insertText: "for ${1:item} in ${2:iterable}:\n    ${3:pass}",
                insertTextRules:
                  monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: "For loop",
                range,
              },
            ],
          };
        },
      });
    }

    setIsReady(true);
    onMount?.(editor);
  };

  // Update theme when it changes
  useEffect(() => {
    if (monacoRef.current && editorRef.current && isReady) {
      const selectedTheme = theme === "dark" ? "ottrpad-dark" : "ottrpad-light";
      monacoRef.current.editor.setTheme(selectedTheme);
      // Force editor layout refresh
      setTimeout(() => {
        editorRef.current?.layout();
      }, 50);
    }
  }, [theme, isReady]);

  return (
    <div
      className={`monaco-editor-container ${className}`}
      style={{ minHeight: typeof height === "number" ? `${height}px` : height }}
    >
      <Editor
        height={height}
        language={getMonacoLanguage(language)}
        value={value}
        onChange={(value) => onChange(value || "")}
        onMount={handleEditorDidMount}
        options={defaultOptions}
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
