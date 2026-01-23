use std::path::{Path, PathBuf};

use axum::{
    Extension, Router,
    extract::{Path as AxumPath, Request, State},
    http::StatusCode,
    middleware::{Next, from_fn_with_state},
    response::{Json as ResponseJson, Response},
    routing::{get, post},
};
use db::models::project::Project;
use deployment::Deployment;
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use uuid::Uuid;
use utils::response::ApiResponse;

use crate::{DeploymentImpl, error::ApiError, middleware::load_project_middleware};

/// Default branch name for document operations
const DEFAULT_DOCS_BRANCH: &str = "main";

/// Require the repository to be on the main branch for document editing.
/// Returns the current branch name if on main, otherwise returns an error.
/// Documents can only be edited on the main branch - other branches are read-only.
fn require_main_branch(deployment: &DeploymentImpl, repo_path: &Path) -> Result<String, ApiError> {
    let git = deployment.git();
    
    // Get current branch
    let current_branch = git
        .get_current_branch(repo_path)
        .map_err(|e| ApiError::BadRequest(format!("Failed to get current branch: {e}")))?;
    
    // If on main, allow editing
    if current_branch == DEFAULT_DOCS_BRANCH {
        return Ok(current_branch);
    }
    
    // Not on main - document editing is not allowed
    Err(ApiError::Forbidden(format!(
        "Document editing is only allowed on the '{}' branch. Current branch: '{}'. Please switch to '{}' to edit documents.",
        DEFAULT_DOCS_BRANCH,
        current_branch,
        DEFAULT_DOCS_BRANCH
    )))
}

/// Document file type
#[derive(Debug, Clone, Serialize, Deserialize, TS, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum DocumentFileType {
    Markdown,
    Json,
}

/// Metadata for a document file
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct DocumentMetadata {
    /// File name (just the name, not the path)
    pub name: String,
    /// Relative path from repo root (e.g., "docs/README.md")
    pub relative_path: String,
    /// Absolute path on filesystem
    pub absolute_path: String,
    pub file_type: DocumentFileType,
    pub size_bytes: u64,
}

/// Content of a document file
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct DocumentContent {
    pub metadata: DocumentMetadata,
    pub content: String,
}

/// List documents response
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct ListDocumentsResponse {
    pub documents: Vec<DocumentMetadata>,
}

/// Request body for updating document content
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct UpdateDocumentRequest {
    pub content: String,
}

/// Response for document update
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct UpdateDocumentResponse {
    pub success: bool,
    pub message: String,
    /// The branch where the document was saved
    pub branch: Option<String>,
    /// Whether changes were committed
    pub committed: bool,
}

/// Request body for creating a folder
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct CreateFolderRequest {
    /// Relative path for the new folder (e.g., "seed_docs/subfolder")
    pub path: String,
}

/// Response for folder creation
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct CreateFolderResponse {
    pub success: bool,
    pub message: String,
    pub path: String,
}

/// Request body for creating a file
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct CreateFileRequest {
    /// Relative path for the new file (e.g., "seed_docs/new-doc.md")
    pub path: String,
    /// Optional initial content
    pub content: Option<String>,
}

/// Response for file creation
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct CreateFileResponse {
    pub success: bool,
    pub message: String,
    pub metadata: DocumentMetadata,
    /// The branch where the file was created
    pub branch: Option<String>,
    /// Whether changes were committed
    pub committed: bool,
}

/// Directories to skip during recursive scanning
const EXCLUDED_DIRS: &[&str] = &[
    "node_modules",
    ".git",
    "target",
    "dist",
    "build",
    ".next",
    "__pycache__",
    ".venv",
    "venv",
    ".cache",
    ".turbo",
    "coverage",
    ".nyc_output",
    ".parcel-cache",
    ".svelte-kit",
    ".nuxt",
    ".output",
];

