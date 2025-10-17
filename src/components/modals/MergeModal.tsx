import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { useBranchStore } from '../../store/branch';
import { X, GitMerge, AlertCircle } from 'lucide-react';

interface MergeModalProps {
  open: boolean;
  onClose: () => void;
  roomId: string;
}

export default function MergeModal({ open, onClose }: MergeModalProps) {
  const { branches, getMergeDiff, mergeBranch } = useBranchStore();
  const [source, setSource] = useState<string>('');
  const [target, setTarget] = useState<string>('');
  const [preview, setPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMerging, setIsMerging] = useState(false);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setSource('');
      setTarget('');
      setPreview(null);
      setIsLoading(false);
      setIsMerging(false);
    }
  }, [open]);

  const handlePreview = async () => {
    if (!source || !target) {
      alert('Please select both source and target branches');
      return;
    }

    if (source === target) {
      alert('Source and target branches must be different');
      return;
    }

    setIsLoading(true);
    try {
      const diff = await getMergeDiff(source, target);
      setPreview(JSON.stringify(diff, null, 2));
    } catch (error) {
      console.error('Failed to get merge preview:', error);
      alert(error instanceof Error ? error.message : 'Failed to get merge preview');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMerge = async () => {
    if (!source || !target) {
      alert('Please select both source and target branches');
      return;
    }

    if (source === target) {
      alert('Source and target branches must be different');
      return;
    }

    setIsMerging(true);
    try {
      const result = await mergeBranch({ sourceBranchId: source, targetBranchId: target });
      
      if (result.hasConflicts) {
        alert(`Merge has ${result.conflicts?.length || 0} conflicts. Please resolve them in the Conflicts tab.`);
        onClose();
      } else {
        alert('Merge completed successfully!');
        onClose();
      }
    } catch (error) {
      console.error('Failed to merge branches:', error);
      alert(error instanceof Error ? error.message : 'Failed to merge branches');
    } finally {
      setIsMerging(false);
    }
  };

  if (!open) return null;

  const sourceBranch = branches.find(b => b.branch_id === source);
  const targetBranch = branches.find(b => b.branch_id === target);

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-card rounded-lg shadow-2xl p-6 z-10 w-full max-w-3xl border border-border max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <GitMerge className="w-5 h-5 text-orange-400" />
            <h3 className="text-lg font-semibold text-foreground">Merge Branches</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 hover:bg-muted"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Source Branch
            </label>
            <select
              className="w-full p-2 border border-border rounded bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-orange-400"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            >
              <option value="">-- select source --</option>
              {branches?.map(b => (
                <option key={b.branch_id} value={b.branch_id}>
                  {b.branch_name} {b.is_main ? '(main)' : ''}
                </option>
              ))}
            </select>
            {sourceBranch && (
              <p className="text-xs text-muted-foreground mt-1">{sourceBranch.description || 'No description'}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Target Branch
            </label>
            <select
              className="w-full p-2 border border-border rounded bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-orange-400"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            >
              <option value="">-- select target --</option>
              {branches?.map(b => (
                <option key={b.branch_id} value={b.branch_id}>
                  {b.branch_name} {b.is_main ? '(main)' : ''}
                </option>
              ))}
            </select>
            {targetBranch && (
              <p className="text-xs text-muted-foreground mt-1">{targetBranch.description || 'No description'}</p>
            )}
          </div>
        </div>

        {source && target && source === target && (
          <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded mb-4">
            <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-yellow-600 dark:text-yellow-400">
              Source and target branches are the same. Please select different branches.
            </p>
          </div>
        )}

        {preview && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Merge Preview</h4>
            <div className="max-h-64 overflow-auto p-3 border border-border rounded bg-muted/30">
              <pre className="whitespace-pre-wrap text-xs font-mono text-foreground">{preview}</pre>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button onClick={onClose} variant="outline" disabled={isLoading || isMerging}>
            Cancel
          </Button>
          <Button
            onClick={handlePreview}
            variant="outline"
            disabled={!source || !target || source === target || isLoading || isMerging}
          >
            {isLoading ? 'Loading...' : 'Preview Diff'}
          </Button>
          <Button
            onClick={handleMerge}
            disabled={!source || !target || source === target || isMerging}
            className="bg-gradient-to-r from-orange-400 to-orange-500 text-black hover:from-orange-300 hover:to-orange-400"
          >
            {isMerging ? 'Merging...' : 'Merge'}
          </Button>
        </div>
      </div>
    </div>
  );
}
