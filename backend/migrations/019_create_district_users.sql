-- USE housing;

-- Delete previously inserted district and admin accounts to avoid duplicates
DELETE FROM inspector WHERE email LIKE '%@nhd.lk';

-- Insert District and Admin Investigator Accounts
INSERT INTO inspector (division_id, full_name, employee_id, designation, contact_number, email, role, password_hash, is_active)
VALUES
  (NULL, 'NHD System Administrator', 'NHD_ADMIN', 'System Administrator', NULL, 'admin@nhd.lk', 'ADMIN', '$2y$10$dC8UVKf3dNSjxzFFQezWDuMXnt.gf.xSEw1Pv41x24QotH4Wa2zvS', 1),
  (NULL, 'Kandy District Investigator', 'NHD_KANDY', 'District Investigator', NULL, 'kandy@nhd.lk', 'INVESTIGATOR', '$2y$10$KxF9BzGFvnGCD3kqh702TOIwUfH/CcOpBna6caCxdnIVUgOMh4oZK', 1),
  (NULL, 'Matale District Investigator', 'NHD_MATALE', 'District Investigator', NULL, 'matale@nhd.lk', 'INVESTIGATOR', '$2y$10$jjHenNZ.j20tav9n2TYr6OoEddBi9/zAeHhvZ/AmpiYCljIb2mARq', 1),
  (NULL, 'Nuwara Eliya District Investigator', 'NHD_NUWARA_ELIYA', 'District Investigator', NULL, 'nuwaraeliya@nhd.lk', 'INVESTIGATOR', '$2y$10$z8Z/rKkMAWNXILKaudE1OOBcg9MMaXozpXX.7rMHPRUur5W790Lx2', 1),
  (NULL, 'Ampara District Investigator', 'NHD_AMPARA', 'District Investigator', NULL, 'ampara@nhd.lk', 'INVESTIGATOR', '$2y$10$GZmnd3hmAKqitQh6862TV.AjzsbgRAmDNdE.8do7g2j4ZzgXplsLC', 1),
  (NULL, 'Batticaloa District Investigator', 'NHD_BATTICALOA', 'District Investigator', NULL, 'batticaloa@nhd.lk', 'INVESTIGATOR', '$2y$10$GTKd8wEvpQL.uxkUGXTU5OiUYfOSJ4HpYVmLMMvWYUqhNbDQjplIG', 1),
  (NULL, 'Trincomalee District Investigator', 'NHD_TRINCOMALEE', 'District Investigator', NULL, 'trincomalee@nhd.lk', 'INVESTIGATOR', '$2y$10$WMDQw4Gtc.MW0rADVrjFGe4zvMUj7/veeX6eSWLCBSFqVoq8tGPeS', 1),
  (NULL, 'Anuradhapura District Investigator', 'NHD_ANURADHAPURA', 'District Investigator', NULL, 'anuradhapura@nhd.lk', 'INVESTIGATOR', '$2y$10$8ziOT6PAxg8kVHnSNvNGRe9nKXCpmJi//0Qz.Y6QNE4mkQiazbYwG', 1),
  (NULL, 'Polonnaruwa District Investigator', 'NHD_POLONNARUWA', 'District Investigator', NULL, 'polonnaruwa@nhd.lk', 'INVESTIGATOR', '$2y$10$iRkIBATEeVzotZoSqK6U0e/K4vETiII1HpYm.o88tG39k5zR/BGkS', 1),
  (NULL, 'Jaffna District Investigator', 'NHD_JAFFNA', 'District Investigator', NULL, 'jaffna@nhd.lk', 'INVESTIGATOR', '$2y$10$WNR6ZWtZuQUpklGCYdOCt.EBHKHX0tYnSD16EbclmixTl2E1Qwmp.', 1),
  (NULL, 'Kilinochchi District Investigator', 'NHD_KILINOCHCHI', 'District Investigator', NULL, 'kilinochchi@nhd.lk', 'INVESTIGATOR', '$2y$10$tEq1PisHZpGcwsR4YkZt/OOYKQKQOCnqAFGai.hZf50Xt4VjB6K.W', 1),
  (NULL, 'Mannar District Investigator', 'NHD_MANNAR', 'District Investigator', NULL, 'mannar@nhd.lk', 'INVESTIGATOR', '$2y$10$jaq1sk6L/v9kPIeKg.qMo.z4njRr1A/hf/GjlWDCzTkwu4UwekP9e', 1),
  (NULL, 'Mullaitivu District Investigator', 'NHD_MULLAITIVU', 'District Investigator', NULL, 'mullaitivu@nhd.lk', 'INVESTIGATOR', '$2y$10$xx/jHtejgF0V4QmuxbZq2.3xQrn7R93o52zJdkmKzmAV41J7Sjj0S', 1),
  (NULL, 'Vavuniya District Investigator', 'NHD_VAVUNIYA', 'District Investigator', NULL, 'vavuniya@nhd.lk', 'INVESTIGATOR', '$2y$10$nwv8FIk8.WPTVh5Effwh3eliQMHFt.tZy78iPvg64aU/dQW1/5vc.', 1),
  (NULL, 'Kurunegala District Investigator', 'NHD_KURUNEGALA', 'District Investigator', NULL, 'kurunegala@nhd.lk', 'INVESTIGATOR', '$2y$10$IWC20L0fakkvLtsv8lpOPeqr.Q.v9TB8x0hhiKyrO3ugG8hMyAtLK', 1),
  (NULL, 'Puttalam District Investigator', 'NHD_PUTTALAM', 'District Investigator', NULL, 'puttalam@nhd.lk', 'INVESTIGATOR', '$2y$10$sWWwQYfRfXnJEBZbdcKNkeVbp8t99u7B1Jpb2fe5tRtvZS1b0uwoO', 1),
  (NULL, 'Kegalle District Investigator', 'NHD_KEGALLE', 'District Investigator', NULL, 'kegalle@nhd.lk', 'INVESTIGATOR', '$2y$10$hAaO9oOimfoDobCd1KW98uSL8.ly/GCjpj75dCFZ2Dg0PIfHveqQa', 1),
  (NULL, 'Ratnapura District Investigator', 'NHD_RATNAPURA', 'District Investigator', NULL, 'ratnapura@nhd.lk', 'INVESTIGATOR', '$2y$10$Cpgj96recZtAzujWXI8XeeRybNrjQwZv.KEMu.Q11Bk1DfCtW2eiq', 1),
  (NULL, 'Galle District Investigator', 'NHD_GALLE', 'District Investigator', NULL, 'galle@nhd.lk', 'INVESTIGATOR', '$2y$10$Y91k2lXObS3Oj2siNUlQXOK2TrF0uRKsf3l7yfW6rnnTXT/v/Ejzi', 1),
  (NULL, 'Hambantota District Investigator', 'NHD_HAMBANTOTA', 'District Investigator', NULL, 'hambantota@nhd.lk', 'INVESTIGATOR', '$2y$10$Dnf88GqbMI2hvJUx0kNn6eV7ZZYGYwISpCSqkChrmTTBAgSrzaD/S', 1),
  (NULL, 'Matara District Investigator', 'NHD_MATARA', 'District Investigator', NULL, 'matara@nhd.lk', 'INVESTIGATOR', '$2y$10$JeOrjaVUKmTIZB3mT7T4bOQHmQxqPoF2oaceEIViNhjCfDek7dmL.', 1),
  (NULL, 'Badulla District Investigator', 'NHD_BADULLA', 'District Investigator', NULL, 'badulla@nhd.lk', 'INVESTIGATOR', '$2y$10$3R9ZA2Bw5wVtModb13unsu0m6PtnP.PZf63MLWN617kqZ2.4JrA4u', 1),
  (NULL, 'Moneragala District Investigator', 'NHD_MONERAGALA', 'District Investigator', NULL, 'moneragala@nhd.lk', 'INVESTIGATOR', '$2y$10$NFQfbeUfMEqGtPYjygqgCOTcy0qBR1X1uoV364kdgYQq2AI3RtBIu', 1),
  (NULL, 'Colombo District Investigator', 'NHD_COLOMBO', 'District Investigator', NULL, 'colombo@nhd.lk', 'INVESTIGATOR', '$2y$10$KuvGXjSRlMHMn9dkHOLEmOJLpEbdgNSAfgfgmLlgSJp1onHxMSqp6', 1),
  (NULL, 'Gampaha District Investigator', 'NHD_GAMPAHA', 'District Investigator', NULL, 'gampaha@nhd.lk', 'INVESTIGATOR', '$2y$10$wBB6WxdjeEEmgT8xxaj3zuyYDzGaz.v8oS52jaMHPW0kVX6VTTvN2', 1),
  (NULL, 'Kalutara District Investigator', 'NHD_KALUTARA', 'District Investigator', NULL, 'kalutara@nhd.lk', 'INVESTIGATOR', '$2y$10$RgYlcL3bYfiY6zDHgoBHNegLIOZy9wiSGRYTC53PxRoNzQt/jOa2S', 1);
