USE housing;

ALTER TABLE village DROP COLUMN infrastructure_issue;
ALTER TABLE village ADD COLUMN infrastructure_issues JSON DEFAULT NULL AFTER is_conservation_area;
