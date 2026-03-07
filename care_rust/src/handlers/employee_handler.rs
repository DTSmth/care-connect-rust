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

/// Returns the set of day abbreviations (MON, TUE, …) covered by a recurrence rule.
/// DAILY expands to all 7 days; WEEKLY:MON,WED,FRI returns ["MON","WED","FRI"].
fn shift_recurrence_days(rule: &str) -> Vec<&'static str> {
    const ALL: &[&str] = &["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
    if rule == "DAILY" {
        return ALL.to_vec();
    }
    match rule.split_once(':') {
        Some(("WEEKLY", days_str)) => days_str
            .split(',')
            .filter_map(|d| {
                        ALL.iter().copied().find(|&a| a.eq_ignore_ascii_case(d.trim()))
            })
            .collect(),
        _ => vec![],
    }
}

#[derive(FromRow)]
struct ShiftRow {
    shift_id: i32,
    total_hours: i16,
    zipcode: String,
    open_for_matching: bool,
    default_start_time: Option<chrono::NaiveTime>,
    default_duration_minutes: Option<i16>,
    recurrence_rule: Option<String>,
    series_start: Option<chrono::NaiveDate>,
    series_end: Option<chrono::NaiveDate>,
    location_lat: Option<f64>,
    location_lon: Option<f64>,
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
        open_for_matching: r.open_for_matching,
        assigned_employee: None,
        default_start_time: r.default_start_time,
        default_duration_minutes: r.default_duration_minutes,
        recurrence_rule: r.recurrence_rule,
        series_start: r.series_start,
        series_end: r.series_end,
        location_lat: r.location_lat,
        location_lon: r.location_lon,
    }
}

/// Haversine formula — returns straight-line distance in miles.
fn haversine_miles(lat1: f64, lon1: f64, lat2: f64, lon2: f64) -> f64 {
    const R: f64 = 3958.8;
    let dlat = (lat2 - lat1).to_radians();
    let dlon = (lon2 - lon1).to_radians();
    let a = (dlat / 2.0).sin().powi(2)
        + lat1.to_radians().cos() * lat2.to_radians().cos() * (dlon / 2.0).sin().powi(2);
    R * 2.0 * a.sqrt().asin()
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
            (employee_id, can_do_personal_care, can_do_lifting, home_zipcode, home_lat, home_lon,
             max_distance_miles, min_hours, max_hours, available_days)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (employee_id) DO UPDATE SET
            can_do_personal_care = EXCLUDED.can_do_personal_care,
            can_do_lifting       = EXCLUDED.can_do_lifting,
            home_zipcode         = EXCLUDED.home_zipcode,
            home_lat             = EXCLUDED.home_lat,
            home_lon             = EXCLUDED.home_lon,
            max_distance_miles   = EXCLUDED.max_distance_miles,
            min_hours            = EXCLUDED.min_hours,
            max_hours            = EXCLUDED.max_hours,
            available_days       = EXCLUDED.available_days
         RETURNING *",
    )
    .bind(id)
    .bind(payload.can_do_personal_care)
    .bind(payload.can_do_lifting)
    .bind(&payload.home_zipcode)
    .bind(payload.home_lat)
    .bind(payload.home_lon)
    .bind(payload.max_distance_miles)
    .bind(payload.min_hours)
    .bind(payload.max_hours)
    .bind(&payload.available_days)
    .fetch_one(&pool)
    .await?;
    Ok((StatusCode::OK, Json(pref)))
}

