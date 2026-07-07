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

            // 1. Create migration tracker table if it doesn't exist
            $db->exec("CREATE TABLE IF NOT EXISTS migration_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                migration_name VARCHAR(255) UNIQUE NOT NULL,
                run_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )");

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

            $executed = [];
            foreach ($migrationFiles as $file) {
                if (in_array($file, $executedMigrations)) {
                    continue; // Skip already executed migrations
                }

                $sqlPath = $migrationsDir . '/' . $file;
                $sql = file_get_contents($sqlPath);

                // Execute the migration SQL
                $db->exec($sql);

                // Record execution in history table
                $recordStmt = $db->prepare("INSERT INTO migration_history (migration_name) VALUES (:name)");
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
