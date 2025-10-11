import { useRunStore } from "../../../store/workspace";
import { Button } from "../../ui/button";
import {
  Terminal,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";

export function RunOutputPane() {
  const { outputs, isRunning, clearOutputs } = useRunStore();

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatDuration = (duration?: number) => {
    if (!duration) return "";
    return `${duration}ms`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "running":
        return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Terminal className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-4 ">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {isRunning && (
              <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
            )}
          </div>

          {outputs.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearOutputs}
              className="text-muted-foreground hover:text-foreground"
              title="Clear All"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {outputs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Terminal className="w-12 h-12 mb-4" />
            <p className="text-sm">No output yet</p>
            <p className="text-xs text-muted-foreground/70">
              Run a block to see output here
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {outputs.map((output) => (
              <div
                key={output.id}
                className="bg-card/50 border border-border rounded-lg p-4 space-y-3"
              >
                {/* Output Header */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(output.status)}
                    {output.blockId ? (
                      <span className="text-gray-400" title={output.blockId}>
                        Block
                      </span>
                    ) : (
                      <span className="text-gray-400">Terminal</span>
                    )}
                    <span className="text-gray-500">•</span>
                    <span className="text-gray-500 flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{formatTimestamp(output.timestamp)}</span>
                    </span>
                    {output.duration && (
                      <>
                        <span className="text-gray-500">•</span>
                        <span className="text-gray-500">
                          {formatDuration(output.duration)}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Command */}
                <div className="text-xs">
                  <span className="text-gray-500">$ </span>
                  <span className="text-gray-300 font-mono">
                    {output.command}
                  </span>
                </div>

                {/* Output */}
                {output.output && (
                  <pre className="text-foreground/90 text-sm font-mono whitespace-pre-wrap bg-muted/20 rounded p-3 border border-border/30 max-h-48 overflow-y-auto">
                    {output.output}
                  </pre>
                )}

                {/* Error */}
                {output.error && (
                  <pre className="text-red-400 text-sm font-mono whitespace-pre-wrap bg-red-500/10 rounded p-3 border border-red-500/20 max-h-48 overflow-y-auto">
                    {output.error}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
