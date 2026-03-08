use axum::{extract::{State, Path}, http::StatusCode, Json};
use sqlx::PgPool;
use crate::auth::{hash::hash_password, jwt::Claims};
use crate::errors::AppError;
use crate::models::{CreateUserRequest, User};

/// GET /users — admin only
pub async fn get_all_users(
    claims: Claims,
    State(pool): State<PgPool>,
) -> Result<Json<Vec<User>>, AppError> {
    if claims.role != "admin" {
        return Err(AppError::ForbiddenError("Forbidden: admin only".to_string()));
    }
    let users = sqlx::query_as::<_, User>("SELECT * FROM app_user")
        .fetch_all(&pool)
        .await?;
    Ok(Json(users))
}

/// GET /users/:id — admin only
pub async fn get_user_by_id(
    claims: Claims,
    State(pool): State<PgPool>,
    Path(id): Path<i32>,
) -> Result<Json<User>, AppError> {
    if claims.role != "admin" {
        return Err(AppError::ForbiddenError("Forbidden: admin only".to_string()));
    }
    let user = sqlx::query_as::<_, User>("SELECT * FROM app_user WHERE user_id = $1")
        .bind(id)
        .fetch_one(&pool)
        .await?;
    Ok(Json(user))
}

/// POST /users — admin only; accepts plain-text password and hashes it
pub async fn create_user(
    claims: Claims,
    State(pool): State<PgPool>,
    Json(payload): Json<CreateUserRequest>,
) -> Result<(StatusCode, Json<User>), AppError> {
    if claims.role != "admin" {
        return Err(AppError::ForbiddenError("Forbidden: admin only".to_string()));
    }

    let hashed = hash_password(&payload.password)
        .map_err(|_| AppError::InternalError("Failed to hash password".to_string()))?;

    let new_user = sqlx::query_as::<_, User>(
        "INSERT INTO app_user (username, password_hash, role, display_name)
         VALUES ($1, $2, $3, $4)
         RETURNING *",
    )
    .bind(&payload.username)
    .bind(&hashed)
    .bind(&payload.role)
    .bind(&payload.display_name)
    .fetch_one(&pool)
    .await?;

    tracing::info!("Admin '{}' created user '{}'", claims.sub, new_user.username);
    Ok((StatusCode::CREATED, Json(new_user)))
}
