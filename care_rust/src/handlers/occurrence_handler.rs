use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use chrono::{DateTime, Datelike, Duration, NaiveDate, NaiveTime, TimeZone, Utc, Weekday};
use sqlx::PgPool;

use crate::{
    errors::AppError,
    models::{
        CalendarFilters, Client, CreateOccurrenceRequest, Employee, OccurrenceResponse,
        Service, ShiftResponse, UpdateOccurrenceRequest,
    },
};

// ---------------------------------------------------------------------------
// Recurrence expansion
// ---------------------------------------------------------------------------

/// Supported recurrence rule format:
///   DAILY
///   WEEKLY:MON,TUE,WED,THU,FRI,SAT,SUN  (comma-separated day abbreviations)
fn expand_recurrence(
    rule: &str,
    start_time: NaiveTime,
    duration_minutes: i64,
    series_start: NaiveDate,
    series_end: NaiveDate,
    window_start: NaiveDate,
    window_end: NaiveDate,
) -> Vec<(DateTime<Utc>, DateTime<Utc>)> {
    let from = series_start.max(window_start);
    let until = series_end.min(window_end);

    if from > until {
        return vec![];
    }

    let days: Vec<NaiveDate> = match rule.split_once(':') {
        Some(("WEEKLY", days_str)) => {
            let target_days: Vec<Weekday> = days_str
                .split(',')
                .filter_map(|d| parse_weekday(d.trim()))
                .collect();
            date_range(from, until)
                .filter(|d| target_days.contains(&d.weekday()))
                .collect()
        }
        _ if rule == "DAILY" => date_range(from, until).collect(),
        _ => vec![],
    };

    days.into_iter()
        .map(|date| {
            let naive_start = date.and_time(start_time);
            let start = Utc.from_utc_datetime(&naive_start);
            let end = start + Duration::minutes(duration_minutes);
            (start, end)
        })
        .collect()
}

fn date_range(from: NaiveDate, until: NaiveDate) -> impl Iterator<Item = NaiveDate> {
    let mut current = from;
    std::iter::from_fn(move || {
        if current <= until {
            let d = current;
            current += Duration::days(1);
            Some(d)
        } else {
            None
        }
    })
}

fn parse_weekday(s: &str) -> Option<Weekday> {
    match s.to_uppercase().as_str() {
        "MON" | "MONDAY"    => Some(Weekday::Mon),
        "TUE" | "TUESDAY"   => Some(Weekday::Tue),
        "WED" | "WEDNESDAY" => Some(Weekday::Wed),
        "THU" | "THURSDAY"  => Some(Weekday::Thu),
        "FRI" | "FRIDAY"    => Some(Weekday::Fri),
        "SAT" | "SATURDAY"  => Some(Weekday::Sat),
        "SUN" | "SUNDAY"    => Some(Weekday::Sun),
        _ => None,
    }
}

// ---------------------------------------------------------------------------
// DB row structs
// ---------------------------------------------------------------------------

#[derive(sqlx::FromRow)]
struct OccurrenceRow {
    occurrence_id: i32,
    scheduled_start: DateTime<Utc>,
    scheduled_end: DateTime<Utc>,
    status: String,
    notes: Option<String>,
    // employee (nullable)
    employee_id: Option<i32>,
    employee_first_name: Option<String>,
    employee_last_name: Option<String>,
    employee_phone: Option<String>,
    employee_email: Option<String>,
    // shift
    shift_id: i32,
    total_hours: i16,
    zipcode: String,
    open_for_matching: bool,
    default_start_time: Option<chrono::NaiveTime>,
    default_duration_minutes: Option<i16>,
    recurrence_rule: Option<String>,
    series_start: Option<chrono::NaiveDate>,
    series_end: Option<chrono::NaiveDate>,
    // client
    client_id: i32,
    first_name: String,
    last_name: String,
    has_personal_care: bool,
    has_lifting: bool,
    address_1: String,
    address_2: String,
    client_zipcode: String,
    phone_number: String,
    // service
    services_id: i32,
    service_name: String,
}

