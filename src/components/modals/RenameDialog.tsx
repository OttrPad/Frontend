import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Check, X } from "lucide-react";

interface RenameDialogProps {
  open: boolean;
  currentName: string;
  onConfirm: (newName: string) => void;
  onCancel: () => void;
}

export function RenameDialog({
  open,
  currentName,
  onConfirm,
  onCancel,
}: RenameDialogProps) {
  const [name, setName] = useState(currentName);

  useEffect(() => {
    setName(currentName);
  }, [currentName]);

  const handleConfirm = () => {
    if (name.trim() && name.trim() !== currentName) {
      onConfirm(name.trim());
    } else {
      onCancel();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleConfirm();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-4 w-full max-w-sm mx-4">
        <h3 className="text-sm font-semibold text-white mb-3">Rename</h3>

        <div className="flex items-center space-x-2">
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={(e) => e.target.select()}
            className="flex-1 bg-gray-700 border-gray-600 text-white focus:border-orange-400 focus:ring-orange-400/20"
            autoFocus
          />

          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={!name.trim() || name.trim() === currentName}
            className="bg-green-600 hover:bg-green-700 text-white h-8 w-8 p-0"
          >
            <Check className="w-4 h-4" />
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={onCancel}
            className="bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600 h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
