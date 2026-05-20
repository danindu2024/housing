<?php
require_once __DIR__ . '/../vendor/autoload.php';

use App\Config\App;
use App\Config\Database;

// Initialize app configuration and environment variables
App::loadEnv(__DIR__ . '/../.env');

echo "Starting Sri Lanka Administrative Location Seeder...\n";

// Path to srilanka.php
$sriLankaConfigPath = 'D:\\xampp\\htdocs\\promotion portal\\promotion-portal\\config\\srilanka.php';

if (!file_exists($sriLankaConfigPath)) {
    die("Error: The Sri Lanka location config file was not found at path: {$sriLankaConfigPath}\n");
}

// Load the hierarchy from the return value of srilanka.php
$sriLankaData = require $sriLankaConfigPath;
$hierarchy = $sriLankaData['hierarchy'] ?? [];

if (empty($hierarchy)) {
    die("Error: Failed to load location hierarchy from {$sriLankaConfigPath}\n");
}

try {
    $db = Database::getConnection();

    // Disable foreign key constraints to allow truncating reference tables
    $db->exec("SET FOREIGN_KEY_CHECKS = 0");
    $db->exec("TRUNCATE TABLE division");
    $db->exec("TRUNCATE TABLE district");
    $db->exec("TRUNCATE TABLE inspector");
    $db->exec("SET FOREIGN_KEY_CHECKS = 1");
    
    echo "Existing location and inspector tables truncated successfully.\n";

    // Prepare insert statements
    $insertDistrictStmt = $db->prepare("INSERT INTO district (name, province) VALUES (:name, :province)");
    $insertDivisionStmt = $db->prepare("INSERT INTO division (district_id, name) VALUES (:district_id, :name)");

    $districtCount = 0;
    $divisionCount = 0;

    // Loop through Province -> District -> DS Divisions
    foreach ($hierarchy as $provinceName => $districts) {
        foreach ($districts as $districtName => $divisions) {
            // Insert District
            $insertDistrictStmt->execute([
                ':name' => $districtName,
                ':province' => $provinceName
            ]);
            $districtId = $db->lastInsertId();
            $districtCount++;

            // Insert Divisions belonging to this District
            foreach ($divisions as $divisionName) {
                $insertDivisionStmt->execute([
                    ':district_id' => $districtId,
                    ':name' => $divisionName
                ]);
                $divisionCount++;
            }
        }
    }

    echo "Successfully seeded {$districtCount} districts and {$divisionCount} DS divisions!\n";

    // Grab a default division ID (first seeded division) for the initial inspector
    $defaultDivisionId = $db->query("SELECT id FROM division LIMIT 1")->fetchColumn();

    // Seed Admin Inspector Account
    // Password: admin123
    $adminPasswordHash = password_hash('admin123', PASSWORD_BCRYPT);
    $insertAdminStmt = $db->prepare("
        INSERT INTO inspector (division_id, full_name, employee_id, designation, contact_number, email, role, password_hash, is_active)
        VALUES (:division_id, :full_name, :employee_id, :designation, :contact_number, :email, :role, :password_hash, :is_active)
    ");

    $insertAdminStmt->execute([
        ':division_id' => $defaultDivisionId ? $defaultDivisionId : null,
        ':full_name' => 'System Admin',
        ':employee_id' => 'ADMIN001',
        ':designation' => 'Administrator',
        ':contact_number' => '0771234567',
        ':email' => 'admin@gov.lk',
        ':role' => 'ADMIN',
        ':password_hash' => $adminPasswordHash,
        ':is_active' => 1
    ]);

    echo "Successfully seeded initial Admin account (admin@gov.lk / admin123)!\n";

} catch (\PDOException $e) {
    die("Database Seeding Failed: " . $e->getMessage() . "\n");
}
