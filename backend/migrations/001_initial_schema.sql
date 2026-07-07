-- USE housing;

CREATE TABLE IF NOT EXISTS district (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  province VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS division (
  id INT PRIMARY KEY AUTO_INCREMENT,
  district_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (district_id) REFERENCES district(id)
);

CREATE TABLE IF NOT EXISTS land_ownership_body (
  id INT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(30) UNIQUE NOT NULL,
  name VARCHAR(150) NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS village_category (
  id INT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(30) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS construction_stage (
  id INT PRIMARY KEY AUTO_INCREMENT,
  stage_order TINYINT UNIQUE NOT NULL,
  code VARCHAR(30) UNIQUE NOT NULL,
  label VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS inspector (
  id INT PRIMARY KEY AUTO_INCREMENT,
  division_id INT,
  full_name VARCHAR(200) NOT NULL,
  employee_id VARCHAR(50) UNIQUE NOT NULL,
  designation VARCHAR(150),
  contact_number VARCHAR(20),
  email VARCHAR(150) UNIQUE,
  role ENUM('ADMIN','INVESTIGATOR','FIELD_COLLECTOR') NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (division_id) REFERENCES division(id)
);

CREATE TABLE IF NOT EXISTS village (
  id INT PRIMARY KEY AUTO_INCREMENT,
  division_id INT NOT NULL,
  category_id INT NOT NULL,
  ownership_body_id INT NOT NULL,
  name VARCHAR(200) NOT NULL,
  development_project VARCHAR(100),
  grama_niladhari_division VARCHAR(200),
  gps_lat DECIMAL(10,7),
  gps_lng DECIMAL(10,7),
  total_planned_houses INT NOT NULL,
  status ENUM('IN_PROGRESS','COMPLETED','INCOMPLETE','ABANDONED') NOT NULL,
  is_conservation_area TINYINT(1) DEFAULT 0,
  has_infrastructure_issues TINYINT(1) DEFAULT 0,
  program_start_date DATE,
  program_end_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (division_id) REFERENCES division(id),
  FOREIGN KEY (category_id) REFERENCES village_category(id),
  FOREIGN KEY (ownership_body_id) REFERENCES land_ownership_body(id)
);

CREATE TABLE IF NOT EXISTS house (
  id INT PRIMARY KEY AUTO_INCREMENT,
  village_id INT NOT NULL,
  house_number VARCHAR(50) NOT NULL,
  owner_name VARCHAR(200) NOT NULL,
  owner_nic VARCHAR(20) UNIQUE NOT NULL,
  owner_contact VARCHAR(20),
  household_members TINYINT UNSIGNED,
  land_area_perches DECIMAL(8,2),
  construction_stage_id INT NOT NULL,
  is_land_sold TINYINT(1) DEFAULT 0,
  is_house_sold TINYINT(1) DEFAULT 0,
  occupancy_status ENUM('BORROWER_LIVING','SOLD','ABANDONED','NOT_APPLICABLE') DEFAULT 'NOT_APPLICABLE',
  has_infrastructure_issues TINYINT(1) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_village_house (village_id, house_number),
  FOREIGN KEY (village_id) REFERENCES village(id),
  FOREIGN KEY (construction_stage_id) REFERENCES construction_stage(id)
);

CREATE TABLE IF NOT EXISTS loan (
  id INT PRIMARY KEY AUTO_INCREMENT,
  house_id INT UNIQUE NOT NULL,
  loan_amount DECIMAL(12,2) NOT NULL,
  approved_by_name VARCHAR(200) NOT NULL,
  approved_by_designation VARCHAR(200),
  approved_by_institution VARCHAR(200),
  approval_date DATE,
  repayment_start_date DATE,
  monthly_installment DECIMAL(10,2),
  repayment_months SMALLINT,
  repayment_status ENUM('NOT_PAID','PARTIALLY_PAID','PAYING','FULLY_PAID') NOT NULL DEFAULT 'NOT_PAID',
  total_paid_so_far DECIMAL(12,2) DEFAULT 0.00,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (house_id) REFERENCES house(id)
);

CREATE TABLE IF NOT EXISTS loan_payment (
  id INT PRIMARY KEY AUTO_INCREMENT,
  loan_id INT NOT NULL,
  payment_date DATE NOT NULL,
  amount_paid DECIMAL(10,2) NOT NULL,
  payment_method ENUM('BANK','CASH','CHEQUE','OTHER'),
  receipt_number VARCHAR(100),
  recorded_by INT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (loan_id) REFERENCES loan(id),
  FOREIGN KEY (recorded_by) REFERENCES inspector(id)
);

CREATE TABLE IF NOT EXISTS loan_default_reason (
  id INT PRIMARY KEY AUTO_INCREMENT,
  loan_id INT UNIQUE NOT NULL,
  reason_code ENUM('FINANCIAL_HARDSHIP','HOUSE_SOLD','BORROWER_DECEASED','AUTHORITY_DISPUTE','NO_AWARENESS','OTHER') NOT NULL,
  reason_detail TEXT,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (loan_id) REFERENCES loan(id)
);

CREATE TABLE IF NOT EXISTS issue_report (
  id INT PRIMARY KEY AUTO_INCREMENT,
  village_id INT,
  house_id INT,
  inspector_id INT NOT NULL,
  issue_type ENUM('LOAN_DEFAULT','CONSTRUCTION_STALLED','LAND_SOLD','HOUSE_ABANDONED','CONSERVATION_VIOLATION','INFRASTRUCTURE_PROBLEM','OWNERSHIP_DISPUTE','LOAN_CORRUPTION','OTHER') NOT NULL,
  description TEXT NOT NULL,
  severity ENUM('LOW','MEDIUM','HIGH','CRITICAL') NOT NULL,
  status ENUM('OPEN','UNDER_REVIEW','RESOLVED') DEFAULT 'OPEN',
  reported_date DATE NOT NULL,
  resolved_date DATE,
  resolution_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (village_id) REFERENCES village(id),
  FOREIGN KEY (house_id) REFERENCES house(id),
  FOREIGN KEY (inspector_id) REFERENCES inspector(id)
);

-- Core Reference Seeding
INSERT IGNORE INTO land_ownership_body (id, code, name) VALUES
  (1, 'DS_DIVISION', 'DS Division'),
  (2, 'MAHAWELI', 'Mahaweli Authority'),
  (3, 'LRC', 'Land Reform Commission'),
  (4, 'HOUSING_AUTH', 'Housing Authority'),
  (5, 'WILDLIFE', 'Department of Wildlife Conservation');

INSERT IGNORE INTO village_category (id, code, name) VALUES
  (1, 'LOAN', 'Loan Village'),
  (2, 'GRANT', 'Grant Village');

INSERT IGNORE INTO construction_stage (id, stage_order, code, label) VALUES
  (1, 1, 'NO_FOUNDATION', 'No Foundation'),
  (2, 2, 'FOUNDATION_DONE', 'Foundation Done'),
  (3, 3, 'LINTEL_DONE', 'Lintel Done'),
  (4, 4, 'WINDOWS_DONE', 'Windows Done'),
  (5, 5, 'ROOF_LEVEL', 'Reached Roof Level'),
  (6, 6, 'ROOF_DONE', 'Roof Done'),
  (7, 7, 'PLASTERING_DONE', 'Plastering Done'),
  (8, 8, 'FULLY_DEVELOPED', 'House Fully Developed');
