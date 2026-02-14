use axum::{
    extract::{State, Path, Query},
    http::StatusCode,
    Json
};
use sqlx::PgPool;
use serde::Deserialize;
use crate::models::{Client, ClientFilters, UpdateClientRequest};


// 1. GET with Filtering
pub async fn get_clients(
    State(pool): State<PgPool>,
    Query(filters): Query<ClientFilters>,
) -> Result<Json<Vec<Client>>, StatusCode> {
    let clients = match (filters.first_name, filters.last_name, filters.zipcode) {
        (Some(f), Some(l), _) => {
            sqlx::query_as::<_, Client>("SELECT * FROM client WHERE first_name = $1 AND last_name = $2")
                .bind(f).bind(l).fetch_all(&pool).await
        }
        (_, _, Some(z)) => {
            sqlx::query_as::<_, Client>("SELECT * FROM client WHERE zipcode = $1")
                .bind(z).fetch_all(&pool).await
        }
        _ => {
            sqlx::query_as::<_, Client>("SELECT * FROM client").fetch_all(&pool).await
        }
    }.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(clients))
}

pub async fn get_client_by_id(
    State(pool): State<PgPool>,
    Path(id): Path<i32>, // This extracts the {id} from the URL
) -> Result<Json<Client>, StatusCode> {
    let client = sqlx::query_as::<_, Client>("SELECT * FROM client WHERE client_id = $1")
        .bind(id)
        .fetch_one(&pool)
        .await
        .map_err(|e| {
            match e {
                sqlx::Error::RowNotFound => StatusCode::NOT_FOUND,
                _ => StatusCode::INTERNAL_SERVER_ERROR,
            }
        })?;

    Ok(Json(client))
}

// 2. POST (Create)
pub async fn create_client(
    State(pool): State<PgPool>,
    Json(payload): Json<Client>, // Assuming Client struct matches DB
) -> Result<(StatusCode, Json<Client>), StatusCode> {
    let new_client = sqlx::query_as::<_, Client>(
        "INSERT INTO client (first_name, last_name, has_personal_care, has_lifting, address_1, address_2, zipcode, phone_number)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *"
    )
        .bind(&payload.first_name).bind(&payload.last_name)
        .bind(payload.has_personal_care).bind(payload.has_lifting)
        .bind(&payload.address_1).bind(&payload.address_2)
        .bind(&payload.zipcode).bind(&payload.phone_number)
        .fetch_one(&pool).await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok((StatusCode::CREATED, Json(new_client)))
}

// 3. PUT (Update)
pub async fn update_client(
    State(pool): State<PgPool>,
    Path(id): Path<i32>, // The ID from the URL
    Json(payload): Json<UpdateClientRequest>, // The body from React
) -> Result<Json<Client>, StatusCode> {
    let updated_client = sqlx::query_as::<_, Client>(
        "UPDATE client SET
            first_name = $1, last_name = $2, has_personal_care = $3,
            has_lifting = $4, address_1 = $5, address_2 = $6,
            zipcode = $7, phone_number = $8
         WHERE client_id = $9
         RETURNING *"
    )
        .bind(&payload.first_name)
        .bind(&payload.last_name)
        .bind(payload.has_personal_care)
        .bind(payload.has_lifting)
        .bind(&payload.address_1)
        .bind(&payload.address_2)
        .bind(&payload.zipcode)
        .bind(&payload.phone_number)
        .bind(id) // The ID from Path(id)
        .fetch_one(&pool)
        .await
        .map_err(|_| StatusCode::NOT_FOUND)?;

    Ok(Json(updated_client))
}

// 4. DELETE
pub async fn delete_client(
    State(pool): State<PgPool>,
    Path(id): Path<i32>,
) -> Result<StatusCode, StatusCode> {
    sqlx::query("DELETE FROM client WHERE client_id = $1")
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(StatusCode::NO_CONTENT)
}