/// Recursively scan a directory for markdown and JSON files
fn scan_directory_recursive(
    base_path: &Path,
    current_path: &Path,
    documents: &mut Vec<DocumentMetadata>,
) {
    let entries = match std::fs::read_dir(current_path) {
        Ok(entries) => entries,
        Err(e) => {
            tracing::warn!("Failed to read directory {:?}: {}", current_path, e);
            return;
        }
    };

    for entry in entries.flatten() {
        let path = entry.path();
        let file_name = match path.file_name() {
            Some(name) => name.to_string_lossy().to_string(),
            None => continue,
        };

        // Skip hidden files/directories (starting with .)
        if file_name.starts_with('.') {
            continue;
        }

        if path.is_dir() {
            // Check if directory should be excluded
            if EXCLUDED_DIRS.contains(&file_name.as_str()) {
                continue;
            }
            // Recursively scan subdirectory
            scan_directory_recursive(base_path, &path, documents);
        } else if path.is_file() {
            // Check file extension
            let file_type = match path.extension().and_then(|e| e.to_str()) {
                Some("md") | Some("markdown") => DocumentFileType::Markdown,
                Some("json") => DocumentFileType::Json,
                _ => continue, // Skip non-markdown/json files
            };

            // Get relative path from base
            let relative_path = match path.strip_prefix(base_path) {
                Ok(rel) => rel.to_string_lossy().to_string(),
                Err(_) => continue,
            };

            // Get file size
            let size_bytes = match entry.metadata() {
                Ok(meta) => meta.len(),
                Err(_) => 0,
            };

            documents.push(DocumentMetadata {
                name: file_name,
                relative_path,
                absolute_path: path.to_string_lossy().to_string(),
                file_type,
                size_bytes,
            });
        }
    }
}

/// List markdown and JSON files from project repositories (including subdirectories)
pub async fn list_project_documents(
    State(deployment): State<DeploymentImpl>,
    Extension(project): Extension<Project>,
) -> Result<ResponseJson<ApiResponse<ListDocumentsResponse>>, ApiError> {
    let repositories = deployment
        .project()
        .get_repositories(&deployment.db().pool, project.id)
        .await?;

    let mut documents = Vec::new();

    for repo in repositories {
        let repo_path = PathBuf::from(&repo.path);

        if !repo_path.exists() || !repo_path.is_dir() {
            continue;
        }

        // Recursively scan the repository directory
        scan_directory_recursive(&repo_path, &repo_path, &mut documents);
    }

    // Sort by relative path (puts files in folders together)
    documents.sort_by(|a, b| a.relative_path.to_lowercase().cmp(&b.relative_path.to_lowercase()));

    Ok(ResponseJson(ApiResponse::success(ListDocumentsResponse {
        documents,
    })))
}

/// Middleware for loading project with wildcard path
async fn load_project_with_wildcard(
    State(deployment): State<DeploymentImpl>,
    AxumPath((id, _path)): AxumPath<(Uuid, String)>,
    mut request: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    let project = match Project::find_by_id(&deployment.db().pool, id).await {
        Ok(Some(p)) => p,
        Ok(None) => return Err(StatusCode::NOT_FOUND),
        Err(_) => return Err(StatusCode::INTERNAL_SERVER_ERROR),
    };
    request.extensions_mut().insert(project);
    Ok(next.run(request).await)
}

