import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  FileJson,
  Loader2,
  Search,
  FileCode,
  LayoutGrid,
  TreeDeciduous,
  GitBranch,
  ChevronDown,
  Check,
  Upload,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { documentsApi } from '@/lib/api';
import { useProjects } from '@/hooks/useProjects';
import { TiptapMarkdownViewer } from '@/components/documents/TiptapMarkdownViewer';
import { JsonTreeView } from '@/components/documents/JsonTreeView';
import { FolderTree } from '@/components/documents/FolderTree';
import {
  CreateFolderDialog,
  CreateFileDialog,
} from '@/components/documents/dialogs';
import {
  ConceptualModelViewer,
  UserStoriesViewer,
  TasksViewer,
  NotificationScenariosViewer,
} from '@/components/documents/viewers';
import { detectSpecialJsonType } from '@/utils/jsonViewerUtils';
import type { DocumentMetadata, DocumentContent } from 'shared/types';

type ViewMode = 'content' | 'diagram' | 'tree' | 'raw';

export function DocumentsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { projectsById } = useProjects();

  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<DocumentMetadata[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocumentContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingContent, setLoadingContent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('content');
  const [currentBranch, setCurrentBranch] = useState<string | null>(null);
  const [isDocsBranch, setIsDocsBranch] = useState(true);
  const [branches, setBranches] = useState<Array<{ name: string; is_current: boolean; is_remote: boolean }>>([]);
  const [branchPopoverOpen, setBranchPopoverOpen] = useState(false);
  const [switchingBranch, setSwitchingBranch] = useState(false);
  // Sync status
  const [syncStatus, setSyncStatus] = useState<{
    commits_ahead: number;
    commits_behind: number;
    can_sync: boolean;
    needs_rebase: boolean;
    error: string | null;
  } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const initialLoadDone = useRef(false);

  const project = projectId ? projectsById[projectId] : null;

  // Load document content by relative path
  const loadDocument = useCallback(
    async (relativePath: string) => {
      if (!projectId) return;

      setLoadingContent(true);
      try {
        const content = await documentsApi.get(projectId, relativePath);
        setSelectedDoc(content);

        // Set appropriate view mode based on file type
        if (content.metadata.file_type === 'json') {
          const specialType = detectSpecialJsonType(content.metadata.name);
          // If it's a special JSON type, default to 'diagram' (visualization)
          // Otherwise, default to 'tree'
          setViewMode(specialType !== null ? 'diagram' : 'tree');
        } else {
          setViewMode('content');
        }
      } catch (err) {
        console.error('Failed to load document:', err);
        setError('Failed to load document content');
      } finally {
        setLoadingContent(false);
      }
    },
    [projectId]
  );

  // Load documents list
  useEffect(() => {
    if (!projectId) return;

    const loadDocuments = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await documentsApi.list(projectId);
        setDocuments(response.documents);
        setFilteredDocuments(response.documents);

        // Auto-select first document (only on initial load)
        if (response.documents.length > 0 && !initialLoadDone.current) {
          initialLoadDone.current = true;
          loadDocument(response.documents[0].relative_path);
        }
      } catch (err) {
        console.error('Failed to load documents:', err);
        setError('Failed to load documents');
      } finally {
        setLoading(false);
      }
    };

    loadDocuments();
  }, [projectId, loadDocument]);

  // Load current branch info and branch list
  const loadBranchInfo = useCallback(async () => {
    if (!projectId) return;

    try {
      const [branchResponse, branchesResponse] = await Promise.all([
        documentsApi.getBranch(projectId),
        documentsApi.listBranches(projectId),
      ]);
      setCurrentBranch(branchResponse.branch);
      setIsDocsBranch(branchResponse.is_docs_branch);
      setBranches(branchesResponse.branches);
    } catch (err) {
      console.error('Failed to load branch info:', err);
      // Non-critical, don't set error
    }
  }, [projectId]);

  // Load sync status (only on main branch)
  const loadSyncStatus = useCallback(async () => {
    if (!projectId || !isDocsBranch) {
      setSyncStatus(null);
      return;
    }

    try {
      const status = await documentsApi.getSyncStatus(projectId);
      setSyncStatus({
        commits_ahead: status.commits_ahead,
        commits_behind: status.commits_behind,
        can_sync: status.can_sync,
        needs_rebase: status.needs_rebase,
        error: status.error,
      });
    } catch (err) {
      console.error('Failed to load sync status:', err);
      setSyncStatus(null);
    }
  }, [projectId, isDocsBranch]);

  useEffect(() => {
    loadBranchInfo();
  }, [loadBranchInfo]);

  // Load sync status when on main branch
  useEffect(() => {
    loadSyncStatus();
  }, [loadSyncStatus]);

  // Refresh documents list (used after branch switch)
  const refreshDocuments = useCallback(async () => {
    if (!projectId) return;

    setLoading(true);
    try {
      const response = await documentsApi.list(projectId);
      setDocuments(response.documents);
      setFilteredDocuments(response.documents);
      // Clear selected document when switching branches
      setSelectedDoc(null);
    } catch (err) {
      console.error('Failed to refresh documents:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Handle branch switch
  const handleSwitchBranch = async (branchName: string) => {
    if (!projectId || branchName === currentBranch) {
      setBranchPopoverOpen(false);
      return;
    }

    setSwitchingBranch(true);
    try {
      await documentsApi.switchBranch(projectId, branchName);
      // Reload branch info and documents
      await Promise.all([loadBranchInfo(), refreshDocuments()]);
      setBranchPopoverOpen(false);
    } catch (err) {
      console.error('Failed to switch branch:', err);
      setError(`Failed to switch to branch '${branchName}'`);
    } finally {
      setSwitchingBranch(false);
    }
  };

  // Handle sync to origin/main
  const handleSync = async (allowRebase: boolean = false) => {
    if (!projectId || !isDocsBranch) return;

    setSyncing(true);
    setError(null);
    try {
      const result = await documentsApi.sync(projectId, allowRebase);
      // Show success message
      if (result.rebased) {
        console.log(`Synced ${result.commits_pushed} commits after rebasing`);
      } else {
        console.log(`Synced ${result.commits_pushed} commits to origin/main`);
      }
      // Refresh sync status
      await loadSyncStatus();
    } catch (err) {
      console.error('Failed to sync:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to sync documents';
      setError(errorMessage);
    } finally {
      setSyncing(false);
    }
  };

  // Filter documents by search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredDocuments(documents);
      return;
    }
    const query = searchQuery.toLowerCase();
    const filtered = documents.filter(
      (doc) =>
        doc.name.toLowerCase().includes(query) ||
        doc.relative_path.toLowerCase().includes(query)
    );
    setFilteredDocuments(filtered);
  }, [documents, searchQuery]);

  const handleBack = () => {
    navigate(`/projects/${projectId}/tasks`);
  };

  const formatFileSize = (bytes: number | bigint) => {
    const size = Number(bytes);
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Get existing names in a folder for validation
  const getExistingNames = useCallback((parentPath: string) => {
    const prefix = parentPath ? `${parentPath}/` : '';
    return documents
      .filter((doc) => {
        if (parentPath) {
          return doc.relative_path.startsWith(prefix);
        }
        return !doc.relative_path.includes('/');
      })
      .map((doc) => {
        const relativePart = parentPath
          ? doc.relative_path.slice(prefix.length)
          : doc.relative_path;
        const firstSegment = relativePart.split('/')[0];
        return firstSegment;
      })
      .filter((name, index, self) => self.indexOf(name) === index);
  }, [documents]);

  // Handle create folder
  const handleCreateFolder = useCallback(async (parentPath: string) => {
    if (!projectId) return;

    const existingNames = getExistingNames(parentPath);
    const result = await CreateFolderDialog.show({
      parentPath,
      existingNames,
    });

    if (result.action === 'created' && result.fullPath) {
      try {
        // Create folder with a placeholder README.md to make it visible in the tree
        const readmePath = `${result.fullPath}/README.md`;
        await documentsApi.createFile(projectId, readmePath, `# ${result.folderName}\n`);
        await refreshDocuments();
      } catch (err) {
        console.error('Failed to create folder:', err);
        setError(err instanceof Error ? err.message : 'Failed to create folder');
      }
    }
  }, [projectId, getExistingNames, refreshDocuments]);

  // Handle create file
  const handleCreateFile = useCallback(async (parentPath: string) => {
    if (!projectId) return;

    const existingNames = getExistingNames(parentPath);
    const result = await CreateFileDialog.show({
      parentPath,
      existingNames,
    });

    if (result.action === 'created' && result.fullPath) {
      try {
        const response = await documentsApi.createFile(projectId, result.fullPath, '');
        await refreshDocuments();
        // Auto-select the new file
        loadDocument(response.metadata.relative_path);
      } catch (err) {
        console.error('Failed to create file:', err);
        setError(err instanceof Error ? err.message : 'Failed to create file');
      }
    }
  }, [projectId, getExistingNames, refreshDocuments, loadDocument]);

  const isJson = selectedDoc?.metadata.file_type === 'json';
  const specialJsonType = selectedDoc
    ? detectSpecialJsonType(selectedDoc.metadata.name)
    : null;
  const hasCustomViewer = specialJsonType !== null;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b bg-background">
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div className="h-6 w-px bg-border" />
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">
            Project Documents
            {project && (
              <span className="text-muted-foreground font-normal">
                {' '}
                - {project.name}
              </span>
            )}
          </h1>
        </div>
        {currentBranch && (
          <>
            <div className="h-6 w-px bg-border" />
            <DropdownMenu open={branchPopoverOpen} onOpenChange={setBranchPopoverOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm cursor-pointer hover:opacity-80 transition-opacity ${
                    isDocsBranch
                      ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                      : 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                  }`}
                  disabled={switchingBranch}
                >
                  {switchingBranch ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <GitBranch className="w-3.5 h-3.5" />
                  )}
                  <span className="font-medium">{currentBranch}</span>
                  <ChevronDown className="w-3 h-3 opacity-60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64" align="start">
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Switch branch
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {branches.length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground text-center">
                    No branches found
                  </div>
                ) : (
                  <div className="max-h-64 overflow-auto">
                    {/* Local branches */}
                    {branches
                      .filter(b => !b.is_remote)
                      .map((branch) => (
                        <DropdownMenuItem
                          key={branch.name}
                          className={`flex items-center gap-2 cursor-pointer ${
                            branch.name === currentBranch ? 'bg-muted/50' : ''
                          }`}
                          onClick={() => handleSwitchBranch(branch.name)}
                          disabled={switchingBranch}
                        >
                          <GitBranch className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                          <span className="truncate flex-1">{branch.name}</span>
                          {branch.name === currentBranch && (
                            <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                          )}
                          {branch.name === 'main' && branch.name !== currentBranch && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-600 dark:text-green-400">
                              docs
                            </span>
                          )}
                        </DropdownMenuItem>
                      ))}

                    {/* Remote branches separator */}
                    {branches.some(b => b.is_remote) && branches.some(b => !b.is_remote) && (
                      <DropdownMenuSeparator />
                    )}

                    {/* Remote branches */}
                    {branches
                      .filter(b => b.is_remote)
                      .map((branch) => (
                        <div
                          key={branch.name}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground opacity-60"
                        >
                          <GitBranch className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate flex-1 text-xs">{branch.name}</span>
                        </div>
                      ))}
                  </div>
                )}
                {!isDocsBranch && (
                  <>
                    <DropdownMenuSeparator />
                    <div className="p-2 bg-yellow-500/5">
                      <p className="text-xs text-yellow-600 dark:text-yellow-400">
                        Tip: Switch to 'main' branch for document editing
                      </p>
                    </div>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Sync Status & Button (only on main branch) */}
        {isDocsBranch && (
          <div className="flex items-center gap-2">
            {syncStatus ? (
              <>
                {/* Commits ahead badge */}
                {syncStatus.commits_ahead > 0 && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <span className="font-medium">{syncStatus.commits_ahead}</span>
                    <span className="text-xs">
                      {syncStatus.commits_ahead === 1 ? 'commit' : 'commits'}
                    </span>
                  </div>
                )}

                {/* Needs rebase warning */}
                {syncStatus.needs_rebase && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span className="text-xs">
                      {syncStatus.commits_behind} behind
                    </span>
                  </div>
                )}

                {/* Sync button */}
                {syncStatus.commits_ahead > 0 || syncStatus.needs_rebase ? (
                  <Button
                    size="sm"
                    variant={syncStatus.needs_rebase ? 'outline' : 'default'}
                    onClick={() => handleSync(syncStatus.needs_rebase)}
                    disabled={syncing || !syncStatus.can_sync}
                    className="gap-1.5"
                  >
                    {syncing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    {syncStatus.needs_rebase ? 'Pull & Sync' : 'Sync'}
                  </Button>
                ) : (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm text-muted-foreground">
                    <Check className="w-3.5 h-3.5" />
                    <span className="text-xs">Up to date</span>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span className="text-xs">Checking sync status...</span>
              </div>
            )}
          </div>
        )}

        {/* Read-only indicator for non-main branches */}
        {!isDocsBranch && currentBranch && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm bg-muted text-muted-foreground">
            <span className="text-xs">Read-only (switch to main to edit)</span>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex flex-1 min-h-0 min-w-0">
        {/* Sidebar - File List */}
        <div className="w-72 border-r flex flex-col bg-muted/30">
          {/* Search */}
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* File List */}
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="text-center py-8 text-destructive text-sm px-4">
                {error}
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm px-4">
                No markdown or JSON files found
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm px-4">
                No files match your search
              </div>
            ) : (
              <FolderTree
                documents={filteredDocuments}
                selectedPath={selectedDoc?.metadata.relative_path || null}
                onSelectDocument={loadDocument}
                formatFileSize={formatFileSize}
                onCreateFolder={handleCreateFolder}
                onCreateFile={handleCreateFile}
              />
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          {loadingContent ? (
            <div className="flex items-center justify-center flex-1">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : selectedDoc ? (
            <>
              {/* Content Header with Tabs */}
              <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
                <div className="flex items-center gap-2 min-w-0">
                  {isJson ? (
                    <FileJson className="w-4 h-4 text-amber-500 shrink-0" />
                  ) : (
                    <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                  )}
                  <span className="font-medium text-sm truncate" title={selectedDoc.metadata.relative_path}>
                    {selectedDoc.metadata.relative_path}
                  </span>
                </div>

                <div className="flex items-center gap-1 bg-muted rounded-lg p-1 shrink-0">
                  {isJson ? (
                    <>
                      {/* Show visualization tab only for special JSON types */}
                      {hasCustomViewer && (
                        <Button
                          variant={viewMode === 'diagram' ? 'secondary' : 'ghost'}
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setViewMode('diagram')}
                        >
                          <LayoutGrid className="w-3 h-3 mr-1" />
                          시각화
                        </Button>
                      )}
                      <Button
                        variant={viewMode === 'tree' ? 'secondary' : 'ghost'}
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setViewMode('tree')}
                      >
                        <TreeDeciduous className="w-3 h-3 mr-1" />
                        Tree
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant={viewMode === 'content' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setViewMode('content')}
                    >
                      <FileText className="w-3 h-3 mr-1" />
                      Content
                    </Button>
                  )}
                  <Button
                    variant={viewMode === 'raw' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setViewMode('raw')}
                  >
                    <FileCode className="w-3 h-3 mr-1" />
                    Raw
                  </Button>
                </div>
              </div>

              {/* Content Body */}
              <div className="flex-1 min-h-0 overflow-hidden">
                {viewMode === 'content' && !isJson && projectId && (
                  <div className="h-full overflow-auto p-6">
                    <TiptapMarkdownViewer
                      content={selectedDoc.content}
                      projectId={projectId}
                      relativePath={selectedDoc.metadata.relative_path}
                      readOnly={!isDocsBranch}
                    />
                  </div>
                )}

                {viewMode === 'diagram' && isJson && hasCustomViewer && (
                  <>
                    {specialJsonType === 'conceptual_model' && (
                      <ConceptualModelViewer
                        content={selectedDoc.content}
                        className="h-full"
                      />
                    )}
                    {specialJsonType === 'user_stories_data' && (
                      <UserStoriesViewer
                        content={selectedDoc.content}
                        className="h-full"
                      />
                    )}
                    {specialJsonType === 'tasks' && (
                      <TasksViewer
                        content={selectedDoc.content}
                        className="h-full"
                      />
                    )}
                    {specialJsonType === 'notification_scenarios' && (
                      <NotificationScenariosViewer
                        content={selectedDoc.content}
                        className="h-full"
                      />
                    )}
                  </>
                )}

                {viewMode === 'tree' && isJson && (
                  <JsonTreeView
                    content={selectedDoc.content}
                    className="h-full"
                  />
                )}

                {viewMode === 'raw' && (
                  <div className="h-full overflow-auto p-4">
                    <pre className="text-sm font-mono bg-muted p-4 rounded-lg overflow-auto whitespace-pre-wrap">
                      {selectedDoc.content}
                    </pre>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center flex-1 text-muted-foreground">
              <div className="text-center">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Select a document to view</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
