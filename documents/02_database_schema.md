# Database Schema Design
## Village & Housing Development Investigation System

---

**Document Version:** 1.0  
**Date:** May 2026  
**Database:** MySQL 8.0+

---

## 1. Overview

The schema is organized into six logical groups:

| Group | Tables |
|---|---|
| Geography | `district`, `division` |
| Village | `village_category`, `village`, `land_ownership_body` |
| House | `house`, `construction_stage` |
| Loan | `loan`, `loan_payment`, `loan_default_reason` |
| Land Issues | `land_issue` |
| Investigation | `issue_report`, `inspector` |

---

## 2. Reference / Lookup Tables

### 2.1 `district`
Stores Sri Lankan administrative districts.

| Column | Type | Notes |
|---|---|---|
| id | INT PK AUTO_INCREMENT | |
| name | VARCHAR(100) NOT NULL | e.g., "Kandy", "Colombo" |
| province | VARCHAR(100) NOT NULL | e.g., "Central Province" |
| created_at | TIMESTAMP DEFAULT NOW() | |

---

### 2.2 `division`
Divisional Secretariat divisions within a district.

| Column | Type | Notes |
|---|---|---|
| id | INT PK AUTO_INCREMENT | |
| district_id | INT FK → district.id | |
| name | VARCHAR(150) NOT NULL | e.g., "Kundasale" |
| created_at | TIMESTAMP DEFAULT NOW() | |

---

### 2.3 `land_ownership_body`
The government body that holds ownership of the land on which the village is built.

| Column | Type | Notes |
|---|---|---|
| id | INT PK AUTO_INCREMENT | |
| code | VARCHAR(30) UNIQUE NOT NULL | `DS_DIVISION`, `MAHAWELI`, `LRC`, `HOUSING_AUTH`, `WILDLIFE` |
| name | VARCHAR(150) NOT NULL | Full display name |
| description | TEXT | |

**Seed Data:**

| code | name |
|---|---|
| DS_DIVISION | DS Division |
| MAHAWELI | Mahaweli Authority |
| LRC | Land Reform Commission |
| HOUSING_AUTH | Housing Authority |
| WILDLIFE | Department of Wildlife Conservation |

---

### 2.4 `village_category`
Classifies the village programme type.

| Column | Type | Notes |
|---|---|---|
| id | INT PK AUTO_INCREMENT | |
| code | VARCHAR(30) UNIQUE NOT NULL | `LOAN`, `GRANT` |
| name | VARCHAR(100) NOT NULL | |
| description | TEXT | |

**Seed Data:**

| code | name |
|---|---|
| LOAN | Loan Village |
| GRANT | Grant Village |

---

### 2.5 `construction_stage`
Ordered stages of house construction for consistent tracking.

| Column | Type | Notes |
|---|---|---|
| id | INT PK AUTO_INCREMENT | |
| stage_order | TINYINT NOT NULL UNIQUE | 1–8, defines sequence |
| code | VARCHAR(30) UNIQUE NOT NULL | |
| label | VARCHAR(100) NOT NULL | Display label |

**Seed Data:**

| stage_order | code | label |
|---|---|---|
| 1 | NO_FOUNDATION | No Foundation |
| 2 | FOUNDATION_DONE | Foundation Done |
| 3 | LINTEL_DONE | Lintel Done |
| 4 | WINDOWS_DONE | Windows Done |
| 5 | ROOF_LEVEL | Reached Roof Level |
| 6 | ROOF_DONE | Roof Done |
| 7 | PLASTERING_DONE | Plastering Done |
| 8 | FULLY_DEVELOPED | House Fully Developed |

---

## 3. Core Entity Tables

### 3.1 `village`
The central entity. Each row represents one village in the programme.

