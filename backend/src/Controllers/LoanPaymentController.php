<?php
namespace App\Controllers;

use App\Config\Database;
use App\Middleware\AuthMiddleware;

class LoanPaymentController {

    public function index(array $params): void {
        $loanId = (int)$params['loan_id'];

        try {
            $db = Database::getConnection();
            $stmt = $db->prepare("
                SELECT lp.*, ins.full_name as recorded_by_name
                FROM loan_payment lp
                LEFT JOIN inspector ins ON lp.recorded_by = ins.id
                WHERE lp.loan_id = :loan_id
                ORDER BY lp.payment_date DESC, lp.id DESC
            ");
            $stmt->execute([':loan_id' => $loanId]);
            $payments = $stmt->fetchAll();

            foreach ($payments as &$p) {
                $p['id'] = (int)$p['id'];
                $p['loan_id'] = (int)$p['loan_id'];
                $p['amount_paid'] = (float)$p['amount_paid'];
                $p['recorded_by'] = $p['recorded_by'] !== null ? (int)$p['recorded_by'] : null;
            }

            http_response_code(200);
            echo json_encode(['data' => $payments]);

        } catch (\PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Database error loading payments: ' . $e->getMessage()]);
        }
    }

    public function store(array $params): void {
        $loanId = (int)$params['loan_id'];
        $body = json_decode(file_get_contents('php://input'), true);

        if (!$body) {
            http_response_code(400);
            echo json_encode(['error' => 'Malformed or missing JSON request body.']);
            return;
        }

        // Validate payment fields
        $errors = [];
        if (!isset($body['amount_paid']) || !is_numeric($body['amount_paid']) || (float)$body['amount_paid'] <= 0) {
            $errors['amount_paid'][] = 'Payment amount must be a positive numeric value.';
        }
        if (empty($body['payment_date']) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $body['payment_date'])) {
            $errors['payment_date'][] = 'A valid payment date is required in the format YYYY-MM-DD.';
        }
        
        $validMethods = ['BANK', 'CASH', 'CHEQUE', 'OTHER'];
        if (empty($body['payment_method']) || !in_array($body['payment_method'], $validMethods)) {
            $errors['payment_method'][] = 'Payment method must be one of: ' . implode(', ', $validMethods);
        }

        if (!empty($errors)) {
            http_response_code(400);
            echo json_encode(['error' => 'Validation failed', 'details' => $errors]);
            return;
        }

        $recordedBy = AuthMiddleware::getUserId();

        try {
            $db = Database::getConnection();

            // Start a SQL transaction to guarantee ledger consistency
            $db->beginTransaction();

            // Check if loan exists
            $loanStmt = $db->prepare("SELECT id, loan_amount, total_paid_so_far FROM loan WHERE id = :loan_id LIMIT 1");
            $loanStmt->execute([':loan_id' => $loanId]);
            $loan = $loanStmt->fetch();

            if (!$loan) {
                $db->rollBack();
                http_response_code(404);
                echo json_encode(['error' => 'Loan record not found.']);
                return;
            }

            $amountPaid = (float)$body['amount_paid'];
            $newTotalPaid = (float)$loan['total_paid_so_far'] + $amountPaid;
            $loanAmount = (float)$loan['loan_amount'];

            // Determine new repayment status
            if ($newTotalPaid >= $loanAmount) {
                $newStatus = 'FULLY_PAID';
            } elseif ($newTotalPaid > 0) {
                $newStatus = 'PARTIALLY_PAID';
            } else {
                $newStatus = 'NOT_PAID';
            }

            // 1. Insert payment record
            $payStmt = $db->prepare("
                INSERT INTO loan_payment (loan_id, payment_date, amount_paid, payment_method, receipt_number, recorded_by, notes)
                VALUES (:loan_id, :payment_date, :amount_paid, :method, :receipt, :recorded_by, :notes)
            ");
            
            $payStmt->execute([
                ':loan_id'      => $loanId,
                ':payment_date' => $body['payment_date'],
                ':amount_paid'  => $amountPaid,
                ':method'       => $body['payment_method'],
                ':receipt'      => !empty($body['receipt_number']) ? trim($body['receipt_number']) : null,
                ':recorded_by'  => $recordedBy,
                ':notes'        => !empty($body['notes']) ? trim($body['notes']) : null
            ]);

            // 2. Update loan summary columns
            $updStmt = $db->prepare("
                UPDATE loan 
                SET total_paid_so_far = :new_total, repayment_status = :status 
                WHERE id = :loan_id
            ");
            
            $updStmt->execute([
                ':new_total' => $newTotalPaid,
                ':status'    => $newStatus,
                ':loan_id'   => $loanId
            ]);

            $db->commit();

            http_response_code(201);
            echo json_encode([
                'id' => (int)$db->lastInsertId(),
                'new_total_paid' => $newTotalPaid,
                'repayment_status' => $newStatus,
                'message' => 'Repayment recorded successfully.'
            ]);

        } catch (\PDOException $e) {
            if (isset($db) && $db->inTransaction()) {
                $db->rollBack();
            }
            http_response_code(500);
            echo json_encode(['error' => 'Failed to record repayment receipt: ' . $e->getMessage()]);
        }
    }
}
