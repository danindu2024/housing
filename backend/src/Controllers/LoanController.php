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
        if (empty($body['approved_by_name']) || trim($body['approved_by_name']) === '') {
            $errors['approved_by_name'][] = 'Approving officer name is required.';
        }
        if (!isset($body['monthly_installment']) || !is_numeric($body['monthly_installment']) || (float)$body['monthly_installment'] <= 0) {
            $errors['monthly_installment'][] = 'Monthly installment must be a positive numeric value.';
        }
        if (!isset($body['repayment_months']) || !is_numeric($body['repayment_months']) || (int)$body['repayment_months'] <= 0) {
            $errors['repayment_months'][] = 'Repayment period in months must be a positive integer.';
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
                INSERT INTO loan (house_id, loan_amount, approved_by_name, approved_by_designation,
                  approved_by_institution, approval_date, repayment_start_date,
                  monthly_installment, repayment_months, repayment_status, total_paid_so_far)
                VALUES (:house_id, :loan_amount, :approved_by_name, :approved_by_designation,
                  :approved_by_institution, :approval_date, :start_date,
                  :monthly_installment, :repayment_months, 'NOT_PAID', 0.00)
            ");

            $stmt->execute([
                ':house_id'               => $houseId,
                ':loan_amount'            => (float)$body['loan_amount'],
                ':approved_by_name'       => trim($body['approved_by_name']),
                ':approved_by_designation'=> !empty($body['approved_by_designation']) ? trim($body['approved_by_designation']) : null,
                ':approved_by_institution'=> !empty($body['approved_by_institution']) ? trim($body['approved_by_institution']) : null,
                ':approval_date'          => !empty($body['approval_date']) ? $body['approval_date'] : null,
                ':start_date'             => !empty($body['repayment_start_date']) ? $body['repayment_start_date'] : null,
                ':monthly_installment'    => (float)$body['monthly_installment'],
                ':repayment_months'       => (int)$body['repayment_months']
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
}
