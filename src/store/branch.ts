/**
 * Branch Store
 * Manages branch state and operations using Zustand
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { apiClient } from '../lib/apiClient';
import type { Branch, MergeConflict, Block, MergeResult } from '../types/branch';
import { useBlocksStore } from './workspace';

interface BranchState {
  // State
  currentBranch: Branch | null;
  branches: Branch[];
  conflicts: MergeConflict[];
  isLoading: boolean;
  error: string | null;

  // Actions
  setCurrentBranch: (branch: Branch | null) => void;
  setBranches: (branches: Branch[]) => void;
  setConflicts: (conflicts: MergeConflict[]) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;

  fetchBranches: (roomId: string) => Promise<void>;
  fetchCurrentBranch: (roomId: string) => Promise<void>;
  createBranch: (params: {
    roomId: string;
    branchName: string;
    description?: string;
    parentBranchId?: string;
  }) => Promise<Branch>;
  checkoutBranch: (branchId: string, roomId: string) => Promise<void>;
  deleteBranch: (branchId: string) => Promise<void>;
  pullFromMain: (branchId: string, roomId: string, commitMessage?: string) => Promise<{ success: boolean; hasConflicts: boolean; conflicts?: MergeConflict[]; mergeCommitId?: string }>;
  pushToMain: (branchId: string, roomId: string, commitMessage?: string) => Promise<{ success: boolean; hasConflicts: boolean; conflicts?: MergeConflict[]; mergeCommitId?: string }>;
  mergeBranch: (params: {
    sourceBranchId: string;
    targetBranchId: string;
    commitMessage?: string;
  }) => Promise<{ success: boolean; hasConflicts: boolean; conflicts?: MergeConflict[] }>;
  fetchConflicts: (roomId: string, sourceBranchId?: string, targetBranchId?: string) => Promise<void>;
  resolveConflict: (conflictId: string, resolution: Block | null) => Promise<void>;
  applyMerge: (params: {
    roomId: string;
    sourceBranchId: string;
    targetBranchId: string;
    commitMessage?: string;
  }) => Promise<void>;
  getMergeDiff: (sourceBranchId: string, targetBranchId: string) => Promise<MergeResult>;
}

export const useBranchStore = create<BranchState>()(
  devtools(
    (set, get) => ({
      // Initial state
      currentBranch: null,
      branches: [],
      conflicts: [],
      isLoading: false,
      error: null,

      // Setters
      setCurrentBranch: (branch) => set({ currentBranch: branch }),
      setBranches: (branches) => set({ branches }),
      setConflicts: (conflicts) => set({ conflicts }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),

      // Fetch all branches for a room
      fetchBranches: async (roomId: string) => {
        set({ isLoading: true, error: null });
        try {
          console.log('[BranchStore] Fetching branches for room:', roomId);
          const { branches } = await apiClient.getBranches(roomId);
          set({ branches, isLoading: false });
          console.log('[BranchStore] Fetched branches:', branches.length);
        } catch (error) {
          console.error('[BranchStore] Error fetching branches:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to fetch branches', isLoading: false });
        }
      },

      // Fetch current branch for user
      fetchCurrentBranch: async (roomId: string) => {
        set({ isLoading: true, error: null });
        try {
          console.log('[BranchStore] Fetching current branch for room:', roomId);
          const { branch } = await apiClient.getCurrentBranch(roomId);
          set({ currentBranch: branch, isLoading: false });
          console.log('[BranchStore] Current branch:', branch?.branch_name);
        } catch (error) {
          console.error('[BranchStore] Error fetching current branch:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to fetch current branch', isLoading: false });
        }
      },

      // Create a new branch
      // Creates initial commit with current blocks if present
      createBranch: async (params) => {
        set({ isLoading: true, error: null });
        try {
          console.log('[BranchStore] Creating branch:', params.branchName);
          
          // Get current blocks to save as initial commit
          const currentBlocks = useBlocksStore.getState().blocks;
          const initialSnapshot = currentBlocks.length > 0 ? { blocks: currentBlocks } : undefined;
          
          if (initialSnapshot) {
            console.log('[BranchStore] 💾 Including', currentBlocks.length, 'blocks as initial commit...');
          }
          
          const { branch, initialCommitId } = await apiClient.createBranch({
            ...params,
            initialSnapshot,
          });
          
          if (initialCommitId) {
            console.log('[BranchStore] ✅ Created initial commit:', initialCommitId);
          }
          
          // Add to branches list
          const { branches } = get();
          set({ branches: [branch, ...branches], isLoading: false });
          
          console.log('[BranchStore] Branch created:', branch.branch_id);
          return branch;
        } catch (error) {
          console.error('[BranchStore] Error creating branch:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to create branch', isLoading: false });
          throw error;
        }
      },

      // Checkout (switch to) a branch
      // AUTO-SAVES current work before switching
      checkoutBranch: async (branchId: string, roomId: string) => {
        set({ isLoading: true, error: null });
        try {
          console.log('[BranchStore] Checking out branch:', branchId);
          
          // Get current blocks to auto-save before switching
          const currentBlocks = useBlocksStore.getState().blocks;
          const currentSnapshot = currentBlocks.length > 0 ? { blocks: currentBlocks } : undefined;
          
          if (currentSnapshot) {
            console.log('[BranchStore] 💾 Sending', currentBlocks.length, 'blocks for auto-commit...');
          }
          
          const { branch, snapshot, autoCommitId } = await apiClient.checkoutBranch({ 
            branchId, 
            roomId,
            currentSnapshot 
          });
          
          if (autoCommitId) {
            console.log('[BranchStore] ✅ Auto-committed current work before switch:', autoCommitId);
          }
          
          set({ currentBranch: branch, isLoading: false });
          
          // Update blocks store with the branch's snapshot
          // IMPORTANT: Only update if snapshot has blocks, otherwise preserve current state
          if (snapshot?.blocks && snapshot.blocks.length > 0) {
            console.log('[BranchStore] 📥 Loading', snapshot.blocks.length, 'blocks from branch');
            // Type assertion needed as block types differ between stores
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            useBlocksStore.setState({ blocks: snapshot.blocks as any });
            
            // Also save to localStorage to prevent loss on reload
            try {
              localStorage.setItem(
                'ottrpad-blocks-backup',
                JSON.stringify({
                  blocks: snapshot.blocks,
                  timestamp: Date.now(),
                })
              );
            } catch (err) {
              console.error('[BranchStore] Failed to save blocks to localStorage:', err);
            }
          } else {
            console.log('[BranchStore] Branch has no commits yet - preserving current code');
          }
          
          console.log('[BranchStore] ✅ Checked out to:', branch.branch_name);
        } catch (error) {
          console.error('[BranchStore] Error checking out branch:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to checkout branch', isLoading: false });
          throw error;
        }
      },

      // Delete a branch
      deleteBranch: async (branchId: string) => {
        set({ isLoading: true, error: null });
        try {
          console.log('[BranchStore] Deleting branch:', branchId);
          await apiClient.deleteBranch(branchId);
          
          // Remove from branches list
          const { branches } = get();
          set({
            branches: branches.filter((b) => b.branch_id !== branchId),
            isLoading: false,
          });
          
          console.log('[BranchStore] Branch deleted');
        } catch (error) {
          console.error('[BranchStore] Error deleting branch:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to delete branch', isLoading: false });
          throw error;
        }
      },

      // Pull changes from main branch into current branch
      pullFromMain: async (branchId: string, roomId: string, commitMessage?: string) => {
        set({ isLoading: true, error: null });
        try {
          console.log('[BranchStore] 📥 Pulling from main into branch:', branchId);
          const result = await apiClient.pullFromMain({ branchId, roomId, commitMessage });
          
          if (result.conflicts && result.conflicts.length > 0) {
            console.log('[BranchStore] ⚠️ Pull has conflicts:', result.conflicts.length);
            set({ conflicts: result.conflicts, isLoading: false });
            return { success: false, hasConflicts: true, conflicts: result.conflicts };
          }
          
          console.log('[BranchStore] ✅ Pull successful:', result.mergeCommitId);
          set({ isLoading: false });
          
          // Refresh the current branch to get updated snapshot
          if (get().currentBranch?.branch_id === branchId) {
            await get().checkoutBranch(branchId, roomId);
          }
          
          return { success: true, hasConflicts: false, mergeCommitId: result.mergeCommitId };
        } catch (error) {
          console.error('[BranchStore] Error pulling from main:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to pull from main', isLoading: false });
          throw error;
        }
      },

      // Push changes from current branch to main branch
      pushToMain: async (branchId: string, roomId: string, commitMessage?: string) => {
        set({ isLoading: true, error: null });
        try {
          console.log('[BranchStore] 📤 Pushing branch to main:', branchId);
          const result = await apiClient.pushToMain({ branchId, roomId, commitMessage });
          
          if (result.conflicts && result.conflicts.length > 0) {
            console.log('[BranchStore] ⚠️ Push has conflicts:', result.conflicts.length);
            set({ conflicts: result.conflicts, isLoading: false });
            return { success: false, hasConflicts: true, conflicts: result.conflicts };
          }
          
          console.log('[BranchStore] ✅ Push successful:', result.mergeCommitId);
          set({ isLoading: false });
          return { success: true, hasConflicts: false, mergeCommitId: result.mergeCommitId };
        } catch (error) {
          console.error('[BranchStore] Error pushing to main:', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to push to main';
          set({ error: errorMessage, isLoading: false });
          
          // Throw with context for UI to handle
          if (errorMessage.includes('Only owners and admins')) {
            throw new Error('Only owners and admins can push to the main branch');
          }
          throw error;
        }
      },

      // Merge two branches
      mergeBranch: async (params) => {
        set({ isLoading: true, error: null });
        try {
          console.log('[BranchStore] Merging branches:', params);
          const result = await apiClient.mergeBranches(params);
          
          if (result.hasConflicts) {
            console.log('[BranchStore] Merge has conflicts:', result.conflicts?.length);
            set({ conflicts: result.conflicts || [], isLoading: false });
            return { success: false, hasConflicts: true, conflicts: result.conflicts };
          }
          
          console.log('[BranchStore] Merge successful:', result.mergeCommitId);
          set({ isLoading: false });
          return { success: true, hasConflicts: false };
        } catch (error) {
          console.error('[BranchStore] Error merging branches:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to merge branches', isLoading: false });
          throw error;
        }
      },

      // Fetch merge conflicts
      fetchConflicts: async (roomId, sourceBranchId, targetBranchId) => {
        set({ isLoading: true, error: null });
        try {
          console.log('[BranchStore] Fetching conflicts');
          const { conflicts } = await apiClient.getMergeConflicts({
            roomId,
            sourceBranchId,
            targetBranchId,
          });
          set({ conflicts, isLoading: false });
          console.log('[BranchStore] Fetched conflicts:', conflicts.length);
        } catch (error) {
          console.error('[BranchStore] Error fetching conflicts:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to fetch conflicts', isLoading: false });
        }
      },

      // Resolve a conflict
      resolveConflict: async (conflictId, resolution) => {
        set({ isLoading: true, error: null });
        try {
          console.log('[BranchStore] Resolving conflict:', conflictId);
          await apiClient.resolveConflict({ conflictId, resolution });
          
          // Update conflict in list
          const { conflicts } = get();
          set({
            conflicts: conflicts.map((c) =>
              c.conflict_id === conflictId
                ? { ...c, resolved: true, resolution_content: resolution }
                : c
            ),
            isLoading: false,
          });
          
          console.log('[BranchStore] Conflict resolved');
        } catch (error) {
          console.error('[BranchStore] Error resolving conflict:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to resolve conflict', isLoading: false });
          throw error;
        }
      },

      // Apply merge after conflicts resolved
      applyMerge: async (params) => {
        set({ isLoading: true, error: null });
        try {
          console.log('[BranchStore] Applying merge');
          await apiClient.applyMerge(params);
          
          // Clear conflicts
          set({ conflicts: [], isLoading: false });
          
          console.log('[BranchStore] Merge applied successfully');
        } catch (error) {
          console.error('[BranchStore] Error applying merge:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to apply merge', isLoading: false });
          throw error;
        }
      },

      // Get merge preview
      getMergeDiff: async (sourceBranchId, targetBranchId) => {
        set({ isLoading: true, error: null });
        try {
          console.log('[BranchStore] Getting merge diff');
          const { diff } = await apiClient.getMergeDiff({
            sourceBranchId,
            targetBranchId,
          });
          set({ isLoading: false });
          return diff;
        } catch (error) {
          console.error('[BranchStore] Error getting merge diff:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to get merge diff', isLoading: false });
          throw error;
        }
      },
    }),
    { name: 'BranchStore' }
  )
);
