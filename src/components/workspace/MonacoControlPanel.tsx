import { useState } from "react";
import { Button } from "../ui/button";
import { Settings, Zap, Eye, Code, Map } from "lucide-react";
import {
  MonacoFeatureManager,
  PERFORMANCE_CONFIG,
  RICH_CONFIG,
} from "../monaco/MonacoFeatureManager";
import type { editor } from "monaco-editor";

interface MonacoControlPanelProps {
  editor: editor.IStandaloneCodeEditor | null;
  className?: string;
}

export function MonacoControlPanel({
  editor,
  className = "",
}: MonacoControlPanelProps) {
  const [featureManager, setFeatureManager] =
    useState<MonacoFeatureManager | null>(null);
  const [isPerformanceMode, setIsPerformanceMode] = useState(true);
  const [showControls, setShowControls] = useState(false);

  // Initialize feature manager when editor is available
  useState(() => {
    if (editor && !featureManager) {
      const manager = new MonacoFeatureManager(editor, PERFORMANCE_CONFIG);
      setFeatureManager(manager);
    }
  });

  const toggleMode = () => {
    if (!featureManager) return;

    if (isPerformanceMode) {
      featureManager.useRichMode();
      setIsPerformanceMode(false);
    } else {
      featureManager.usePerformanceMode();
      setIsPerformanceMode(true);
    }
  };

  const toggleFeature = (feature: keyof typeof RICH_CONFIG) => {
    if (!featureManager) return;
    featureManager.toggleFeature(feature);
  };

  if (!editor || !featureManager) {
    return null;
  }

  return (
    <div className={`monaco-control-panel ${className}`}>
      {/* Main toggle button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowControls(!showControls)}
        className="text-muted-foreground hover:text-orange-400"
        title="Monaco Editor Settings"
      >
        <Settings className="w-4 h-4" />
      </Button>

      {/* Quick mode toggle */}
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleMode}
        className={`ml-2 ${
          isPerformanceMode
            ? "text-green-400 hover:text-green-300"
            : "text-orange-400 hover:text-orange-300"
        }`}
        title={
          isPerformanceMode
            ? "Switch to Rich Mode"
            : "Switch to Performance Mode"
        }
      >
        {isPerformanceMode ? (
          <Zap className="w-4 h-4" />
        ) : (
          <Eye className="w-4 h-4" />
        )}
      </Button>

      {/* Expanded controls */}
      {showControls && (
        <div className="absolute top-8 right-0 bg-popover/90 backdrop-blur-xl border border-border rounded-md shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] p-3 min-w-[200px] z-50">
          <div className="space-y-2">
            <div className="text-sm font-medium text-foreground">
              Editor Features
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleFeature("minimap")}
                className="justify-start text-xs"
                title="Toggle Minimap"
              >
                <Map className="w-3 h-3 mr-1" />
                Minimap
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleFeature("codeLens")}
                className="justify-start text-xs"
                title="Toggle Code Lens"
              >
                <Code className="w-3 h-3 mr-1" />
                CodeLens
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleFeature("folding")}
                className="justify-start text-xs"
                title="Toggle Code Folding"
              >
                <Eye className="w-3 h-3 mr-1" />
                Folding
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleFeature("bracketPairColorization")}
                className="justify-start text-xs"
                title="Toggle Bracket Colorization"
              >
                <div className="w-3 h-3 mr-1 rounded-full bg-gradient-to-r from-red-400 to-blue-400" />
                Brackets
              </Button>
            </div>

            <div className="border-t border-border pt-2 mt-2">
              <div className="text-xs text-muted-foreground">
                {isPerformanceMode ? "Performance Mode" : "Rich Mode"}
              </div>
              <div className="text-xs text-muted-foreground">
                Click features to toggle individually
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Usage example in a notebook toolbar
export function NotebookToolbar({
  editor,
}: {
  editor: editor.IStandaloneCodeEditor | null;
}) {
  return (
    <div className="flex items-center justify-between p-2 border-b border-border">
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium">Notebook</span>
      </div>

      <div className="flex items-center space-x-2 relative">
        <MonacoControlPanel editor={editor} />
      </div>
    </div>
  );
}
