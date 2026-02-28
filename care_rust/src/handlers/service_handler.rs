use axum::{extract::State, Json};
use sqlx::PgPool;
use crate::errors::AppError;
use crate::models::Service;

pub async fn get_services(
    State(pool): State<PgPool>,
) -> Result<Json<Vec<Service>>, AppError> {
    let services = sqlx::query_as::<_, Service>("SELECT * FROM service ORDER BY services_id")
        .fetch_all(&pool)
        .await?;
    Ok(Json(services))
}
