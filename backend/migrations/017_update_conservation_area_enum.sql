USE housing;

ALTER TABLE village MODIFY COLUMN is_conservation_area VARCHAR(50) NOT NULL DEFAULT 'NONE';
UPDATE village SET is_conservation_area = 'WILDLIFE' WHERE is_conservation_area = '1';
UPDATE village SET is_conservation_area = 'NONE' WHERE is_conservation_area = '0';
ALTER TABLE village MODIFY COLUMN is_conservation_area ENUM('NONE', 'WILDLIFE', 'FOREST', 'COASTAL', 'ARCHAEOLOGICAL', 'SACRED', 'OTHER') NOT NULL DEFAULT 'NONE';