/// Get content of a specific document by relative path
pub async fn get_document_content(
    State(deployment): State<DeploymentImpl>,
    Extension(project): Extension<Project>,
    AxumPath((_id, relative_path)): AxumPath<(Uuid, String)>,
) -> Result<ResponseJson<ApiResponse<DocumentContent>>, ApiError> {
    let repositories = deployment
        .project()
        .get_repositories(&deployment.db().pool, project.id)
        .await?;

    // Decode the URL-encoded path
    let decoded_path = urlencoding::decode(&relative_path)
        .map_err(|_| ApiError::BadRequest("Invalid path encoding".to_string()))?
        .to_string();

    // Search for the file in all repositories
    for repo in repositories {
        let repo_path = PathBuf::from(&repo.path);
        let file_path = repo_path.join(&decoded_path);

        // Security: Ensure the file is within the repository
        let canonical_repo = match repo_path.canonicalize() {
            Ok(p) => p,
            Err(_) => continue,
        };

        let canonical_file = match file_path.canonicalize() {
            Ok(p) => p,
            Err(_) => continue,
        };

        if !canonical_file.starts_with(&canonical_repo) {
            return Err(ApiError::BadRequest(
                "Invalid file path: access denied".to_string(),
            ));
        }

        if file_path.exists() && file_path.is_file() {
            // Determine file type
            let file_type = match file_path.extension().and_then(|e| e.to_str()) {
                Some("md") | Some("markdown") => DocumentFileType::Markdown,
                Some("json") => DocumentFileType::Json,
                _ => {
                    return Err(ApiError::BadRequest(
                        "Only markdown and JSON files are supported".to_string(),
                    ))
                }
            };

            // Read file content
            let content = match std::fs::read_to_string(&file_path) {
                Ok(c) => c,
                Err(e) => {
                    tracing::error!("Failed to read file {:?}: {}", file_path, e);
                    return Err(ApiError::BadRequest(format!(
                        "Failed to read file: {}",
                        e
                    )));
                }
            };

            // Get file name
            let name = file_path
                .file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_else(|| decoded_path.clone());

            // Get file size
            let size_bytes = match std::fs::metadata(&file_path) {
                Ok(meta) => meta.len(),
                Err(_) => 0,
            };

            return Ok(ResponseJson(ApiResponse::success(DocumentContent {
                metadata: DocumentMetadata {
                    name,
                    relative_path: decoded_path,
                    absolute_path: file_path.to_string_lossy().to_string(),
                    file_type,
                    size_bytes,
                },
                content,
            })));
        }
    }

    Err(ApiError::BadRequest(format!(
        "Document '{}' not found in project repositories",
        decoded_path
    )))
}

/// Update content of a specific document by relative path
pub async fn update_document_content(
    State(deployment): State<DeploymentImpl>,
    Extension(project): Extension<Project>,
    AxumPath((_id, relative_path)): AxumPath<(Uuid, String)>,
    ResponseJson(body): ResponseJson<UpdateDocumentRequest>,
) -> Result<ResponseJson<ApiResponse<UpdateDocumentResponse>>, ApiError> {
    let repositories = deployment
        .project()
        .get_repositories(&deployment.db().pool, project.id)
        .await?;

    // Decode the URL-encoded path
    let decoded_path = urlencoding::decode(&relative_path)
        .map_err(|_| ApiError::BadRequest("Invalid path encoding".to_string()))?
        .to_string();

    // Search for the file in all repositories
    for repo in repositories {
        let repo_path = PathBuf::from(&repo.path);
        let file_path = repo_path.join(&decoded_path);

        // Security: Ensure the file is within the repository
        let canonical_repo = match repo_path.canonicalize() {
            Ok(p) => p,
            Err(_) => continue,
        };

        let canonical_file = match file_path.canonicalize() {
            Ok(p) => p,
            Err(_) => continue,
        };

        if !canonical_file.starts_with(&canonical_repo) {
            return Err(ApiError::BadRequest(
                "Invalid file path: access denied".to_string(),
            ));
        }

        if file_path.exists() && file_path.is_file() {
            // Verify file type (only allow markdown and JSON)
            match file_path.extension().and_then(|e| e.to_str()) {
                Some("md") | Some("markdown") | Some("json") => {}
                _ => {
                    return Err(ApiError::BadRequest(
                        "Only markdown and JSON files are supported".to_string(),
                    ))
                }
            };

            // Ensure we're on the main branch before modifying documents
            let current_branch = require_main_branch(&deployment, &repo_path)?;

            // Write content to file
            match std::fs::write(&file_path, &body.content) {
                Ok(_) => {
                    tracing::info!("Document updated: {:?}", file_path);

                    // Auto-commit the changes
                    let commit_message = format!("docs: update {}", decoded_path);
                    let committed = match deployment.git().commit(&repo_path, &commit_message) {
                        Ok(true) => {
                            tracing::info!(
                                "Auto-committed document change to branch {:?}: {}",
                                current_branch,
                                decoded_path
                            );
                            true
                        }
                        Ok(false) => {
                            tracing::debug!("No changes to commit for document: {}", decoded_path);
                            false
                        }
                        Err(e) => {
                            tracing::warn!("Failed to auto-commit document change: {}", e);
                            false
                        }
                    };

                    return Ok(ResponseJson(ApiResponse::success(UpdateDocumentResponse {
                        success: true,
                        message: if committed {
                            format!("Document saved and committed to branch '{}'", &current_branch)
                        } else {
                            "Document saved successfully".to_string()
                        },
                        branch: Some(current_branch),
                        committed,
                    })));
                }
                Err(e) => {
                    tracing::error!("Failed to write file {:?}: {}", file_path, e);
                    return Err(ApiError::BadRequest(format!(
                        "Failed to save file: {}",
                        e
                    )));
                }
            }
        }
    }

    Err(ApiError::BadRequest(format!(
        "Document '{}' not found in project repositories",
        decoded_path
    )))
}

