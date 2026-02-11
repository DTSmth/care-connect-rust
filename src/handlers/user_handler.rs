use axum::{extract::{State, Path}, http::StatusCode, Json};
use sqlx::PgPool;
use crate::models::{CreateUserRequest, User};

pub async fn get_all_users(
    State(pool): State<PgPool>,
) -> Result<Json<Vec<User>>, StatusCode> {
    let users = sqlx::query_as::<_, User>("Select * FROM app_user")
        .fetch_all(&pool)
        .await
        .map_err(|e| {
            eprintln!("Database error: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    Ok(Json(users))
}

pub async fn get_user_by_id(
    State(pool): State<PgPool>,
    Path(id): Path<i32>,
) -> Result<Json<User>, StatusCode> {
    let user = sqlx::query_as::<_, User>("SELECT * FROM app_user WHERE id = $1")
        .bind(id)
        .fetch_one(&pool)
        .await
        .map_err(|_| StatusCode::NOT_FOUND)?;

    Ok(Json(user))
}

pub async fn create_user(
    State(pool): State<PgPool>,
    Json(payload): Json<CreateUserRequest>, // Extracts JSON body
) -> Result<(StatusCode, Json<User>), StatusCode> {

    let new_user = sqlx::query_as::<_, User>(
        "INSERT INTO app_user (username, password_hash, role, display_name)
         VALUES ($1, $2, $3, $4)
         RETURNING *" // Returns the created row including the new user_id
    )
        .bind(&payload.username)
        .bind(&payload.password_hash)
        .bind(&payload.role)
        .bind(&payload.display_name)
        .fetch_one(&pool)
        .await
        .map_err(|e| {
            eprintln!("Error creating user: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    // Return 201 Created with the new user object
    Ok((StatusCode::CREATED, Json(new_user)))
}