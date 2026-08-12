-- USE housing;

-- Add permanent_address, estimated_value, current_status, infrastructure_issues to house table
-- These were previously concatenated into the notes column or stored as a boolean flag.

ALTER TABLE `house`
  ADD COLUMN `permanent_address` TEXT DEFAULT NULL AFTER `owner_contact`,
  ADD COLUMN `estimated_value` DECIMAL(14,2) DEFAULT NULL AFTER `land_area_perches`,
  ADD COLUMN `current_status` ENUM('IN_PROGRESS','STOPPED','FINISHED') DEFAULT NULL AFTER `occupancy_status`,
  ADD COLUMN `infrastructure_issues` JSON DEFAULT NULL AFTER `has_infrastructure_issues`;
