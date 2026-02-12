mod models;
mod handlers;

use axum::{routing::get, Json, Router};
use sqlx::postgres::PgPoolOptions;
use std::net::SocketAddr;
use axum::routing::{delete, post, put};
use tower_http::cors::CorsLayer;
use serde::Serialize;
use crate::handlers::{client_handler, user_handler};

#[derive(Serialize)]
struct Status {
    status: String,
    db_connected: bool,
}

#[tokio::main]
async fn main() {
    // Load .env and connect to postgres
    dotenvy::dotenv().ok();
    let db_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");

    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&db_url)
        .await
        .expect("Failed to connect to Postgres");

    //Change for prod
    let cors = CorsLayer::permissive();

    let app = Router::new()
        .route("/", get(hello_world))
        .route("/health", get(health_check))
        .route("/users", get(user_handler::get_all_users))
        .route("/users/:id", get(user_handler::get_user_by_id))
        .route("/users", post(user_handler::create_user))
        .route("/clients", get(client_handler::get_clients))
        .route("/clients", post(client_handler::create_client))
        .route("/clients/:id", get(client_handler::get_client_by_id))
        .route("/clients/:id", put(client_handler::update_client))
        .route("/clients/:id", delete(client_handler::delete_client))
        .layer(cors)
        .with_state(pool);

    let addr = SocketAddr::from(([127, 0, 0, 1], 8080));
    println!("Server started at{}", addr);
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn hello_world() -> &'static str {
    "Welcome to Care Rust "
}

async fn health_check() -> Json<Status> {
    Json(Status {
        status: "Up".to_string(),
        db_connected: false,
    })
}