| Column | Type | Notes |
|---|---|---|
| id | INT PK AUTO_INCREMENT | |
| division_id | INT FK → division.id | Geographic location |
| category_id | INT FK → village_category.id | LOAN or GRANT |
| ownership_body_id | INT FK → land_ownership_body.id | Government body that owns the land |
| name | VARCHAR(200) NOT NULL | Village name |
| grama_niladhari_division | VARCHAR(200) | GN division name |
| gps_lat | DECIMAL(10,7) | Latitude |
| gps_lng | DECIMAL(10,7) | Longitude |
| total_planned_houses | INT NOT NULL | Planned number of houses |
| status | ENUM('IN_PROGRESS','COMPLETED','INCOMPLETE','ABANDONED') NOT NULL | |
| is_conservation_area | TINYINT(1) DEFAULT 0 | Land in wildlife conservation zone |
| has_infrastructure_issues | TINYINT(1) DEFAULT 0 | Road/water/electricity problems |
| program_start_date | DATE | |
| program_end_date | DATE | |
| notes | TEXT | General investigator notes |
| created_at | TIMESTAMP DEFAULT NOW() | |
| updated_at | TIMESTAMP ON UPDATE NOW() | |

**Index:** `(division_id)`, `(category_id)`, `(status)`, `(ownership_body_id)`

---

### 3.2 `house`
Each house within a village, regardless of village type.

| Column | Type | Notes |
|---|---|---|
| id | INT PK AUTO_INCREMENT | |
| village_id | INT FK → village.id | |
| house_number | VARCHAR(50) NOT NULL | Local reference number |
| owner_name | VARCHAR(200) NOT NULL | Original beneficiary name |
| owner_nic | VARCHAR(20) UNIQUE NOT NULL | National Identity Card number |
| owner_contact | VARCHAR(20) | |
| household_members | TINYINT UNSIGNED | Number of people in household |
| land_area_perches | DECIMAL(8,2) | Land size in perches |
| construction_stage_id | INT FK → construction_stage.id | Current highest stage reached |
| is_land_sold | TINYINT(1) DEFAULT 0 | Has the land been sold? |
| is_house_sold | TINYINT(1) DEFAULT 0 | Has the house been sold? |
| occupancy_status | ENUM('BORROWER_LIVING','SOLD','ABANDONED','NOT_APPLICABLE') DEFAULT 'NOT_APPLICABLE' | Only relevant when stage = FULLY_DEVELOPED |
| has_infrastructure_issues | TINYINT(1) DEFAULT 0 | House-level infra problem |
| notes | TEXT | |
| created_at | TIMESTAMP DEFAULT NOW() | |
| updated_at | TIMESTAMP ON UPDATE NOW() | |

**Constraint:** `UNIQUE(village_id, house_number)`  
**Index:** `(village_id)`, `(construction_stage_id)`, `(owner_nic)`

---

## 4. Loan Tables

> These tables are only populated for houses in **Loan Villages** (`village.category_id = LOAN`).

### 4.1 `loan`
One loan per house in a loan village.

| Column | Type | Notes |
|---|---|---|
| id | INT PK AUTO_INCREMENT | |
| house_id | INT FK → house.id UNIQUE | One loan per house |
| loan_amount | DECIMAL(12,2) NOT NULL | Total loan amount (LKR) |
| approved_by_name | VARCHAR(200) NOT NULL | Name of approving officer |
| approved_by_designation | VARCHAR(200) | Officer's designation/title |
| approved_by_institution | VARCHAR(200) | Institution/department |
| approval_date | DATE | |
| repayment_start_date | DATE | |
| monthly_installment | DECIMAL(10,2) | Expected monthly payment |
| repayment_months | SMALLINT | Total repayment period in months |
| repayment_status | ENUM('NOT_PAID','PARTIALLY_PAID','PAYING','FULLY_PAID') NOT NULL DEFAULT 'NOT_PAID' | |
| total_paid_so_far | DECIMAL(12,2) DEFAULT 0.00 | Computed or manually updated |
| notes | TEXT | |
| created_at | TIMESTAMP DEFAULT NOW() | |
| updated_at | TIMESTAMP ON UPDATE NOW() | |

**Index:** `(repayment_status)`, `(approved_by_name)` *(for corruption queries)*

---

### 4.2 `loan_payment`
Individual payment records against a loan.

| Column | Type | Notes |
|---|---|---|
| id | INT PK AUTO_INCREMENT | |
| loan_id | INT FK → loan.id | |
| payment_date | DATE NOT NULL | |
| amount_paid | DECIMAL(10,2) NOT NULL | |
| payment_method | ENUM('BANK','CASH','CHEQUE','OTHER') | |
| receipt_number | VARCHAR(100) | |
| recorded_by | INT FK → inspector.id | Who entered this record |
| notes | TEXT | |
| created_at | TIMESTAMP DEFAULT NOW() | |

