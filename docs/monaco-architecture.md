# Optimized Monaco Editor Architecture

This document describes the new scalable Monaco Editor architecture that replaces the previous per-cell editor approach with a single shared editor and multiple models.

## Overview

The new architecture addresses performance issues with the original implementation where each cell spawned its own Monaco editor instance. This was expensive in terms of DOM nodes, memory usage, and CPU overhead.

### Key Components

1. **SharedMonacoEditor** - Single Monaco editor instance
2. **MonacoModelManager** - Manages text models for each cell
3. **CodePreview** - Lightweight previews for non-focused cells
4. **OptimizedBlock** - Updated block component using the new architecture
5. **OptimizedNotebookArea** - Container managing the shared editor positioning
6. **MonacoFeatureManager** - Configuration utility for performance tuning

## Architecture Benefits

### Performance Improvements

- **Single Editor Instance**: Only one Monaco editor DOM structure instead of N editors
- **Shared Workers**: Monaco language workers are shared across all cells
- **Memory Efficiency**: Linear memory growth with models, not editor instances
- **Reduced Layout Thrash**: Single editor means less DOM manipulation
- **Faster Rendering**: Lightweight previews for non-focused cells

### Maintained Functionality

- **Identical UX**: Click any cell to edit, smooth scrolling preserved
- **Full Monaco Features**: All language features available on the focused cell
- **Keyboard Navigation**: Alt+Arrow keys to navigate between cells
- **Syntax Highlighting**: Previews show colorized code using Monaco's colorize API

## Component Details

### SharedMonacoEditor

```tsx
<SharedMonacoEditor
  focusedBlockId={focusedBlockId}
  blocks={blocks}
  onContentChange={handleContentChange}
  height={120}
/>
```

- Manages a single Monaco editor instance
- Switches models when focus changes
- Handles content change events
- Positioned absolutely over the focused cell

### MonacoModelManager

The core class that manages Monaco text models:

```typescript
class MonacoModelManager {
  // Create or retrieve existing model for a block
  getOrCreateModel(
    blockId: string,
    content: string,
    language: Lang
  ): editor.ITextModel;

  // Update model content
  updateModelContent(blockId: string, content: string): void;

  // Clean up old models (automatic memory management)
  private cleanupOldModels(): void;

  // Dispose model when block is deleted
  disposeModel(blockId: string): void;
}
```

**Memory Management Features:**

- Automatic cleanup of unused models (max 50 cached)
- LRU-based eviction strategy
- Timer-based cleanup every 30 seconds
- Proper disposal on component unmount

### CodePreview

Lightweight component for non-focused cells:

```tsx
<CodePreview
  content={block.content}
  language={block.lang}
  onClick={handleFocus}
  monaco={monaco}
/>
```

- Uses Monaco's `colorize()` API for syntax highlighting
- No interactive features (read-only)
- Click to focus and switch to full editor
- Minimal DOM footprint

### Virtualization

Optional virtualization support for large notebooks:

```typescript
const { observeElement, isVisible } = useIntersectionVirtualization(0.1);

// Only render previews for visible cells
{
  isVisible(block.id) ? <CodePreview {...props} /> : <PlaceholderDiv />;
}
```

## Performance Configuration

### Default Performance Mode

```typescript
const PERFORMANCE_OPTIONS = {
  minimap: { enabled: false },
  codeLens: false,
  occurrencesHighlight: "off",
  renderWhitespace: "none",
  renderLineHighlight: "none",
  wordWrap: "off",
  bracketPairColorization: { enabled: false },
  folding: false,
  automaticLayout: false, // Manual layout for performance
};
```

### Feature Toggle System

```typescript
// Enable rich features on demand
const featureManager = new MonacoFeatureManager(editor);

// Toggle specific features
featureManager.enableFeature("minimap");
featureManager.enableFeature("bracketPairColorization");

// Or switch to rich mode entirely
featureManager.useRichMode();
```

## Implementation Guide