fn row_to_response(r: OccurrenceRow) -> OccurrenceResponse {
    let employee = r.employee_id.map(|id| Employee {
        employee_id: id,
        first_name: r.employee_first_name.unwrap_or_default(),
        last_name: r.employee_last_name.unwrap_or_default(),
        phone_number: r.employee_phone.unwrap_or_default(),
        email: r.employee_email,
    });

    OccurrenceResponse {
        occurrence_id: r.occurrence_id,
        shift: ShiftResponse {
            shift_id: r.shift_id,
            total_hours: r.total_hours,
            zipcode: r.zipcode,
            open_for_matching: r.open_for_matching,
            assigned_employee: None,
            default_start_time: r.default_start_time,
            default_duration_minutes: r.default_duration_minutes,
            recurrence_rule: r.recurrence_rule,
            series_start: r.series_start,
            series_end: r.series_end,
            location_lat: None,
            location_lon: None,
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
        },
        employee,
        scheduled_start: r.scheduled_start,
        scheduled_end: r.scheduled_end,
        status: r.status,
        notes: r.notes,
    }
}

const OCCURRENCE_JOIN: &str = "
    SELECT
        o.occurrence_id, o.scheduled_start, o.scheduled_end, o.status, o.notes,
        e.employee_id,
        e.first_name  AS employee_first_name,
        e.last_name   AS employee_last_name,
        e.phone_number AS employee_phone,
        e.email       AS employee_email,
        s.shift_id, s.total_hours, s.zipcode, s.open_for_matching,
        s.default_start_time, s.default_duration_minutes,
        s.recurrence_rule, s.series_start, s.series_end,
        c.client_id, c.first_name, c.last_name, c.has_personal_care, c.has_lifting,
        c.address_1, c.address_2, c.zipcode AS client_zipcode, c.phone_number,
        sv.services_id, sv.service_name
    FROM shift_occurrence o
    JOIN shift   s  ON o.shift_id   = s.shift_id
    JOIN client  c  ON s.client_id  = c.client_id
    JOIN service sv ON s.service_id = sv.services_id
    LEFT JOIN employee e ON o.employee_id = e.employee_id";

// ---------------------------------------------------------------------------
// GET /calendar?start=&end=[&employeeId=][&clientId=]
// ---------------------------------------------------------------------------
pub async fn get_calendar(
    State(pool): State<PgPool>,
    Query(filters): Query<CalendarFilters>,
) -> Result<Json<Vec<OccurrenceResponse>>, AppError> {
    let window_start: DateTime<Utc> = Utc
        .from_utc_datetime(&filters.start.and_hms_opt(0, 0, 0).unwrap());
    let window_end: DateTime<Utc> = Utc
        .from_utc_datetime(&filters.end.and_hms_opt(23, 59, 59).unwrap());

    // 1. Generate occurrences from recurring shift series that fall in the window.
    generate_occurrences_for_window(&pool, filters.start, filters.end).await?;

    // 2. Query persisted occurrences in the window.
    let mut rows = sqlx::query_as::<_, OccurrenceRow>(&format!(
        "{OCCURRENCE_JOIN}
         WHERE o.scheduled_start >= $1 AND o.scheduled_end <= $2"
    ))
    .bind(window_start)
    .bind(window_end)
    .fetch_all(&pool)
    .await?;

    // 3. Apply optional filters.
    if let Some(eid) = filters.employee_id {
        rows.retain(|r| r.employee_id == Some(eid));
    }
    if let Some(cid) = filters.client_id {
        rows.retain(|r| r.client_id == cid);
    }

    Ok(Json(rows.into_iter().map(row_to_response).collect()))
}