/// Core scoring logic — shared between employee-based and anonymous matching.
/// Fetches all open shifts from the DB and scores each against the given preferences.
async fn score_open_shifts(pool: &PgPool, pref: &EmployeePreference) -> Result<Vec<MatchResult>, sqlx::Error> {
    let rows = sqlx::query_as::<_, ShiftRow>(
        "SELECT
            s.shift_id, s.total_hours, s.zipcode, s.open_for_matching,
            s.default_start_time, s.default_duration_minutes,
            s.recurrence_rule, s.series_start, s.series_end,
            s.location_lat, s.location_lon,
            c.client_id, c.first_name, c.last_name, c.has_personal_care, c.has_lifting,
            c.address_1, c.address_2, c.zipcode AS client_zipcode, c.phone_number,
            sv.services_id, sv.service_name
         FROM shift s
         JOIN client  c  ON s.client_id  = c.client_id
         JOIN service sv ON s.service_id = sv.services_id
         WHERE s.open_for_matching = true",
    )
    .fetch_all(pool)
    .await?;

    let mut results: Vec<MatchResult> = rows
        .into_iter()
        .map(|r| {
            let mut score: i32 = 0;

            // Distance scoring — used when both employee home and shift location are geocoded.
            // Scoring bands: <5mi=+4, <10=+3, <20=+2, <30=+1; over max_distance=-3.
            // Falls back to partial zipcode match when coordinates are unavailable.
            let distance_miles = match (pref.home_lat, pref.home_lon, r.location_lat, r.location_lon) {
                (Some(hlat), Some(hlon), Some(slat), Some(slon)) => {
                    Some(haversine_miles(hlat, hlon, slat, slon))
                }
                _ => None,
            };

            if let Some(dist) = distance_miles {
                score += if dist < 5.0 { 4 }
                         else if dist < 10.0 { 3 }
                         else if dist < 20.0 { 2 }
                         else if dist < 30.0 { 1 }
                         else { 0 };
                if let Some(max) = pref.max_distance_miles {
                    if dist > max as f64 { score -= 3; }
                }
            } else if let Some(ref hz) = pref.home_zipcode {
                if r.zipcode.len() >= 3 && hz.len() >= 3 && r.zipcode[..3] == hz[..3] {
                    score += 1;
                }
            }

            match (pref.min_hours, pref.max_hours) {
                (Some(min), Some(max)) if r.total_hours >= min && r.total_hours <= max => {
                    score += 2;
                }
                _ => {}
            }

            if r.has_personal_care && pref.can_do_personal_care == Some(true) { score += 1; }
            if r.has_lifting       && pref.can_do_lifting       == Some(true) { score += 1; }
            if r.has_personal_care && pref.can_do_personal_care == Some(false) { score -= 2; }
            if r.has_lifting       && pref.can_do_lifting       == Some(false) { score -= 2; }

            if let Some(ref avail) = pref.available_days {
                if !avail.is_empty() {
                    let shift_days = shift_recurrence_days(
                        r.recurrence_rule.as_deref().unwrap_or(""),
                    );
                    if !shift_days.is_empty() {
                        let overlap = shift_days
                            .iter()
                            .filter(|d| avail.iter().any(|a| a.eq_ignore_ascii_case(d)))
                            .count() as i32;
                        if overlap == 0 { score -= 1; } else { score += overlap.min(3); }
                    }
                }
            }

            MatchResult {
                score,
                distance_miles,
                shift: to_shift_response(r),
            }
        })
        .collect();

    results.sort_by(|a, b| b.score.cmp(&a.score));
    Ok(results)
}

/// GET /employees/:id/matches — match against a saved employee's preferences
pub async fn get_matches(
    State(pool): State<PgPool>,
    Path(id): Path<i32>,
) -> Result<Json<Vec<MatchResult>>, AppError> {
    let pref = sqlx::query_as::<_, EmployeePreference>(
        "SELECT * FROM employee_preference WHERE employee_id = $1",
    )
    .bind(id)
    .fetch_optional(&pool)
    .await?
    .unwrap_or(EmployeePreference {
        employee_id: id,
        can_do_personal_care: None,
        can_do_lifting: None,
        home_zipcode: None,
        home_lat: None,
        home_lon: None,
        max_distance_miles: None,
        min_hours: None,
        max_hours: None,
        available_days: None,
    });

    let results = score_open_shifts(&pool, &pref).await?;
    Ok(Json(results))
}

/// POST /matches — anonymous matching (no employee record required).
/// Accepts criteria in the request body and returns ranked open shifts.
/// The assign step is unavailable until the candidate is added as an employee.
pub async fn anonymous_match(
    State(pool): State<PgPool>,
    Json(payload): Json<UpsertPreferenceRequest>,
) -> Result<Json<Vec<MatchResult>>, AppError> {
    let pref = EmployeePreference {
        employee_id: 0, // unused for scoring
        can_do_personal_care: payload.can_do_personal_care,
        can_do_lifting: payload.can_do_lifting,
        home_zipcode: payload.home_zipcode,
        home_lat: payload.home_lat,
        home_lon: payload.home_lon,
        max_distance_miles: payload.max_distance_miles,
        min_hours: payload.min_hours,
        max_hours: payload.max_hours,
        available_days: payload.available_days,
    };

    let results = score_open_shifts(&pool, &pref).await?;
    Ok(Json(results))
}