/// Create a new folder in the project repository
pub async fn create_folder(
    State(deployment): State<DeploymentImpl>,
    Extension(project): Extension<Project>,
    ResponseJson(body): ResponseJson<CreateFolderRequest>,
) -> Result<ResponseJson<ApiResponse<CreateFolderResponse>>, ApiError> {
    let repositories = deployment
        .project()
        .get_repositories(&deployment.db().pool, project.id)
        .await?;

    // Get the first repository (primary repository)
    let repo = repositories.first().ok_or_else(|| {
        ApiError::BadRequest("No repository found for this project".to_string())
    })?;

    let repo_path = PathBuf::from(&repo.path);

    if !repo_path.exists() || !repo_path.is_dir() {
        return Err(ApiError::BadRequest(
            "Repository path does not exist".to_string(),
        ));
    }

    // Validate the path (no path traversal)
    let folder_path = body.path.trim();
    if folder_path.is_empty() {
        return Err(ApiError::BadRequest("Folder path cannot be empty".to_string()));
    }
    if folder_path.contains("..") {
        return Err(ApiError::BadRequest(
            "Invalid path: path traversal not allowed".to_string(),
        ));
    }

    let full_path = repo_path.join(folder_path);

    // Security: Ensure the path is within the repository
    let canonical_repo = repo_path.canonicalize().map_err(|e| {
        ApiError::BadRequest(format!("Failed to resolve repository path: {}", e))
    })?;

    // For new paths, we need to check the parent exists and is within repo
    if let Some(parent) = full_path.parent() {
        if parent.exists() {
            let canonical_parent = parent.canonicalize().map_err(|e| {
                ApiError::BadRequest(format!("Failed to resolve parent path: {}", e))
            })?;
            if !canonical_parent.starts_with(&canonical_repo) {
                return Err(ApiError::BadRequest(
                    "Invalid path: access denied".to_string(),
                ));
            }
        }
    }

    // Check if folder already exists
    if full_path.exists() {
        return Err(ApiError::BadRequest(format!(
            "Folder '{}' already exists",
            folder_path
        )));
    }

    // Ensure we're on the main branch before creating folders
    require_main_branch(&deployment, &repo_path)?;

    // Create the folder
    std::fs::create_dir_all(&full_path).map_err(|e| {
        tracing::error!("Failed to create folder {:?}: {}", full_path, e);
        ApiError::BadRequest(format!("Failed to create folder: {}", e))
    })?;

    tracing::info!("Folder created: {:?}", full_path);

    Ok(ResponseJson(ApiResponse::success(CreateFolderResponse {
        success: true,
        message: "Folder created successfully".to_string(),
        path: folder_path.to_string(),
    })))
}

