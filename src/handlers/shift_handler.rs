use axum::{extract::{State, Path, Query}, http::StatusCode, Json};
use sqlx::PgPool;
use crate::models::{Shift, ShiftFilters}; // Ensure these are in models.rs

// GET /shifts with filtering
pub async fn get_shifts(
    State(pool): State<PgPool>,
    Query(filters): Query<ShiftFilters>,
) -> Result<Json<Vec<Shift>>, StatusCode> {
    let shifts = match (
        filters.client_id,
        filters.service_id,
        filters.zipcode,
        filters.available,
        filters.min_hours,
        filters.max_hours
    ) {
        (Some(cid), _, _, _, _, _) => {
            sqlx::query_as::<_, Shift>("SELECT * FROM shift WHERE client_id = $1")
                .bind(cid).fetch_all(&pool).await
        }
        (_, Some(sid), _, _, _, _) => {
            sqlx::query_as::<_, Shift>("SELECT * FROM shift WHERE service_id = $1")
                .bind(sid).fetch_all(&pool).await
        }
        (_, _, Some(z), _, _, _) => {
            sqlx::query_as::<_, Shift>("SELECT * FROM shift WHERE zipcode = $1")
                .bind(z).fetch_all(&pool).await
        }
        (_, _, _, Some(true), _, _) => {
            sqlx::query_as::<_, Shift>("SELECT * FROM shift WHERE available = true")
                .fetch_all(&pool).await
        }
        (_, _, _, _, Some(min), Some(max)) => {
            sqlx::query_as::<_, Shift>("SELECT * FROM shift WHERE total_hours BETWEEN $1 AND $2")
                .bind(min).bind(max).fetch_all(&pool).await
        }
        _ => {
            sqlx::query_as::<_, Shift>("SELECT * FROM shift").fetch_all(&pool).await
        }
    }.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(shifts))
}

// GET /shifts/:id
pub async fn get_shift_by_id(
    State(pool): State<PgPool>,
    Path(id): Path<i32>,
) -> Result<Json<Shift>, StatusCode> {
    let shift = sqlx::query_as::<_, Shift>("SELECT * FROM shift WHERE shift_id = $1")
        .bind(id)
        .fetch_one(&pool)
        .await
        .map_err(|_| StatusCode::NOT_FOUND)?;

    Ok(Json(shift))
}

// POST /shifts
pub async fn create_shift(
    State(pool): State<PgPool>,
    Json(payload): Json<Shift>, // Or a CreateShiftRequest DTO
) -> Result<(StatusCode, Json<Shift>), StatusCode> {
    let new_shift = sqlx::query_as::<_, Shift>(
        "INSERT INTO shift (client_id, service_id, total_hours, zipcode, available)
         VALUES ($1, $2, $3, $4, $5) RETURNING *"
    )
        .bind(payload.client_id).bind(payload.service_id)
        .bind(payload.total_hours).bind(payload.zipcode)
        .bind(payload.available)
        .fetch_one(&pool).await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok((StatusCode::CREATED, Json(new_shift)))
}

// PUT /shifts/:id
pub async fn update_shift(
    State(pool): State<PgPool>,
    Path(id): Path<i32>,
    Json(payload): Json<Shift>,
) -> Result<Json<Shift>, StatusCode> {
    let updated = sqlx::query_as::<_, Shift>(
        "UPDATE shift SET client_id=$1, service_id=$2, total_hours=$3, zipcode=$4, available=$5
         WHERE shift_id=$6 RETURNING *"
    )
        .bind(payload.client_id).bind(payload.service_id)
        .bind(payload.total_hours).bind(payload.zipcode)
        .bind(payload.available).bind(id)
        .fetch_one(&pool).await
        .map_err(|_| StatusCode::NOT_FOUND)?;

    Ok(Json(updated))
}

// DELETE /shifts/:id
pub async fn delete_shift(
    State(pool): State<PgPool>,
    Path(id): Path<i32>,
) -> Result<StatusCode, StatusCode> {
    sqlx::query("DELETE FROM shift WHERE shift_id = $1")
        .bind(id)
        .execute(&pool).await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(StatusCode::NO_CONTENT)
}