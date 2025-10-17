import React, { useEffect, useState } from 'react';
import { useBranchStore } from '../../store/branch';
import { Button } from '../ui/button';
import type { Block, MergeConflict } from '../../types/branch';
import { X, AlertTriangle, Check, Undo2, Edit } from 'lucide-react';

interface MergeConflictModalProps {
  open: boolean;
  onClose: () => void;
  roomId: string;
}

export default function MergeConflictModal({ open, onClose, roomId }: MergeConflictModalProps) {
  const { conflicts, fetchConflicts, resolveConflict, applyMerge } = useBranchStore();
  const [localResolutions, setLocalResolutions] = useState<Record<string, Block | null>>({});
  const [localEdits, setLocalEdits] = useState<Record<string, string>>({});
  const [editingConflict, setEditingConflict] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    if (open) {
      fetchConflicts(roomId).catch(console.error);
      setLocalResolutions({});
      setLocalEdits({});
      setEditingConflict(null);
    }
  }, [open, fetchConflicts, roomId]);

  // Helper: produce pretty JSON and split into lines for side-by-side diff
  const prettyLines = (obj: unknown) => {
    try {
      return JSON.stringify(obj, null, 2).split('\n');
    } catch {
      return String(obj).split('\n');
    }
  };

  const renderSideBySide = (left: unknown, right: unknown) => {
    const leftLines = prettyLines(left);
    const rightLines = prettyLines(right);
    const max = Math.max(leftLines.length, rightLines.length);
    const rows: React.ReactNode[] = [];
    
    for (let i = 0; i < max; i++) {
      const l = leftLines[i] ?? '';
      const r = rightLines[i] ?? '';
      const isDiff = l.trim() !== r.trim();
      
      rows.push(
        <div key={i} className={`grid grid-cols-2 gap-2 text-xs font-mono ${isDiff ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''}`}>
          <div className={`p-1 whitespace-pre-wrap ${isDiff ? 'bg-red-50 dark:bg-red-900/30' : ''}`}>{l || '\u00A0'}</div>
          <div className={`p-1 whitespace-pre-wrap ${isDiff ? 'bg-green-50 dark:bg-green-900/30' : ''}`}>{r || '\u00A0'}</div>
        </div>
      );
    }
    
    return <div className="border rounded overflow-auto max-h-64 bg-background">{rows}</div>;
  };

  const handleApplyMerge = async () => {
    const unresolved = conflicts.filter(c => !c.resolved && !localResolutions[c.conflict_id]);
    
    if (unresolved.length > 0) {
      alert(`Please resolve all ${unresolved.length} conflicts before applying merge.`);
      return;
    }

    if (conflicts.length === 0) {
      alert('No conflicts to apply');
      return;
    }

    const first = conflicts[0];
    setIsApplying(true);
    
    try {
      await applyMerge({
        roomId: first.room_id.toString(),
        sourceBranchId: first.source_branch_id,
        targetBranchId: first.target_branch_id,
      });
      alert('Merge applied successfully!');
      onClose();
    } catch (error) {
      console.error('Failed to apply merge:', error);
      alert(error instanceof Error ? error.message : 'Failed to apply merge');
    } finally {
      setIsApplying(false);
    }
  };

  if (!open) return null;

  const allResolved = conflicts.every(c => c.resolved || Boolean(localResolutions[c.conflict_id]));

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-card rounded-lg shadow-2xl p-6 z-10 w-full max-w-6xl border border-border max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            <h3 className="text-lg font-semibold text-foreground">
              Merge Conflicts ({conflicts.length})
            </h3>
            {allResolved && conflicts.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-green-500/10 text-green-600 dark:text-green-400 text-xs rounded">
                All Resolved
              </span>
            )}
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

        <div className="space-y-4 mb-6">
          {conflicts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Check className="w-12 h-12 mx-auto mb-2 text-green-500" />
              <p>No conflicts found</p>
            </div>
          ) : (
            conflicts.map((c: MergeConflict) => {
              const resolved = c.resolved || Boolean(localResolutions[c.conflict_id]);
              const currentResolution = localResolutions[c.conflict_id] ?? c.resolution_content ?? null;
              
              return (
                <div key={c.conflict_id} className="p-4 border border-border rounded-lg bg-muted/30">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-foreground">Block: {c.block_id}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Type: {c.conflict_type}
                        {resolved && (
                          <span className="ml-2 text-green-500 inline-flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            Resolved
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="text-sm font-medium text-muted-foreground mb-2">
                      Side-by-side diff (Source vs Target)
                    </div>
                    {renderSideBySide(c.source_content, c.target_content)}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      onClick={async () => {
                        const resolution = c.source_content as Block;
                        await resolveConflict(c.conflict_id, resolution);
                        setLocalResolutions(prev => ({ ...prev, [c.conflict_id]: resolution }));
                      }}
                      disabled={resolved}
                      className="bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20"
                    >
                      Keep Source
                    </Button>

                    <Button
                      size="sm"
                      onClick={async () => {
                        const resolution = c.target_content as Block;
                        await resolveConflict(c.conflict_id, resolution);
                        setLocalResolutions(prev => ({ ...prev, [c.conflict_id]: resolution }));
                      }}
                      disabled={resolved}
                      className="bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20"
                    >
                      Keep Target
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingConflict(c.conflict_id);
                        setLocalEdits(prev => ({
                          ...prev,
                          [c.conflict_id]: currentResolution
                            ? JSON.stringify(currentResolution, null, 2)
                            : JSON.stringify(c.source_content ?? c.target_content, null, 2)
                        }));
                      }}
                      disabled={resolved}
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Manual Edit
                    </Button>

                    {resolved && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          await resolveConflict(c.conflict_id, null);
                          setLocalResolutions(prev => {
                            const copy = { ...prev };
                            delete copy[c.conflict_id];
                            return copy;
                          });
                        }}
                      >
                        <Undo2 className="w-3 h-3 mr-1" />
                        Undo
                      </Button>
                    )}
                  </div>

                  {editingConflict === c.conflict_id && (
                    <div className="mt-3 p-3 border border-border rounded bg-background">
                      <div className="text-sm font-medium text-muted-foreground mb-2">
                        Manual resolution (JSON format)
                      </div>
                      <textarea
                        className="w-full p-2 border border-border rounded bg-background text-foreground font-mono text-xs focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                        rows={8}
                        value={localEdits[c.conflict_id] ?? ''}
                        onChange={(e) => setLocalEdits(prev => ({ ...prev, [c.conflict_id]: e.target.value }))}
                      />
                      <div className="flex gap-2 justify-end mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingConflict(null)}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={async () => {
                            try {
                              const parsed = JSON.parse(localEdits[c.conflict_id] || '{}');
                              await resolveConflict(c.conflict_id, parsed);
                              setLocalResolutions(prev => ({ ...prev, [c.conflict_id]: parsed }));
                              setEditingConflict(null);
                            } catch (err) {
                              alert('Invalid JSON: ' + (err as Error).message);
                            }
                          }}
                          className="bg-gradient-to-r from-orange-400 to-orange-500 text-black hover:from-orange-300 hover:to-orange-400"
                        >
                          Save Resolution
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button onClick={onClose} variant="outline" disabled={isApplying}>
            Close
          </Button>
          <Button
            onClick={handleApplyMerge}
            disabled={!allResolved || conflicts.length === 0 || isApplying}
            className="bg-gradient-to-r from-orange-400 to-orange-500 text-black hover:from-orange-300 hover:to-orange-400"
          >
            {isApplying ? 'Applying...' : 'Apply Merge'}
          </Button>
        </div>
      </div>
    </div>
  );
}
