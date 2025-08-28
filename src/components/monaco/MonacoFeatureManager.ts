import { useState, useEffect } from "react";
import type { editor } from "monaco-editor";

export interface MonacoFeatureConfig {
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

export const PERFORMANCE_CONFIG: MonacoFeatureConfig = {
  minimap: false,
  codeLens: false,
  occurrencesHighlight: false,
  renderWhitespace: false,
  renderLineHighlight: false,
  wordWrap: false,
  bracketPairColorization: false,
  folding: false,
  autoComplete: true, // Keep this for basic functionality
  parameterHints: true,
  formatOnPaste: true,
  formatOnType: true,
};

export const RICH_CONFIG: MonacoFeatureConfig = {
  minimap: true,
  codeLens: true,
  occurrencesHighlight: true,
  renderWhitespace: true,
  renderLineHighlight: true,
  wordWrap: true,
  bracketPairColorization: true,
  folding: true,
  autoComplete: true,
  parameterHints: true,
  formatOnPaste: true,
  formatOnType: true,
};

export function createEditorOptions(
  config: MonacoFeatureConfig,
  baseOptions?: Partial<editor.IStandaloneEditorConstructionOptions>
): editor.IStandaloneEditorConstructionOptions {
  return {
    // Base options
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "JetBrains Mono, Fira Code, Monaco, monospace",
    lineNumbers: "on",
    scrollBeyondLastLine: false,
    automaticLayout: false, // We handle this manually for performance
    selectOnLineNumbers: true,
    roundedSelection: false,
    cursorStyle: "line",
    contextmenu: true,
    mouseWheelZoom: false,
    scrollbar: {
      vertical: "auto",
      horizontal: "auto",
      verticalScrollbarSize: 8,
      horizontalScrollbarSize: 8,
    },
    padding: { top: 16, bottom: 16 },

    // Configurable features
    minimap: { enabled: config.minimap || false },
    codeLens: config.codeLens || false,
    occurrencesHighlight: config.occurrencesHighlight ? "singleFile" : "off",
    renderWhitespace: config.renderWhitespace ? "all" : "none",
    renderLineHighlight: config.renderLineHighlight ? "all" : "none",
    wordWrap: config.wordWrap ? "on" : "off",
    bracketPairColorization: {
      enabled: config.bracketPairColorization || false,
    },
    folding: config.folding || false,
    quickSuggestions: config.autoComplete || false,
    acceptSuggestionOnEnter: config.autoComplete ? "on" : "off",
    tabCompletion: config.autoComplete ? "on" : "off",
    wordBasedSuggestions: config.autoComplete ? "matchingDocuments" : "off",
    parameterHints: { enabled: config.parameterHints || false },
    autoIndent: "advanced",
    formatOnPaste: config.formatOnPaste || false,
    formatOnType: config.formatOnType || false,

    // Override with any custom options
    ...baseOptions,
  };
}

export function updateEditorConfig(
  editor: editor.IStandaloneCodeEditor,
  config: MonacoFeatureConfig
): void {
  const options = createEditorOptions(config);
  editor.updateOptions(options);
}

export class MonacoFeatureManager {
  private editor: editor.IStandaloneCodeEditor;
  private currentConfig: MonacoFeatureConfig;

  constructor(
    editor: editor.IStandaloneCodeEditor,
    initialConfig: MonacoFeatureConfig = PERFORMANCE_CONFIG
  ) {
    this.editor = editor;
    this.currentConfig = { ...initialConfig };
  }

  enableFeature(feature: keyof MonacoFeatureConfig): void {
    this.currentConfig[feature] = true;
    this.applyConfig();
  }

  disableFeature(feature: keyof MonacoFeatureConfig): void {
    this.currentConfig[feature] = false;
    this.applyConfig();
  }

  toggleFeature(feature: keyof MonacoFeatureConfig): void {
    this.currentConfig[feature] = !this.currentConfig[feature];
    this.applyConfig();
  }

  setConfig(config: Partial<MonacoFeatureConfig>): void {
    this.currentConfig = { ...this.currentConfig, ...config };
    this.applyConfig();
  }

  usePerformanceMode(): void {
    this.currentConfig = { ...PERFORMANCE_CONFIG };
    this.applyConfig();
  }

  useRichMode(): void {
    this.currentConfig = { ...RICH_CONFIG };
    this.applyConfig();
  }

  getConfig(): MonacoFeatureConfig {
    return { ...this.currentConfig };
  }

  private applyConfig(): void {
    updateEditorConfig(this.editor, this.currentConfig);
  }
}

// Hook for managing Monaco features in React components
export function useMonacoFeatures(editor: editor.IStandaloneCodeEditor | null) {
  const [featureManager, setFeatureManager] =
    useState<MonacoFeatureManager | null>(null);

  useEffect(() => {
    if (editor) {
      const manager = new MonacoFeatureManager(editor);
      setFeatureManager(manager);
      return () => {
        setFeatureManager(null);
      };
    }
  }, [editor]);

  return featureManager;
}

// Utility for measuring performance impact
export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  private observers: PerformanceObserver[] = [];

  startMonitoring(): void {
    // Monitor long tasks
    if ("PerformanceObserver" in window) {
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric("longTask", entry.duration);
        }
      });

      try {
        longTaskObserver.observe({ entryTypes: ["longtask"] });
        this.observers.push(longTaskObserver);
      } catch {
        console.warn("Long task monitoring not supported");
      }
    }
  }

  recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    const values = this.metrics.get(name)!;
    values.push(value);

    // Keep only last 100 measurements
    if (values.length > 100) {
      values.shift();
    }
  }

  getMetrics(name: string): { avg: number; p95: number; p99: number } | null {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) return null;

    const sorted = [...values].sort((a, b) => a - b);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];

    return { avg, p95, p99 };
  }

  stopMonitoring(): void {
    this.observers.forEach((observer) => observer.disconnect());
    this.observers = [];
    this.metrics.clear();
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Development helper to log performance metrics
if (process.env.NODE_ENV === "development") {
  let logInterval: NodeJS.Timeout;

  const startPerformanceLogging = () => {
    performanceMonitor.startMonitoring();

    logInterval = setInterval(() => {
      const longTasks = performanceMonitor.getMetrics("longTask");
      if (longTasks) {
        console.log("Monaco Performance Metrics:", {
          longTasks: `avg: ${longTasks.avg.toFixed(
            2
          )}ms, p95: ${longTasks.p95.toFixed(2)}ms`,
        });
      }
    }, 10000); // Log every 10 seconds
  };

  const stopPerformanceLogging = () => {
    performanceMonitor.stopMonitoring();
    if (logInterval) {
      clearInterval(logInterval);
    }
  };

  // Auto-start in development
  if (typeof window !== "undefined") {
    window.addEventListener("load", startPerformanceLogging);
    window.addEventListener("beforeunload", stopPerformanceLogging);
  }
}
