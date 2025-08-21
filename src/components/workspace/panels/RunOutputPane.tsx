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
        return <Terminal className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Terminal className="w-5 h-5 text-orange-400" />
            <h3 className="font-semibold text-white">Run Output</h3>
            {isRunning && (
              <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
            )}
          </div>

          {outputs.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearOutputs}
              className="text-gray-400 hover:text-white"
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
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Terminal className="w-12 h-12 mb-4" />
            <p className="text-sm">No output yet</p>
            <p className="text-xs text-gray-600">
              Run a block to see output here
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {outputs.map((output) => (
              <div
                key={output.id}
                className="bg-gray-700/50 border border-gray-600/50 rounded-lg p-4 space-y-3"
              >
                {/* Output Header */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(output.status)}
                    <span className="text-gray-400">
                      {output.blockId
                        ? `Block ${output.blockId.slice(0, 8)}`
                        : "Terminal"}
                    </span>
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
                  <pre className="text-gray-300 text-sm font-mono whitespace-pre-wrap bg-black/20 rounded p-3 border border-gray-600/30 max-h-48 overflow-y-auto">
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
