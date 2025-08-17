import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Save, X } from "lucide-react";

interface SaveMilestoneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string, notes?: string) => void;
}

export function SaveMilestoneDialog({
  open,
  onOpenChange,
  onSave,
}: SaveMilestoneDialogProps) {
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");

  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim(), notes.trim() || undefined);
      setName("");
      setNotes("");
    }
  };

  const handleClose = () => {
    setName("");
    setNotes("");
    onOpenChange(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Dialog */}
      <div className="relative bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Save Milestone</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="text-gray-400 hover:text-white h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <Label
              htmlFor="milestone-name"
              className="text-gray-200 font-medium"
            >
              Milestone Name
            </Label>
            <Input
              id="milestone-name"
              type="text"
              placeholder="e.g., Initial Setup, Feature Complete"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2 bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 focus:border-orange-400 focus:ring-orange-400/20"
              autoFocus
            />
          </div>

          <div>
            <Label
              htmlFor="milestone-notes"
              className="text-gray-200 font-medium"
            >
              Notes (Optional)
            </Label>
            <textarea
              id="milestone-notes"
              placeholder="Describe what was accomplished in this milestone..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="mt-2 w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder:text-gray-400 focus:border-orange-400 focus:ring-1 focus:ring-orange-400/20 focus:outline-none resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 mt-6">
          <Button
            variant="outline"
            onClick={handleClose}
            className="bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name.trim()}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Milestone
          </Button>
        </div>
      </div>
    </div>
  );
}
