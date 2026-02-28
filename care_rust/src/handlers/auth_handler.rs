use axum::{extract::State, http::StatusCode, Json};
use sqlx::PgPool;
use validator::Validate;

use crate::{
    auth::{
        hash::{hash_password, verify_password},
        jwt::create_token,
    },
    errors::AppError,
    models::{LoginRequest, LoginResponseDto, RegisterUserDto, User},
};

/// POST /login — verifies credentials and returns a signed JWT.
pub async fn login(
    State(pool): State<PgPool>,
    Json(payload): Json<LoginRequest>,
) -> Result<Json<LoginResponseDto>, AppError> {
    let user = sqlx::query_as::<_, User>("SELECT * FROM app_user WHERE username = $1")
        .bind(&payload.username)
        .fetch_one(&pool)
        .await
        .map_err(|_| AppError::AuthError("Invalid credentials".to_string()))?;

    let valid = verify_password(&payload.password, &user.password_hash)
        .map_err(|_| AppError::AuthError("Invalid credentials".to_string()))?;

    if !valid {
        return Err(AppError::AuthError("Invalid credentials".to_string()));
    }

    let secret = std::env::var("JWT_SECRET")
        .map_err(|_| AppError::InternalError("JWT_SECRET not set".to_string()))?;

    let token = create_token(&user.username, &user.role, &secret)
        .map_err(|_| AppError::InternalError("Failed to create token".to_string()))?;

    tracing::info!("User '{}' logged in", user.username);
    Ok(Json(LoginResponseDto { token, user }))
}

/// POST /register — validates input, hashes password, inserts user.
pub async fn register(
    State(pool): State<PgPool>,
    Json(payload): Json<RegisterUserDto>,
) -> Result<(StatusCode, Json<User>), AppError> {
    payload
        .validate()
        .map_err(|e| AppError::ValidationError(e.to_string()))?;

    if payload.password != payload.confirm_password {
        return Err(AppError::ValidationError(
            "Passwords do not match".to_string(),
        ));
    }

    let hashed = hash_password(&payload.password)
        .map_err(|_| AppError::InternalError("Failed to hash password".to_string()))?;

    let user = sqlx::query_as::<_, User>(
        "INSERT INTO app_user (username, password_hash, role) VALUES ($1, $2, $3) RETURNING *",
    )
    .bind(&payload.username)
    .bind(&hashed)
    .bind(&payload.role)
    .fetch_one(&pool)
    .await?;

    tracing::info!("Registered new user '{}'", user.username);
    Ok((StatusCode::CREATED, Json(user)))
}
