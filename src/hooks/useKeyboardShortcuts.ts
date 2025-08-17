import { useEffect, useState } from "react";
import { useBlocksStore, useMilestonesStore } from "../store/workspace";

export function useKeyboardShortcuts() {
  const { addBlock, selectedBlockId, runBlock, runAllBlocks } =
    useBlocksStore();
  const { saveMilestone } = useMilestonesStore();
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing in an input/textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as Element)?.getAttribute("contenteditable") === "true"
      ) {
        return;
      }

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      // ?: Show keyboard shortcuts help
      if (e.key === "?" && !e.shiftKey && !isCtrlOrCmd) {
        e.preventDefault();
        setShowShortcutsModal(true);
        return;
      }

      // Escape: Close modal/menu
      if (e.key === "Escape") {
        setShowShortcutsModal(false);
        return;
      }

      // Ctrl/Cmd + Enter: Add new block
      if (isCtrlOrCmd && e.key === "Enter") {
        e.preventDefault();
        addBlock();
        return;
      }

      // Shift + Enter: Run current/selected block
      if (e.shiftKey && e.key === "Enter" && selectedBlockId) {
        e.preventDefault();
        runBlock(selectedBlockId);
        return;
      }

      // Ctrl/Cmd + Shift + Enter: Run all blocks
      if (isCtrlOrCmd && e.shiftKey && e.key === "Enter") {
        e.preventDefault();
        runAllBlocks();
        return;
      }

      // Ctrl/Cmd + S: Save milestone
      if (isCtrlOrCmd && e.key === "s") {
        e.preventDefault();
        const defaultName = `Milestone ${new Date().toLocaleString()}`;
        saveMilestone(defaultName);
        return;
      }

      // Alt + Arrow Up/Down: Move block (handled by Block component)
      // These are just placeholders for future implementation
      if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
        e.preventDefault();
        // Block movement logic would go here
        return;
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [addBlock, selectedBlockId, runBlock, runAllBlocks, saveMilestone]);

  return {
    showShortcutsModal,
    setShowShortcutsModal,
  };
}
