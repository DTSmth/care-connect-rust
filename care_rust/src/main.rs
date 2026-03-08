mod models;
mod handlers;
mod errors;
mod auth;

use axum::{routing::get, Json, Router};
use sqlx::postgres::PgPoolOptions;
use std::net::SocketAddr;
use axum::routing::{delete, patch, post, put};
use tower_http::cors::{CorsLayer, AllowOrigin};
use tower_http::trace::TraceLayer;
use tower_http::services::{ServeDir, ServeFile};
use serde::Serialize;
use axum::http::{HeaderValue, Method};
use crate::handlers::{auth_handler, client_handler, employee_handler, occurrence_handler, service_handler, shift_handler, user_handler};

#[derive(Serialize)]
struct Status {
    status: String,
    db_connected: bool,
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    dotenvy::dotenv().ok();
    let db_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    std::env::var("JWT_SECRET").expect("JWT_SECRET must be set");

    // Cloud Run injects PORT; fall back to 8080
    let port: u16 = std::env::var("PORT")
        .unwrap_or_else(|_| "8080".to_string())
        .parse()
        .expect("PORT must be a number");

    let pool = PgPoolOptions::new()
        .max_connections(20)
        .acquire_timeout(std::time::Duration::from_secs(5))
        .connect(&db_url)
        .await
        .expect("Failed to connect to Postgres");

    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("Failed to run database migrations");

    tracing::info!("Migrations applied successfully");

    // In production set ALLOWED_ORIGIN to your Cloud Run URL.
    // If unset (local dev) fall back to permissive.
    let cors = match std::env::var("ALLOWED_ORIGIN") {
        Ok(origin) => {
            let value = HeaderValue::from_str(&origin).expect("Invalid ALLOWED_ORIGIN");
            CorsLayer::new()
                .allow_origin(AllowOrigin::exact(value))
                .allow_methods([
                    Method::GET, Method::POST, Method::PUT,
                    Method::PATCH, Method::DELETE, Method::OPTIONS,
                ])
                .allow_headers(tower_http::cors::Any)
        }
        Err(_) => CorsLayer::permissive(),
    };

    // Serve compiled React app from ./frontend (copied in by Dockerfile)
    let frontend_dir = std::env::var("FRONTEND_DIR")
        .unwrap_or_else(|_| "./frontend".to_string());
    let index_html = format!("{}/index.html", frontend_dir);

    let api_routes = Router::new()
        .route("/health", get(health_check))
        .route("/login", post(auth_handler::login))
        .route("/register", post(auth_handler::register))
        .route("/users", get(user_handler::get_all_users))
        .route("/users/:id", get(user_handler::get_user_by_id))
        .route("/users", post(user_handler::create_user))
        .route("/clients", get(client_handler::get_clients))
        .route("/clients", post(client_handler::create_client))
        .route("/clients/:id", get(client_handler::get_client_by_id))
        .route("/clients/:id", put(client_handler::update_client))
        .route("/clients/:id", delete(client_handler::delete_client))
        .route("/services", get(service_handler::get_services))
        .route("/employees", get(employee_handler::get_all_employees))
        .route("/employees", post(employee_handler::create_employee))
        .route("/employees/:id", get(employee_handler::get_employee_by_id))
        .route("/employees/:id", put(employee_handler::update_employee))
        .route("/employees/:id", delete(employee_handler::delete_employee))
        .route("/employees/:id/preferences", get(employee_handler::get_preferences))
        .route("/employees/:id/preferences", put(employee_handler::upsert_preferences))
        .route("/employees/:id/matches", get(employee_handler::get_matches))
        .route("/matches", post(employee_handler::anonymous_match))
        .route("/shifts", get(shift_handler::get_shifts))
        .route("/shifts", post(shift_handler::create_shift))
        .route("/shifts/:id", get(shift_handler::get_shift_by_id))
        .route("/shifts/:id", put(shift_handler::update_shift))
        .route("/shifts/:id", delete(shift_handler::delete_shift))
        .route("/shifts/:id/assign", post(shift_handler::assign_shift))
        .route("/shifts/:id/matching", patch(shift_handler::set_matching))
        .route("/shifts/:id/occurrences", get(occurrence_handler::get_shift_occurrences))
        .route("/shifts/:id/occurrences", post(occurrence_handler::create_occurrence))
        .route("/calendar", get(occurrence_handler::get_calendar))
        .route("/occurrences/:id", get(occurrence_handler::get_occurrence_by_id))
        .route("/occurrences/:id", put(occurrence_handler::update_occurrence))
        .route("/occurrences/:id", delete(occurrence_handler::delete_occurrence))
        .layer(TraceLayer::new_for_http())
        .layer(cors)
        .with_state(pool);

    // SPA fallback: unmatched paths serve index.html so React Router works
    let app = api_routes.fallback_service(
        ServeDir::new(&frontend_dir).fallback(ServeFile::new(&index_html))
    );

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("Server listening on {}", addr);
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}


async fn health_check() -> Json<Status> {
    Json(Status {
        status: "Up".to_string(),
        db_connected: true,
    })
}
