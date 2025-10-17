import { useEffect, useState } from 'react';
import { useBranchStore } from '../../../store/branch';
import { Button } from '../../ui/button';
import CreateBranchModal from '../../modals/CreateBranchModal';
import MergeModal from '../../modals/MergeModal';
import MergeConflictModal from '../../modals/MergeConflictModal';
import { GitBranch, GitMerge, AlertTriangle, Plus, Trash2, Check, Download, Upload } from 'lucide-react';

interface BranchPaneProps {
  roomId: string;
}

export default function BranchPane({ roomId }: BranchPaneProps) {
  const {
    branches,
    fetchBranches,
    currentBranch,
    fetchCurrentBranch,
    checkoutBranch,
    deleteBranch,
    pullFromMain,
    pushToMain,
    conflicts,
  } = useBranchStore();

  const [showCreate, setShowCreate] = useState(false);
  const [showMerge, setShowMerge] = useState(false);
  const [showConflicts, setShowConflicts] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isPulling, setIsPulling] = useState(false);
  const [isPushing, setIsPushing] = useState(false);

  useEffect(() => {
    if (roomId) {
      fetchBranches(roomId).catch(console.error);
      fetchCurrentBranch(roomId).catch(console.error);
    }
  }, [roomId, fetchBranches, fetchCurrentBranch]);

  const filteredBranches = branches?.filter(b =>
    b.branch_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.description?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleCheckout = async (branchId: string, branchName: string) => {
    if (branchId === currentBranch?.branch_id) {
      return; // Already on this branch
    }
    
    if (confirm(`Switch to branch "${branchName}"?`)) {
      try {
        await checkoutBranch(branchId, roomId);
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Failed to checkout branch');
      }
    }
  };

  const handleDelete = async (branchId: string, branchName: string) => {
    if (confirm(`Are you sure you want to delete branch "${branchName}"? This action cannot be undone.`)) {
      try {
        await deleteBranch(branchId);
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Failed to delete branch');
      }
    }
  };

  const handlePull = async () => {
    if (!currentBranch) {
      alert('No branch currently checked out');
      return;
    }

    if (currentBranch.is_main) {
      alert('Cannot pull into main branch. Main is the source branch.');
      return;
    }

    if (!confirm(`Pull changes from main into "${currentBranch.branch_name}"?`)) {
      return;
    }

    setIsPulling(true);
    try {
      const result = await pullFromMain(currentBranch.branch_id, roomId);
      
      if (result.hasConflicts) {
        alert(`Pull has ${result.conflicts?.length || 0} conflicts. Please resolve them in the Conflicts tab.`);
        setShowConflicts(true);
      } else {
        alert('Successfully pulled changes from main!');
        // Refresh branches to show updated state
        await fetchBranches(roomId);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to pull from main');
    } finally {
      setIsPulling(false);
    }
  };

  const handlePush = async () => {
    if (!currentBranch) {
      alert('No branch currently checked out');
      return;
    }

    if (currentBranch.is_main) {
      alert('Cannot push main to main. Push is for merging sub-branches into main.');
      return;
    }

    if (!confirm(`Push changes from "${currentBranch.branch_name}" to main?\n\nThis will merge your branch into main. Only owners and admins can do this.`)) {
      return;
    }

    setIsPushing(true);
    try {
      const result = await pushToMain(currentBranch.branch_id, roomId);
      
      if (result.hasConflicts) {
        alert(`Push has ${result.conflicts?.length || 0} conflicts. Please resolve them in the Conflicts tab.`);
        setShowConflicts(true);
      } else {
        alert('Successfully pushed changes to main!');
        // Refresh branches to show updated state
        await fetchBranches(roomId);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to push to main';
      alert(message);
    } finally {
      setIsPushing(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-orange-400" />
            <h3 className="text-sm font-semibold text-foreground">Branches</h3>
          </div>
          <div className="flex gap-1">
            <Button
              size="sm"
              onClick={() => setShowCreate(true)}
              className="h-7 px-2 bg-gradient-to-r from-orange-400 to-orange-500 text-black hover:from-orange-300 hover:to-orange-400"
            >
              <Plus className="w-3 h-3 mr-1" />
              New
            </Button>
          </div>
        </div>

        {/* Current Branch Indicator */}
        {currentBranch && (
          <div className="p-2 rounded bg-orange-500/10 border border-orange-500/20 mb-3">
            <div className="flex items-center gap-2">
              <Check className="w-3 h-3 text-orange-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-orange-600 dark:text-orange-400 truncate">
                  {currentBranch.branch_name}
                </div>
                {currentBranch.description && (
                  <div className="text-xs text-muted-foreground truncate">
                    {currentBranch.description}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Search */}
        <input
          type="text"
          placeholder="Search branches..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-1.5 text-sm border border-border rounded bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-400"
        />

        {/* Pull/Push Buttons - Only show on sub-branches */}
        {currentBranch && !currentBranch.is_main && (
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              variant="outline"
              onClick={handlePull}
              disabled={isPulling}
              className="flex-1 h-8 sm:h-9 text-xs sm:text-sm hover:bg-blue-500/10 hover:text-blue-600 hover:border-blue-500/20 touch-manipulation"
              title="Pull changes from main branch"
            >
              <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
              <span className="truncate">{isPulling ? 'Pulling...' : 'Pull'}</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handlePush}
              disabled={isPushing}
              className="flex-1 h-8 sm:h-9 text-xs sm:text-sm hover:bg-green-500/10 hover:text-green-600 hover:border-green-500/20 touch-manipulation"
              title="Push changes to main branch (requires owner/admin)"
            >
              <Upload className="w-3 h-3 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
              <span className="truncate">{isPushing ? 'Pushing...' : 'Push'}</span>
            </Button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 mt-3">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowMerge(true)}
            className="flex-1 h-8 sm:h-9 text-xs sm:text-sm touch-manipulation"
          >
            <GitMerge className="w-3 h-3 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
            <span className="truncate">Merge</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowConflicts(true)}
            className="flex-1 h-8 sm:h-9 text-xs sm:text-sm relative touch-manipulation"
          >
            <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
            <span className="truncate">Conflicts</span>
            {conflicts.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-yellow-500 text-black text-xs rounded-full flex-shrink-0">
                {conflicts.length}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Branch List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filteredBranches.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {searchTerm ? 'No branches match your search' : 'No branches yet'}
          </div>
        ) : (
          filteredBranches.map((b) => {
            const isCurrent = b.branch_id === currentBranch?.branch_id;
            
            return (
              <div
                key={b.branch_id}
                className={`p-3 border rounded-lg transition-colors ${
                  isCurrent
                    ? 'border-orange-500 bg-orange-500/5'
                    : 'border-border bg-muted/30 hover:bg-muted/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="font-medium text-sm text-foreground truncate">
                        {b.branch_name}
                      </div>
                      {b.is_main && (
                        <span className="px-1.5 py-0.5 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 text-xs rounded shrink-0">
                          main
                        </span>
                      )}
                      {isCurrent && (
                        <span className="px-1.5 py-0.5 bg-orange-500/10 text-orange-600 dark:text-orange-400 text-xs rounded shrink-0">
                          current
                        </span>
                      )}
                    </div>
                    {b.description && (
                      <div className="text-xs text-muted-foreground line-clamp-2">
                        {b.description}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-1.5 mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCheckout(b.branch_id, b.branch_name)}
                    disabled={isCurrent}
                    className="h-7 px-2 text-xs flex-1"
                  >
                    {isCurrent ? 'Current' : 'Checkout'}
                  </Button>
                  {!b.is_main && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(b.branch_id, b.branch_name)}
                      className="h-7 px-2 text-xs hover:bg-red-500/10 hover:text-red-600 hover:border-red-500/20"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modals */}
      <CreateBranchModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        roomId={roomId}
      />

      <MergeModal
        open={showMerge}
        onClose={() => setShowMerge(false)}
        roomId={roomId}
      />

      <MergeConflictModal
        open={showConflicts}
        onClose={() => setShowConflicts(false)}
        roomId={roomId}
      />
    </div>
  );
}