### 1. Replace NotebookArea

Replace the existing `NotebookArea` component with `OptimizedNotebookArea`:

```tsx
// Before
<NotebookArea />

// After
<OptimizedNotebookArea />
```

### 2. Update Block Components

Use `OptimizedBlock` instead of the original `Block`:

```tsx
<OptimizedBlock
  block={block}
  isDragging={isDragging}
  onAddBlockBelow={onAddBlockBelow}
  onFocus={handleBlockFocus}
  isEditor={focusedBlockId === block.id}
  monaco={monaco}
/>
```

### 3. Configure Performance

Add performance monitoring in development:

```typescript
import { performanceMonitor } from "./MonacoFeatureManager";

// Automatically starts in development mode
// Check console for performance metrics every 10 seconds
```

## Migration Path

### Phase 1: Gradual Migration

1. Keep existing `MonacoEditor` for backwards compatibility
2. Add `OptimizedNotebookArea` as an alternative
3. Feature flag to switch between implementations

### Phase 2: Full Migration

1. Replace all uses of individual `MonacoEditor` components
2. Update state management for focused cell tracking
3. Add keyboard shortcuts for cell navigation

### Phase 3: Advanced Features

1. Add virtualization for very large notebooks (1000+ cells)
2. Implement model persistence for memory optimization
3. Add advanced Monaco features toggle UI

## Performance Benchmarks

Expected improvements for a 100-cell notebook:

| Metric         | Before   | After | Improvement   |
| -------------- | -------- | ----- | ------------- |
| Initial Load   | 5-8s     | <2s   | 60-75% faster |
| Memory Usage   | ~500MB   | ~50MB | 90% reduction |
| DOM Nodes      | 50,000+  | 5,000 | 90% reduction |
| Worker Count   | 100+     | 3-5   | 95% reduction |
| Typing Latency | 30-100ms | <10ms | 70-90% faster |

## API Reference

### SharedMonacoEditor Props

```typescript
interface SharedMonacoEditorProps {
  focusedBlockId: string | null;
  blocks: Block[];
  onContentChange: (blockId: string, content: string) => void;
  height?: number;
  className?: string;
}
```

### MonacoFeatureConfig

```typescript
interface MonacoFeatureConfig {
  minimap?: boolean;
  codeLens?: boolean;
  occurrencesHighlight?: boolean;
  renderWhitespace?: boolean;
  renderLineHighlight?: boolean;
  wordWrap?: boolean;
  bracketPairColorization?: boolean;
  folding?: boolean;
  autoComplete?: boolean;
  parameterHints?: boolean;
  formatOnPaste?: boolean;
  formatOnType?: boolean;
}
```

## Keyboard Shortcuts

- `Alt + ↑/↓` - Navigate between cells
- `Shift + Enter` - Run current cell
- `Cmd/Ctrl + Enter` - Add new cell below
- `Click` - Focus cell for editing

## Troubleshooting

### Common Issues

1. **Editor not positioning correctly**

   - Ensure container has proper positioning context
   - Check scroll listener setup

2. **Model switching delays**

   - Models are created lazily on first focus
   - Consider pre-creating models for visible cells

3. **Memory leaks**

   - Models are automatically cleaned up
   - Ensure proper component unmounting

4. **Performance degradation**
   - Check if too many rich features are enabled
   - Use performance monitor to identify bottlenecks

### Development Tools

Enable debug mode:

```typescript
// Add to development environment
window.monacoDebug = true;

// Logs model operations and performance metrics
```

## Future Enhancements

1. **Multi-editor Support**: Keep 2-3 editors for instant switching
2. **Worker Optimization**: Custom worker pooling
3. **Advanced Virtualization**: Viewport-based rendering
4. **Model Streaming**: Lazy loading for very large files
5. **Collaborative Editing**: Shared model with OT/CRDT support

This architecture provides the foundation for a scalable, performant notebook interface while maintaining the familiar user experience.
