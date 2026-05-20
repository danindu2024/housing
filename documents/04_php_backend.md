# PHP Backend Architecture
## Village & Housing Development Investigation System

---

**Document Version:** 1.0  
**Date:** May 2026  
**Stack:** PHP 8.2+, MySQL 8.0, Apache/Nginx

---

## 1. Project Structure

```
backend/
├── public/
│   └── index.php               # Single entry point (front controller)
├── src/
│   ├── Config/
│   │   ├── Database.php        # PDO connection singleton
│   │   └── App.php             # App constants, env loader
│   ├── Middleware/
│   │   ├── AuthMiddleware.php  # JWT verification
│   │   └── RoleMiddleware.php  # Role-based access check
│   ├── Controllers/
│   │   ├── AuthController.php
│   │   ├── VillageController.php
│   │   ├── HouseController.php
│   │   ├── LoanController.php
│   │   ├── LoanPaymentController.php
│   │   ├── IssueController.php
│   │   └── DashboardController.php
│   ├── Models/
│   │   ├── Village.php
│   │   ├── House.php
│   │   ├── Loan.php
│   │   ├── LoanPayment.php
│   │   ├── LoanDefaultReason.php
│   │   ├── IssueReport.php
│   │   └── Inspector.php
│   ├── Services/
│   │   ├── AuthService.php     # JWT generation/validation
│   │   ├── DashboardService.php
│   │   └── ProblemSuggestionService.php
│   ├── Validators/
│   │   ├── VillageValidator.php
│   │   ├── HouseValidator.php
│   │   └── LoanValidator.php
│   └── Router/
│       └── Router.php          # Route registration
├── migrations/
│   └── 001_initial_schema.sql
├── .env
├── composer.json
└── .htaccess
```

---

## 2. Entry Point — `public/index.php`

```php
<?php
require_once __DIR__ . '/../vendor/autoload.php';

use App\Config\App;
use App\Router\Router;

// Load environment variables
App::loadEnv(__DIR__ . '/../.env');

// CORS headers (allow React frontend)
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . App::get('FRONTEND_URL', '*'));
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Authorization, Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Bootstrap router
$router = new Router();
require_once __DIR__ . '/../src/routes.php';
$router->dispatch();
```

---

## 3. Route Registration — `src/routes.php`

```php
<?php
use App\Controllers\{
    AuthController, VillageController, HouseController,
    LoanController, LoanPaymentController, IssueController, DashboardController
};
use App\Middleware\AuthMiddleware;

// Auth (public)
$router->post('/api/v1/auth/login', [AuthController::class, 'login']);
$router->post('/api/v1/auth/logout', [AuthController::class, 'logout'],
    [AuthMiddleware::class]);

// Reference data
$router->get('/api/v1/reference/districts', [ReferenceController::class, 'districts'],
    [AuthMiddleware::class]);
$router->get('/api/v1/reference/village-categories', [ReferenceController::class, 'villageCategories'],
    [AuthMiddleware::class]);
$router->get('/api/v1/reference/land-ownership-bodies', [ReferenceController::class, 'landOwnershipBodies'],
    [AuthMiddleware::class]);
$router->get('/api/v1/reference/construction-stages', [ReferenceController::class, 'constructionStages'],
    [AuthMiddleware::class]);

// Villages
$router->get('/api/v1/villages', [VillageController::class, 'index'], [AuthMiddleware::class]);
$router->post('/api/v1/villages', [VillageController::class, 'store'], [AuthMiddleware::class]);
$router->get('/api/v1/villages/{id}', [VillageController::class, 'show'], [AuthMiddleware::class]);
$router->put('/api/v1/villages/{id}', [VillageController::class, 'update'], [AuthMiddleware::class]);

// Houses
$router->get('/api/v1/villages/{village_id}/houses', [HouseController::class, 'index'],
    [AuthMiddleware::class]);
$router->post('/api/v1/villages/{village_id}/houses', [HouseController::class, 'store'],
    [AuthMiddleware::class]);
$router->get('/api/v1/houses/{id}', [HouseController::class, 'show'], [AuthMiddleware::class]);
$router->put('/api/v1/houses/{id}', [HouseController::class, 'update'], [AuthMiddleware::class]);

// Loans
$router->get('/api/v1/houses/{house_id}/loan', [LoanController::class, 'show'],
    [AuthMiddleware::class]);
$router->post('/api/v1/houses/{house_id}/loan', [LoanController::class, 'store'],
    [AuthMiddleware::class]);
$router->put('/api/v1/loans/{id}', [LoanController::class, 'update'], [AuthMiddleware::class]);

// Loan Payments
$router->get('/api/v1/loans/{loan_id}/payments', [LoanPaymentController::class, 'index'],
    [AuthMiddleware::class]);
$router->post('/api/v1/loans/{loan_id}/payments', [LoanPaymentController::class, 'store'],
    [AuthMiddleware::class]);
$router->post('/api/v1/loans/{loan_id}/default-reason', [LoanController::class, 'storeDefaultReason'],
    [AuthMiddleware::class]);

// Issues
$router->get('/api/v1/issues', [IssueController::class, 'index'], [AuthMiddleware::class]);
$router->post('/api/v1/issues', [IssueController::class, 'store'], [AuthMiddleware::class]);
$router->put('/api/v1/issues/{id}', [IssueController::class, 'update'], [AuthMiddleware::class]);

// Dashboard
$router->get('/api/v1/dashboard/summary', [DashboardController::class, 'summary'],
    [AuthMiddleware::class]);
$router->get('/api/v1/dashboard/construction-progress', [DashboardController::class, 'constructionProgress'],
    [AuthMiddleware::class]);
$router->get('/api/v1/dashboard/loan-approvers', [DashboardController::class, 'loanApprovers'],
    [AuthMiddleware::class]);
$router->get('/api/v1/dashboard/common-problems', [DashboardController::class, 'commonProblems'],
    [AuthMiddleware::class]);
$router->get('/api/v1/dashboard/ownership-body-issues', [DashboardController::class, 'ownershipBodyIssues'],
    [AuthMiddleware::class]);
```

