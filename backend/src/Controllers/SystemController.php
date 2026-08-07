<?php
namespace App\Controllers;

use App\Config\Database;
use PDO;

class SystemController {

    public function migrate(): void {
        header('Content-Type: application/json');
        
        $providedKey = $_GET['secret_key'] ?? '';
        $expectedKey = \App\Config\App::get('MIGRATION_SECRET', 'nhd_default_secure_key_123');

        if (empty($expectedKey) || $providedKey !== $expectedKey) {
            http_response_code(403);
            echo json_encode([
                'status' => 'error',
                'message' => 'Forbidden: Invalid or missing secret_key.'
            ]);
            return;
        }

        try {
            $db = Database::getConnection();

            // Check if specific migration file should be force re-executed
            $forceFile = $_GET['force_file'] ?? $_GET['rerun'] ?? null;
            if (!empty($forceFile)) {
                $delStmt = $db->prepare("DELETE FROM migration_history WHERE migration_name LIKE :name");
                $delStmt->execute([':name' => '%' . trim($forceFile) . '%']);
            }

            // 1. Create migration tracker table if it doesn't exist
            $db->exec("CREATE TABLE IF NOT EXISTS migration_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                migration_name VARCHAR(255) UNIQUE NOT NULL,
                run_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )");

            // Auto-detect existing databases and mark historical migrations as executed
            $checkCount = $db->query("SELECT COUNT(*) FROM migration_history")->fetchColumn();
            if ((int)$checkCount === 0) {
                $tableCheck = $db->query("SHOW TABLES LIKE 'district'")->fetch();
                if ($tableCheck) {
                    // Check if google_map_link column exists to see if migrations 14-18 were already applied
                    $hasGoogleMapLink = false;
                    try {
                        $colCheck = $db->query("SHOW COLUMNS FROM village LIKE 'google_map_link'")->fetch();
                        if ($colCheck) {
                            $hasGoogleMapLink = true;
                        }
                    } catch (\Exception $e) {}

                    $historical = [
                        '001_initial_schema.sql',
                        '002_development_project.sql',
                        '003_land_ownership_localization.sql',
                        '004_add_ownership_bodies.sql',
                        '005_remove_gps_fields.sql',
                        '006_update_village_status_enum.sql',
                        '007_remove_program_end_date.sql',
                        '008_update_infrastructure_issues.sql',
                        '009_multiple_infrastructure_issues.sql',
                        '010_add_boundary_type.sql',
                        '011_create_grant_table.sql',
                        '012_simplify_financial_schema.sql',
                        '013_create_officer_table.sql'
                    ];

                    if ($hasGoogleMapLink) {
                        $historical = array_merge($historical, [
                            '014_add_google_map_link.sql',
                            '015_make_ownership_body_id_nullable.sql',
                            '016_update_boundary_type_enum.sql',
                            '017_update_conservation_area_enum.sql',
                            '018_make_status_nullable.sql'
                        ]);
                    }

                    $ins = $db->prepare("INSERT INTO migration_history (migration_name) VALUES (:name)");
                    foreach ($historical as $m) {
                        $ins->execute([':name' => $m]);
                    }
                }
            }

            // Self-healing check: If migration_history claims 014 is executed, but google_map_link is missing from village table,
            // we delete 014-018 from migration_history so they get executed properly.
            $hasGoogleMapLinkColumn = false;
            try {
                $colCheck = $db->query("SHOW COLUMNS FROM village LIKE 'google_map_link'")->fetch();
                if ($colCheck) {
                    $hasGoogleMapLinkColumn = true;
                }
            } catch (\Exception $e) {
                // Table might not exist yet, which is fine
            }

            if (!$hasGoogleMapLinkColumn) {
                $db->exec("DELETE FROM migration_history WHERE migration_name IN (
                    '014_add_google_map_link.sql',
                    '015_make_ownership_body_id_nullable.sql',
                    '016_update_boundary_type_enum.sql',
                    '017_update_conservation_area_enum.sql',
                    '018_make_status_nullable.sql'
                )");
            }

            // 2. Fetch already executed migrations
            $stmt = $db->query("SELECT migration_name FROM migration_history");
            $executedMigrations = $stmt->fetchAll(PDO::FETCH_COLUMN);

            // 3. Scan the migrations directory
            $migrationsDir = __DIR__ . '/../../migrations';
            $files = scandir($migrationsDir);
            
            // Filter only .sql files
            $migrationFiles = array_filter($files, function($file) {
                return pathinfo($file, PATHINFO_EXTENSION) === 'sql';
            });

            // Sort files numerically/alphabetically
            sort($migrationFiles);

            $skipParam = $_GET['skip'] ?? '';
            $skipPatterns = array_filter(array_map('trim', explode(',', $skipParam)));

            $executed = [];
            foreach ($migrationFiles as $file) {
                // Safety protection: Never automatically run TRUNCATE data scripts on live database
                if (strpos($file, 'truncate') !== false) {
                    $recordStmt = $db->prepare("INSERT IGNORE INTO migration_history (migration_name) VALUES (:name)");
                    $recordStmt->execute([':name' => $file]);
                    continue;
                }

                // Skip specified migrations
                $isSkipped = false;
                foreach ($skipPatterns as $pattern) {
                    if (!empty($pattern) && strpos($file, $pattern) !== false) {
                        $isSkipped = true;
                        break;
                    }
                }
                if ($isSkipped) {
                    $recordStmt = $db->prepare("INSERT IGNORE INTO migration_history (migration_name) VALUES (:name)");
                    $recordStmt->execute([':name' => $file]);
                    continue;
                }

                if (in_array($file, $executedMigrations)) {
                    continue; // Skip already executed migrations
                }

                $sqlPath = $migrationsDir . '/' . $file;
                $sql = file_get_contents($sqlPath);

                // Execute the migration SQL
                $db->exec($sql);

                // Record execution in history table
                $recordStmt = $db->prepare("INSERT IGNORE INTO migration_history (migration_name) VALUES (:name)");
                $recordStmt->execute([':name' => $file]);

                $executed[] = $file;
            }

            http_response_code(200);
            echo json_encode([
                'status' => 'success',
                'executed_migrations' => $executed,
                'message' => count($executed) === 0 ? 'Database is already up to date.' : 'Successfully ran new migrations.'
            ]);

        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode([
                'status' => 'error',
                'message' => $e->getMessage()
            ]);
        }
    }
}
