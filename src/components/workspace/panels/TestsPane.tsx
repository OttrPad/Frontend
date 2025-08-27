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
  FileText,
  RefreshCw,
} from "lucide-react";
import { MonacoEditor } from "../../monaco/MonacoEditor";

export function TestsPane() {
  const { testFiles, isRunningTests, runTests, runSingleTest } =
    useTestsStore();
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);

  const selectedTest = testFiles.find((test) => test.id === selectedTestId);

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
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <TestTube className="w-5 h-5 text-orange-400" />
            <h3 className="font-semibold text-foreground">Tests</h3>
            {isRunningTests && (
              <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
            )}
          </div>

          <Button
            size="sm"
            onClick={runTests}
            disabled={isRunningTests}
            className="bg-green-600 hover:bg-green-700 text-white"
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

        {/* Test Summary */}
        {testFiles.some((test) => test.lastRun) && (
          <div className="mt-3 flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-1 text-green-400">
              <CheckCircle className="w-4 h-4" />
              <span>{getPassedCount()} passed</span>
            </div>
            <div className="flex items-center space-x-1 text-red-400">
              <XCircle className="w-4 h-4" />
              <span>{getFailedCount()} failed</span>
            </div>
            <div className="text-gray-400">{testFiles.length} total</div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex">
        {/* Test List */}
        <div className="w-1/2 border-r border-border overflow-y-auto scrollbar-thin">
          {testFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
              <TestTube className="w-12 h-12 mb-4" />
              <p className="text-sm text-center">No test files found</p>
              <p className="text-xs text-muted-foreground/70 text-center">
                Create test files in the /tests directory
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {testFiles.map((test) => (
                <div
                  key={test.id}
                  onClick={() => setSelectedTestId(test.id)}
                  className={`
                    p-3 rounded-lg border cursor-pointer transition-all
                    ${
                      selectedTestId === test.id
                        ? "bg-accent border-orange-400"
                        : "bg-card/30 border-border hover:bg-card/50"
                    }
                  `}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(test.status)}
                      <span className="text-sm font-medium text-foreground truncate">
                        {test.name}
                      </span>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        runSingleTest(test.id);
                      }}
                      disabled={test.status === "running"}
                      className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                      title="Run this test"
                    >
                      {test.status === "running" ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Play className="w-3 h-3" />
                      )}
                    </Button>
                  </div>

                  <div className="text-xs text-gray-500 flex items-center space-x-2">
                    <span>{test.path}</span>
                    {test.lastRun && (
                      <>
                        <span>•</span>
                        <span>{formatTimestamp(test.lastRun)}</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Test Details */}
        <div className="w-1/2 flex flex-col">
          {selectedTest ? (
            <>
              {/* Test Header */}
              <div className="flex-shrink-0 p-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-medium text-foreground">
                      {selectedTest.name}
                    </span>
                    {getStatusIcon(selectedTest.status)}
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => runSingleTest(selectedTest.id)}
                    disabled={selectedTest.status === "running"}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Test Content */}
              <div className="flex-1 flex flex-col">
                <div className="flex-1">
                  <MonacoEditor
                    value={selectedTest.content}
                    onChange={() => {}} // Read-only for now
                    language="python"
                    readOnly
                    options={{
                      fontSize: 12,
                      lineHeight: 18,
                    }}
                  />
                </div>

                {/* Test Output */}
                {selectedTest.output && (
                  <div className="flex-shrink-0 border-t border-border p-4">
                    <h4 className="text-sm font-medium text-foreground mb-2">
                      Output
                    </h4>
                    <pre className="text-xs font-mono text-foreground/90 bg-muted/20 rounded p-3 border border-border/30 max-h-32 overflow-y-auto">
                      {selectedTest.output}
                    </pre>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <FileText className="w-12 h-12 mx-auto mb-4" />
                <p className="text-sm">Select a test to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
