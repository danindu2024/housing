-- USE housing;

-- Simplify loan table
ALTER TABLE loan 
  DROP COLUMN approved_by_name,
  DROP COLUMN approved_by_designation,
  DROP COLUMN approved_by_institution,
  DROP COLUMN approval_date,
  DROP COLUMN repayment_start_date;

ALTER TABLE loan MODIFY COLUMN repayment_status ENUM('NOT_PAID','PARTIALLY_PAID','PAYING','FULLY_PAID','DEFAULTED') NOT NULL DEFAULT 'NOT_PAID';

-- Simplify grant_detail table
ALTER TABLE grant_detail
  DROP COLUMN approved_by_name,
  DROP COLUMN approved_by_designation,
  DROP COLUMN approved_by_institution,
  DROP COLUMN approval_date;
