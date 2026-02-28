-- Migration: initial schema
-- Replaces spring.jpa.hibernate.ddl-auto=create

CREATE TABLE IF NOT EXISTS app_user (
    user_id      SERIAL PRIMARY KEY,
    username     VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255)        NOT NULL,
    role         VARCHAR(50)          NOT NULL DEFAULT 'user',
    display_name VARCHAR(255),
    img_url      VARCHAR(500),
    short_bio    TEXT
);

CREATE TABLE IF NOT EXISTS service (
    services_id  SERIAL PRIMARY KEY,
    service_name VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS client (
    client_id        SERIAL PRIMARY KEY,
    first_name       VARCHAR(255) NOT NULL,
    last_name        VARCHAR(255) NOT NULL,
    has_personal_care BOOLEAN     NOT NULL DEFAULT FALSE,
    has_lifting      BOOLEAN      NOT NULL DEFAULT FALSE,
    address_1        VARCHAR(255) NOT NULL,
    address_2        VARCHAR(255) NOT NULL DEFAULT '',
    zipcode          VARCHAR(20)  NOT NULL,
    phone_number     VARCHAR(20)  NOT NULL
);

CREATE TABLE IF NOT EXISTS shift (
    shift_id   SERIAL  PRIMARY KEY,
    client_id  INTEGER NOT NULL REFERENCES client(client_id),
    service_id INTEGER NOT NULL REFERENCES service(services_id),
    total_hours SMALLINT NOT NULL,
    zipcode    INTEGER  NOT NULL,
    available  BOOLEAN  NOT NULL DEFAULT TRUE
);
