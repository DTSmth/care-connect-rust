use serde::{Serialize, Deserialize};
use sqlx::FromRow;

#[derive(Serialize, Deserialize, FromRow)]
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

#[derive(Serialize, Deserialize, FromRow)]
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

#[derive(Serialize, Deserialize, FromRow)]
pub struct Shift {
    pub shift_id: i32,
    pub client_id: i32,
    pub service_id: i32,
    pub total_hours: i8,
    pub zipcode: i16,
    pub available: bool,
}

#[derive(Serialize, Deserialize, FromRow)]
pub struct Service {
    services_id: i32,
    service_name: String,
}

#[derive(Serialize, Deserialize, FromRow)]
pub struct Client_Service {
    client_id: i32,
    service_id: i32,
}