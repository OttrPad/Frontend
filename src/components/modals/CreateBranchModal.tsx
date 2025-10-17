import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { useBranchStore } from '../../store/branch';
import { X } from 'lucide-react';

interface CreateBranchModalProps {
  open: boolean;
  onClose: () => void;
  roomId: string;
}

export default function CreateBranchModal({ open, onClose, roomId }: CreateBranchModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const createBranch = useBranchStore((s) => s.createBranch);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setName('');
      setDescription('');
      setIsCreating(false);
    }
  }, [open]);

  const handleCreate = async () => {
    if (!name.trim()) {
      alert('Branch name cannot be empty');
      return;
    }

    setIsCreating(true);
    try {
      await createBranch({ roomId, branchName: name.trim(), description: description.trim() });
      onClose();
    } catch (error) {
      console.error('Failed to create branch:', error);
      alert(error instanceof Error ? error.message : 'Failed to create branch');
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCreate();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-card rounded-lg shadow-2xl p-6 z-10 w-96 border border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Create New Branch</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 hover:bg-muted"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Branch Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="feature/new-feature"
              className="w-full p-2 border border-border rounded bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-400"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Brief description of this branch..."
              rows={3}
              className="w-full p-2 border border-border rounded bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button onClick={onClose} variant="outline" disabled={isCreating}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isCreating || !name.trim()}
            className="bg-gradient-to-r from-orange-400 to-orange-500 text-black hover:from-orange-300 hover:to-orange-400"
          >
            {isCreating ? 'Creating...' : 'Create Branch'}
          </Button>
        </div>
      </div>
    </div>
  );
}