/// Create a new markdown file in the project repository
pub async fn create_file(
    State(deployment): State<DeploymentImpl>,
    Extension(project): Extension<Project>,
    ResponseJson(body): ResponseJson<CreateFileRequest>,
) -> Result<ResponseJson<ApiResponse<CreateFileResponse>>, ApiError> {
    let repositories = deployment
        .project()
        .get_repositories(&deployment.db().pool, project.id)
        .await?;

    // Get the first repository (primary repository)
    let repo = repositories.first().ok_or_else(|| {
        ApiError::BadRequest("No repository found for this project".to_string())
    })?;

    let repo_path = PathBuf::from(&repo.path);

    if !repo_path.exists() || !repo_path.is_dir() {
        return Err(ApiError::BadRequest(
            "Repository path does not exist".to_string(),
        ));
    }

    // Validate the path (no path traversal)
    let file_path_str = body.path.trim();
    if file_path_str.is_empty() {
        return Err(ApiError::BadRequest("File path cannot be empty".to_string()));
    }
    if file_path_str.contains("..") {
        return Err(ApiError::BadRequest(
            "Invalid path: path traversal not allowed".to_string(),
        ));
    }

    // Validate file extension (only markdown allowed)
    let path_obj = Path::new(file_path_str);
    match path_obj.extension().and_then(|e| e.to_str()) {
        Some("md") | Some("markdown") => {}
        _ => {
            return Err(ApiError::BadRequest(
                "Only markdown files (.md, .markdown) are allowed".to_string(),
            ))
        }
    }

    let full_path = repo_path.join(file_path_str);

    // Security: Ensure the path is within the repository
    let canonical_repo = repo_path.canonicalize().map_err(|e| {
        ApiError::BadRequest(format!("Failed to resolve repository path: {}", e))
    })?;

    // For new paths, we need to check the parent exists and is within repo
    if let Some(parent) = full_path.parent() {
        if parent.exists() {
            let canonical_parent = parent.canonicalize().map_err(|e| {
                ApiError::BadRequest(format!("Failed to resolve parent path: {}", e))
            })?;
            if !canonical_parent.starts_with(&canonical_repo) {
                return Err(ApiError::BadRequest(
                    "Invalid path: access denied".to_string(),
                ));
            }
        } else {
            // Create parent directories if they don't exist
            std::fs::create_dir_all(parent).map_err(|e| {
                ApiError::BadRequest(format!("Failed to create parent directories: {}", e))
            })?;
        }
    }

    // Check if file already exists
    if full_path.exists() {
        return Err(ApiError::BadRequest(format!(
            "File '{}' already exists",
            file_path_str
        )));
    }

    // Ensure we're on the main branch before creating documents
    let current_branch = require_main_branch(&deployment, &repo_path)?;

    // Write content to file
    let content = body.content.unwrap_or_default();
    std::fs::write(&full_path, &content).map_err(|e| {
        tracing::error!("Failed to create file {:?}: {}", full_path, e);
        ApiError::BadRequest(format!("Failed to create file: {}", e))
    })?;

    tracing::info!("File created: {:?}", full_path);

    // Auto-commit the new file
    let commit_message = format!("docs: create {}", file_path_str);
    let committed = match deployment.git().commit(&repo_path, &commit_message) {
        Ok(true) => {
            tracing::info!(
                "Auto-committed new document to branch {:?}: {}",
                current_branch,
                file_path_str
            );
            true
        }
        Ok(false) => {
            tracing::debug!("No changes to commit for new document: {}", file_path_str);
            false
        }
        Err(e) => {
            tracing::warn!("Failed to auto-commit new document: {}", e);
            false
        }
    };

    // Get file name
    let name = full_path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| file_path_str.to_string());

    Ok(ResponseJson(ApiResponse::success(CreateFileResponse {
        success: true,
        message: if committed {
            format!("File created and committed to branch '{}'", &current_branch)
        } else {
            "File created successfully".to_string()
        },
        metadata: DocumentMetadata {
            name,
            relative_path: file_path_str.to_string(),
            absolute_path: full_path.to_string_lossy().to_string(),
            file_type: DocumentFileType::Markdown,
            size_bytes: content.len() as u64,
        },
        branch: Some(current_branch),
        committed,
    })))
}

