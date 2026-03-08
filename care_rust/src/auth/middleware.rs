use axum::{extract::Request, http::StatusCode, middleware::Next, response::Response};

use crate::auth::jwt::verify_token;

/// Middleware: rejects requests without a valid `Authorization: Bearer <token>` header.
/// Apply this to any router that should require authentication.
pub async fn require_auth(request: Request, next: Next) -> Result<Response, StatusCode> {
    let secret = std::env::var("JWT_SECRET")
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let auth_header = request
        .headers()
        .get("Authorization")
        .and_then(|v| v.to_str().ok())
        .ok_or(StatusCode::UNAUTHORIZED)?;

    let token = auth_header
        .strip_prefix("Bearer ")
        .ok_or(StatusCode::UNAUTHORIZED)?;

    verify_token(token, &secret).map_err(|_| StatusCode::UNAUTHORIZED)?;

    Ok(next.run(request).await)
}

/// Middleware: adds standard HTTP security headers to every response.
pub async fn security_headers(request: Request, next: Next) -> Response {
    let mut response = next.run(request).await;
    let headers = response.headers_mut();

    // Prevent clickjacking
    headers.insert(
        "x-frame-options",
        "DENY".parse().unwrap(),
    );
    // Prevent MIME sniffing
    headers.insert(
        "x-content-type-options",
        "nosniff".parse().unwrap(),
    );
    // XSS filter (legacy browsers)
    headers.insert(
        "x-xss-protection",
        "1; mode=block".parse().unwrap(),
    );
    // Don't send full referrer to cross-origin destinations
    headers.insert(
        "referrer-policy",
        "strict-origin-when-cross-origin".parse().unwrap(),
    );
    // HSTS — only meaningful over HTTPS (Cloud Run uses HTTPS)
    headers.insert(
        "strict-transport-security",
        "max-age=31536000; includeSubDomains".parse().unwrap(),
    );

    response
}
