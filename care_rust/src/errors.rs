use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;

#[derive(Debug)]
pub enum AppError {
    AuthError(String),
    ForbiddenError(String),
    DbError(sqlx::Error),
    NotFound,
    ValidationError(String),
    InternalError(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match self {
            AppError::AuthError(msg) => (StatusCode::UNAUTHORIZED, msg),
            AppError::ForbiddenError(msg) => (StatusCode::FORBIDDEN, msg),
            AppError::DbError(e) => match e {
                sqlx::Error::RowNotFound => {
                    (StatusCode::NOT_FOUND, "Resource not found".to_string())
                }
                _ => {
                    tracing::error!("Database error: {:?}", e);
                    (StatusCode::INTERNAL_SERVER_ERROR, "Database error".to_string())
                }
            },
            AppError::NotFound => (StatusCode::NOT_FOUND, "Resource not found".to_string()),
            AppError::ValidationError(msg) => (StatusCode::BAD_REQUEST, msg),
            AppError::InternalError(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg),
        };

        (status, Json(json!({ "error": message }))).into_response()
    }
}

impl From<sqlx::Error> for AppError {
    fn from(e: sqlx::Error) -> Self {
        AppError::DbError(e)
    }
}
