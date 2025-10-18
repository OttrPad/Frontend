import { useEffect, useRef } from "react";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({
  content,
  className = "",
}: MarkdownRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !content) return;

    // Simple markdown parser with common patterns
    let html = content;

    // Headers
    html = html.replace(
      /^### (.*$)/gim,
      '<h3 class="text-lg font-bold mt-4 mb-2">$1</h3>'
    );
    html = html.replace(
      /^## (.*$)/gim,
      '<h2 class="text-xl font-bold mt-4 mb-2">$1</h2>'
    );
    html = html.replace(
      /^# (.*$)/gim,
      '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>'
    );

    // Bold
    html = html.replace(
      /\*\*(.*?)\*\*/gim,
      '<strong class="font-bold">$1</strong>'
    );
    html = html.replace(
      /__(.*?)__/gim,
      '<strong class="font-bold">$1</strong>'
    );

    // Italic
    html = html.replace(/\*(.*?)\*/gim, '<em class="italic">$1</em>');
    html = html.replace(/_(.*?)_/gim, '<em class="italic">$1</em>');

    // Code blocks (multiline)
    html = html.replace(
      /```([\s\S]*?)```/gim,
      '<pre class="bg-muted/60 p-3 rounded-md overflow-x-auto my-2"><code class="text-sm font-mono">$1</code></pre>'
    );

    // Inline code
    html = html.replace(
      /`([^`]+)`/gim,
      '<code class="bg-muted/60 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>'
    );

    // Links
    html = html.replace(
      /\[([^\]]+)\]\(([^)]+)\)/gim,
      '<a href="$2" class="text-orange-400 hover:text-orange-300 underline" target="_blank" rel="noopener noreferrer">$1</a>'
    );

    // Images
    html = html.replace(
      /!\[([^\]]*)\]\(([^)]+)\)/gim,
      '<img src="$2" alt="$1" class="max-w-full h-auto rounded-md my-2" />'
    );

    // Unordered lists
    html = html.replace(/^\* (.*$)/gim, '<li class="ml-4">$1</li>');
    html = html.replace(/^- (.*$)/gim, '<li class="ml-4">$1</li>');
    html = html.replace(
      /(<li class="ml-4">.*<\/li>)/s,
      '<ul class="list-disc list-inside my-2">$1</ul>'
    );

    // Ordered lists
    html = html.replace(/^\d+\. (.*$)/gim, '<li class="ml-4">$1</li>');

    // Blockquotes
    html = html.replace(
      /^> (.*$)/gim,
      '<blockquote class="border-l-4 border-orange-400 pl-4 italic my-2">$1</blockquote>'
    );

    // Horizontal rule
    html = html.replace(
      /^---$/gim,
      '<hr class="border-t border-border my-4" />'
    );
    html = html.replace(
      /^\*\*\*$/gim,
      '<hr class="border-t border-border my-4" />'
    );

    // Line breaks
    html = html.replace(/\n/gim, "<br />");

    containerRef.current.innerHTML = html;
  }, [content]);

  if (!content || !content.trim()) {
    return (
      <div
        className={`markdown-renderer text-muted-foreground text-sm ${className}`}
      >
        <em>No markdown content to display</em>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`markdown-renderer prose prose-invert max-w-none text-foreground ${className}`}
      style={{
        lineHeight: "1.6",
        wordWrap: "break-word",
      }}
    />
  );
}
