use axum::{extract::{State, Path}, http::StatusCode, Json};
use sqlx::PgPool;
use crate::models::{CreateClientRequest, Client};

pub async fn get_all_clients(
    State(pool): State<PgPool>,
) -> Result<Json<Vec<Client>>, StatusCode> {
    let clients = sqlx::query_as::<_, Client>("select * FROM client")
        .fetch_all(&pool)
        .await
        .map_err(|e| {
            eprintln!("Database error: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    Ok(Json(clients))
}