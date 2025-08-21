import { useState } from "react";
import {
  File,
  Folder,
  FolderOpen,
  Plus,
  MoreVertical,
  FileText,
  Edit3,
  Trash2,
  Copy,
} from "lucide-react";
import { Button } from "../ui/button";
import { useFilesStore } from "../../store/workspace";
import type { FileNode } from "../../types/workspace";
import { ContextMenu } from "./ContextMenu";
import { RenameDialog } from "../modals/RenameDialog";

export function FilesSidebar() {
  const {
    files,
    selectedFileId,
    expandedFolders,
    selectFile,
    toggleFolder,
    addFile,
    deleteFile,
    renameFile,
  } = useFilesStore();

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    fileId: string;
    fileType: "file" | "folder";
  } | null>(null);
  const [renameDialog, setRenameDialog] = useState<{
    fileId: string;
    currentName: string;
  } | null>(null);

  const handleContextMenu = (e: React.MouseEvent, file: FileNode) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      fileId: file.id,
      fileType: file.type,
    });
  };

  const handleNewFile = (parentId: string | null = null) => {
    const name = `untitled${Date.now()}.py`;
    addFile(parentId, name, "file");
    setContextMenu(null);
  };

  const handleNewFolder = (parentId: string | null = null) => {
    const name = `folder${Date.now()}`;
    addFile(parentId, name, "folder");
    setContextMenu(null);
  };

  const handleRename = (fileId: string, currentName: string) => {
    setRenameDialog({ fileId, currentName });
    setContextMenu(null);
  };

  const handleDelete = (fileId: string) => {
    deleteFile(fileId);
    setContextMenu(null);
  };

  const handleRenameConfirm = (newName: string) => {
    if (renameDialog) {
      renameFile(renameDialog.fileId, newName);
      setRenameDialog(null);
    }
  };

  const contextMenuItems = [
    {
      label: "New File",
      icon: FileText,
      onClick: () =>
        contextMenu &&
        handleNewFile(
          contextMenu.fileType === "folder" ? contextMenu.fileId : null
        ),
    },
    {
      label: "New Folder",
      icon: Folder,
      onClick: () =>
        contextMenu &&
        handleNewFolder(
          contextMenu.fileType === "folder" ? contextMenu.fileId : null
        ),
    },
    { separator: true },
    {
      label: "Rename",
      icon: Edit3,
      onClick: () => {
        if (contextMenu) {
          const file = findFileById(files, contextMenu.fileId);
          if (file) {
            handleRename(contextMenu.fileId, file.name);
          }
        }
      },
    },
    {
      label: "Duplicate",
      icon: Copy,
      onClick: () => {
        // Implementation for duplicate
        setContextMenu(null);
      },
    },
    { separator: true },
    {
      label: "Delete",
      icon: Trash2,
      onClick: () => contextMenu && handleDelete(contextMenu.fileId),
      className: "text-red-400 hover:text-red-300",
    },
  ];

  const findFileById = (
    files: FileNode[],
    id: string
  ): FileNode | undefined => {
    for (const file of files) {
      if (file.id === id) return file;
      if (file.children) {
        const found = findFileById(file.children, id);
        if (found) return found;
      }
    }
    return undefined;
  };

  const renderFileTree = (nodes: FileNode[], level = 0) => {
    return nodes.map((node) => (
      <div key={node.id}>
        <div
          className={`
            flex items-center px-2 py-1 hover:bg-gray-700 cursor-pointer group
            ${
              selectedFileId === node.id
                ? "bg-gray-700 text-orange-400"
                : "text-gray-300"
            }
          `}
          style={{ paddingLeft: `${8 + level * 16}px` }}
          onClick={() => {
            if (node.type === "folder") {
              toggleFolder(node.id);
            } else {
              selectFile(node.id);
            }
          }}
          onContextMenu={(e) => handleContextMenu(e, node)}
        >
          {node.type === "folder" ? (
            expandedFolders.has(node.id) ? (
              <FolderOpen className="w-4 h-4 mr-2 text-orange-400" />
            ) : (
              <Folder className="w-4 h-4 mr-2 text-orange-400" />
            )
          ) : (
            <File className="w-4 h-4 mr-2 text-blue-400" />
          )}

          <span className="flex-1 text-sm truncate">{node.name}</span>

          <Button
            variant="ghost"
            size="sm"
            className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-gray-400 hover:text-white"
            onClick={(e) => {
              e.stopPropagation();
              handleContextMenu(e, node);
            }}
          >
            <MoreVertical className="w-3 h-3" />
          </Button>
        </div>

        {node.type === "folder" &&
          node.children &&
          expandedFolders.has(node.id) &&
          renderFileTree(node.children, level + 1)}
      </div>
    ));
  };

  return (
    <>
      <div className="h-full bg-gray-800 flex flex-col">
        {/* Header */}
        <div className="p-3 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Files</h3>
            <div className="flex space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleNewFile()}
                className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                title="New File"
              >
                <Plus className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleNewFolder()}
                className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                title="New Folder"
              >
                <Folder className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>

        {/* File Tree */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {files.length > 0 ? (
            <div className="py-2">{renderFileTree(files)}</div>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500">
              <Folder className="w-8 h-8 mb-2" />
              <p className="text-sm">No files yet</p>
              <p className="text-xs">Create a file to get started</p>
            </div>
          )}
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems}
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
