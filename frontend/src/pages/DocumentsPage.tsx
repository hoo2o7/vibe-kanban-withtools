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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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

  // Refresh documents list
  const refreshDocuments = useCallback(async () => {
    if (!projectId) return;
    try {
      const response = await documentsApi.list(projectId);
      setDocuments(response.documents);
      setFilteredDocuments(response.documents);
    } catch (err) {
      console.error('Failed to refresh documents:', err);
    }
  }, [projectId]);

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
