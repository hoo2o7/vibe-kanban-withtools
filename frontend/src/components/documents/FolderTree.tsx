import { useState, useMemo } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileText,
  FileJson,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DocumentMetadata } from 'shared/types';

interface FolderTreeProps {
  documents: DocumentMetadata[];
  selectedPath: string | null;
  onSelectDocument: (relativePath: string) => void;
  formatFileSize: (bytes: number | bigint) => string;
}

interface TreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  children: TreeNode[];
  document?: DocumentMetadata;
}

// Build tree structure from flat document list
function buildTree(documents: DocumentMetadata[]): TreeNode[] {
  const root: TreeNode[] = [];
  const folderMap = new Map<string, TreeNode>();

  // Helper to get or create folder node
  const getOrCreateFolder = (folderPath: string): TreeNode => {
    if (folderMap.has(folderPath)) {
      return folderMap.get(folderPath)!;
    }

    const parts = folderPath.split('/');
    const name = parts[parts.length - 1];
    const parentPath = parts.slice(0, -1).join('/');

    const folderNode: TreeNode = {
      name,
      path: folderPath,
      isFolder: true,
      children: [],
    };

    folderMap.set(folderPath, folderNode);

    if (parentPath) {
      const parentNode = getOrCreateFolder(parentPath);
      parentNode.children.push(folderNode);
    } else {
      root.push(folderNode);
    }

    return folderNode;
  };

  // Process each document
  for (const doc of documents) {
    const parts = doc.relative_path.split('/');
    const fileName = parts[parts.length - 1];
    const folderPath = parts.slice(0, -1).join('/');

    const fileNode: TreeNode = {
      name: fileName,
      path: doc.relative_path,
      isFolder: false,
      children: [],
      document: doc,
    };

    if (folderPath) {
      const parentFolder = getOrCreateFolder(folderPath);
      parentFolder.children.push(fileNode);
    } else {
      root.push(fileNode);
    }
  }

  // Sort children: folders first, then files, both alphabetically
  const sortChildren = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.isFolder !== b.isFolder) {
        return a.isFolder ? -1 : 1;
      }
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    });
    nodes.forEach((node) => {
      if (node.children.length > 0) {
        sortChildren(node.children);
      }
    });
  };

  sortChildren(root);
  return root;
}

interface TreeNodeComponentProps {
  node: TreeNode;
  depth: number;
  expandedFolders: Set<string>;
  toggleFolder: (path: string) => void;
  selectedPath: string | null;
  onSelectDocument: (relativePath: string) => void;
  formatFileSize: (bytes: number | bigint) => string;
}

function TreeNodeComponent({
  node,
  depth,
  expandedFolders,
  toggleFolder,
  selectedPath,
  onSelectDocument,
  formatFileSize,
}: TreeNodeComponentProps) {
  const isExpanded = expandedFolders.has(node.path);
  const isSelected = selectedPath === node.path;
  const indent = depth * 16;

  if (node.isFolder) {
    return (
      <div>
        <button
          onClick={() => toggleFolder(node.path)}
          className={cn(
            'w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm transition-colors',
            'hover:bg-accent text-foreground'
          )}
          style={{ paddingLeft: indent + 8 }}
        >
          <span className="w-4 h-4 flex items-center justify-center text-muted-foreground">
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </span>
          {isExpanded ? (
            <FolderOpen className="w-4 h-4 text-amber-500 shrink-0" />
          ) : (
            <Folder className="w-4 h-4 text-amber-500 shrink-0" />
          )}
          <span className="truncate flex-1 text-left font-medium">
            {node.name}
          </span>
          <span className="text-xs text-muted-foreground">
            {node.children.length}
          </span>
        </button>

        {isExpanded && (
          <div>
            {node.children.map((child) => (
              <TreeNodeComponent
                key={child.path}
                node={child}
                depth={depth + 1}
                expandedFolders={expandedFolders}
                toggleFolder={toggleFolder}
                selectedPath={selectedPath}
                onSelectDocument={onSelectDocument}
                formatFileSize={formatFileSize}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // File node
  const isJson = node.document?.file_type === 'json';

  return (
    <button
      onClick={() => onSelectDocument(node.path)}
      className={cn(
        'w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm transition-colors',
        'hover:bg-accent',
        isSelected ? 'bg-accent text-accent-foreground' : 'text-foreground'
      )}
      style={{ paddingLeft: indent + 8 + 20 }} // Extra indent to align with folder names
    >
      {isJson ? (
        <FileJson className="w-4 h-4 text-amber-500 shrink-0" />
      ) : (
        <FileText className="w-4 h-4 text-blue-500 shrink-0" />
      )}
      <span className="truncate flex-1 text-left">{node.name}</span>
      {node.document && (
        <span className="text-xs text-muted-foreground shrink-0">
          {formatFileSize(node.document.size_bytes)}
        </span>
      )}
    </button>
  );
}

export function FolderTree({
  documents,
  selectedPath,
  onSelectDocument,
  formatFileSize,
}: FolderTreeProps) {
  // Start with all folders expanded
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => {
    const folders = new Set<string>();
    documents.forEach((doc) => {
      const parts = doc.relative_path.split('/');
      let path = '';
      for (let i = 0; i < parts.length - 1; i++) {
        path = path ? `${path}/${parts[i]}` : parts[i];
        folders.add(path);
      }
    });
    return folders;
  });

  const tree = useMemo(() => buildTree(documents), [documents]);

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const expandAll = () => {
    const folders = new Set<string>();
    documents.forEach((doc) => {
      const parts = doc.relative_path.split('/');
      let path = '';
      for (let i = 0; i < parts.length - 1; i++) {
        path = path ? `${path}/${parts[i]}` : parts[i];
        folders.add(path);
      }
    });
    setExpandedFolders(folders);
  };

  const collapseAll = () => {
    setExpandedFolders(new Set());
  };

  // Count folders
  const folderCount = useMemo(() => {
    const folders = new Set<string>();
    documents.forEach((doc) => {
      const parts = doc.relative_path.split('/');
      let path = '';
      for (let i = 0; i < parts.length - 1; i++) {
        path = path ? `${path}/${parts[i]}` : parts[i];
        folders.add(path);
      }
    });
    return folders.size;
  }, [documents]);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      {folderCount > 0 && (
        <div className="flex items-center gap-2 px-2 py-1.5 border-b">
          <button
            onClick={expandAll}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Expand All
          </button>
          <span className="text-muted-foreground">|</span>
          <button
            onClick={collapseAll}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Collapse All
          </button>
        </div>
      )}

      {/* Tree */}
      <div className="flex-1 overflow-auto py-1">
        {tree.map((node) => (
          <TreeNodeComponent
            key={node.path}
            node={node}
            depth={0}
            expandedFolders={expandedFolders}
            toggleFolder={toggleFolder}
            selectedPath={selectedPath}
            onSelectDocument={onSelectDocument}
            formatFileSize={formatFileSize}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="px-2 py-2 border-t text-xs text-muted-foreground">
        {documents.length} file{documents.length !== 1 ? 's' : ''}
        {folderCount > 0 && ` in ${folderCount} folder${folderCount !== 1 ? 's' : ''}`}
      </div>
    </div>
  );
}
