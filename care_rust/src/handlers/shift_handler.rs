use axum::{extract::{State, Path, Query}, http::StatusCode, Json};
use sqlx::{FromRow, PgPool};
use crate::errors::AppError;
use crate::models::{Client, CreateShiftRequest, Service, ShiftFilters, ShiftResponse};

/// Flat DB row returned by the JOIN query — converted to ShiftResponse before sending.
#[derive(FromRow)]
struct ShiftRow {
    shift_id: i32,
    total_hours: i16,
    zipcode: String,
    available: bool,
    // from client JOIN
    client_id: i32,
    first_name: String,
    last_name: String,
    has_personal_care: bool,
    has_lifting: bool,
    address_1: String,
    address_2: String,
    client_zipcode: String,
    phone_number: String,
    // from service JOIN
    services_id: i32,
    service_name: String,
}

fn to_response(r: ShiftRow) -> ShiftResponse {
    ShiftResponse {
        shift_id: r.shift_id,
        client: Client {
            client_id: r.client_id,
            first_name: r.first_name,
            last_name: r.last_name,
            has_personal_care: r.has_personal_care,
            has_lifting: r.has_lifting,
            address_1: r.address_1,
            address_2: r.address_2,
            zipcode: r.client_zipcode,
            phone_number: r.phone_number,
        },
        service: Service {
            services_id: r.services_id,
            service_name: r.service_name,
        },
        total_hours: r.total_hours,
        zipcode: r.zipcode,
        available: r.available,
    }
}

const SHIFT_JOIN: &str = "
    SELECT
        s.shift_id, s.total_hours, s.zipcode, s.available,
        c.client_id, c.first_name, c.last_name, c.has_personal_care, c.has_lifting,
        c.address_1, c.address_2, c.zipcode AS client_zipcode, c.phone_number,
        sv.services_id, sv.service_name
    FROM shift s
    JOIN client  c  ON s.client_id  = c.client_id
    JOIN service sv ON s.service_id = sv.services_id";

// GET /shifts with filtering
pub async fn get_shifts(
    State(pool): State<PgPool>,
    Query(filters): Query<ShiftFilters>,
) -> Result<Json<Vec<ShiftResponse>>, AppError> {
    let sql = match (
        filters.client_id,
        filters.service_id,
        filters.zipcode,
        filters.available,
        filters.min_hours,
        filters.max_hours,
    ) {
        (Some(cid), _, _, _, _, _) => {
            sqlx::query_as::<_, ShiftRow>(&format!("{SHIFT_JOIN} WHERE s.client_id = $1"))
                .bind(cid).fetch_all(&pool).await
        }
        (_, Some(sid), _, _, _, _) => {
            sqlx::query_as::<_, ShiftRow>(&format!("{SHIFT_JOIN} WHERE s.service_id = $1"))
                .bind(sid).fetch_all(&pool).await
        }
        (_, _, Some(z), _, _, _) => {
            sqlx::query_as::<_, ShiftRow>(&format!("{SHIFT_JOIN} WHERE s.zipcode = $1"))
                .bind(z).fetch_all(&pool).await
        }
        (_, _, _, Some(true), _, _) => {
            sqlx::query_as::<_, ShiftRow>(&format!("{SHIFT_JOIN} WHERE s.available = true"))
                .fetch_all(&pool).await
        }
        (_, _, _, _, Some(min), Some(max)) => {
            sqlx::query_as::<_, ShiftRow>(&format!("{SHIFT_JOIN} WHERE s.total_hours BETWEEN $1 AND $2"))
                .bind(min).bind(max).fetch_all(&pool).await
        }
        _ => {
            sqlx::query_as::<_, ShiftRow>(SHIFT_JOIN).fetch_all(&pool).await
        }
    }?;

    Ok(Json(sql.into_iter().map(to_response).collect()))
}

// GET /shifts/:id
pub async fn get_shift_by_id(
    State(pool): State<PgPool>,
    Path(id): Path<i32>,
) -> Result<Json<ShiftResponse>, AppError> {
    let row = sqlx::query_as::<_, ShiftRow>(&format!("{SHIFT_JOIN} WHERE s.shift_id = $1"))
        .bind(id)
        .fetch_one(&pool)
        .await?;

    Ok(Json(to_response(row)))
}

// POST /shifts
pub async fn create_shift(
    State(pool): State<PgPool>,
    Json(payload): Json<CreateShiftRequest>,
) -> Result<(StatusCode, Json<ShiftResponse>), AppError> {
    let row = sqlx::query_as::<_, ShiftRow>(&format!(
        "WITH ins AS (
            INSERT INTO shift (client_id, service_id, total_hours, zipcode, available)
            VALUES ($1, $2, $3, $4, $5) RETURNING *
         )
         SELECT
             ins.shift_id, ins.total_hours, ins.zipcode, ins.available,
             c.client_id, c.first_name, c.last_name, c.has_personal_care, c.has_lifting,
             c.address_1, c.address_2, c.zipcode AS client_zipcode, c.phone_number,
             sv.services_id, sv.service_name
         FROM ins
         JOIN client  c  ON ins.client_id  = c.client_id
         JOIN service sv ON ins.service_id = sv.services_id"
    ))
    .bind(payload.client.client_id)
    .bind(payload.service.services_id)
    .bind(payload.total_hours)
    .bind(&payload.zipcode)
    .bind(payload.available)
    .fetch_one(&pool)
    .await?;

    Ok((StatusCode::CREATED, Json(to_response(row))))
}

// PUT /shifts/:id
pub async fn update_shift(
    State(pool): State<PgPool>,
    Path(id): Path<i32>,
    Json(payload): Json<CreateShiftRequest>,
) -> Result<Json<ShiftResponse>, AppError> {
    let row = sqlx::query_as::<_, ShiftRow>(
        "WITH upd AS (
            UPDATE shift SET client_id=$1, service_id=$2, total_hours=$3, zipcode=$4, available=$5
            WHERE shift_id=$6 RETURNING *
         )
         SELECT
             upd.shift_id, upd.total_hours, upd.zipcode, upd.available,
             c.client_id, c.first_name, c.last_name, c.has_personal_care, c.has_lifting,
             c.address_1, c.address_2, c.zipcode AS client_zipcode, c.phone_number,
             sv.services_id, sv.service_name
         FROM upd
         JOIN client  c  ON upd.client_id  = c.client_id
         JOIN service sv ON upd.service_id = sv.services_id",
    )
    .bind(payload.client.client_id)
    .bind(payload.service.services_id)
    .bind(payload.total_hours)
    .bind(&payload.zipcode)
    .bind(payload.available)
    .bind(id)
    .fetch_one(&pool)
    .await?;

    Ok(Json(to_response(row)))
}

// DELETE /shifts/:id
pub async fn delete_shift(
    State(pool): State<PgPool>,
    Path(id): Path<i32>,
) -> Result<StatusCode, AppError> {
    sqlx::query("DELETE FROM shift WHERE shift_id = $1")
        .bind(id)
        .execute(&pool).await?;

    Ok(StatusCode::NO_CONTENT)
}