/// Response for getting current branch
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct GetBranchResponse {
    /// Current branch name of the primary repository
    pub branch: String,
    /// Whether this is the expected docs branch (main)
    pub is_docs_branch: bool,
}

/// Get the current branch of the project's primary repository
pub async fn get_current_branch(
    State(deployment): State<DeploymentImpl>,
    Extension(project): Extension<Project>,
) -> Result<ResponseJson<ApiResponse<GetBranchResponse>>, ApiError> {
    let repositories = deployment
        .project()
        .get_repositories(&deployment.db().pool, project.id)
        .await?;

    // Get the first repository (primary repository)
    let repo = repositories.first().ok_or_else(|| {
        ApiError::BadRequest("No repository found for this project".to_string())
    })?;

    let repo_path = PathBuf::from(&repo.path);

    let current_branch = deployment
        .git()
        .get_current_branch(&repo_path)
        .map_err(|e| ApiError::BadRequest(format!("Failed to get current branch: {e}")))?;

    let is_docs_branch = current_branch == DEFAULT_DOCS_BRANCH;

    Ok(ResponseJson(ApiResponse::success(GetBranchResponse {
        branch: current_branch,
        is_docs_branch,
    })))
}

/// Response for listing branches
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct ListBranchesResponse {
    /// List of branch names
    pub branches: Vec<BranchInfo>,
    /// Current branch name
    pub current_branch: String,
}

/// Branch info
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct BranchInfo {
    pub name: String,
    pub is_current: bool,
    pub is_remote: bool,
}

/// Get all branches of the project's primary repository
pub async fn list_branches(
    State(deployment): State<DeploymentImpl>,
    Extension(project): Extension<Project>,
) -> Result<ResponseJson<ApiResponse<ListBranchesResponse>>, ApiError> {
    let repositories = deployment
        .project()
        .get_repositories(&deployment.db().pool, project.id)
        .await?;

    let repo = repositories.first().ok_or_else(|| {
        ApiError::BadRequest("No repository found for this project".to_string())
    })?;

    let repo_path = PathBuf::from(&repo.path);

    let git_branches = deployment
        .git()
        .get_all_branches(&repo_path)
        .map_err(|e| ApiError::BadRequest(format!("Failed to get branches: {e}")))?;

    let current_branch = deployment
        .git()
        .get_current_branch(&repo_path)
        .unwrap_or_else(|_| "unknown".to_string());

    let branches: Vec<BranchInfo> = git_branches
        .into_iter()
        .map(|b| BranchInfo {
            name: b.name,
            is_current: b.is_current,
            is_remote: b.is_remote,
        })
        .collect();

    Ok(ResponseJson(ApiResponse::success(ListBranchesResponse {
        branches,
        current_branch,
    })))
}

/// Request for switching branch
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct SwitchBranchRequest {
    pub branch: String,
}

/// Response for switching branch
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct SwitchBranchResponse {
    pub success: bool,
    pub branch: String,
    pub message: String,
    /// Whether changes were stashed during the switch
    pub stashed: bool,
}

