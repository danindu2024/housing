-- USE housing;

ALTER TABLE village DROP COLUMN has_infrastructure_issues;
ALTER TABLE village ADD COLUMN infrastructure_issue VARCHAR(50) DEFAULT NULL AFTER is_conservation_area;
