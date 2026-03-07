use axum::{extract::{State, Path, Query}, http::StatusCode, Json};
use chrono::{NaiveDate, NaiveTime};
use sqlx::PgPool;
use crate::errors::AppError;
use crate::models::{AssignedEmployee, AssignShiftRequest, Client, CreateShiftRequest, Service, SetMatchingRequest, ShiftFilters, ShiftResponse};

/// Flat DB row returned by the JOIN query — converted to ShiftResponse before sending.
#[derive(sqlx::FromRow)]
struct ShiftRow {
    shift_id: i32,
    total_hours: i16,
    zipcode: String,
    open_for_matching: bool,
    default_start_time: Option<NaiveTime>,
    default_duration_minutes: Option<i16>,
    recurrence_rule: Option<String>,
    series_start: Option<NaiveDate>,
    series_end: Option<NaiveDate>,
    location_lat: Option<f64>,
    location_lon: Option<f64>,
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
    // from assigned employee LEFT JOIN
    assigned_employee_id: Option<i32>,
    emp_first_name: Option<String>,
    emp_last_name: Option<String>,
}

fn to_response(r: ShiftRow) -> ShiftResponse {
    let assigned_employee = match (r.assigned_employee_id, r.emp_first_name, r.emp_last_name) {
        (Some(id), Some(first), Some(last)) => Some(AssignedEmployee {
            employee_id: id,
            first_name: first,
            last_name: last,
        }),
        _ => None,
    };
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
        open_for_matching: r.open_for_matching,
        assigned_employee,
        default_start_time: r.default_start_time,
        default_duration_minutes: r.default_duration_minutes,
        recurrence_rule: r.recurrence_rule,
        series_start: r.series_start,
        series_end: r.series_end,
        location_lat: r.location_lat,
        location_lon: r.location_lon,
    }
}

const SHIFT_JOIN: &str = "
    SELECT
        s.shift_id, s.total_hours, s.zipcode, s.open_for_matching,
        s.default_start_time, s.default_duration_minutes,
        s.recurrence_rule, s.series_start, s.series_end,
        s.location_lat, s.location_lon,
        c.client_id, c.first_name, c.last_name, c.has_personal_care, c.has_lifting,
        c.address_1, c.address_2, c.zipcode AS client_zipcode, c.phone_number,
        sv.services_id, sv.service_name,
        e.employee_id AS assigned_employee_id,
        e.first_name  AS emp_first_name,
        e.last_name   AS emp_last_name
    FROM shift s
    JOIN client  c  ON s.client_id  = c.client_id
    JOIN service sv ON s.service_id = sv.services_id
    LEFT JOIN employee e ON s.assigned_employee_id = e.employee_id";