**Index:** `(loan_id)`, `(payment_date)`

---

### 4.3 `loan_default_reason`
Reasons recorded when a loan is not paid or partially paid.

| Column | Type | Notes |
|---|---|---|
| id | INT PK AUTO_INCREMENT | |
| loan_id | INT FK → loan.id UNIQUE | One reason record per defaulted loan |
| reason_code | ENUM('FINANCIAL_HARDSHIP','HOUSE_SOLD','BORROWER_DECEASED','AUTHORITY_DISPUTE','NO_AWARENESS','OTHER') NOT NULL | |
| reason_detail | TEXT | Free text explanation |
| recorded_at | TIMESTAMP DEFAULT NOW() | |

---

## 5. Issue Tracking Tables

### 5.1 `issue_report`
Problems identified at house or village level during investigation.

| Column | Type | Notes |
|---|---|---|
| id | INT PK AUTO_INCREMENT | |
| village_id | INT FK → village.id NULLABLE | Village-level issue |
| house_id | INT FK → house.id NULLABLE | House-level issue |
| inspector_id | INT FK → inspector.id | Who recorded this |
| issue_type | ENUM('LOAN_DEFAULT','CONSTRUCTION_STALLED','LAND_SOLD','HOUSE_ABANDONED','CONSERVATION_VIOLATION','INFRASTRUCTURE_PROBLEM','OWNERSHIP_DISPUTE','LOAN_CORRUPTION','OTHER') NOT NULL | |
| description | TEXT NOT NULL | |
| severity | ENUM('LOW','MEDIUM','HIGH','CRITICAL') NOT NULL | |
| status | ENUM('OPEN','UNDER_REVIEW','RESOLVED') DEFAULT 'OPEN' | |
| reported_date | DATE NOT NULL | |
| resolved_date | DATE NULLABLE | |
| resolution_notes | TEXT | |
| created_at | TIMESTAMP DEFAULT NOW() | |

**Constraint:** `CHECK (village_id IS NOT NULL OR house_id IS NOT NULL)`

---

### 5.2 `inspector`
Field officers and investigators who collect and enter data.

| Column | Type | Notes |
|---|---|---|
| id | INT PK AUTO_INCREMENT | |
| division_id | INT FK → division.id | Area assigned |
| full_name | VARCHAR(200) NOT NULL | |
| employee_id | VARCHAR(50) UNIQUE NOT NULL | |
| designation | VARCHAR(150) | |
| contact_number | VARCHAR(20) | |
| email | VARCHAR(150) UNIQUE | |
| role | ENUM('ADMIN','INVESTIGATOR','FIELD_COLLECTOR') NOT NULL | |
| password_hash | VARCHAR(255) NOT NULL | Bcrypt hash |
| is_active | TINYINT(1) DEFAULT 1 | |
| created_at | TIMESTAMP DEFAULT NOW() | |

---

## 6. Entity Relationship Summary

```
district
  └── division
        ├── inspector (assigned area)
        └── village
              ├── village_category  (LOAN / GRANT)
              ├── land_ownership_body (DS / Mahaweli / LRC / Housing / Wildlife)
              ├── issue_report (village-level)
              └── house
                    ├── construction_stage (current stage)
                    ├── issue_report (house-level)
                    └── loan  [only if village.category = LOAN]
                          ├── loan_payment (multiple)
                          └── loan_default_reason (if defaulted)
```

---

## 7. Key Investigative Queries

### 7.1 Loan Corruption Check — Who approved the most loans?
```sql
SELECT
  approved_by_name,
  approved_by_designation,
  approved_by_institution,
  COUNT(*) AS total_loans_approved,
  SUM(loan_amount) AS total_value,
  SUM(CASE WHEN repayment_status = 'NOT_PAID' THEN 1 ELSE 0 END) AS defaulted
FROM loan
GROUP BY approved_by_name, approved_by_designation, approved_by_institution
ORDER BY total_loans_approved DESC;
```

### 7.2 Construction Progress Summary
```sql
SELECT cs.label, COUNT(h.id) AS house_count
FROM house h
JOIN construction_stage cs ON h.construction_stage_id = cs.id
GROUP BY cs.stage_order, cs.label
ORDER BY cs.stage_order;
```

