use axum::{extract::{State, Path}, http::StatusCode, Json};
use sqlx::PgPool;
use crate::errors::AppError;
use crate::models::{CreateUserRequest, User};

pub async fn get_all_users(
    State(pool): State<PgPool>,
) -> Result<Json<Vec<User>>, AppError> {
    let users = sqlx::query_as::<_, User>("SELECT * FROM app_user")
        .fetch_all(&pool)
        .await?;
    Ok(Json(users))
}

pub async fn get_user_by_id(
    State(pool): State<PgPool>,
    Path(id): Path<i32>,
) -> Result<Json<User>, AppError> {
    let user = sqlx::query_as::<_, User>("SELECT * FROM app_user WHERE user_id = $1")
        .bind(id)
        .fetch_one(&pool)
        .await?;
    Ok(Json(user))
}

pub async fn create_user(
    State(pool): State<PgPool>,
    Json(payload): Json<CreateUserRequest>,
) -> Result<(StatusCode, Json<User>), AppError> {
    let new_user = sqlx::query_as::<_, User>(
        "INSERT INTO app_user (username, password_hash, role, display_name)
         VALUES ($1, $2, $3, $4)
         RETURNING *",
    )
    .bind(&payload.username)
    .bind(&payload.password_hash)
    .bind(&payload.role)
    .bind(&payload.display_name)
    .fetch_one(&pool)
    .await?;

    Ok((StatusCode::CREATED, Json(new_user)))
}