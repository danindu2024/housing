-- USE housing;

-- Rename 'name' to 'name_en' for consistency
ALTER TABLE land_ownership_body CHANGE name name_en VARCHAR(150) NOT NULL;

-- Add Sinhala and Tamil name columns
ALTER TABLE land_ownership_body ADD COLUMN name_si VARCHAR(150) NOT NULL AFTER name_en;
ALTER TABLE land_ownership_body ADD COLUMN name_ta VARCHAR(150) AFTER name_si;

-- Populate existing records with translations
UPDATE land_ownership_body SET name_si = 'ප්‍රාදේශීය ලේකම් කාර්යාලය', name_ta = 'பிரதேச செயலகம்' WHERE code = 'DS_DIVISION';
UPDATE land_ownership_body SET name_si = 'මහවැලි අධිකාරිය', name_ta = 'மகாவலி அதிகாரம்' WHERE code = 'MAHAWELI';
UPDATE land_ownership_body SET name_si = 'ඉඩම් ප්‍රතිසංස්කරණ කොමිෂන් සභාව', name_ta = 'காணி சீர்திருத்த ஆணைக்குழு' WHERE code = 'LRC';
UPDATE land_ownership_body SET name_si = 'නිවාස අධිකාරිය', name_ta = 'வீடமைப்பு அதிகார சபை' WHERE code = 'HOUSING_AUTH';
UPDATE land_ownership_body SET name_si = 'වනජීවී සංරක්ෂණ දෙපාර්තමේන්තුව', name_ta = 'வனஜீவராசிகள் பாதுகாப்பு திணைக்களம்' WHERE code = 'WILDLIFE';
