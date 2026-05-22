USE housing;

-- 1. Create the lookup table for development projects
CREATE TABLE IF NOT EXISTS development_project (
  id INT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(50) UNIQUE NOT NULL,
  name_en VARCHAR(150) NOT NULL,
  name_si VARCHAR(150) NOT NULL,
  name_ta VARCHAR(150),
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Populate with Sinhala and Tamil translations
INSERT INTO development_project (id, code, name_en, name_si, name_ta) VALUES
  (1, '40TH_ANNIVERSARY', '40th Anniversary', '40 වන සංවත්සරය', '40வது ஆண்டுவிழா'),
  (2, '41ST_ANNIVERSARY', '41st Anniversary', '41 වන සංවත්සරය', '41வது ஆண்டுவிழா'),
  (3, 'GRAMA_SHAKTHI', 'Grama Shakthi', 'ග්‍රාම ශක්ති', 'கிராம சக்தி'),
  (4, 'GRANT_MODEL_VILLAGE', 'Grant Model Village', 'ආධාර ආදර්ශ ගම්මානය', 'மானிய மாதிரி கிராமம்'),
  (5, 'LOAN_MODEL_VILLAGE', 'Loan Model Village', 'ණය ආදර්ශ ගම්මානය', 'கடன் மாதிரி கிராமம்'),
  (6, 'ADARSHA_GAMMANA', 'Adarsha Gammana', 'ආදර්ශ ගම්මාන', 'மாதிரி கிராமங்கள்'),
  (7, 'NORTH_PROVINCE', 'North Province', 'උතුරු පළාත්', 'வட மாகாணம்'),
  (8, 'WELIOYA_PROGRAMME', 'Welioya Programme', 'වැලිඔය වැඩසටහන', 'வெலிஓயா திட்டம்')
ON DUPLICATE KEY UPDATE 
  name_en = VALUES(name_en), 
  name_si = VALUES(name_si), 
  name_ta = VALUES(name_ta);

-- 3. Modify the village table: Remove old string column & add foreign key relation
ALTER TABLE village DROP COLUMN development_project;
ALTER TABLE village ADD COLUMN development_project_id INT NULL;
ALTER TABLE village ADD CONSTRAINT fk_village_development_project FOREIGN KEY (development_project_id) REFERENCES development_project(id);
