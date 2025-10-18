import { useEffect, useRef } from "react";
import { DiffEditor, type Monaco } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import type { Lang } from "../../types/workspace";
import { useAppStore } from "../../store/workspace";

interface MonacoDiffProps {
  original: string;
  modified: string;
  language: Lang;
  height?: string | number;
  options?: editor.IStandaloneDiffEditorConstructionOptions;
  onMount?: (diffEditor: editor.IStandaloneDiffEditor) => void;
  className?: string;
}

const getMonacoLanguage = (lang: Lang): string => {
  const languageMap: Record<Lang, string> = {
    python: "python",
    markdown: "markdown",
  };
  return languageMap[lang] || "plaintext";
};

export function MonacoDiff({
  original,
  modified,
  language,
  height = "400px",
  options = {},
  onMount,
  className = "",
}: MonacoDiffProps) {
  const { theme } = useAppStore();
  const diffEditorRef = useRef<editor.IStandaloneDiffEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);

  const defaultOptions: editor.IStandaloneDiffEditorConstructionOptions = {
    readOnly: true,
    renderSideBySide: true,
    renderOverviewRuler: true,
    enableSplitViewResizing: true,
    originalEditable: false,
    automaticLayout: true,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "JetBrains Mono, Fira Code, Monaco, monospace",
    wordWrap: "on",
    scrollBeyondLastLine: false,
    folding: true,
    minimap: { enabled: false },
    scrollbar: {
      vertical: "auto",
      horizontal: "auto",
      verticalScrollbarSize: 8,
      horizontalScrollbarSize: 8,
    },
    ...options,
  };

  const handleDiffEditorDidMount = (
    diffEditor: editor.IStandaloneDiffEditor,
    monaco: Monaco
  ) => {
    diffEditorRef.current = diffEditor;
    monacoRef.current = monaco;

    // Configure themes (reuse from MonacoEditor)
    monaco.editor.defineTheme("ottrpad-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "#6A9955", fontStyle: "italic" },
        { token: "keyword", foreground: "#569CD6" },
        { token: "string", foreground: "#CE9178" },
        { token: "number", foreground: "#B5CEA8" },
        { token: "function", foreground: "#DCDCAA" },
        { token: "variable", foreground: "#9CDCFE" },
      ],
      colors: {
        "editor.background": "#0F0F14",
        "editor.foreground": "#D4D4D4",
        "editor.lineHighlightBackground": "#1A1A1F",
        "editor.selectionBackground": "#264F78",
        "editor.inactiveSelectionBackground": "#3A3D41",
        "editorCursor.foreground": "#FF8C00",
        "editorLineNumber.foreground": "#858585",
        "editorLineNumber.activeForeground": "#FF8C00",
        "diffEditor.insertedTextBackground": "#9BB95533",
        "diffEditor.removedTextBackground": "#FF000033",
        "diffEditor.border": "#444444",
      },
    });

    monaco.editor.defineTheme("ottrpad-light", {
      base: "vs",
      inherit: true,
      rules: [
        { token: "comment", foreground: "#008000", fontStyle: "italic" },
        { token: "keyword", foreground: "#0000FF" },
        { token: "string", foreground: "#A31515" },
        { token: "number", foreground: "#098658" },
        { token: "function", foreground: "#795E26" },
        { token: "variable", foreground: "#001080" },
      ],
      colors: {
        "editor.background": "#FFFFFF",
        "editor.foreground": "#000000",
        "editor.lineHighlightBackground": "#F7F7F7",
        "editor.selectionBackground": "#ADD6FF",
        "editor.inactiveSelectionBackground": "#E5EBF1",
        "editorCursor.foreground": "#FF8C00",
        "editorLineNumber.foreground": "#237893",
        "editorLineNumber.activeForeground": "#FF8C00",
        "diffEditor.insertedTextBackground": "#9BB95533",
        "diffEditor.removedTextBackground": "#FF000033",
        "diffEditor.border": "#CCCCCC",
      },
    });

    // Set theme
    monaco.editor.setTheme(theme === "dark" ? "ottrpad-dark" : "ottrpad-light");

    onMount?.(diffEditor);
  };

  // Update theme when it changes
  useEffect(() => {
    if (monacoRef.current) {
      monacoRef.current.editor.setTheme(
        theme === "dark" ? "ottrpad-dark" : "ottrpad-light"
      );
    }
  }, [theme]);

  return (
    <div className={`monaco-diff-container ${className}`}>
      <DiffEditor
        height={height}
        language={getMonacoLanguage(language)}
        original={original}
        modified={modified}
        onMount={handleDiffEditorDidMount}
        options={defaultOptions}
        loading={
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-400"></div>
          </div>
        }
      />
    </div>
  );
}
