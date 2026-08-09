-- USE housing;

-- Drop UNIQUE index constraint on owner_nic to allow multiple houses under same NIC
ALTER TABLE `house` DROP INDEX `owner_nic`;
