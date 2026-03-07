use chrono::{NaiveDate, NaiveTime};
use chrono::DateTime;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use validator::Validate;

// --- USER MODELS ---
#[derive(Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct User {
    pub user_id: i32,
    pub username: String,
    #[serde(skip_serializing)]
    pub password_hash: String,
    pub role: String,
    pub display_name: Option<String>,
    pub img_url: Option<String>,
    pub short_bio: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateUserRequest {
    pub username: String,
    pub password_hash: String,
    pub role: String,
    pub display_name: Option<String>,
}

// --- CLIENT MODELS ---
#[derive(Serialize, Deserialize, FromRow, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Client {
    pub client_id: i32,
    pub first_name: String,
    pub last_name: String,
    pub has_personal_care: bool,
    pub has_lifting: bool,
    pub address_1: String,
    pub address_2: String,
    pub zipcode: String,
    pub phone_number: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClientFilters {
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub zipcode: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateClientRequest {
    pub first_name: String,
    pub last_name: String,
    pub has_personal_care: bool,
    pub has_lifting: bool,
    pub address_1: String,
    pub address_2: String,
    pub zipcode: String,
    pub phone_number: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateClientRequest {
    pub first_name: String,
    pub last_name: String,
    pub has_personal_care: bool,
    pub has_lifting: bool,
    pub address_1: String,
    pub address_2: String,
    pub zipcode: String,
    pub phone_number: String,
}

// --- SHIFT & SERVICE MODELS ---
#[derive(Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Shift {
    pub shift_id: i32,
    pub client_id: i32,
    pub service_id: i32,
    pub total_hours: i16,
    pub zipcode: String,
    pub open_for_matching: bool,
    pub default_start_time: Option<NaiveTime>,
    pub default_duration_minutes: Option<i16>,
    pub recurrence_rule: Option<String>,
    pub series_start: Option<NaiveDate>,
    pub series_end: Option<NaiveDate>,
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ShiftFilters {
    pub client_id: Option<i32>,
    pub service_id: Option<i32>,
    pub zipcode: Option<String>,
    pub open_for_matching: Option<bool>,
    pub min_hours: Option<i16>,
    pub max_hours: Option<i16>,
}

#[derive(Serialize, Deserialize, FromRow, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Service {
    pub services_id: i32,
    pub service_name: String,
}

#[derive(Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct ClientService {
    pub client_id: i32,
    pub service_id: i32,
}

/// Response shape for GET /shifts — includes full nested Client and Service objects.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ShiftResponse {
    pub shift_id: i32,
    pub client: Client,
    pub service: Service,
    pub total_hours: i16,
    pub zipcode: String,
    pub open_for_matching: bool,
    pub assigned_employee: Option<AssignedEmployee>,
    pub default_start_time: Option<NaiveTime>,
    pub default_duration_minutes: Option<i16>,
    pub recurrence_rule: Option<String>,
    pub series_start: Option<NaiveDate>,
    pub series_end: Option<NaiveDate>,
}

/// Lightweight employee summary nested inside ShiftResponse.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AssignedEmployee {
    pub employee_id: i32,
    pub first_name: String,
    pub last_name: String,
}

/// Request body for POST/PUT /shifts — mirrors the shape the React frontend sends.
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateShiftRequest {
    pub client: ShiftClientRef,
    pub service: ShiftServiceRef,
    pub total_hours: i16,
    pub zipcode: String,
    pub open_for_matching: bool,
    pub default_start_time: Option<NaiveTime>,
    pub default_duration_minutes: Option<i16>,
    pub recurrence_rule: Option<String>,
    pub series_start: Option<NaiveDate>,
    pub series_end: Option<NaiveDate>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ShiftClientRef {
    pub client_id: i32,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ShiftServiceRef {
    pub services_id: i32,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AssignShiftRequest {
    pub employee_id: i32,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetMatchingRequest {
    pub open_for_matching: bool,
}

// --- EMPLOYEE MODELS ---
#[derive(Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Employee {
    pub employee_id: i32,
    pub first_name: String,
    pub last_name: String,
    pub phone_number: String,
    pub email: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateEmployeeRequest {
    pub first_name: String,
    pub last_name: String,
    pub phone_number: String,
    pub email: Option<String>,
}

// --- EMPLOYEE PREFERENCE & MATCHING MODELS ---
#[derive(Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct EmployeePreference {
    pub employee_id: i32,
    pub can_do_personal_care: Option<bool>,
    pub can_do_lifting: Option<bool>,
    pub preferred_zipcode: Option<String>,
    pub min_hours: Option<i16>,
    pub max_hours: Option<i16>,
    /// Day abbreviations the employee is available: MON, TUE, WED, THU, FRI, SAT, SUN.
    /// NULL or empty = no day preference (all shifts shown).
    pub available_days: Option<Vec<String>>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpsertPreferenceRequest {
    pub can_do_personal_care: Option<bool>,
    pub can_do_lifting: Option<bool>,
    pub preferred_zipcode: Option<String>,
    pub min_hours: Option<i16>,
    pub max_hours: Option<i16>,
    pub available_days: Option<Vec<String>>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MatchResult {
    pub score: i32,
    pub shift: ShiftResponse,
}

// This replaces RegisterUserDto
#[derive(Deserialize, Validate)]
pub struct RegisterUserDto {
    #[validate(length(min = 3, message = "Username must be at least 3 characters"))]
    pub username: String,
    #[validate(length(min = 8, message = "Password must be at least 8 characters"))]
    pub password: String,
    pub confirm_password: String,
    pub role: String,
}

#[derive(Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

// This replaces the Login response
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginResponseDto {
    pub token: String,
    pub user: crate::models::User,
}

// --- SHIFT OCCURRENCE MODELS ---

#[derive(Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct ShiftOccurrence {
    pub occurrence_id: i32,
    pub shift_id: i32,
    pub employee_id: Option<i32>,
    pub scheduled_start: DateTime<Utc>,
    pub scheduled_end: DateTime<Utc>,
    pub status: String,
    pub notes: Option<String>,
}

/// Full occurrence response with nested shift, client, service, and employee details.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OccurrenceResponse {
    pub occurrence_id: i32,
    pub shift: ShiftResponse,
    pub employee: Option<Employee>,
    pub scheduled_start: DateTime<Utc>,
    pub scheduled_end: DateTime<Utc>,
    pub status: String,
    pub notes: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateOccurrenceRequest {
    pub scheduled_start: DateTime<Utc>,
    pub scheduled_end: DateTime<Utc>,
    pub employee_id: Option<i32>,
    pub status: Option<String>,
    pub notes: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateOccurrenceRequest {
    pub scheduled_start: Option<DateTime<Utc>>,
    pub scheduled_end: Option<DateTime<Utc>>,
    pub employee_id: Option<i32>,
    pub status: Option<String>,
    pub notes: Option<String>,
}

/// Query params for GET /calendar
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CalendarFilters {
    pub start: NaiveDate,
    pub end: NaiveDate,
    pub employee_id: Option<i32>,
    pub client_id: Option<i32>,
}