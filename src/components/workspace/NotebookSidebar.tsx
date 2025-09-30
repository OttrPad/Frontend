import { useState, useEffect, useCallback } from "react";
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
import {
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "../ui/alert-dialog";
import { useCollaboration } from "../../hooks/useCollaboration";
import { socketCollaborationService } from "../../lib/socketCollaborationService";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

export function NotebookSidebar() {
  const {
    createNotebook,
    renameNotebook,
    deleteNotebook,
    isConnected,
    isCreatingNotebook,
    notebooks,
    activeNotebookId,
    switchNotebook,
  } = useCollaboration();

  // Treat UI as connected if either the context OR the socket says we are
  const uiConnected = isConnected || socketCollaborationService.isConnected();

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

  const [deleteDialog, setDeleteDialog] = useState<{
    notebookId: string;
    notebookName: string;
  } | null>(null);

  useEffect(() => {
    // helpful to see why the + button might be disabled
    console.log(
      "[Sidebar] isConnected(ctx):",
      isConnected,
      "isConnected(socket):",
      socketCollaborationService.isConnected(),
      "isCreatingNotebook:",
      isCreatingNotebook
    );
  }, [isConnected, isCreatingNotebook]);

  /* ---------- Right-click: empty area → “New Notebook” ---------- */
  const handleEmptySpaceContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, type: "empty" });
  };

  const handleNewNotebook = useCallback(async () => {
    const name = `Notebook ${Date.now()}`;
    try {
      await createNotebook(name);
    } catch (err) {
      console.error("Failed to create notebook:", err);
    } finally {
      setContextMenu(null);
    }
  }, [createNotebook]);

  /* ---------- Row actions (Rename/Delete) ---------- */
  const handleNotebookRename = (notebookId: string, currentName: string) => {
    setRenameDialog({ notebookId, currentName });
  };

  const handleNotebookDelete = (notebookId: string, notebookName: string) => {
    setDeleteDialog({ notebookId, notebookName });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog) return;
    try {
      await deleteNotebook(deleteDialog.notebookId);
    } catch (err) {
      console.error("Failed to delete notebook:", err);
    }
    setDeleteDialog(null);
  };

  const handleRenameConfirm = async (newName: string) => {
    if (!renameDialog) return;
    try {
      await renameNotebook(renameDialog.notebookId, newName);
    } catch (err) {
      console.error("Failed to rename notebook:", err);
    }
    setRenameDialog(null);
  };

  /* ---------- ContextMenu items for EMPTY SPACE only ---------- */
  const getEmptySpaceMenuItems = () => [
    { label: "New Notebook", icon: FileText, onClick: handleNewNotebook },
  ];

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
                onClick={handleNewNotebook}
                disabled={!uiConnected || isCreatingNotebook}
                className="h-6 w-6 p-0 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent disabled:opacity-50"
                title={
                  !uiConnected
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
                  className={`flex items-center px-3 py-2 rounded text-sm group
                    ${
                      activeNotebookId === notebook.id
                        ? "bg-sidebar-accent text-sidebar-primary"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                    }`}
                >
                  <button
                    type="button"
                    className="flex-1 flex items-center text-left"
                    onClick={() => switchNotebook(notebook.id)}
                    onDoubleClick={() =>
                      handleNotebookRename(notebook.id, notebook.title)
                    }
                  >
                    <BookOpen className="w-4 h-4 mr-3 flex-shrink-0" />
                    <span className="flex-1 truncate">{notebook.title}</span>
                  </button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent opacity-60 group-hover:opacity-100"
                        title="More options"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.preventDefault();
                          handleNotebookRename(notebook.id, notebook.title);
                        }}
                      >
                        <Edit3 className="mr-2 h-4 w-4" />
                        <span>Rename Notebook</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-500 focus:text-red-500"
                        onClick={(e) => {
                          e.preventDefault();
                          handleNotebookDelete(notebook.id, notebook.title);
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        <span>Delete Notebook</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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

      {/* Right-click Context Menu (empty space only) */}
      {contextMenu && contextMenu.type === "empty" && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={getEmptySpaceMenuItems()}
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

      {/* Delete Confirmation Dialog */}
      {deleteDialog && (
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Notebook</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteDialog.notebookName}"?
              This action cannot be undone and will permanently remove the
              notebook and all its content.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialog(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      )}
    </>
  );
}
