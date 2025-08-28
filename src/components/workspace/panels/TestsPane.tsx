import { useState } from "react";
import { useTestsStore } from "../../../store/workspace";
import { Button } from "../../ui/button";
import {
  TestTube,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
} from "lucide-react";

export function TestsPane() {
  const { testFiles, isRunningTests, runTests, runSingleTest } =
    useTestsStore();
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "passed":
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-400" />;
      case "running":
        return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return "";
    return new Date(timestamp).toLocaleTimeString();
  };

  const getPassedCount = () => {
    return testFiles.filter((test) => test.status === "passed").length;
  };

  const getFailedCount = () => {
    return testFiles.filter((test) => test.status === "failed").length;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <TestTube className="w-5 h-5 text-orange-400" />
            <h3 className="font-semibold text-foreground">Testing</h3>
            {isRunningTests && (
              <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
            )}
          </div>

          <div className="text-xs text-muted-foreground">
            {testFiles.length} test{testFiles.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Test Summary and Actions */}
        <div className="grid grid-cols-2 gap-3">
          {/* Summary Stats */}
          {testFiles.some((test) => test.lastRun) && (
            <div className="space-y-2">
              <div className="flex items-center space-x-3 text-sm">
                <div className="flex items-center space-x-1 text-green-400">
                  <CheckCircle className="w-4 h-4" />
                  <span>{getPassedCount()} passed</span>
                </div>
                <div className="flex items-center space-x-1 text-red-400">
                  <XCircle className="w-4 h-4" />
                  <span>{getFailedCount()} failed</span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                Total: {testFiles.length} tests
              </div>
            </div>
          )}

          {/* Action Button */}
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={runTests}
              disabled={isRunningTests}
              className="bg-green-600 hover:bg-green-700 text-white w-full"
            >
              {isRunningTests ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-1" />
                  Run All Tests
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {/* Test Grid */}
        {testFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
            <TestTube className="w-12 h-12 mb-4" />
            <p className="text-sm text-center">No test files found</p>
            <p className="text-xs text-muted-foreground/70 text-center">
              Create test files in the /tests directory
            </p>
          </div>
        ) : (
          <div className="h-full overflow-y-auto scrollbar-thin">
            <div className="p-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {testFiles.map((test) => (
                  <div
                    key={test.id}
                    onClick={() => setSelectedTestId(test.id)}
                    className={`
                      p-4 rounded-lg border cursor-pointer transition-all
                      ${
                        selectedTestId === test.id
                          ? "bg-accent border-orange-400 ring-1 ring-orange-400/30"
                          : "bg-card/30 border-border hover:bg-card/50 hover:border-border/80"
                      }
                    `}
                  >
                    <div className="grid grid-cols-[1fr_auto] gap-3 items-start">
                      {/* Test Info */}
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          {getStatusIcon(test.status)}
                          <span className="text-sm font-medium text-foreground truncate">
                            {test.name}
                          </span>
                        </div>

                        <div className="text-xs text-muted-foreground space-y-1">
                          <div className="truncate">{test.path}</div>
                          {test.lastRun && (
                            <div className="flex items-center space-x-2">
                              <Clock className="w-3 h-3" />
                              <span>{formatTimestamp(test.lastRun)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Run Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          runSingleTest(test.id);
                        }}
                        disabled={test.status === "running"}
                        className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-accent/50 flex-shrink-0"
                        title="Run this test"
                      >
                        {test.status === "running" ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </Button>
                    </div>

                    {/* Test Output Preview */}
                    {test.output && selectedTestId === test.id && (
                      <div className="mt-3 pt-3 border-t border-border/50">
                        <h5 className="text-xs font-medium text-foreground mb-2">
                          Last Output:
                        </h5>
                        <pre className="text-xs font-mono text-foreground/80 bg-muted/20 rounded p-2 border border-border/30 max-h-20 overflow-y-auto">
                          {test.output.length > 200
                            ? test.output.substring(0, 200) + "..."
                            : test.output}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
