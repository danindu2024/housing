<?php
require_once __DIR__ . '/../vendor/autoload.php';

use App\Config\App;
use App\Router\Router;

// Load environment config variables
App::loadEnv(__DIR__ . '/../.env');

// Set global API JSON and CORS headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . App::get('FRONTEND_URL', '*'));
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Authorization, Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Bootstrap and dispatch router
$router = new Router();
require_once __DIR__ . '/../src/routes.php';
$router->dispatch();
