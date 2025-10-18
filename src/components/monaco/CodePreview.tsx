import { useEffect, useState, useRef } from "react";
import { type Monaco } from "@monaco-editor/react";
import type { Lang } from "../../types/workspace";
import { useAppStore } from "../../store/workspace";

interface CodePreviewProps {
  content: string;
  language: Lang;
  onClick: () => void;
  className?: string;
  minHeight?: number;
  monaco?: Monaco | null;
}

const getMonacoLanguage = (lang: Lang): string => {
  const languageMap: Record<Lang, string> = {
    python: "python",
    markdown: "markdown",
  };
  return languageMap[lang] || "plaintext";
};

export function CodePreview({
  content,
  language,
  onClick,
  className = "",
  minHeight = 120,
  monaco,
}: CodePreviewProps) {
  const { theme } = useAppStore();
  const [colorizedHtml, setColorizedHtml] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!monaco || !content.trim()) {
      setColorizedHtml("");
      setIsLoading(false);
      return;
    }

    const colorizeContent = async () => {
      try {
        setIsLoading(true);

        // Use Monaco's colorize API for syntax highlighting
        const html = await monaco.editor.colorize(
          content,
          getMonacoLanguage(language),
          {}
        );

        setColorizedHtml(html);
      } catch (error) {
        console.error("Error colorizing code:", error);
        // Fallback to plain text with basic escaping
        setColorizedHtml(escapeHtml(content));
      } finally {
        setIsLoading(false);
      }
    };

    colorizeContent();
  }, [content, language, monaco]);

  // Helper function to escape HTML
  const escapeHtml = (text: string): string => {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML.replace(/\n/g, "<br>");
  };

  if (isLoading) {
    return (
      <div
        className={`code-preview-loading ${className}`}
        style={{ minHeight }}
        onClick={onClick}
      >
        <div className="flex items-center justify-center h-full">
          <div className="animate-pulse text-muted-foreground text-sm">
            Loading...
          </div>
        </div>
      </div>
    );
  }

  if (!content.trim()) {
    return (
      <div
        className={`code-preview-empty ${className}`}
        style={{ minHeight }}
        onClick={onClick}
      >
        <div className="flex items-center justify-center h-full text-muted-foreground text-sm cursor-pointer hover:text-foreground transition-colors">
          Click to edit
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`code-preview ${className} cursor-pointer hover:bg-muted/60 transition-colors`}
      style={{ minHeight }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          onClick();
        }
      }}
    >
      <div
        className={`
          font-mono text-sm leading-relaxed p-4
          ${theme === "dark" ? "text-gray-200" : "text-gray-800"}
        `}
        dangerouslySetInnerHTML={{ __html: colorizedHtml }}
        style={{
          fontSize: "14px",
          lineHeight: "20px",
          fontFamily: "JetBrains Mono, Fira Code, Monaco, monospace",
        }}
      />

      {/* Overlay for click indication */}
      <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity bg-orange-400/5 pointer-events-none" />
    </div>
  );
}

// Virtualized code preview for off-screen optimization
interface VirtualizedCodePreviewProps extends CodePreviewProps {
  isVisible: boolean;
  index: number;
}

export function VirtualizedCodePreview({
  isVisible,
  index,
  ...props
}: VirtualizedCodePreviewProps) {
  // Only render content when visible
  if (!isVisible) {
    return (
      <div
        className={`virtualized-placeholder ${props.className}`}
        style={{ minHeight: props.minHeight || 120 }}
        data-block-index={index}
      >
        {/* Placeholder content for layout purposes */}
      </div>
    );
  }

  return <CodePreview {...props} />;
}
