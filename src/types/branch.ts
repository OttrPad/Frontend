/**
 * Branch System Types
 */

export interface Branch {
  branch_id: string;
  room_id: number;
  branch_name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  parent_branch_id: string | null;
  is_main: boolean;
  last_commit_id: string | null;
  description: string | null;
}

export interface MergeConflict {
  conflict_id: string;
  room_id: number;
  source_branch_id: string;
  target_branch_id: string;
  block_id: string;
  source_content: Block;
  target_content: Block;
  base_content: Block | null;
  conflict_type: 'modify-modify' | 'modify-delete' | 'add-add';
  resolved: boolean;
  resolution_content: Block | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface Block {
  id: string;
  type: string;
  content: string;
  language?: string;
  [key: string]: unknown;
}

export interface MergeResult {
  merged: Block[];
  conflicts: Array<{
    blockId: string;
    type: 'modify-modify' | 'modify-delete' | 'add-add';
    sourceContent: Block;
    targetContent: Block;
    baseContent: Block | null;
  }>;
  hasConflicts: boolean;
}