/// Switch to a different branch in the project's primary repository
pub async fn switch_branch(
    State(deployment): State<DeploymentImpl>,
    Extension(project): Extension<Project>,
    ResponseJson(body): ResponseJson<SwitchBranchRequest>,
) -> Result<ResponseJson<ApiResponse<SwitchBranchResponse>>, ApiError> {
    let repositories = deployment
        .project()
        .get_repositories(&deployment.db().pool, project.id)
        .await?;

    let repo = repositories.first().ok_or_else(|| {
        ApiError::BadRequest("No repository found for this project".to_string())
    })?;

    let repo_path = PathBuf::from(&repo.path);

    // Checkout to the requested branch, automatically stashing changes if needed
    let stashed = deployment
        .git()
        .checkout_with_stash(&repo_path, &body.branch)
        .map_err(|e| {
            ApiError::BadRequest(format!(
                "Failed to switch to branch '{}': {}",
                body.branch, e
            ))
        })?;

    let message = if stashed {
        tracing::info!(
            "Switched to branch '{}' in repository {:?} (changes were stashed and restored)",
            body.branch,
            repo_path
        );
        format!(
            "Switched to branch '{}' (changes were stashed and restored)",
            body.branch
        )
    } else {
        tracing::info!(
            "Switched to branch '{}' in repository {:?}",
            body.branch,
            repo_path
        );
        format!("Switched to branch '{}'", body.branch)
    };

    Ok(ResponseJson(ApiResponse::success(SwitchBranchResponse {
        success: true,
        branch: body.branch.clone(),
        message,
        stashed,
    })))
}

/// Response for sync status
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct SyncStatusResponse {
    /// Number of commits ahead of origin/main (local changes not pushed)
    pub commits_ahead: usize,
    /// Number of commits behind origin/main (remote changes not pulled)
    pub commits_behind: usize,
    /// Whether sync is possible (on main branch)
    pub can_sync: bool,
    /// Whether rebase is needed before pushing
    pub needs_rebase: bool,
    /// Current branch name
    pub current_branch: String,
    /// Error message if any
    pub error: Option<String>,
}

/// Get sync status for the project's documents
pub async fn get_sync_status(
    State(deployment): State<DeploymentImpl>,
    Extension(project): Extension<Project>,
) -> Result<ResponseJson<ApiResponse<SyncStatusResponse>>, ApiError> {
    let repositories = deployment
        .project()
        .get_repositories(&deployment.db().pool, project.id)
        .await?;

    let repo = repositories.first().ok_or_else(|| {
        ApiError::BadRequest("No repository found for this project".to_string())
    })?;

    let repo_path = PathBuf::from(&repo.path);

    // Get current branch
    let current_branch = deployment
        .git()
        .get_current_branch(&repo_path)
        .unwrap_or_else(|_| "unknown".to_string());

    let is_main = current_branch == DEFAULT_DOCS_BRANCH;

    // If not on main, can't sync
    if !is_main {
        return Ok(ResponseJson(ApiResponse::success(SyncStatusResponse {
            commits_ahead: 0,
            commits_behind: 0,
            can_sync: false,
            needs_rebase: false,
            current_branch,
            error: Some("Must be on main branch to sync documents".to_string()),
        })));
    }

    // Try to fetch from origin to get latest status
    if let Err(e) = deployment.git().fetch(&repo_path, "origin", "main") {
        tracing::warn!("Failed to fetch from origin: {}", e);
        return Ok(ResponseJson(ApiResponse::success(SyncStatusResponse {
            commits_ahead: 0,
            commits_behind: 0,
            can_sync: false,
            needs_rebase: false,
            current_branch,
            error: Some(format!("Failed to fetch from origin: {}", e)),
        })));
    }

    // Get ahead/behind counts
    let (ahead, behind) = deployment
        .git()
        .get_ahead_behind(&repo_path, "main", "origin/main")
        .unwrap_or((0, 0));

    Ok(ResponseJson(ApiResponse::success(SyncStatusResponse {
        commits_ahead: ahead,
        commits_behind: behind,
        can_sync: is_main,
        needs_rebase: behind > 0,
        current_branch,
        error: None,
    })))
}

/// Request for syncing documents
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct SyncRequest {
    /// If true, will rebase before pushing when behind origin
    #[serde(default)]
    pub allow_rebase: bool,
}

/// Response for syncing documents
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct SyncResponse {
    pub success: bool,
    pub commits_pushed: usize,
    pub message: String,
    /// Whether rebase was performed
    pub rebased: bool,
}

