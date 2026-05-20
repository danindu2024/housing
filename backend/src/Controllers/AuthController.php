<?php
namespace App\Controllers;

use App\Config\Database;
use App\Services\AuthService;

class AuthController {

    public function login(): void {
        $input = json_decode(file_get_contents('php://input'), true);
        $email = $input['email'] ?? '';
        $password = $input['password'] ?? '';

        if (empty($email) || empty($password)) {
            http_response_code(400);
            echo json_encode(['error' => 'Email and password are required fields.']);
            return;
        }

        try {
            $db = Database::getConnection();
            $stmt = $db->prepare("SELECT * FROM inspector WHERE email = :email LIMIT 1");
            $stmt->execute([':email' => $email]);
            $inspector = $stmt->fetch();

            if (!$inspector || $inspector['is_active'] == 0 || !password_verify($password, $inspector['password_hash'])) {
                http_response_code(401);
                echo json_encode(['error' => 'Invalid email or password.']);
                return;
            }

            // User matches - build payload and generate token
            $payload = [
                'id' => (int)$inspector['id'],
                'full_name' => $inspector['full_name'],
                'role' => $inspector['role'],
                'division_id' => $inspector['division_id'] ? (int)$inspector['division_id'] : null
            ];

            $token = AuthService::generateToken($payload);

            http_response_code(200);
            echo json_encode([
                'token' => $token,
                'user' => $payload
            ]);

        } catch (\PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'An internal server error occurred during login.']);
        }
    }
}
