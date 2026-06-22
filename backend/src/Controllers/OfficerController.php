<?php
namespace App\Controllers;

use App\Config\Database;

class OfficerController {

    public function index(array $params): void {
        try {
            $db = Database::getConnection();
            $stmt = $db->query("SELECT * FROM officer ORDER BY id DESC");
            $officers = $stmt->fetchAll(\PDO::FETCH_ASSOC);

            // Cast types
            foreach ($officers as &$officer) {
                $officer['id'] = (int)$officer['id'];
                $officer['payment'] = $officer['payment'] !== null ? (float)$officer['payment'] : null;
            }

            http_response_code(200);
            echo json_encode($officers);
        } catch (\PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Database error loading officers: ' . $e->getMessage()]);
        }
    }

    public function store(array $params): void {
        $body = json_decode(file_get_contents('php://input'), true);

        if (!$body) {
            http_response_code(400);
            echo json_encode(['error' => 'Malformed or missing JSON request body.']);
            return;
        }

        $errors = $this->validateOfficer($body);

        if (!empty($errors)) {
            http_response_code(400);
            echo json_encode(['error' => 'Validation failed', 'details' => $errors]);
            return;
        }

        try {
            $db = Database::getConnection();
            $stmt = $db->prepare("
                INSERT INTO officer (type, name, contact_number, position, payment)
                VALUES (:type, :name, :contact_number, :position, :payment)
            ");

            $stmt->execute([
                ':type'           => strtoupper(trim($body['type'])),
                ':name'           => trim($body['name']),
                ':contact_number' => !empty($body['contact_number']) ? trim($body['contact_number']) : null,
                ':position'       => strtoupper(trim($body['type'])) === 'GOVERNMENT' ? trim($body['position']) : null,
                ':payment'        => strtoupper(trim($body['type'])) === 'EXTERNAL' ? (float)$body['payment'] : null
            ]);

            http_response_code(201);
            echo json_encode([
                'id' => (int)$db->lastInsertId(),
                'message' => 'Officer record created successfully.'
            ]);
        } catch (\PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to store officer record: ' . $e->getMessage()]);
        }
    }

    public function bulkStore(array $params): void {
        $body = json_decode(file_get_contents('php://input'), true);

        if (!$body || !is_array($body)) {
            http_response_code(400);
            echo json_encode(['error' => 'Malformed or missing JSON request body containing array of officers.']);
            return;
        }

        try {
            $db = Database::getConnection();
            $validationErrors = [];

            // PASS 1: Validation
            foreach ($body as $index => $row) {
                $displayRowIndex = $index + 1;
                $rowErrors = $this->validateOfficer($row);

                if (!empty($rowErrors)) {
                    $validationErrors[$displayRowIndex] = $rowErrors;
                }
            }

            if (!empty($validationErrors)) {
                http_response_code(400);
                echo json_encode([
                    'error' => 'Input validation failed for some rows.',
                    'details' => $validationErrors
                ]);
                return;
            }

            // PASS 2: Transactional Insertions
            $db->beginTransaction();
            $stmt = $db->prepare("
                INSERT INTO officer (type, name, contact_number, position, payment)
                VALUES (:type, :name, :contact_number, :position, :payment)
            ");

            foreach ($body as $row) {
                $stmt->execute([
                    ':type'           => strtoupper(trim($row['type'])),
                    ':name'           => trim($row['name']),
                    ':contact_number' => !empty($row['contact_number']) ? trim($row['contact_number']) : null,
                    ':position'       => strtoupper(trim($row['type'])) === 'GOVERNMENT' ? trim($row['position']) : null,
                    ':payment'        => strtoupper(trim($row['type'])) === 'EXTERNAL' ? (float)$row['payment'] : null
                ]);
            }
            $db->commit();

            http_response_code(201);
            echo json_encode(['message' => count($body) . ' Officers imported successfully.']);
        } catch (\PDOException $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            http_response_code(500);
            echo json_encode(['error' => 'A database transactional error occurred: ' . $e->getMessage()]);
        }
    }

    private function validateOfficer(array $data): array {
        $errors = [];

        if (empty($data['name']) || trim($data['name']) === '') {
            $errors['name'][] = 'Name is required.';
        }

        $type = isset($data['type']) ? strtoupper(trim($data['type'])) : '';
        if ($type !== 'GOVERNMENT' && $type !== 'EXTERNAL') {
            $errors['type'][] = 'Officer type must be GOVERNMENT or EXTERNAL.';
        } else {
            if ($type === 'GOVERNMENT') {
                if (empty($data['position']) || trim($data['position']) === '') {
                    $errors['position'][] = 'Position is required for government officers.';
                }
            } else {
                if (!isset($data['payment']) || !is_numeric($data['payment']) || (float)$data['payment'] < 0) {
                    $errors['payment'][] = 'A valid positive payment amount is required for external people.';
                }
            }
        }

        return $errors;
    }
}
