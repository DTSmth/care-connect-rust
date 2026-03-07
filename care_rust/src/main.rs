mod models;
mod handlers;
mod errors;
mod auth;

use axum::{routing::get, Json, Router};
use sqlx::postgres::PgPoolOptions;
use std::net::SocketAddr;
use axum::routing::{delete, patch, post, put};
use tower_http::cors::CorsLayer;
use tower_http::trace::TraceLayer;
use serde::Serialize;
use crate::handlers::{auth_handler, client_handler, employee_handler, occurrence_handler, service_handler, shift_handler, user_handler};

#[derive(Serialize)]
struct Status {
    status: String,
    db_connected: bool,
}

#[tokio::main]
async fn main() {
    // Task 9: Structured logging (replaces Logback/SLF4J)
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    // Task 8: Environment configuration (replaces application.properties)
    dotenvy::dotenv().ok();
    let db_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    std::env::var("JWT_SECRET").expect("JWT_SECRET must be set");

    // Task 7: Connection pooling (replaces HikariCP)
    let pool = PgPoolOptions::new()
        .max_connections(20)
        .acquire_timeout(std::time::Duration::from_secs(5))
        .connect(&db_url)
        .await
        .expect("Failed to connect to Postgres");

    // Task 6: Run migrations on startup (replaces spring.jpa.hibernate.ddl-auto)
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("Failed to run database migrations");

    tracing::info!("Migrations applied successfully");

    //Change for prod
    let cors = CorsLayer::permissive();

    let app = Router::new()
        .route("/", get(hello_world))
        .route("/health", get(health_check))
        // Auth routes (Task 3)
        .route("/login", post(auth_handler::login))
        .route("/register", post(auth_handler::register))
        // User routes
        .route("/users", get(user_handler::get_all_users))
        .route("/users/:id", get(user_handler::get_user_by_id))
        .route("/users", post(user_handler::create_user))
        // Client routes
        .route("/clients", get(client_handler::get_clients))
        .route("/clients", post(client_handler::create_client))
        .route("/clients/:id", get(client_handler::get_client_by_id))
        .route("/clients/:id", put(client_handler::update_client))
        .route("/clients/:id", delete(client_handler::delete_client))
        .route("/services", get(service_handler::get_services))
        // Employee CRUD routes
        .route("/employees", get(employee_handler::get_all_employees))
        .route("/employees", post(employee_handler::create_employee))
        .route("/employees/:id", get(employee_handler::get_employee_by_id))
        .route("/employees/:id", put(employee_handler::update_employee))
        .route("/employees/:id", delete(employee_handler::delete_employee))
        // Employee preference & matching routes
        .route("/employees/:id/preferences", get(employee_handler::get_preferences))
        .route("/employees/:id/preferences", put(employee_handler::upsert_preferences))
        .route("/employees/:id/matches", get(employee_handler::get_matches))
        // Shift routes
        .route("/shifts", get(shift_handler::get_shifts))
        .route("/shifts", post(shift_handler::create_shift))
        .route("/shifts/:id", get(shift_handler::get_shift_by_id))
        .route("/shifts/:id", put(shift_handler::update_shift))
        .route("/shifts/:id", delete(shift_handler::delete_shift))
        .route("/shifts/:id/assign", post(shift_handler::assign_shift))
        .route("/shifts/:id/matching", patch(shift_handler::set_matching))
        // Shift occurrence routes
        .route("/shifts/:id/occurrences", get(occurrence_handler::get_shift_occurrences))
        .route("/shifts/:id/occurrences", post(occurrence_handler::create_occurrence))
        // Calendar view
        .route("/calendar", get(occurrence_handler::get_calendar))
        // Individual occurrence management
        .route("/occurrences/:id", get(occurrence_handler::get_occurrence_by_id))
        .route("/occurrences/:id", put(occurrence_handler::update_occurrence))
        .route("/occurrences/:id", delete(occurrence_handler::delete_occurrence))
        .layer(TraceLayer::new_for_http())
        .layer(cors)
        .with_state(pool);

    let addr = SocketAddr::from(([127, 0, 0, 1], 9000));
    tracing::info!("Server started at {}", addr);
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn hello_world() -> &'static str {
    "Welcome to Care Rust "
}

async fn health_check() -> Json<Status> {
    Json(Status {
        status: "Up".to_string(),
        db_connected: true,
    })
}