---

## 4. Database Connection — `src/Config/Database.php`

```php
<?php
namespace App\Config;

use PDO;
use PDOException;

class Database {
    private static ?PDO $instance = null;

    public static function getConnection(): PDO {
        if (self::$instance === null) {
            $dsn = sprintf(
                'mysql:host=%s;dbname=%s;charset=utf8mb4',
                App::get('DB_HOST', 'localhost'),
                App::get('DB_NAME', 'village_dev_db')
            );
            try {
                self::$instance = new PDO($dsn,
                    App::get('DB_USER'),
                    App::get('DB_PASS'),
                    [
                        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                        PDO::ATTR_EMULATE_PREPARES => false,
                    ]
                );
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode(['error' => 'Database connection failed']);
                exit;
            }
        }
        return self::$instance;
    }
}
```

---

## 5. Example Controller — `VillageController.php`

```php
<?php
namespace App\Controllers;

use App\Config\Database;
use App\Validators\VillageValidator;

class VillageController {

    public function index(array $params): void {
        $db = Database::getConnection();
        $filters = $_GET;

        $sql = "SELECT v.*, vc.code as category_code, vc.name as category_name,
                  lob.name as ownership_body_name, lob.code as ownership_body_code,
                  div.name as division_name, d.name as district_name,
                  COUNT(h.id) as total_houses_recorded
                FROM village v
                JOIN village_category vc ON v.category_id = vc.id
                JOIN land_ownership_body lob ON v.ownership_body_id = lob.id
                JOIN division div ON v.division_id = div.id
                JOIN district d ON div.district_id = d.id
                LEFT JOIN house h ON h.village_id = v.id
                WHERE 1=1";
        $bindings = [];

        if (!empty($filters['category'])) {
            $sql .= " AND vc.code = :category";
            $bindings['category'] = $filters['category'];
        }
        if (!empty($filters['status'])) {
            $sql .= " AND v.status = :status";
            $bindings['status'] = $filters['status'];
        }
        if (!empty($filters['division_id'])) {
            $sql .= " AND v.division_id = :division_id";
            $bindings['division_id'] = (int)$filters['division_id'];
        }
        if (isset($filters['is_conservation_area'])) {
            $sql .= " AND v.is_conservation_area = :conservation";
            $bindings['conservation'] = (int)$filters['is_conservation_area'];
        }

        $sql .= " GROUP BY v.id ORDER BY v.name";

        $page = max(1, (int)($filters['page'] ?? 1));
        $perPage = min(100, (int)($filters['per_page'] ?? 20));
        $offset = ($page - 1) * $perPage;

        $countStmt = $db->prepare(str_replace("SELECT v.*, vc.code as category_code,
                  vc.name as category_name, lob.name as ownership_body_name,
                  lob.code as ownership_body_code, div.name as division_name,
                  d.name as district_name, COUNT(h.id) as total_houses_recorded",
            "SELECT COUNT(DISTINCT v.id)", $sql));
        $countStmt->execute($bindings);
        $total = (int)$countStmt->fetchColumn();

        $sql .= " LIMIT :limit OFFSET :offset";
        $stmt = $db->prepare($sql);
        foreach ($bindings as $key => $val) {
            $stmt->bindValue(":$key", $val);
        }
        $stmt->bindValue(':limit', $perPage, \PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, \PDO::PARAM_INT);
        $stmt->execute();
        $villages = $stmt->fetchAll();

        http_response_code(200);
        echo json_encode([
            'data' => $villages,
            'meta' => [
                'total' => $total,
                'page' => $page,
                'per_page' => $perPage,
                'last_page' => (int)ceil($total / $perPage),
            ]
        ]);
    }

    public function store(array $params): void {
        $body = json_decode(file_get_contents('php://input'), true);
        $errors = VillageValidator::validate($body);

        if (!empty($errors)) {
            http_response_code(400);
            echo json_encode(['error' => 'Validation failed', 'details' => $errors]);
            return;
        }

        $db = Database::getConnection();
        $stmt = $db->prepare("
            INSERT INTO village (division_id, category_id, ownership_body_id, name,
              grama_niladhari_division, gps_lat, gps_lng, total_planned_houses,
              status, is_conservation_area, has_infrastructure_issues,
              program_start_date, program_end_date, notes)
            VALUES (:division_id, :category_id, :ownership_body_id, :name,
              :gn_div, :gps_lat, :gps_lng, :total_planned,
              :status, :conservation, :infra_issues, :start_date, :end_date, :notes)
        ");
        $stmt->execute([
            'division_id'    => $body['division_id'],
            'category_id'    => $body['category_id'],
            'ownership_body_id' => $body['ownership_body_id'],
            'name'           => $body['name'],
            'gn_div'         => $body['grama_niladhari_division'] ?? null,
            'gps_lat'        => $body['gps_lat'] ?? null,
            'gps_lng'        => $body['gps_lng'] ?? null,
            'total_planned'  => $body['total_planned_houses'],
            'status'         => $body['status'],
            'conservation'   => (int)($body['is_conservation_area'] ?? 0),
            'infra_issues'   => (int)($body['has_infrastructure_issues'] ?? 0),
            'start_date'     => $body['program_start_date'] ?? null,
            'end_date'       => $body['program_end_date'] ?? null,
            'notes'          => $body['notes'] ?? null,
        ]);

        $id = $db->lastInsertId();
        http_response_code(201);
        echo json_encode(['id' => $id, 'message' => 'Village created successfully']);
    }
}
```

