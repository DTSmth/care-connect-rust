use axum::{extract::{State, Extension}, http::{StatusCode, HeaderMap}, Json};
use sqlx::PgPool;
use validator::Validate;

use crate::{
    auth::{
        hash::{hash_password, verify_password},
        jwt::{create_token, Claims},
        rate_limit::LoginRateLimiter,
    },
    errors::AppError,
    models::{LoginRequest, LoginResponseDto, RegisterUserDto, User},
};

/// POST /login — verifies credentials and returns a signed JWT.
/// Rate-limited: 10 failed attempts per IP per 15 minutes.
pub async fn login(
    State(pool): State<PgPool>,
    Extension(limiter): Extension<LoginRateLimiter>,
    headers: HeaderMap,
    Json(payload): Json<LoginRequest>,
) -> Result<Json<LoginResponseDto>, AppError> {
    // Extract client IP from X-Forwarded-For (Cloud Run sets this) or fall back
    let ip = headers
        .get("x-forwarded-for")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.split(',').next())
        .map(|s| s.trim().to_string())
        .unwrap_or_else(|| "unknown".to_string());

    if limiter.is_blocked(&ip) {
        tracing::warn!(ip, "Login blocked — rate limit exceeded");
        return Err(AppError::AuthError(
            "Too many login attempts. Please try again later.".to_string(),
        ));
    }

    let user_result = sqlx::query_as::<_, User>("SELECT * FROM app_user WHERE username = $1")
        .bind(&payload.username)
        .fetch_one(&pool)
        .await
        .map_err(|_| AppError::AuthError("Invalid credentials".to_string()));

    let user = match user_result {
        Ok(u) => u,
        Err(e) => {
            limiter.record_failure(&ip);
            return Err(e);
        }
    };

    let valid = verify_password(&payload.password, &user.password_hash)
        .map_err(|_| AppError::AuthError("Invalid credentials".to_string()))?;

    if !valid {
        limiter.record_failure(&ip);
        return Err(AppError::AuthError("Invalid credentials".to_string()));
    }

    limiter.record_success(&ip);

    let secret = std::env::var("JWT_SECRET")
        .map_err(|_| AppError::InternalError("JWT_SECRET not set".to_string()))?;

    let token = create_token(&user.username, &user.role, &secret)
        .map_err(|_| AppError::InternalError("Failed to create token".to_string()))?;

    tracing::info!(username = %user.username, "User logged in");
    Ok(Json(LoginResponseDto { token, user }))
}

/// POST /register — admin only; validates input, hashes password, inserts user.
pub async fn register(
    claims: Claims,
    State(pool): State<PgPool>,
    Json(payload): Json<RegisterUserDto>,
) -> Result<(StatusCode, Json<User>), AppError> {
    if claims.role != "admin" {
        return Err(AppError::ForbiddenError("Forbidden: admin only".to_string()));
    }

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
