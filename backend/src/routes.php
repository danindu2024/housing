<?php
use App\Router\Router;
use App\Middleware\AuthMiddleware;
use App\Controllers\AuthController;
use App\Controllers\ReferenceController;
use App\Controllers\VillageController;
use App\Controllers\HouseController;
use App\Controllers\LoanController;
use App\Controllers\LoanPaymentController;

/** @var Router $router */

// --- Authentication (Public) ---
$router->post('/api/v1/auth/login', [AuthController::class, 'login']);

// --- Reference/Lookup Data (Protected) ---
$router->get('/api/v1/reference/districts', [ReferenceController::class, 'districts'], [AuthMiddleware::class]);
$router->get('/api/v1/reference/village-categories', [ReferenceController::class, 'villageCategories'], [AuthMiddleware::class]);
$router->get('/api/v1/reference/land-ownership-bodies', [ReferenceController::class, 'landOwnershipBodies'], [AuthMiddleware::class]);
$router->get('/api/v1/reference/construction-stages', [ReferenceController::class, 'constructionStages'], [AuthMiddleware::class]);

// --- Villages Management (Protected) ---
$router->get('/api/v1/villages', [VillageController::class, 'index'], [AuthMiddleware::class]);
$router->post('/api/v1/villages', [VillageController::class, 'store'], [AuthMiddleware::class]);
$router->get('/api/v1/villages/{id}', [VillageController::class, 'show'], [AuthMiddleware::class]);

// --- Houses Management (Protected) ---
$router->get('/api/v1/villages/{village_id}/houses', [HouseController::class, 'index'], [AuthMiddleware::class]);
$router->post('/api/v1/villages/{village_id}/houses', [HouseController::class, 'store'], [AuthMiddleware::class]);
$router->get('/api/v1/houses/{id}', [HouseController::class, 'show'], [AuthMiddleware::class]);
$router->put('/api/v1/houses/{id}', [HouseController::class, 'update'], [AuthMiddleware::class]);

// --- Loans Management (Protected) ---
$router->get('/api/v1/houses/{house_id}/loan', [LoanController::class, 'show'], [AuthMiddleware::class]);
$router->post('/api/v1/houses/{house_id}/loan', [LoanController::class, 'store'], [AuthMiddleware::class]);

// --- Loan Payments Ledger (Protected) ---
$router->get('/api/v1/loans/{loan_id}/payments', [LoanPaymentController::class, 'index'], [AuthMiddleware::class]);
$router->post('/api/v1/loans/{loan_id}/payments', [LoanPaymentController::class, 'store'], [AuthMiddleware::class]);
