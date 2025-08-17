import { X, Keyboard } from "lucide-react";
import { Button } from "../ui/button";

interface KeyboardShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

const shortcuts = [
  {
    category: "Block Management",
    items: [
      { key: "Ctrl/Cmd + Enter", description: "Add new block" },
      { key: "Shift + Enter", description: "Run current block" },
      { key: "Ctrl/Cmd + Shift + Enter", description: "Run all blocks" },
      { key: "Alt + ↑/↓", description: "Move block up/down" },
    ],
  },
  {
    category: "File Management",
    items: [
      { key: "Ctrl/Cmd + S", description: "Save milestone" },
      { key: "Ctrl/Cmd + N", description: "New file" },
      { key: "F2", description: "Rename file" },
    ],
  },
  {
    category: "Navigation",
    items: [
      { key: "Ctrl/Cmd + B", description: "Toggle sidebar" },
      { key: "Ctrl/Cmd + `", description: "Toggle terminal" },
      { key: "Escape", description: "Close modal/menu" },
    ],
  },
];

export function KeyboardShortcutsModal({
  open,
  onClose,
}: KeyboardShortcutsModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Keyboard className="w-5 h-5 text-orange-400" />
            <h2 className="text-lg font-semibold text-white">
              Keyboard Shortcuts
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-white h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {shortcuts.map((category) => (
            <div key={category.category}>
              <h3 className="text-sm font-semibold text-orange-400 mb-3">
                {category.category}
              </h3>
              <div className="space-y-2">
                {category.items.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between py-2 px-3 bg-gray-700/30 rounded border border-gray-600/30"
                  >
                    <span className="text-gray-200 text-sm">
                      {item.description}
                    </span>
                    <code className="text-xs bg-gray-600 text-orange-300 px-2 py-1 rounded font-mono">
                      {item.key}
                    </code>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-gray-700">
          <p className="text-xs text-gray-500 text-center">
            Press{" "}
            <code className="bg-gray-600 text-orange-300 px-1 rounded">?</code>{" "}
            to show/hide this help
          </p>
        </div>
      </div>
    </div>
  );
}