/// Sync documents to origin/main
pub async fn sync_documents(
    State(deployment): State<DeploymentImpl>,
    Extension(project): Extension<Project>,
    ResponseJson(body): ResponseJson<SyncRequest>,
) -> Result<ResponseJson<ApiResponse<SyncResponse>>, ApiError> {
    let repositories = deployment
        .project()
        .get_repositories(&deployment.db().pool, project.id)
        .await?;

    let repo = repositories.first().ok_or_else(|| {
        ApiError::BadRequest("No repository found for this project".to_string())
    })?;

    let repo_path = PathBuf::from(&repo.path);

    // Must be on main branch
    let current_branch = deployment
        .git()
        .get_current_branch(&repo_path)
        .map_err(|e| ApiError::BadRequest(format!("Failed to get current branch: {}", e)))?;

    if current_branch != DEFAULT_DOCS_BRANCH {
        return Err(ApiError::BadRequest(
            "Must be on main branch to sync documents".to_string(),
        ));
    }

    // Fetch to get latest state
    deployment
        .git()
        .fetch(&repo_path, "origin", "main")
        .map_err(|e| ApiError::BadRequest(format!("Failed to fetch from origin: {}", e)))?;

    // Check ahead/behind
    let (ahead, behind) = deployment
        .git()
        .get_ahead_behind(&repo_path, "main", "origin/main")
        .unwrap_or((0, 0));

    // If behind, need rebase
    let rebased = if behind > 0 {
        if !body.allow_rebase {
            return Err(ApiError::BadRequest(format!(
                "Remote has {} new commit(s). Please pull changes first or enable rebase.",
                behind
            )));
        }

        // Pull with rebase
        deployment
            .git()
            .pull_rebase(&repo_path, "origin", "main")
            .map_err(|e| {
                ApiError::BadRequest(format!("Failed to rebase: {}. Please resolve conflicts manually.", e))
            })?;

        tracing::info!("Rebased {} commits from origin/main", behind);
        true
    } else {
        false
    };

    // If nothing to push, return early
    if ahead == 0 && !rebased {
        return Ok(ResponseJson(ApiResponse::success(SyncResponse {
            success: true,
            commits_pushed: 0,
            message: "Already up to date".to_string(),
            rebased: false,
        })));
    }

    // Get remote URL and push
    let remote_url = deployment
        .git()
        .get_remote_url(&repo_path, "origin")
        .map_err(|e| ApiError::BadRequest(format!("Failed to get remote URL: {}", e)))?;

    deployment
        .git()
        .push(&repo_path, &remote_url, "main", false)
        .map_err(|e| ApiError::BadRequest(format!("Failed to push to origin: {}", e)))?;

    tracing::info!(
        "Pushed {} commits to origin/main (rebased: {})",
        ahead,
        rebased
    );

    Ok(ResponseJson(ApiResponse::success(SyncResponse {
        success: true,
        commits_pushed: ahead,
        message: if rebased {
            format!(
                "Synced {} commit(s) after rebasing {} remote commit(s)",
                ahead, behind
            )
        } else {
            format!("Synced {} commit(s) to origin/main", ahead)
        },
        rebased,
    })))
}

pub fn router(deployment: &DeploymentImpl) -> Router<DeploymentImpl> {
    // Router for listing documents and creating folders/files (no wildcard path)
    let list_router = Router::new()
        .route("/", get(list_project_documents))
        .route("/branch", get(get_current_branch))
        .route("/branches", get(list_branches))
        .route("/switch-branch", post(switch_branch))
        .route("/sync-status", get(get_sync_status))
        .route("/sync", post(sync_documents))
        .route("/folders", post(create_folder))
        .route("/files", post(create_file))
        .layer(from_fn_with_state(
            deployment.clone(),
            load_project_middleware,
        ));

    // Router for getting/updating document content (with wildcard path)
    let content_router = Router::new()
        .route(
            "/{*relative_path}",
            get(get_document_content).put(update_document_content),
        )
        .layer(from_fn_with_state(
            deployment.clone(),
            load_project_with_wildcard,
        ));

    Router::new()
        .nest("/projects/{id}/documents", list_router.merge(content_router))
}