/// Expand all recurring shifts into `shift_occurrence` rows for the given window.
/// Uses INSERT … ON CONFLICT DO NOTHING so re-querying the same window is safe.
async fn generate_occurrences_for_window(
    pool: &PgPool,
    window_start: NaiveDate,
    window_end: NaiveDate,
) -> Result<(), AppError> {
    #[derive(sqlx::FromRow)]
    struct ShiftSeries {
        shift_id: i32,
        default_start_time: Option<NaiveTime>,
        default_duration_minutes: Option<i16>,
        recurrence_rule: Option<String>,
        series_start: Option<NaiveDate>,
        series_end: Option<NaiveDate>,
        assigned_employee_id: Option<i32>,
    }

    let series = sqlx::query_as::<_, ShiftSeries>(
        "SELECT shift_id, default_start_time, default_duration_minutes,
                recurrence_rule, series_start, series_end, assigned_employee_id
         FROM shift
         WHERE recurrence_rule IS NOT NULL
           AND series_start IS NOT NULL
           AND default_start_time IS NOT NULL
           AND default_duration_minutes IS NOT NULL
           AND series_start <= $1
           AND (series_end IS NULL OR series_end >= $2)",
    )
    .bind(window_end)
    .bind(window_start)
    .fetch_all(pool)
    .await?;

    for s in series {
        let rule = s.recurrence_rule.unwrap();
        let start_time = s.default_start_time.unwrap();
        let duration = s.default_duration_minutes.unwrap() as i64;
        let series_start = s.series_start.unwrap();
        let series_end = s.series_end.unwrap_or(window_end);

        let slots = expand_recurrence(
            &rule,
            start_time,
            duration,
            series_start,
            series_end,
            window_start,
            window_end,
        );

        for (occ_start, occ_end) in slots {
            let status = if s.assigned_employee_id.is_some() { "confirmed" } else { "open" };
            sqlx::query(
                "INSERT INTO shift_occurrence (shift_id, employee_id, scheduled_start, scheduled_end, status)
                 SELECT $1, $2, $3, $4, $5
                 WHERE NOT EXISTS (
                     SELECT 1 FROM shift_occurrence
                     WHERE shift_id = $1 AND scheduled_start = $3
                 )",
            )
            .bind(s.shift_id)
            .bind(s.assigned_employee_id)
            .bind(occ_start)
            .bind(occ_end)
            .bind(status)
            .execute(pool)
            .await?;
        }
    }

    Ok(())
}

// ---------------------------------------------------------------------------
// GET /shifts/:id/occurrences
// ---------------------------------------------------------------------------
pub async fn get_shift_occurrences(
    State(pool): State<PgPool>,
    Path(shift_id): Path<i32>,
) -> Result<Json<Vec<OccurrenceResponse>>, AppError> {
    let rows = sqlx::query_as::<_, OccurrenceRow>(&format!(
        "{OCCURRENCE_JOIN} WHERE o.shift_id = $1 ORDER BY o.scheduled_start"
    ))
    .bind(shift_id)
    .fetch_all(&pool)
    .await?;

    Ok(Json(rows.into_iter().map(row_to_response).collect()))
}

// ---------------------------------------------------------------------------
// GET /occurrences/:id
// ---------------------------------------------------------------------------
pub async fn get_occurrence_by_id(
    State(pool): State<PgPool>,
    Path(id): Path<i32>,
) -> Result<Json<OccurrenceResponse>, AppError> {
    let row = sqlx::query_as::<_, OccurrenceRow>(&format!(
        "{OCCURRENCE_JOIN} WHERE o.occurrence_id = $1"
    ))
    .bind(id)
    .fetch_one(&pool)
    .await?;

    Ok(Json(row_to_response(row)))
}

