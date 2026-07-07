-- USE housing;

ALTER TABLE village ADD COLUMN boundary_type ENUM('URBAN', 'DS', 'VILLAGE') DEFAULT NULL AFTER ownership_body_id;
