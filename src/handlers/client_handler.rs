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

pub async fn get_client_by_id(
    State(pool): State<PgPool>,
    Path(id): Path<i32>,
) -> Result<Json<Client>, StatusCode> {
    let client = sqlx::query_as::<_, Client>("Select * FROM client WHERE id = $1")
        .bind(id)
        .fetch_one((&pool))
        .await
        .map_err(|_| StatusCode::NOT_FOUND)?;

    Ok(Json(client))
}