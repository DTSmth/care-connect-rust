use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use sqlx::PgPool;

use crate::{
    errors::AppError,
    models::{CreateEmployeeRequest, Employee, EmployeePreference, MatchResult, ShiftResponse, UpsertPreferenceRequest},
};

use sqlx::FromRow;

// ── Employee CRUD ────────────────────────────────────────────────────────────

pub async fn get_all_employees(
    State(pool): State<PgPool>,
) -> Result<Json<Vec<Employee>>, AppError> {
    let employees = sqlx::query_as::<_, Employee>("SELECT * FROM employee ORDER BY last_name, first_name")
        .fetch_all(&pool)
        .await?;
    Ok(Json(employees))
}

pub async fn get_employee_by_id(
    State(pool): State<PgPool>,
    Path(id): Path<i32>,
) -> Result<Json<Employee>, AppError> {
    let emp = sqlx::query_as::<_, Employee>("SELECT * FROM employee WHERE employee_id = $1")
        .bind(id)
        .fetch_one(&pool)
        .await?;
    Ok(Json(emp))
}

pub async fn create_employee(
    State(pool): State<PgPool>,
    Json(payload): Json<CreateEmployeeRequest>,
) -> Result<(StatusCode, Json<Employee>), AppError> {
    let emp = sqlx::query_as::<_, Employee>(
        "INSERT INTO employee (first_name, last_name, phone_number, email)
         VALUES ($1, $2, $3, $4) RETURNING *",
    )
    .bind(&payload.first_name)
    .bind(&payload.last_name)
    .bind(&payload.phone_number)
    .bind(&payload.email)
    .fetch_one(&pool)
    .await?;
    Ok((StatusCode::CREATED, Json(emp)))
}

pub async fn update_employee(
    State(pool): State<PgPool>,
    Path(id): Path<i32>,
    Json(payload): Json<CreateEmployeeRequest>,
) -> Result<Json<Employee>, AppError> {
    let emp = sqlx::query_as::<_, Employee>(
        "UPDATE employee SET first_name=$1, last_name=$2, phone_number=$3, email=$4
         WHERE employee_id=$5 RETURNING *",
    )
    .bind(&payload.first_name)
    .bind(&payload.last_name)
    .bind(&payload.phone_number)
    .bind(&payload.email)
    .bind(id)
    .fetch_one(&pool)
    .await?;
    Ok(Json(emp))
}

pub async fn delete_employee(
    State(pool): State<PgPool>,
    Path(id): Path<i32>,
) -> Result<StatusCode, AppError> {
    sqlx::query("DELETE FROM employee WHERE employee_id = $1")
        .bind(id)
        .execute(&pool)
        .await?;
    Ok(StatusCode::NO_CONTENT)
}

// ── Preferences & Matching ───────────────────────────────────────────────────

#[derive(FromRow)]
struct ShiftRow {
    shift_id: i32,
    total_hours: i16,
    zipcode: String,
    available: bool,
    client_id: i32,
    first_name: String,
    last_name: String,
    has_personal_care: bool,
    has_lifting: bool,
    address_1: String,
    address_2: String,
    client_zipcode: String,
    phone_number: String,
    services_id: i32,
    service_name: String,
}

fn to_shift_response(r: ShiftRow) -> ShiftResponse {
    use crate::models::{Client, Service};
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

/// GET /employees/:id/preferences
pub async fn get_preferences(
    State(pool): State<PgPool>,
    Path(id): Path<i32>,
) -> Result<Json<EmployeePreference>, AppError> {
    let pref = sqlx::query_as::<_, EmployeePreference>(
        "SELECT * FROM employee_preference WHERE employee_id = $1",
    )
    .bind(id)
    .fetch_one(&pool)
    .await?;
    Ok(Json(pref))
}

/// PUT /employees/:id/preferences — insert or update
pub async fn upsert_preferences(
    State(pool): State<PgPool>,
    Path(id): Path<i32>,
    Json(payload): Json<UpsertPreferenceRequest>,
) -> Result<(StatusCode, Json<EmployeePreference>), AppError> {
    let pref = sqlx::query_as::<_, EmployeePreference>(
        "INSERT INTO employee_preference
            (employee_id, can_do_personal_care, can_do_lifting, preferred_zipcode, min_hours, max_hours)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (employee_id) DO UPDATE SET
            can_do_personal_care = EXCLUDED.can_do_personal_care,
            can_do_lifting       = EXCLUDED.can_do_lifting,
            preferred_zipcode    = EXCLUDED.preferred_zipcode,
            min_hours            = EXCLUDED.min_hours,
            max_hours            = EXCLUDED.max_hours
         RETURNING *",
    )
    .bind(id)
    .bind(payload.can_do_personal_care)
    .bind(payload.can_do_lifting)
    .bind(&payload.preferred_zipcode)
    .bind(payload.min_hours)
    .bind(payload.max_hours)
    .fetch_one(&pool)
    .await?;
    Ok((StatusCode::OK, Json(pref)))
}

/// GET /employees/:id/matches
pub async fn get_matches(
    State(pool): State<PgPool>,
    Path(id): Path<i32>,
) -> Result<Json<Vec<MatchResult>>, AppError> {
    let pref = sqlx::query_as::<_, EmployeePreference>(
        "SELECT * FROM employee_preference WHERE employee_id = $1",
    )
    .bind(id)
    .fetch_one(&pool)
    .await?;

    let rows = sqlx::query_as::<_, ShiftRow>(
        "SELECT
            s.shift_id, s.total_hours, s.zipcode, s.available,
            c.client_id, c.first_name, c.last_name, c.has_personal_care, c.has_lifting,
            c.address_1, c.address_2, c.zipcode AS client_zipcode, c.phone_number,
            sv.services_id, sv.service_name
         FROM shift s
         JOIN client  c  ON s.client_id  = c.client_id
         JOIN service sv ON s.service_id = sv.services_id
         WHERE s.available = true
           AND (c.has_personal_care = false OR $1 = true)
           AND (c.has_lifting       = false OR $2 = true)",
    )
    .bind(pref.can_do_personal_care)
    .bind(pref.can_do_lifting)
    .fetch_all(&pool)
    .await?;

    let mut results: Vec<MatchResult> = rows
        .into_iter()
        .map(|r| {
            let mut score: i32 = 0;

            if let Some(ref pz) = pref.preferred_zipcode {
                if &r.zipcode == pz {
                    score += 3;
                }
            }

            match (pref.min_hours, pref.max_hours) {
                (Some(min), Some(max)) if r.total_hours >= min && r.total_hours <= max => {
                    score += 2;
                }
                _ => {}
            }

            if r.has_personal_care && pref.can_do_personal_care {
                score += 1;
            }
            if r.has_lifting && pref.can_do_lifting {
                score += 1;
            }

            MatchResult {
                score,
                shift: to_shift_response(r),
            }
        })
        .collect();

    results.sort_by(|a, b| b.score.cmp(&a.score));

    Ok(Json(results))
}
