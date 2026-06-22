USE housing;

CREATE TABLE IF NOT EXISTS grant_detail (
  id INT PRIMARY KEY AUTO_INCREMENT,
  house_id INT UNIQUE NOT NULL,
  grant_amount DECIMAL(12,2) NOT NULL,
  approved_by_name VARCHAR(200) NOT NULL,
  approved_by_designation VARCHAR(200),
  approved_by_institution VARCHAR(200),
  approval_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (house_id) REFERENCES house(id)
);
