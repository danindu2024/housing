<?php
namespace App\Controllers;

use App\Config\Database;
use App\Services\AuthService;

class AuthController {

    // Maximum failed attempts before temporary lockout
    private const MAX_ATTEMPTS  = 10;
    // Lockout window in seconds (15 minutes)
    private const LOCKOUT_SECS  = 900;

    public function login(): void {
        $input    = json_decode(file_get_contents('php://input'), true);
        $email    = trim($input['email']    ?? '');
        $password = trim($input['password'] ?? '');

        if (empty($email) || empty($password)) {
            http_response_code(400);
            echo json_encode(['error' => 'Email and password are required fields.']);
            return;
        }

        try {
            $db  = Database::getConnection();
            $ip  = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';

            // ----------------------------------------------------------------
            // Brute-force protection: block IP after MAX_ATTEMPTS failures
            // ----------------------------------------------------------------
            $db->exec("CREATE TABLE IF NOT EXISTS login_attempt (
                id         INT AUTO_INCREMENT PRIMARY KEY,
                ip_address VARCHAR(45)  NOT NULL,
                attempts   SMALLINT    NOT NULL DEFAULT 1,
                locked_at  DATETIME    NULL,
                updated_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP
                          ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uq_ip (ip_address)
            )");

            // Fetch existing record for this IP
            $attemptStmt = $db->prepare(
                "SELECT attempts, locked_at FROM login_attempt WHERE ip_address = :ip"
            );
            $attemptStmt->execute([':ip' => $ip]);
            $row = $attemptStmt->fetch();

            if ($row) {
                // Check if currently locked out
                if ($row['locked_at'] !== null) {
                    $lockedSince = strtotime($row['locked_at']);
                    $remaining   = self::LOCKOUT_SECS - (time() - $lockedSince);
                    if ($remaining > 0) {
                        http_response_code(429);
                        echo json_encode([
                            'error'       => 'Too many failed login attempts. Please try again later.',
                            'retry_after' => $remaining,
                        ]);
                        return;
                    }
                    // Lockout expired — reset counter
                    $db->prepare("UPDATE login_attempt SET attempts = 0, locked_at = NULL WHERE ip_address = :ip")
                       ->execute([':ip' => $ip]);
                    $row['attempts'] = 0;
                }
            }

            // ----------------------------------------------------------------
            // Credential verification
            // ----------------------------------------------------------------
            $stmt = $db->prepare("SELECT * FROM inspector WHERE email = :email LIMIT 1");
            $stmt->execute([':email' => $email]);
            $inspector = $stmt->fetch();

            if (!$inspector || $inspector['is_active'] == 0 || !password_verify($password, $inspector['password_hash'])) {
                // Increment attempt counter; lock if threshold reached
                if ($row) {
                    $newCount = (int)$row['attempts'] + 1;
                    $lockAt   = $newCount >= self::MAX_ATTEMPTS ? date('Y-m-d H:i:s') : null;
                    $db->prepare("UPDATE login_attempt SET attempts = :n, locked_at = :l WHERE ip_address = :ip")
                       ->execute([':n' => $newCount, ':l' => $lockAt, ':ip' => $ip]);
                } else {
                    $db->prepare("INSERT INTO login_attempt (ip_address, attempts) VALUES (:ip, 1)")
                       ->execute([':ip' => $ip]);
                }

                http_response_code(401);
                echo json_encode(['error' => 'Invalid email or password.']);
                return;
            }

            // ----------------------------------------------------------------
            // Successful login — clear attempt counter for this IP
            // ----------------------------------------------------------------
            $db->prepare("DELETE FROM login_attempt WHERE ip_address = :ip")
               ->execute([':ip' => $ip]);

            $payload = [
                'id'          => (int)$inspector['id'],
                'full_name'   => $inspector['full_name'],
                'role'        => $inspector['role'],
                'division_id' => $inspector['division_id'] ? (int)$inspector['division_id'] : null,
            ];

            $token = AuthService::generateToken($payload);

            http_response_code(200);
            echo json_encode([
                'token' => $token,
                'user'  => $payload,
            ]);

        } catch (\PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'An internal server error occurred during login.']);
        }
    }

}
