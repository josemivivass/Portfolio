-- Añade columnas de geolocalización (país, ciudad, lat/lng) a visitor_logs.
-- Se rellenan en backend con geoip-lite en cada INSERT.
-- Backfill de filas históricas: backend/scripts/backfill-geo.js.

USE portfolio;

ALTER TABLE visitor_logs
  ADD COLUMN country_code CHAR(2)         DEFAULT NULL AFTER ip_address,
  ADD COLUMN country_name VARCHAR(80)     DEFAULT NULL AFTER country_code,
  ADD COLUMN region       VARCHAR(80)     DEFAULT NULL AFTER country_name,
  ADD COLUMN city         VARCHAR(120)    DEFAULT NULL AFTER region,
  ADD COLUMN latitude     DECIMAL(8,5)    DEFAULT NULL AFTER city,
  ADD COLUMN longitude    DECIMAL(8,5)    DEFAULT NULL AFTER latitude;

CREATE INDEX idx_visitor_logs_country ON visitor_logs (country_code);
