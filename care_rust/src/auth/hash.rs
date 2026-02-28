use bcrypt::{hash, verify, DEFAULT_COST};

/// Hash a plain-text password using bcrypt (replaces BCryptPasswordEncoder).
pub fn hash_password(password: &str) -> Result<String, bcrypt::BcryptError> {
    hash(password, DEFAULT_COST)
}

/// Verify a plain-text password against a stored bcrypt hash.
pub fn verify_password(password: &str, hashed: &str) -> Result<bool, bcrypt::BcryptError> {
    verify(password, hashed)
}