### 7.3 Loan Repayment Status by Village
```sql
SELECT
  v.name AS village_name,
  l.repayment_status,
  COUNT(*) AS count,
  SUM(l.loan_amount) AS total_amount,
  SUM(l.total_paid_so_far) AS total_paid
FROM loan l
JOIN house h ON l.house_id = h.id
JOIN village v ON h.village_id = v.id
GROUP BY v.id, l.repayment_status;
```

### 7.4 Completed Houses — Occupancy Check
```sql
SELECT
  h.owner_name, h.owner_nic, h.occupancy_status,
  v.name AS village_name
FROM house h
JOIN village v ON h.village_id = v.id
JOIN construction_stage cs ON h.construction_stage_id = cs.id
WHERE cs.code = 'FULLY_DEVELOPED';
```

### 7.5 Problem Frequency (for solution recommendations)
```sql
SELECT issue_type, severity, COUNT(*) AS frequency
FROM issue_report
GROUP BY issue_type, severity
ORDER BY frequency DESC;
```

### 7.6 Conservation Area / Infrastructure Violations
```sql
SELECT v.name, v.is_conservation_area, v.has_infrastructure_issues,
  lob.name AS ownership_body, COUNT(h.id) AS house_count
FROM village v
JOIN land_ownership_body lob ON v.ownership_body_id = lob.id
LEFT JOIN house h ON h.village_id = v.id
WHERE v.is_conservation_area = 1 OR v.has_infrastructure_issues = 1
GROUP BY v.id;
```

---

## 8. MySQL DDL Script

```sql
CREATE DATABASE IF NOT EXISTS village_dev_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE village_dev_db;

CREATE TABLE district (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  province VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE division (
  id INT PRIMARY KEY AUTO_INCREMENT,
  district_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (district_id) REFERENCES district(id)
);

CREATE TABLE land_ownership_body (
  id INT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(30) UNIQUE NOT NULL,
  name VARCHAR(150) NOT NULL,
  description TEXT
);

CREATE TABLE village_category (
  id INT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(30) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT
);

CREATE TABLE construction_stage (
  id INT PRIMARY KEY AUTO_INCREMENT,
  stage_order TINYINT UNIQUE NOT NULL,
  code VARCHAR(30) UNIQUE NOT NULL,
  label VARCHAR(100) NOT NULL
);

CREATE TABLE inspector (
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

CREATE TABLE village (
  id INT PRIMARY KEY AUTO_INCREMENT,
  division_id INT NOT NULL,
  category_id INT NOT NULL,
  ownership_body_id INT NOT NULL,
  name VARCHAR(200) NOT NULL,
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

CREATE TABLE house (
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

CREATE TABLE loan (
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

CREATE TABLE loan_payment (
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

CREATE TABLE loan_default_reason (
  id INT PRIMARY KEY AUTO_INCREMENT,
  loan_id INT UNIQUE NOT NULL,
  reason_code ENUM('FINANCIAL_HARDSHIP','HOUSE_SOLD','BORROWER_DECEASED','AUTHORITY_DISPUTE','NO_AWARENESS','OTHER') NOT NULL,
  reason_detail TEXT,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (loan_id) REFERENCES loan(id)
);

CREATE TABLE issue_report (
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

-- Seed Data
INSERT INTO land_ownership_body (code, name) VALUES
  ('DS_DIVISION', 'DS Division'),
  ('MAHAWELI', 'Mahaweli Authority'),
  ('LRC', 'Land Reform Commission'),
  ('HOUSING_AUTH', 'Housing Authority'),
  ('WILDLIFE', 'Department of Wildlife Conservation');

INSERT INTO village_category (code, name) VALUES
  ('LOAN', 'Loan Village'),
  ('GRANT', 'Grant Village');

INSERT INTO construction_stage (stage_order, code, label) VALUES
  (1, 'NO_FOUNDATION', 'No Foundation'),
  (2, 'FOUNDATION_DONE', 'Foundation Done'),
  (3, 'LINTEL_DONE', 'Lintel Done'),
  (4, 'WINDOWS_DONE', 'Windows Done'),
  (5, 'ROOF_LEVEL', 'Reached Roof Level'),
  (6, 'ROOF_DONE', 'Roof Done'),
  (7, 'PLASTERING_DONE', 'Plastering Done'),
  (8, 'FULLY_DEVELOPED', 'House Fully Developed');
```
