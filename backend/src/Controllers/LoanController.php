<?php
namespace App\Controllers;

use App\Config\Database;

class LoanController {

    public function show(array $params): void {
        $houseId = (int)$params['house_id'];

        try {
            $db = Database::getConnection();
            $stmt = $db->prepare("SELECT * FROM loan WHERE house_id = :house_id LIMIT 1");
            $stmt->execute([':house_id' => $houseId]);
            $loan = $stmt->fetch();

            if (!$loan) {
                http_response_code(404);
                echo json_encode(['error' => 'No loan registered for this house.']);
                return;
            }

            // Cast columns
            $loan['id'] = (int)$loan['id'];
            $loan['house_id'] = (int)$loan['house_id'];
            $loan['loan_amount'] = (float)$loan['loan_amount'];
            $loan['monthly_installment'] = (float)$loan['monthly_installment'];
            $loan['repayment_months'] = (int)$loan['repayment_months'];
            $loan['total_paid_so_far'] = (float)$loan['total_paid_so_far'];
            $loan['balance_remaining'] = $loan['loan_amount'] - $loan['total_paid_so_far'];

            http_response_code(200);
            echo json_encode($loan);

        } catch (\PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Database error loading loan details: ' . $e->getMessage()]);
        }
    }

    public function store(array $params): void {
        $houseId = (int)$params['house_id'];
        $body = json_decode(file_get_contents('php://input'), true);

        if (!$body) {
            http_response_code(400);
            echo json_encode(['error' => 'Malformed or missing JSON request body.']);
            return;
        }

        // Inline Loan Validation
        $errors = [];
        if (!isset($body['loan_amount']) || !is_numeric($body['loan_amount']) || (float)$body['loan_amount'] <= 0) {
            $errors['loan_amount'][] = 'Loan amount must be a positive numeric value.';
        }
        if (!isset($body['monthly_installment']) || !is_numeric($body['monthly_installment']) || (float)$body['monthly_installment'] <= 0) {
            $errors['monthly_installment'][] = 'Monthly installment must be a positive numeric value.';
        }
        if (!isset($body['repayment_months']) || !is_numeric($body['repayment_months']) || (int)$body['repayment_months'] <= 0) {
            $errors['repayment_months'][] = 'Repayment period in months must be a positive integer.';
        }

        // Repayment status validation
        $repaymentStatus = isset($body['repayment_status']) ? strtoupper(trim($body['repayment_status'])) : 'NOT_PAID';
        $validStatuses = ['NOT_PAID', 'PARTIALLY_PAID', 'PAYING', 'FULLY_PAID', 'DEFAULTED'];
        if (!in_array($repaymentStatus, $validStatuses, true)) {
            $errors['repayment_status'][] = 'Invalid repayment status specified.';
        }

        // Total paid so far validation
        $totalPaid = isset($body['total_paid_so_far']) && $body['total_paid_so_far'] !== '' ? (float)$body['total_paid_so_far'] : 0.00;
        if ($totalPaid < 0) {
            $errors['total_paid_so_far'][] = 'Total paid so far must be a non-negative numeric value.';
        }

        if (!empty($errors)) {
            http_response_code(400);
            echo json_encode(['error' => 'Validation failed', 'details' => $errors]);
            return;
        }

        try {
            $db = Database::getConnection();

            // Verify house exists and belongs to a category allowing loans
            $houseStmt = $db->prepare("
                SELECT h.id, vc.code as category_code
                FROM house h
                JOIN village v ON h.village_id = v.id
                JOIN village_category vc ON v.category_id = vc.id
                WHERE h.id = :house_id
            ");
            $houseStmt->execute([':house_id' => $houseId]);
            $house = $houseStmt->fetch();

            if (!$house) {
                http_response_code(404);
                echo json_encode(['error' => 'House record not found.']);
                return;
            }

            // Check if loan already exists
            $dupStmt = $db->prepare("SELECT COUNT(*) FROM loan WHERE house_id = :house_id");
            $dupStmt->execute([':house_id' => $houseId]);
            if ((int)$dupStmt->fetchColumn() > 0) {
                http_response_code(400);
                echo json_encode(['error' => 'A loan is already registered under this house.']);
                return;
            }

            // Insert loan record
            $stmt = $db->prepare("
                INSERT INTO loan (house_id, loan_amount, monthly_installment, repayment_months, repayment_status, total_paid_so_far, notes)
                VALUES (:house_id, :loan_amount, :monthly_installment, :repayment_months, :repayment_status, :total_paid, :notes)
            ");

            $stmt->execute([
                ':house_id'            => $houseId,
                ':loan_amount'         => (float)$body['loan_amount'],
                ':monthly_installment' => (float)$body['monthly_installment'],
                ':repayment_months'    => (int)$body['repayment_months'],
                ':repayment_status'    => $repaymentStatus,
                ':total_paid'          => $totalPaid,
                ':notes'               => !empty($body['notes']) ? trim($body['notes']) : null
            ]);

            http_response_code(201);
            echo json_encode([
                'id' => (int)$db->lastInsertId(),
                'message' => 'Loan terms initialized successfully.'
            ]);

        } catch (\PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to register loan record: ' . $e->getMessage()]);
        }
    }

    public function showGrant(array $params): void {
        $houseId = (int)$params['house_id'];

        try {
            $db = Database::getConnection();
            $stmt = $db->prepare("SELECT * FROM grant_detail WHERE house_id = :house_id LIMIT 1");
            $stmt->execute([':house_id' => $houseId]);
            $grant = $stmt->fetch(\PDO::FETCH_ASSOC);

            if (!$grant) {
                http_response_code(404);
                echo json_encode(['error' => 'No grant registered for this house.']);
                return;
            }

            // Cast columns
            $grant['id'] = (int)$grant['id'];
            $grant['house_id'] = (int)$grant['house_id'];
            $grant['grant_amount'] = (float)$grant['grant_amount'];

            http_response_code(200);
            echo json_encode($grant);

        } catch (\PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Database error loading grant details: ' . $e->getMessage()]);
        }
    }

    public function storeGrant(array $params): void {
        $houseId = (int)$params['house_id'];
        $body = json_decode(file_get_contents('php://input'), true);

        if (!$body) {
            http_response_code(400);
            echo json_encode(['error' => 'Malformed or missing JSON request body.']);
            return;
        }

        // Inline Grant Validation
        $errors = [];
        if (!isset($body['grant_amount']) || !is_numeric($body['grant_amount']) || (float)$body['grant_amount'] <= 0) {
            $errors['grant_amount'][] = 'Grant amount must be a positive numeric value.';
        }

        if (!empty($errors)) {
            http_response_code(400);
            echo json_encode(['error' => 'Validation failed', 'details' => $errors]);
            return;
        }

        try {
            $db = Database::getConnection();

            // Verify house exists and belongs to a category allowing grants
            $houseStmt = $db->prepare("
                SELECT h.id, vc.code as category_code
                FROM house h
                JOIN village v ON h.village_id = v.id
                JOIN village_category vc ON v.category_id = vc.id
                WHERE h.id = :house_id
            ");
            $houseStmt->execute([':house_id' => $houseId]);
            $house = $houseStmt->fetch(\PDO::FETCH_ASSOC);

            if (!$house) {
                http_response_code(404);
                echo json_encode(['error' => 'House record not found.']);
                return;
            }

            if (strpos($house['category_code'], 'GRANT') !== 0) {
                http_response_code(400);
                echo json_encode(['error' => 'This house belongs to a village that does not support grants.']);
                return;
            }

            // Check if grant already exists
            $dupStmt = $db->prepare("SELECT COUNT(*) FROM grant_detail WHERE house_id = :house_id");
            $dupStmt->execute([':house_id' => $houseId]);
            if ((int)$dupStmt->fetchColumn() > 0) {
                http_response_code(400);
                echo json_encode(['error' => 'A grant is already registered under this house.']);
                return;
            }

            // Insert grant record
            $stmt = $db->prepare("
                INSERT INTO grant_detail (house_id, grant_amount, notes)
                VALUES (:house_id, :grant_amount, :notes)
            ");

            $stmt->execute([
                ':house_id'     => $houseId,
                ':grant_amount' => (float)$body['grant_amount'],
                ':notes'        => !empty($body['notes']) ? trim($body['notes']) : null
            ]);

            http_response_code(201);
            echo json_encode([
                'id' => (int)$db->lastInsertId(),
                'message' => 'Grant terms initialized successfully.'
            ]);

        } catch (\PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to register grant record: ' . $e->getMessage()]);
        }
    }

    private function resolveHouseId(array $row, \PDO $db): ?array {
        $nic = isset($row['owner_nic']) ? trim($row['owner_nic']) : '';
        if ($nic !== '') {
            $stmt = $db->prepare("
                SELECT h.id, h.village_id, vc.code as category_code
                FROM house h
                JOIN village v ON h.village_id = v.id
                JOIN village_category vc ON v.category_id = vc.id
                WHERE h.owner_nic = :nic 
                LIMIT 1
            ");
            $stmt->execute([':nic' => $nic]);
            $res = $stmt->fetch(\PDO::FETCH_ASSOC);
            if ($res) {
                return [
                    'id' => (int)$res['id'],
                    'village_id' => (int)$res['village_id'],
                    'category_code' => $res['category_code']
                ];
            }
        }
        return null;
    }

    private function mapRepaymentStatus(string $status): string {
        $s = strtolower(trim($status));
        if ($s === 'paying' || $s === 'ණය ගෙවමින් පවති' || $s === 'ණය ගෙවමින් පවතී') return 'PAYING';
        if ($s === 'fully_paid' || $s === 'ණය ගෙවා අවසන්') return 'FULLY_PAID';
        if ($s === 'defaulted' || $s === 'ණය ගෙවීම පැහැරහැර ඇත') return 'DEFAULTED';
        if ($s === 'not_paid' || $s === 'ණය ගෙවීම සිදුනොවේ') return 'NOT_PAID';
        if ($s === 'partially_paid') return 'PARTIALLY_PAID';
        return 'NOT_PAID'; // Default fallback
    }

    public function bulkStore(array $params): void {
        $body = json_decode(file_get_contents('php://input'), true);

        if (!$body || !is_array($body)) {
            http_response_code(400);
            echo json_encode(['error' => 'Malformed or missing JSON request body containing array of loans.']);
            return;
        }

        try {
            $db = Database::getConnection();
            $validationErrors = [];

            // PASS 1: Validation and House Resolving
            foreach ($body as $index => $row) {
                $rowErrors = [];
                $displayRowIndex = $index + 1;

                $resolvedHouse = $this->resolveHouseId($row, $db);
                if (!$resolvedHouse) {
                    $rowErrors['beneficiary'][] = "No registered house could be resolved with the provided NIC.";
                } else {
                    if ($resolvedHouse['category_code'] !== 'LOAN') {
                        $rowErrors['beneficiary'][] = "The resolved house belongs to a village that does not support loans.";
                    }
                    
                    // Check if loan already exists for this house
                    $dupStmt = $db->prepare("SELECT COUNT(*) FROM loan WHERE house_id = :house_id");
                    $dupStmt->execute([':house_id' => $resolvedHouse['id']]);
                    if ((int)$dupStmt->fetchColumn() > 0) {
                        $rowErrors['beneficiary'][] = "A loan is already registered under this resolved house.";
                    }
                }

                // Loan specific validations
                if (!isset($row['loan_amount']) || !is_numeric($row['loan_amount']) || (float)$row['loan_amount'] <= 0) {
                    $rowErrors['loan_amount'][] = 'Loan amount must be a positive numeric value.';
                }
                if (!isset($row['monthly_installment']) || !is_numeric($row['monthly_installment']) || (float)$row['monthly_installment'] <= 0) {
                    $rowErrors['monthly_installment'][] = 'Monthly installment must be a positive numeric value.';
                }
                if (!isset($row['repayment_months']) || !is_numeric($row['repayment_months']) || (int)$row['repayment_months'] <= 0) {
                    $rowErrors['repayment_months'][] = 'Repayment period in months must be a positive integer.';
                }

                // Repayment status mapping & validation
                $rawStatus = isset($row['repayment_status']) ? trim($row['repayment_status']) : '';
                $repaymentStatus = $this->mapRepaymentStatus($rawStatus);

                // Total paid validation
                $totalPaid = isset($row['total_paid_so_far']) && $row['total_paid_so_far'] !== '' ? (float)$row['total_paid_so_far'] : 0.00;
                if ($totalPaid < 0) {
                    $rowErrors['total_paid_so_far'][] = 'Total paid so far must be a non-negative numeric value.';
                }

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
            foreach ($body as $row) {
                $resolvedHouse = $this->resolveHouseId($row, $db);
                $houseId = $resolvedHouse['id'];
                $repaymentStatus = $this->mapRepaymentStatus($row['repayment_status'] ?? '');
                $totalPaid = isset($row['total_paid_so_far']) && $row['total_paid_so_far'] !== '' ? (float)$row['total_paid_so_far'] : 0.00;

                $stmt = $db->prepare("
                    INSERT INTO loan (house_id, loan_amount, monthly_installment, repayment_months, repayment_status, total_paid_so_far, notes)
                    VALUES (:house_id, :loan_amount, :monthly_installment, :repayment_months, :repayment_status, :total_paid, :notes)
                ");

                $stmt->execute([
                    ':house_id'            => $houseId,
                    ':loan_amount'         => (float)$row['loan_amount'],
                    ':monthly_installment' => (float)$row['monthly_installment'],
                    ':repayment_months'    => (int)$row['repayment_months'],
                    ':repayment_status'    => $repaymentStatus,
                    ':total_paid'          => $totalPaid,
                    ':notes'               => !empty($row['notes']) ? trim($row['notes']) : null
                ]);
            }
            $db->commit();

            http_response_code(201);
            echo json_encode(['message' => count($body) . ' Loans imported successfully.']);

        } catch (\PDOException $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            http_response_code(500);
            echo json_encode(['error' => 'A transactional database error occurred during loan upload: ' . $e->getMessage()]);
        }
    }

    public function bulkGrantStore(array $params): void {
        $body = json_decode(file_get_contents('php://input'), true);

        if (!$body || !is_array($body)) {
            http_response_code(400);
            echo json_encode(['error' => 'Malformed or missing JSON request body containing array of grants.']);
            return;
        }

        try {
            $db = Database::getConnection();
            $validationErrors = [];

            // PASS 1: Validation and House Resolving
            foreach ($body as $index => $row) {
                $rowErrors = [];
                $displayRowIndex = $index + 1;

                $resolvedHouse = $this->resolveHouseId($row, $db);
                if (!$resolvedHouse) {
                    $rowErrors['beneficiary'][] = "No registered house could be resolved with the provided NIC.";
                } else {
                    if (strpos($resolvedHouse['category_code'], 'GRANT') !== 0) {
                        $rowErrors['beneficiary'][] = "The resolved house belongs to a village that does not support grants.";
                    }
                    
                    // Check if grant already exists for this house
                    $dupStmt = $db->prepare("SELECT COUNT(*) FROM grant_detail WHERE house_id = :house_id");
                    $dupStmt->execute([':house_id' => $resolvedHouse['id']]);
                    if ((int)$dupStmt->fetchColumn() > 0) {
                        $rowErrors['beneficiary'][] = "A grant is already registered under this resolved house.";
                    }
                }

                // Grant specific validations
                if (!isset($row['grant_amount']) || !is_numeric($row['grant_amount']) || (float)$row['grant_amount'] <= 0) {
                    $rowErrors['grant_amount'][] = 'Grant amount must be a positive numeric value.';
                }

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
            foreach ($body as $row) {
                $resolvedHouse = $this->resolveHouseId($row, $db);
                $houseId = $resolvedHouse['id'];

                $stmt = $db->prepare("
                    INSERT INTO grant_detail (house_id, grant_amount, notes)
                    VALUES (:house_id, :grant_amount, :notes)
                ");

                $stmt->execute([
                    ':house_id'     => $houseId,
                    ':grant_amount' => (float)$row['grant_amount'],
                    ':notes'        => !empty($row['notes']) ? trim($row['notes']) : null
                ]);
            }
            $db->commit();

            http_response_code(201);
            echo json_encode(['message' => count($body) . ' Grants imported successfully.']);

        } catch (\PDOException $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            http_response_code(500);
            echo json_encode(['error' => 'A transactional database error occurred during grant upload: ' . $e->getMessage()]);
        }
    }
}