// ---------------------------------------------------------------------------
// POST /shifts/:id/occurrences  — add a one-off occurrence to a shift series
// ---------------------------------------------------------------------------
pub async fn create_occurrence(
    State(pool): State<PgPool>,
    Path(shift_id): Path<i32>,
    Json(payload): Json<CreateOccurrenceRequest>,
) -> Result<(StatusCode, Json<OccurrenceResponse>), AppError> {
    let status = payload.status.unwrap_or_else(|| "scheduled".to_string());

    let occurrence_id: i32 = sqlx::query_scalar(
        "INSERT INTO shift_occurrence (shift_id, employee_id, scheduled_start, scheduled_end, status, notes)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING occurrence_id",
    )
    .bind(shift_id)
    .bind(payload.employee_id)
    .bind(payload.scheduled_start)
    .bind(payload.scheduled_end)
    .bind(&status)
    .bind(&payload.notes)
    .fetch_one(&pool)
    .await?;

    let row = sqlx::query_as::<_, OccurrenceRow>(&format!(
        "{OCCURRENCE_JOIN} WHERE o.occurrence_id = $1"
    ))
    .bind(occurrence_id)
    .fetch_one(&pool)
    .await?;

    Ok((StatusCode::CREATED, Json(row_to_response(row))))
}

// ---------------------------------------------------------------------------
// PUT /occurrences/:id  — update a single occurrence (reassign, reschedule, cancel)
// ---------------------------------------------------------------------------
pub async fn update_occurrence(
    State(pool): State<PgPool>,
    Path(id): Path<i32>,
    Json(payload): Json<UpdateOccurrenceRequest>,
) -> Result<Json<OccurrenceResponse>, AppError> {
    // 1. Update this occurrence's own fields.
    sqlx::query(
        "UPDATE shift_occurrence
         SET employee_id     = $1,
             scheduled_start = COALESCE($2, scheduled_start),
             scheduled_end   = COALESCE($3, scheduled_end),
             status          = COALESCE($4, status),
             notes           = $5
         WHERE occurrence_id = $6",
    )
    .bind(payload.employee_id)
    .bind(payload.scheduled_start)
    .bind(payload.scheduled_end)
    .bind(&payload.status)
    .bind(&payload.notes)
    .bind(id)
    .execute(&pool)
    .await?;

    // 2. Fetch the updated row to obtain shift_id.
    let row = sqlx::query_as::<_, OccurrenceRow>(&format!(
        "{OCCURRENCE_JOIN} WHERE o.occurrence_id = $1"
    ))
    .bind(id)
    .fetch_one(&pool)
    .await?;

    // 3. Cascade the employee change to the whole series.
    //    Status, notes, and times are per-occurrence concerns.
    //    Employee assignment is series-level: whoever works this shift works all
    //    non-cancelled occurrences, and the shift record must reflect it.
    let series_status = if payload.employee_id.is_some() { "confirmed" } else { "open" };

    sqlx::query(
        "UPDATE shift
         SET assigned_employee_id = $1,
             open_for_matching    = $2
         WHERE shift_id = $3",
    )
    .bind(payload.employee_id)
    .bind(payload.employee_id.is_none())
    .bind(row.shift_id)
    .execute(&pool)
    .await?;

    // Update every other non-cancelled occurrence in the series.
    // The occurrence we just saved is excluded — it already has the correct employee
    // and its status was set intentionally (e.g. user may have cancelled it).
    sqlx::query(
        "UPDATE shift_occurrence
         SET employee_id = $1, status = $2
         WHERE shift_id = $3
           AND status != 'cancelled'
           AND occurrence_id != $4",
    )
    .bind(payload.employee_id)
    .bind(series_status)
    .bind(row.shift_id)
    .bind(id)
    .execute(&pool)
    .await?;

    Ok(Json(row_to_response(row)))
}

// ---------------------------------------------------------------------------
// DELETE /occurrences/:id
// ---------------------------------------------------------------------------
pub async fn delete_occurrence(
    State(pool): State<PgPool>,
    Path(id): Path<i32>,
) -> Result<StatusCode, AppError> {
    sqlx::query("DELETE FROM shift_occurrence WHERE occurrence_id = $1")
        .bind(id)
        .execute(&pool)
        .await?;

    Ok(StatusCode::NO_CONTENT)
}
