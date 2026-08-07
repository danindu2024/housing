<?php
require_once __DIR__ . '/../vendor/autoload.php';

use App\Config\App;
use App\Config\Database;

App::loadEnv(__DIR__ . '/../.env');

$migrationFile = $argv[1] ?? null;
if (!$migrationFile) {
    echo "Usage: php scripts/run_migration.php <filename.sql>\n";
    exit(1);
}

$filePath = __DIR__ . '/../migrations/' . $migrationFile;
if (!file_exists($filePath)) {
    echo "Migration file not found: {$filePath}\n";
    exit(1);
}

$sql = file_get_contents($filePath);

try {
    $db = Database::getConnection();
    $db->exec($sql);
    echo "Migration {$migrationFile} executed successfully.\n";
} catch (\PDOException $e) {
    echo "Migration error: " . $e->getMessage() . "\n";
    exit(1);
}
