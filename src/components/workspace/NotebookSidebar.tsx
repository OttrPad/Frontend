import { useState, useCallback } from "react";
import {
  Plus,
  MoreVertical,
  FileText,
  Edit3,
  Trash2,
  BookOpen,
} from "lucide-react";
import { Button } from "../ui/button";
import { ContextMenu } from "./ContextMenu";
import { RenameDialog } from "../modals/RenameDialog";
import { useCollaboration } from "../../hooks/useCollaboration";

export function NotebookSidebar() {
  const {
    createNotebook,
    renameNotebook,
    deleteNotebook,
    isConnected,
    notebooks,
    activeNotebookId,
    switchNotebook,
  } = useCollaboration();

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    notebookId?: string;
    type: "notebook" | "empty";
  } | null>(null);
  const [renameDialog, setRenameDialog] = useState<{
    notebookId: string;
    currentName: string;
  } | null>(null);
  const [isCreatingNotebook, setIsCreatingNotebook] = useState(false);

  const handleNotebookContextMenu = (
    e: React.MouseEvent,
    notebookId: string
  ) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      notebookId: notebookId,
      type: "notebook",
    });
  };

  const handleEmptySpaceContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      type: "empty",
    });
  };

  const handleNewNotebook = useCallback(async () => {
    if (!isConnected || isCreatingNotebook) {
      console.error(
        "Not connected to collaboration server or already creating"
      );
      return;
    }

    const name = `Notebook ${Date.now()}`;
    try {
      setIsCreatingNotebook(true);
      await createNotebook(name);
    } catch (error) {
      console.error("Failed to create notebook:", error);
    } finally {
      setIsCreatingNotebook(false);
    }
    setContextMenu(null);
  }, [isConnected, createNotebook, isCreatingNotebook]);

  const handleNotebookRename = (notebookId: string, currentName: string) => {
    setRenameDialog({ notebookId, currentName });
    setContextMenu(null);
  };

  const handleNotebookDelete = async (notebookId: string) => {
    try {
      await deleteNotebook(notebookId);
    } catch (error) {
      console.error("Failed to delete notebook:", error);
    }
    setContextMenu(null);
  };

  const handleRenameConfirm = async (newName: string) => {
    if (renameDialog) {
      try {
        await renameNotebook(renameDialog.notebookId, newName);
      } catch (error) {
        console.error("Failed to rename notebook:", error);
      }
      setRenameDialog(null);
    }
  };

  const getContextMenuItems = () => {
    if (!contextMenu) return [];

    if (contextMenu.type === "notebook" && contextMenu.notebookId) {
      const notebook = notebooks.find((nb) => nb.id === contextMenu.notebookId);
      return [
        {
          label: "Rename Notebook",
          icon: Edit3,
          onClick: () => {
            if (notebook) {
              handleNotebookRename(notebook.id, notebook.title);
            }
          },
        },
        { separator: true },
        {
          label: "Delete Notebook",
          icon: Trash2,
          onClick: () => {
            if (notebook) {
              handleNotebookDelete(notebook.id);
            }
          },
          className: "text-red-400 hover:text-red-300",
        },
      ];
    }

    // Empty space context menu - just create new notebook
    return [
      {
        label: "New Notebook",
        icon: FileText,
        onClick: () => handleNewNotebook(),
      },
    ];
  };

  return (
    <>
      <div className="h-full bg-sidebar flex flex-col">
        {/* Header */}
        <div className="p-3 border-b border-sidebar-border">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-sidebar-foreground">
              Notebooks
            </h3>
            <div className="flex space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleNewNotebook()}
                disabled={!isConnected || isCreatingNotebook}
                className="h-6 w-6 p-0 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent disabled:opacity-50"
                title={
                  !isConnected
                    ? "Not connected"
                    : isCreatingNotebook
                    ? "Creating notebook..."
                    : "New Notebook"
                }
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>

        {/* Notebooks List */}
        <div
          className="flex-1 overflow-y-auto scrollbar-thin"
          onContextMenu={handleEmptySpaceContextMenu}
        >
          {notebooks.length > 0 ? (
            <div className="p-3 space-y-1">
              {notebooks.map((notebook) => (
                <div
                  key={notebook.id}
                  className={`
                    flex items-center px-3 py-2 rounded cursor-pointer text-sm group
                    ${
                      activeNotebookId === notebook.id
                        ? "bg-sidebar-accent text-sidebar-primary"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                    }
                  `}
                  onClick={() => switchNotebook(notebook.id)}
                  onDoubleClick={() =>
                    handleNotebookRename(notebook.id, notebook.title)
                  }
                  onContextMenu={(e) =>
                    handleNotebookContextMenu(e, notebook.id)
                  }
                >
                  <BookOpen className="w-4 h-4 mr-3 flex-shrink-0" />
                  <span className="flex-1 truncate">{notebook.title}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNotebookContextMenu(e, notebook.id);
                    }}
                  >
                    <MoreVertical className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-sidebar-foreground/60">
              <BookOpen className="w-8 h-8 mb-2" />
              <p className="text-sm">No notebooks yet</p>
              <p className="text-xs">Click + to create your first notebook</p>
            </div>
          )}
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={getContextMenuItems()}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Rename Dialog */}
      {renameDialog && (
        <RenameDialog
          open={!!renameDialog}
          currentName={renameDialog.currentName}
          onConfirm={handleRenameConfirm}
          onCancel={() => setRenameDialog(null)}
        />
      )}
    </>
  );
}
