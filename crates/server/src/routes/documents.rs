use std::path::{Path, PathBuf};

use axum::{
    Extension, Router,
    extract::{Path as AxumPath, Request, State},
    http::StatusCode,
    middleware::{Next, from_fn_with_state},
    response::{Json as ResponseJson, Response},
    routing::{get, put},
};
use db::models::project::Project;
use deployment::Deployment;
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use uuid::Uuid;
use utils::response::ApiResponse;

use crate::{DeploymentImpl, error::ApiError, middleware::load_project_middleware};

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

            // Write content to file
            match std::fs::write(&file_path, &body.content) {
                Ok(_) => {
                    tracing::info!("Document updated: {:?}", file_path);
                    return Ok(ResponseJson(ApiResponse::success(UpdateDocumentResponse {
                        success: true,
                        message: "Document saved successfully".to_string(),
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

pub fn router(deployment: &DeploymentImpl) -> Router<DeploymentImpl> {
    // Router for listing documents (no wildcard path)
    let list_router = Router::new()
        .route("/", get(list_project_documents))
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
