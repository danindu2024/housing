<?php
namespace App\Middleware;

use App\Services\AuthService;

class AuthMiddleware {
    private static ?array $currentUser = null;

    public function handle(array $params): bool {
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? null;

        if (!$authHeader || !preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized: Missing or malformed authentication token']);
            return false;
        }

        $token = $matches[1];
        $decoded = AuthService::verifyToken($token);

        if (!$decoded) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized: Token is invalid or has expired']);
            return false;
        }

        // Store active user payload statically for controllers to query
        self::$currentUser = $decoded;
        return true;
    }

    public static function getUser(): ?array {
        return self::$currentUser;
    }

    public static function getUserId(): ?int {
        return self::$currentUser['id'] ?? null;
    }

    public static function getUserRole(): ?string {
        return self::$currentUser['role'] ?? null;
    }
}
