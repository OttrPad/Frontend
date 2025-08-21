import { useState } from "react";
import { useAIStore, useBlocksStore } from "../../../store/workspace";
import { Button } from "../../ui/button";
import {
  Bot,
  Send,
  Loader2,
  User,
  FileText,
  Plus,
  Copy,
  Trash2,
} from "lucide-react";

export function AIAssistPane() {
  const { messages, isLoading, sendMessage, clearMessages } = useAIStore();
  const { addBlock } = useBlocksStore();
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (input.trim() && !isLoading) {
      sendMessage(input.trim());
      setInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInsertBlock = (content: string, lang = "python") => {
    const blockId = addBlock();
    // In a real implementation, you'd update the block content here
    console.log("Insert block", blockId, content, lang);
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bot className="w-5 h-5 text-orange-400" />
            <h3 className="font-semibold text-white">AI Assist</h3>
            {isLoading && (
              <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
            )}
          </div>

          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearMessages}
              className="text-gray-400 hover:text-white"
              title="Clear Chat"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Bot className="w-12 h-12 mb-4" />
            <p className="text-sm text-center">AI Assistant Ready</p>
            <p className="text-xs text-gray-600 text-center mt-2">
              Ask me anything about your code, request help with implementation,
              or get suggestions for improvements.
            </p>

            {/* Suggested prompts */}
            <div className="mt-6 space-y-2 w-full max-w-xs">
              <button
                onClick={() =>
                  setInput("Help me write a Python function to sort a list")
                }
                className="w-full p-3 text-left text-sm bg-gray-700/30 border border-gray-600/50 rounded-lg hover:bg-gray-700/50 transition-colors"
              >
                💡 Help me write a Python function
              </button>
              <button
                onClick={() =>
                  setInput("Review my code and suggest improvements")
                }
                className="w-full p-3 text-left text-sm bg-gray-700/30 border border-gray-600/50 rounded-lg hover:bg-gray-700/50 transition-colors"
              >
                🔍 Review my code
              </button>
              <button
                onClick={() => setInput("Explain this algorithm step by step")}
                className="w-full p-3 text-left text-sm bg-gray-700/30 border border-gray-600/50 rounded-lg hover:bg-gray-700/50 transition-colors"
              >
                📚 Explain an algorithm
              </button>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`
                    max-w-[80%] rounded-lg p-4 space-y-3
                    ${
                      message.role === "user"
                        ? "bg-orange-500/20 border border-orange-500/30 text-white"
                        : "bg-gray-700/50 border border-gray-600/50 text-gray-200"
                    }
                  `}
                >
                  {/* Message Header */}
                  <div className="flex items-center space-x-2 text-xs">
                    {message.role === "user" ? (
                      <User className="w-4 h-4 text-orange-400" />
                    ) : (
                      <Bot className="w-4 h-4 text-blue-400" />
                    )}
                    <span className="text-gray-400">
                      {message.role === "user" ? "You" : "AI Assistant"}
                    </span>
                    <span className="text-gray-500">•</span>
                    <span className="text-gray-500">
                      {formatTimestamp(message.timestamp)}
                    </span>
                  </div>

                  {/* Message Content */}
                  <div className="text-sm whitespace-pre-wrap">
                    {message.content}
                  </div>

                  {/* Actions */}
                  {message.actions && message.actions.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-gray-600/30">
                      <p className="text-xs text-gray-400">
                        Suggested actions:
                      </p>
                      {message.actions.map((action, index) => (
                        <div
                          key={index}
                          className="flex items-center space-x-2"
                        >
                          {action.type === "insert_block" && (
                            <Button
                              size="sm"
                              onClick={() =>
                                handleInsertBlock(
                                  action.data.content as string,
                                  action.data.lang as string
                                )
                              }
                              className="bg-green-600 hover:bg-green-700 text-white text-xs"
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Insert as Block
                            </Button>
                          )}
                          {action.type === "create_file" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600 text-xs"
                            >
                              <FileText className="w-3 h-3 mr-1" />
                              Create File
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              navigator.clipboard.writeText(
                                action.data.content as string
                              );
                            }}
                            className="text-gray-400 hover:text-white text-xs"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-700/50 border border-gray-600/50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 text-sm text-gray-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Input */}
      <div className="flex-shrink-0 p-4 border-t border-gray-700">
        <div className="flex space-x-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything about your code..."
            className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder:text-gray-400 focus:border-orange-400 focus:ring-1 focus:ring-orange-400/20 focus:outline-none resize-none"
            rows={2}
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>

        <p className="text-xs text-gray-500 mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