// GET /shifts with filtering
pub async fn get_shifts(
    State(pool): State<PgPool>,
    Query(filters): Query<ShiftFilters>,
) -> Result<Json<Vec<ShiftResponse>>, AppError> {
    let sql = match (
        filters.client_id,
        filters.service_id,
        filters.zipcode,
        filters.open_for_matching,
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
            sqlx::query_as::<_, ShiftRow>(&format!("{SHIFT_JOIN} WHERE s.open_for_matching = true"))
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
            INSERT INTO shift (client_id, service_id, total_hours, zipcode, open_for_matching,
                               default_start_time, default_duration_minutes,
                               recurrence_rule, series_start, series_end,
                               location_lat, location_lon)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *
         )
         SELECT
             ins.shift_id, ins.total_hours, ins.zipcode, ins.open_for_matching,
             ins.default_start_time, ins.default_duration_minutes,
             ins.recurrence_rule, ins.series_start, ins.series_end,
             ins.location_lat, ins.location_lon,
             c.client_id, c.first_name, c.last_name, c.has_personal_care, c.has_lifting,
             c.address_1, c.address_2, c.zipcode AS client_zipcode, c.phone_number,
             sv.services_id, sv.service_name,
             e.employee_id AS assigned_employee_id,
             e.first_name  AS emp_first_name,
             e.last_name   AS emp_last_name
         FROM ins
         JOIN client  c  ON ins.client_id  = c.client_id
         JOIN service sv ON ins.service_id = sv.services_id
         LEFT JOIN employee e ON ins.assigned_employee_id = e.employee_id"
    ))
    .bind(payload.client.client_id)
    .bind(payload.service.services_id)
    .bind(payload.total_hours)
    .bind(&payload.zipcode)
    .bind(payload.open_for_matching)
    .bind(payload.default_start_time)
    .bind(payload.default_duration_minutes)
    .bind(&payload.recurrence_rule)
    .bind(payload.series_start)
    .bind(payload.series_end)
    .bind(payload.location_lat)
    .bind(payload.location_lon)
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
            UPDATE shift SET client_id=$1, service_id=$2, total_hours=$3, zipcode=$4, open_for_matching=$5,
                             default_start_time=$6, default_duration_minutes=$7,
                             recurrence_rule=$8, series_start=$9, series_end=$10,
                             location_lat=$11, location_lon=$12
            WHERE shift_id=$13 RETURNING *
         )
         SELECT
             upd.shift_id, upd.total_hours, upd.zipcode, upd.open_for_matching,
             upd.default_start_time, upd.default_duration_minutes,
             upd.recurrence_rule, upd.series_start, upd.series_end,
             upd.location_lat, upd.location_lon,
             c.client_id, c.first_name, c.last_name, c.has_personal_care, c.has_lifting,
             c.address_1, c.address_2, c.zipcode AS client_zipcode, c.phone_number,
             sv.services_id, sv.service_name,
             e.employee_id AS assigned_employee_id,
             e.first_name  AS emp_first_name,
             e.last_name   AS emp_last_name
         FROM upd
         JOIN client  c  ON upd.client_id  = c.client_id
         JOIN service sv ON upd.service_id = sv.services_id
         LEFT JOIN employee e ON upd.assigned_employee_id = e.employee_id",
    )
    .bind(payload.client.client_id)
    .bind(payload.service.services_id)
    .bind(payload.total_hours)
    .bind(&payload.zipcode)
    .bind(payload.open_for_matching)
    .bind(payload.default_start_time)
    .bind(payload.default_duration_minutes)
    .bind(&payload.recurrence_rule)
    .bind(payload.series_start)
    .bind(payload.series_end)
    .bind(payload.location_lat)
    .bind(payload.location_lon)
    .bind(id)
    .fetch_one(&pool)
    .await?;

    // Purge all future non-cancelled occurrences so the new recurrence rule,
    // schedule, and series bounds take effect cleanly on next calendar load.
    // Cancelled occurrences are intentional records and are preserved.
    sqlx::query(
        "DELETE FROM shift_occurrence
         WHERE shift_id = $1
           AND status != 'cancelled'
           AND scheduled_start >= NOW()",
    )
    .bind(id)
    .execute(&pool)
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

// POST /shifts/:id/assign
// Atomically assigns an employee to a shift: turns off matching and confirms all open occurrences.
pub async fn assign_shift(
    State(pool): State<PgPool>,
    Path(id): Path<i32>,
    Json(payload): Json<AssignShiftRequest>,
) -> Result<StatusCode, AppError> {
    sqlx::query(
        "UPDATE shift SET open_for_matching = false, assigned_employee_id = $1 WHERE shift_id = $2"
    )
    .bind(payload.employee_id)
    .bind(id)
    .execute(&pool).await?;

    sqlx::query(
        "UPDATE shift_occurrence
         SET employee_id = $1, status = 'confirmed'
         WHERE shift_id = $2 AND status != 'cancelled'"
    )
    .bind(payload.employee_id)
    .bind(id)
    .execute(&pool).await?;

    Ok(StatusCode::NO_CONTENT)
}

// PATCH /shifts/:id/matching
// Toggles open_for_matching. When re-opening (true), also clears the assigned
// employee and resets all confirmed occurrences back to open.
pub async fn set_matching(
    State(pool): State<PgPool>,
    Path(id): Path<i32>,
    Json(payload): Json<SetMatchingRequest>,
) -> Result<StatusCode, AppError> {
    sqlx::query(
        "UPDATE shift SET open_for_matching = $1,
         assigned_employee_id = CASE WHEN $1 THEN NULL ELSE assigned_employee_id END
         WHERE shift_id = $2"
    )
    .bind(payload.open_for_matching)
    .bind(id)
    .execute(&pool).await?;

    // When re-opening for matching, reset future confirmed occurrences to open
    if payload.open_for_matching {
        sqlx::query(
            "UPDATE shift_occurrence
             SET employee_id = NULL, status = 'open'
             WHERE shift_id = $1 AND status != 'cancelled'"
        )
        .bind(id)
        .execute(&pool).await?;
    }

    Ok(StatusCode::NO_CONTENT)
}