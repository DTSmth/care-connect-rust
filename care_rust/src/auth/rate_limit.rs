use std::sync::Arc;
use std::time::{Duration, Instant};
use dashmap::DashMap;

/// Maximum login attempts allowed per IP within the window before blocking.
const MAX_ATTEMPTS: u32 = 10;
/// Time window for rate limiting.
const WINDOW: Duration = Duration::from_secs(15 * 60); // 15 minutes

#[derive(Debug, Clone, Default)]
struct AttemptRecord {
    count: u32,
    window_start: Option<Instant>,
}

/// Shared, thread-safe in-memory login rate limiter.
/// Tracks failed attempts per IP address. Pass as `Extension<LoginRateLimiter>`.
#[derive(Debug, Clone)]
pub struct LoginRateLimiter(Arc<DashMap<String, AttemptRecord>>);

impl LoginRateLimiter {
    pub fn new() -> Self {
        Self(Arc::new(DashMap::new()))
    }

    /// Returns true if the IP is currently blocked (too many recent attempts).
    /// Should be called before processing a login request.
    pub fn is_blocked(&self, ip: &str) -> bool {
        if let Some(record) = self.0.get(ip) {
            if let Some(start) = record.window_start {
                if start.elapsed() < WINDOW {
                    return record.count >= MAX_ATTEMPTS;
                }
            }
        }
        false
    }

    /// Records a failed login attempt for the given IP.
    pub fn record_failure(&self, ip: &str) {
        let mut record = self.0.entry(ip.to_string()).or_default();
        match record.window_start {
            Some(start) if start.elapsed() < WINDOW => {
                record.count += 1;
            }
            _ => {
                // Window expired or first attempt — start a fresh window
                record.count = 1;
                record.window_start = Some(Instant::now());
            }
        }
        if record.count >= MAX_ATTEMPTS {
            tracing::warn!(ip, "Login rate limit reached — IP blocked for 15 minutes");
        }
    }

    /// Clears the attempt record for an IP on successful login.
    pub fn record_success(&self, ip: &str) {
        self.0.remove(ip);
    }
}