---

## 6. Auth Service — JWT — `src/Services/AuthService.php`

```php
<?php
namespace App\Services;

use App\Config\App;

class AuthService {
    private static string $secret;

    public static function generateToken(array $payload): string {
        self::$secret = App::get('JWT_SECRET');
        $header  = base64_encode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
        $payload['iat'] = time();
        $payload['exp'] = time() + 86400; // 24 hours
        $payload = base64_encode(json_encode($payload));
        $sig = hash_hmac('sha256', "$header.$payload", self::$secret, true);
        return "$header.$payload." . base64_encode($sig);
    }

    public static function verifyToken(string $token): ?array {
        self::$secret = App::get('JWT_SECRET');
        $parts = explode('.', $token);
        if (count($parts) !== 3) return null;
        [$header, $payload, $sig] = $parts;
        $expected = base64_encode(hash_hmac('sha256', "$header.$payload", self::$secret, true));
        if (!hash_equals($expected, $sig)) return null;
        $data = json_decode(base64_decode($payload), true);
        if ($data['exp'] < time()) return null;
        return $data;
    }
}
```

---

## 7. Environment File — `.env`

```env
DB_HOST=localhost
DB_NAME=village_dev_db
DB_USER=village_user
DB_PASS=your_secure_password

JWT_SECRET=change_this_to_a_long_random_string_in_production
FRONTEND_URL=http://localhost:3000

APP_ENV=production
APP_DEBUG=false
```

---

## 8. Apache `.htaccess`

```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ index.php [QSA,L]
```

---

## 9. Composer Dependencies

```json
{
  "require": {
    "php": "^8.2",
    "vlucas/phpdotenv": "^5.6"
  }
}
```

> JWT is implemented without a library to avoid dependencies. For production, consider `firebase/php-jwt`.

---

## 10. Security Checklist

| Item | Implementation |
|---|---|
| SQL Injection | PDO prepared statements throughout |
| XSS | `json_encode` escapes output; React handles display |
| CSRF | JWT tokens (stateless) eliminate CSRF risk |
| Authentication | JWT Bearer token on all protected routes |
| Password Storage | `password_hash()` with `PASSWORD_BCRYPT` |
| CORS | Restricted to `FRONTEND_URL` env variable |
| Input Validation | Validator classes on all write endpoints |
| Role Enforcement | `RoleMiddleware` on sensitive endpoints |
