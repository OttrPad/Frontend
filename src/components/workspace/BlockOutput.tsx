import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Terminal,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button } from "../ui/button";

interface BlockOutputProps {
  output?: string;
  error?: string;
  isRunning?: boolean;
}

export function BlockOutput({ output, error, isRunning }: BlockOutputProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const hasContent = output || error || isRunning;

  if (!hasContent) {
    return null;
  }

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="border-t border-gray-700">
      {/* Output Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-750">
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleExpanded}
            className="h-6 w-6 p-0 text-gray-400 hover:text-white"
          >
            {isExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </Button>

          <div className="flex items-center space-x-2">
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                <span className="text-sm text-blue-400">Running...</span>
              </>
            ) : error ? (
              <>
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span className="text-sm text-red-400">Error</span>
              </>
            ) : (
              <>
                <Terminal className="w-4 h-4 text-green-400" />
                <span className="text-sm text-green-400">Output</span>
              </>
            )}
          </div>
        </div>

        {/* Optional: Add clear/copy buttons here */}
      </div>

      {/* Output Content */}
      {isExpanded && (
        <div className="px-4 py-3 max-h-64 overflow-y-auto">
          {isRunning && (
            <div className="flex items-center space-x-2 text-blue-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Executing code...</span>
            </div>
          )}

          {error && (
            <pre className="text-red-400 text-sm font-mono whitespace-pre-wrap bg-red-500/10 rounded p-3 border border-red-500/20">
              {error}
            </pre>
          )}

          {output && (
            <pre className="text-gray-300 text-sm font-mono whitespace-pre-wrap bg-gray-800/50 rounded p-3 border border-gray-600/30">
              {output}
            </pre>
          )}

          {!isRunning && !output && !error && (
            <div className="text-gray-500 text-sm italic">No output</div>
          )}
        </div>
      )}
    </div>
  );
}
