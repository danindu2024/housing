<?php
namespace App\Controllers;

use App\Config\Database;
use App\Validators\HouseValidator;

class HouseController {

    public function index(array $params): void {
        $villageId = (int)$params['village_id'];
        $filters = $_GET;

        try {
            $db = Database::getConnection();

            // has_loan is derived from loan_amount (non-null after LEFT JOIN = loan exists).
            // No correlated subquery needed — the LEFT JOIN already gives us this info.
            $sql = "SELECT h.*, cs.code as stage_code, cs.label as stage_label,
                      l.loan_amount,
                      gd.grant_amount
                    FROM house h
                    JOIN construction_stage cs ON h.construction_stage_id = cs.id
                    LEFT JOIN loan l ON h.id = l.house_id
                    LEFT JOIN grant_detail gd ON h.id = gd.house_id
                    WHERE h.village_id = :village_id";

            $bindings = [':village_id' => $villageId];

            if (!empty($filters['stage_code'])) {
                $sql .= " AND cs.code = :stage_code";
                $bindings['stage_code'] = $filters['stage_code'];
            }
            if (!empty($filters['occupancy_status'])) {
                $sql .= " AND h.occupancy_status = :occupancy_status";
                $bindings['occupancy_status'] = $filters['occupancy_status'];
            }
            if (isset($filters['is_house_sold']) && $filters['is_house_sold'] !== '') {
                $sql .= " AND h.is_house_sold = :is_house_sold";
                $bindings['is_house_sold'] = (int)$filters['is_house_sold'];
            }
            if (isset($filters['is_land_sold']) && $filters['is_land_sold'] !== '') {
                $sql .= " AND h.is_land_sold = :is_land_sold";
                $bindings['is_land_sold'] = (int)$filters['is_land_sold'];
            }

            $sql .= " ORDER BY COALESCE(h.house_number, h.beneficiary_number, h.id)";
            $stmt = $db->prepare($sql);
            $stmt->execute($bindings);
            $houses = $stmt->fetchAll();

            // Cast column types
            foreach ($houses as &$h) {
                $h['id'] = (int)$h['id'];
                $h['village_id'] = (int)$h['village_id'];
                $h['household_members'] = $h['household_members'] !== null ? (int)$h['household_members'] : null;
                $h['land_area_perches'] = $h['land_area_perches'] !== null ? (float)$h['land_area_perches'] : null;
                $h['construction_stage_id'] = (int)$h['construction_stage_id'];
                $h['is_land_sold'] = (bool)$h['is_land_sold'];
                $h['is_house_sold'] = (bool)$h['is_house_sold'];
                $h['has_infrastructure_issues'] = (bool)$h['has_infrastructure_issues'];
                // Derived from LEFT JOIN: non-null loan_amount means a loan record exists
                $h['has_loan'] = $h['loan_amount'] !== null;
                $h['loan_amount'] = $h['loan_amount'] !== null ? (float)$h['loan_amount'] : null;
                $h['grant_amount'] = $h['grant_amount'] !== null ? (float)$h['grant_amount'] : null;

                $h['construction_stage'] = [
                    'id'    => $h['construction_stage_id'],
                    'code'  => $h['stage_code'],
                    'label' => $h['stage_label'],
                ];
            }


            http_response_code(200);
            echo json_encode(['data' => $houses]);

        } catch (\PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Database error loading houses: ' . $e->getMessage()]);
        }
    }

    public function show(array $params): void {
        $id = (int)$params['id'];

        try {
            $db = Database::getConnection();

            $stmt = $db->prepare("
                SELECT h.*, cs.code as stage_code, cs.label as stage_label,
                       v.name as village_name, v.grama_niladhari_division, vc.code as village_category_code, vc.name as village_category_name,
                       d.name as district_name, dv.name as division_name
                FROM house h
                JOIN construction_stage cs ON h.construction_stage_id = cs.id
                JOIN village v ON h.village_id = v.id
                JOIN village_category vc ON v.category_id = vc.id
                JOIN division dv ON v.division_id = dv.id
                JOIN district d ON dv.district_id = d.id
                WHERE h.id = :id
            ");
            $stmt->execute([':id' => $id]);
            $house = $stmt->fetch();

            if (!$house) {
                http_response_code(404);
                echo json_encode(['error' => 'House record not found.']);
                return;
            }

            // Cast fields
            $house['id'] = (int)$house['id'];
            $house['village_id'] = (int)$house['village_id'];
            $house['household_members'] = $house['household_members'] !== null ? (int)$house['household_members'] : null;
            $house['land_area_perches'] = $house['land_area_perches'] !== null ? (float)$house['land_area_perches'] : null;
            $house['estimated_value'] = $house['estimated_value'] !== null ? (float)$house['estimated_value'] : null;
            $house['construction_stage_id'] = (int)$house['construction_stage_id'];
            $house['is_land_sold'] = (bool)$house['is_land_sold'];
            $house['is_house_sold'] = (bool)$house['is_house_sold'];
            $house['has_infrastructure_issues'] = (bool)$house['has_infrastructure_issues'];
            $house['infrastructure_issues'] = !empty($house['infrastructure_issues']) ? json_decode($house['infrastructure_issues'], true) : [];

            $house['construction_stage'] = [
                'id' => $house['construction_stage_id'],
                'code' => $house['stage_code'],
                'label' => $house['stage_label']
            ];

            // Fetch loan summary (if exists)
            $loanStmt = $db->prepare("SELECT * FROM loan WHERE house_id = :house_id LIMIT 1");
            $loanStmt->execute([':house_id' => $id]);
            $loan = $loanStmt->fetch();

            if ($loan) {
                $loan['id'] = (int)$loan['id'];
                $loan['house_id'] = (int)$loan['house_id'];
                $loan['loan_amount'] = (float)$loan['loan_amount'];
                $loan['monthly_installment'] = $loan['monthly_installment'] !== null ? (float)$loan['monthly_installment'] : 0;
                $loan['repayment_months'] = $loan['repayment_months'] !== null ? (int)$loan['repayment_months'] : 0;
                $loan['total_paid_so_far'] = (float)$loan['total_paid_so_far'];
                $loan['balance_remaining'] = $loan['loan_amount'] - $loan['total_paid_so_far'];
                
                $house['loan'] = $loan;
            } else {
                $house['loan'] = null;
            }

            // Fetch grant summary (if exists)
            $grantStmt = $db->prepare("SELECT * FROM grant_detail WHERE house_id = :house_id LIMIT 1");
            $grantStmt->execute([':house_id' => $id]);
            $grant = $grantStmt->fetch();

            if ($grant) {
                $grant['id'] = (int)$grant['id'];
                $grant['house_id'] = (int)$grant['house_id'];
                $grant['grant_amount'] = (float)$grant['grant_amount'];
                $house['grant'] = $grant;
            } else {
                $house['grant'] = null;
            }

            http_response_code(200);
            echo json_encode($house);

        } catch (\PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Database error loading house detail: ' . $e->getMessage()]);
        }
    }

    public function store(array $params): void {
        $villageId = (int)$params['village_id'];
        $body = json_decode(file_get_contents('php://input'), true);

        if (!$body) {
            http_response_code(400);
            echo json_encode(['error' => 'Malformed or missing JSON request body.']);
            return;
        }

        $errors = HouseValidator::validate($body);

        if (!empty($errors)) {
            http_response_code(400);
            echo json_encode(['error' => 'Validation failed', 'details' => $errors]);
            return;
        }

        try {
            $db = Database::getConnection();

            // Check if house number is unique inside this village (only if provided)
            $houseNum = !empty($body['house_number']) ? trim($body['house_number']) : null;
            if ($houseNum !== null) {
                $dupHouseStmt = $db->prepare("SELECT COUNT(*) FROM house WHERE village_id = :village_id AND house_number = :house_number");
                $dupHouseStmt->execute([
                    ':village_id' => $villageId,
                    ':house_number' => $houseNum
                ]);
                if ((int)$dupHouseStmt->fetchColumn() > 0) {
                    http_response_code(400);
                    echo json_encode([
                        'error' => 'Validation failed',
                        'details' => ['house_number' => ['This house number is already registered within this village.']]
                    ]);
                    return;
                }
            }

            $ownerNic = !empty($body['owner_nic']) ? trim($body['owner_nic']) : null;

            $infraIssues = isset($body['infrastructure_issues']) && is_array($body['infrastructure_issues']) && !empty($body['infrastructure_issues'])
                ? json_encode($body['infrastructure_issues'])
                : null;
            $hasInfra = !empty($body['infrastructure_issues']) || !empty($body['has_infrastructure_issues']) ? 1 : 0;

            $validStatuses = ['IN_PROGRESS', 'STOPPED', 'FINISHED'];
            $currentStatus = isset($body['current_status']) && in_array($body['current_status'], $validStatuses)
                ? $body['current_status'] : null;

            // Insert house record
            $stmt = $db->prepare("
                INSERT INTO house (
                    village_id, house_number, beneficiary_number, owner_name, owner_nic, owner_contact,
                    permanent_address, household_members, land_area_perches, estimated_value,
                    construction_stage_id, is_land_sold, is_house_sold,
                    occupancy_status, current_status, has_infrastructure_issues, infrastructure_issues, notes
                ) VALUES (
                    :village_id, :house_number, :beneficiary_number, :owner_name, :owner_nic, :owner_contact,
                    :perm_addr, :members, :perches, :est_val,
                    :stage_id, :land_sold, :house_sold,
                    :occupancy, :cur_status, :infra_flag, :infra_json, :notes
                )
            ");

            $stmt->execute([
                ':village_id'          => $villageId,
                ':house_number'        => $houseNum,
                ':beneficiary_number'  => !empty($body['beneficiary_number']) ? trim($body['beneficiary_number']) : null,
                ':owner_name'          => trim($body['owner_name']),
                ':owner_nic'           => $ownerNic,
                ':owner_contact'       => !empty($body['owner_contact']) ? trim($body['owner_contact']) : null,
                ':perm_addr'           => !empty($body['permanent_address']) ? trim($body['permanent_address']) : null,
                ':members'             => isset($body['household_members']) && $body['household_members'] !== '' ? (int)$body['household_members'] : 1,
                ':perches'             => isset($body['land_area_perches']) && $body['land_area_perches'] !== '' ? (float)$body['land_area_perches'] : null,
                ':est_val'             => isset($body['estimated_value']) && $body['estimated_value'] !== '' ? (float)$body['estimated_value'] : null,
                ':stage_id'            => !empty($body['construction_stage_id']) ? (int)$body['construction_stage_id'] : 1,
                ':land_sold'           => (int)($body['is_land_sold'] ?? 0),
                ':house_sold'          => (int)($body['is_house_sold'] ?? 0),
                ':occupancy'           => $body['occupancy_status'] ?? 'NOT_APPLICABLE',
                ':cur_status'          => $currentStatus,
                ':infra_flag'          => $hasInfra,
                ':infra_json'          => $infraIssues,
                ':notes'               => !empty($body['notes']) ? trim($body['notes']) : null
            ]);

            $id = $db->lastInsertId();

            // Determine village category code to store loan or grant details appropriately
            $catStmt = $db->prepare("
                SELECT vc.code AS category_code
                FROM village v
                JOIN village_category vc ON v.category_id = vc.id
                WHERE v.id = :village_id
            ");
            $catStmt->execute([':village_id' => $villageId]);
            $categoryCode = $catStmt->fetchColumn() ?: '';

            // 1. Store Loan record if village category is LOAN and loan_amount is provided
            if ($categoryCode === 'LOAN' && isset($body['loan_amount']) && $body['loan_amount'] !== '' && (float)$body['loan_amount'] > 0) {
                $loanStmt = $db->prepare("
                    INSERT INTO loan (house_id, loan_amount, total_paid_so_far, repayment_status, notes)
                    VALUES (:house_id, :loan_amount, :total_paid, :repayment_status, :notes)
                ");
                $loanStmt->execute([
                    ':house_id'         => $id,
                    ':loan_amount'      => (float)$body['loan_amount'],
                    ':total_paid'       => isset($body['total_paid_so_far']) && $body['total_paid_so_far'] !== '' ? (float)$body['total_paid_so_far'] : 0.00,
                    ':repayment_status' => !empty($body['repayment_status']) ? $body['repayment_status'] : null,
                    ':notes'            => !empty($body['loan_notes']) ? trim($body['loan_notes']) : null
                ]);
            }

            // 2. Store Grant record if village category starts with GRANT and grant_amount is provided
            if (strpos($categoryCode, 'GRANT') === 0 && isset($body['grant_amount']) && $body['grant_amount'] !== '' && (float)$body['grant_amount'] > 0) {
                $grantStmt = $db->prepare("
                    INSERT INTO grant_detail (house_id, grant_amount, notes)
                    VALUES (:house_id, :grant_amount, :notes)
                ");
                $grantStmt->execute([
                    ':house_id'     => $id,
                    ':grant_amount' => (float)$body['grant_amount'],
                    ':notes'        => !empty($body['grant_notes']) ? trim($body['grant_notes']) : null
                ]);
            }

            http_response_code(201);
            echo json_encode([
                'id' => (int)$id,
                'message' => 'House record created successfully.'
            ]);

        } catch (\PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to write house record: ' . $e->getMessage()]);
        }
    }

    public function update(array $params): void {
        $id = (int)$params['id'];
        $body = json_decode(file_get_contents('php://input'), true);

        if (!$body) {
            http_response_code(400);
            echo json_encode(['error' => 'Malformed or missing JSON request body.']);
            return;
        }

        try {
            $db = Database::getConnection();

            // Verify house exists
            $checkStmt = $db->prepare("SELECT id, village_id FROM house WHERE id = :id");
            $checkStmt->execute([':id' => $id]);
            $house = $checkStmt->fetch();
            if (!$house) {
                http_response_code(404);
                echo json_encode(['error' => 'House record not found.']);
                return;
            }

            // Build dynamic update query to allow updating individual columns safely
            $updateFields = [];
            $bindings = [':id' => $id];

            if (isset($body['beneficiary_number'])) {
                $updateFields[] = "beneficiary_number = :beneficiary_number";
                $bindings['beneficiary_number'] = trim($body['beneficiary_number']);
            }
            if (isset($body['owner_name'])) {
                $updateFields[] = "owner_name = :owner_name";
                $bindings['owner_name'] = trim($body['owner_name']);
            }
            if (array_key_exists('owner_nic', $body)) {
                $updateFields[] = "owner_nic = :owner_nic";
                $bindings['owner_nic'] = !empty($body['owner_nic']) ? trim($body['owner_nic']) : null;
            }
            if (array_key_exists('owner_contact', $body)) {
                $updateFields[] = "owner_contact = :owner_contact";
                $bindings['owner_contact'] = !empty($body['owner_contact']) ? trim($body['owner_contact']) : null;
            }
            if (array_key_exists('permanent_address', $body)) {
                $updateFields[] = "permanent_address = :permanent_address";
                $bindings['permanent_address'] = !empty($body['permanent_address']) ? trim($body['permanent_address']) : null;
            }
            if (array_key_exists('house_number', $body)) {
                $updateFields[] = "house_number = :house_number";
                $bindings['house_number'] = !empty($body['house_number']) ? trim($body['house_number']) : null;
            }
            if (isset($body['household_members'])) {
                $updateFields[] = "household_members = :members";
                $bindings['members'] = $body['household_members'] !== '' ? (int)$body['household_members'] : null;
            }
            if (isset($body['land_area_perches'])) {
                $updateFields[] = "land_area_perches = :perches";
                $bindings['perches'] = $body['land_area_perches'] !== '' && $body['land_area_perches'] !== null ? (float)$body['land_area_perches'] : null;
            }
            if (array_key_exists('estimated_value', $body)) {
                $updateFields[] = "estimated_value = :estimated_value";
                $bindings['estimated_value'] = $body['estimated_value'] !== '' && $body['estimated_value'] !== null ? (float)$body['estimated_value'] : null;
            }
            if (isset($body['construction_stage_id'])) {
                $updateFields[] = "construction_stage_id = :stage_id";
                $bindings['stage_id'] = (int)$body['construction_stage_id'];
            }
            if (isset($body['is_land_sold'])) {
                $updateFields[] = "is_land_sold = :land_sold";
                $bindings['land_sold'] = (int)$body['is_land_sold'];
            }
            if (isset($body['is_house_sold'])) {
                $updateFields[] = "is_house_sold = :house_sold";
                $bindings['house_sold'] = (int)$body['is_house_sold'];
            }
            if (isset($body['occupancy_status'])) {
                $updateFields[] = "occupancy_status = :occupancy";
                $bindings['occupancy'] = $body['occupancy_status'];
            }
            if (array_key_exists('current_status', $body)) {
                $updateFields[] = "current_status = :current_status";
                $bindings['current_status'] = !empty($body['current_status']) ? trim($body['current_status']) : null;
            }
            if (array_key_exists('infrastructure_issues', $body)) {
                $updateFields[] = "has_infrastructure_issues = :infra_issues";
                $bindings['infra_issues'] = !empty($body['infrastructure_issues']) ? 1 : 0;

                $updateFields[] = "infrastructure_issues = :infra_json";
                $bindings['infra_json'] = is_array($body['infrastructure_issues']) && !empty($body['infrastructure_issues'])
                    ? json_encode($body['infrastructure_issues'])
                    : null;
            }
            if (array_key_exists('notes', $body)) {
                $updateFields[] = "notes = :notes";
                $bindings['notes'] = !empty($body['notes']) ? trim($body['notes']) : null;
            }

            if (!empty($updateFields)) {
                $sql = "UPDATE house SET " . implode(', ', $updateFields) . " WHERE id = :id";
                $stmt = $db->prepare($sql);
                $stmt->execute($bindings);
            }

            // Save or Update Loan details if loan_amount provided
            if (isset($body['loan_amount']) && $body['loan_amount'] !== '' && (float)$body['loan_amount'] > 0) {
                $chkLoan = $db->prepare("SELECT id FROM loan WHERE house_id = :h_id");
                $chkLoan->execute([':h_id' => $id]);
                $loanId = $chkLoan->fetchColumn();

                if ($loanId) {
                    $upLoan = $db->prepare("UPDATE loan SET loan_amount = :amt, total_paid_so_far = :paid, repayment_status = :status, notes = :notes WHERE id = :id");
                    $upLoan->execute([
                        ':amt' => (float)$body['loan_amount'],
                        ':paid' => isset($body['total_paid_so_far']) && $body['total_paid_so_far'] !== '' ? (float)$body['total_paid_so_far'] : 0.00,
                        ':status' => !empty($body['repayment_status']) ? $body['repayment_status'] : 'NOT_PAID',
                        ':notes' => !empty($body['loan_notes']) ? trim($body['loan_notes']) : null,
                        ':id' => $loanId
                    ]);
                } else {
                    $insLoan = $db->prepare("INSERT INTO loan (house_id, loan_amount, total_paid_so_far, repayment_status, notes) VALUES (:h_id, :amt, :paid, :status, :notes)");
                    $insLoan->execute([
                        ':h_id' => $id,
                        ':amt' => (float)$body['loan_amount'],
                        ':paid' => isset($body['total_paid_so_far']) && $body['total_paid_so_far'] !== '' ? (float)$body['total_paid_so_far'] : 0.00,
                        ':status' => !empty($body['repayment_status']) ? $body['repayment_status'] : 'NOT_PAID',
                        ':notes' => !empty($body['loan_notes']) ? trim($body['loan_notes']) : null
                    ]);
                }
            }

            // Save or Update Grant details if grant_amount provided
            if (isset($body['grant_amount']) && $body['grant_amount'] !== '' && (float)$body['grant_amount'] > 0) {
                $chkGrant = $db->prepare("SELECT id FROM grant_detail WHERE house_id = :h_id");
                $chkGrant->execute([':h_id' => $id]);
                $grantId = $chkGrant->fetchColumn();

                if ($grantId) {
                    $upGrant = $db->prepare("UPDATE grant_detail SET grant_amount = :amt, notes = :notes WHERE id = :id");
                    $upGrant->execute([
                        ':amt' => (float)$body['grant_amount'],
                        ':notes' => !empty($body['grant_notes']) ? trim($body['grant_notes']) : null,
                        ':id' => $grantId
                    ]);
                } else {
                    $insGrant = $db->prepare("INSERT INTO grant_detail (house_id, grant_amount, notes) VALUES (:h_id, :amt, :notes)");
                    $insGrant->execute([
                        ':h_id' => $id,
                        ':amt' => (float)$body['grant_amount'],
                        ':notes' => !empty($body['grant_notes']) ? trim($body['grant_notes']) : null
                    ]);
                }
            }

            http_response_code(200);
            echo json_encode(['message' => 'House record updated successfully.']);

        } catch (\PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to update house record: ' . $e->getMessage()]);
        }
    }

    public function destroy(array $params): void {
        $id = (int)$params['id'];

        try {
            $db = Database::getConnection();

            // Verify house exists
            $checkStmt = $db->prepare("SELECT id, village_id, beneficiary_number, owner_name FROM house WHERE id = :id");
            $checkStmt->execute([':id' => $id]);
            $house = $checkStmt->fetch();

            if (!$house) {
                http_response_code(404);
                echo json_encode(['error' => 'House record not found.']);
                return;
            }

            $db->beginTransaction();

            // Delete associated loan payments & default reason if any
            $loanStmt = $db->prepare("SELECT id FROM loan WHERE house_id = :house_id");
            $loanStmt->execute([':house_id' => $id]);
            $loanId = $loanStmt->fetchColumn();

            if ($loanId) {
                $db->prepare("DELETE FROM loan_payment WHERE loan_id = :loan_id")->execute([':loan_id' => $loanId]);
                $db->prepare("DELETE FROM loan_default_reason WHERE loan_id = :loan_id")->execute([':loan_id' => $loanId]);
                $db->prepare("DELETE FROM loan WHERE id = :loan_id")->execute([':loan_id' => $loanId]);
            }

            // Delete associated grant detail if any
            $db->prepare("DELETE FROM grant_detail WHERE house_id = :house_id")->execute([':house_id' => $id]);

            // Delete associated issue reports if any
            $db->prepare("DELETE FROM issue_report WHERE house_id = :house_id")->execute([':house_id' => $id]);

            // Delete house record
            $db->prepare("DELETE FROM house WHERE id = :id")->execute([':id' => $id]);

            $db->commit();

            http_response_code(200);
            echo json_encode([
                'message' => 'House record deleted successfully.',
                'village_id' => (int)$house['village_id']
            ]);

        } catch (\Exception $e) {
            if (isset($db) && $db->inTransaction()) {
                $db->rollBack();
            }
            http_response_code(500);
            echo json_encode(['error' => 'Failed to delete house record: ' . $e->getMessage()]);
        }
    }

    private function sanitizeInput(array $data): array {
        foreach ($data as $key => $value) {
            if (is_string($value)) {
                $data[$key] = trim($value);
            } elseif (is_array($value)) {
                $data[$key] = $this->sanitizeInput($value);
            }
        }
        return $data;
    }

    public function bulkStore(array $params): void {
        $villageId = (int)$params['village_id'];
        $body = json_decode(file_get_contents('php://input'), true);

        if (!$body || !is_array($body)) {
            http_response_code(400);
            echo json_encode(['error' => 'Malformed or missing JSON request body containing array of houses.']);
            return;
        }

        $body = $this->sanitizeInput($body);

        try {
            $db = Database::getConnection();
            $validationErrors = [];
            $validatedRows = [];
            $seenInBatch = [];

            // Prefetch construction stages from DB (no hardcoded IDs)
            $stagesList = $db->query("SELECT id, stage_order, code, label FROM construction_stage ORDER BY stage_order")->fetchAll();
            $stagesMap = [];
            $defaultStageId = (int)($stagesList[0]['id'] ?? 1);
            foreach ($stagesList as $stage) {
                $stagesMap[strtolower(trim($stage['code']))] = (int)$stage['id'];
                $stagesMap[strtolower(trim($stage['label']))] = (int)$stage['id'];
            }

            foreach ($body as $index => $row) {
                $rowErrors = [];
                $displayRowIndex = $index + 1;

                $benNumRaw = isset($row['beneficiary_number']) ? trim($row['beneficiary_number']) : '';
                $benNum = strtolower($benNumRaw);

                if ($benNum === '') {
                    $rowErrors['beneficiary_number'][] = 'Beneficiary number is required.';
                } else {
                    if (isset($seenInBatch[$benNum])) {
                        $rowErrors['beneficiary_number'][] = "Duplicate beneficiary number '{$benNumRaw}' found in Excel sheet at row " . $seenInBatch[$benNum] . ".";
                    } else {
                        $seenInBatch[$benNum] = $displayRowIndex;

                        // Check DB duplicate by beneficiary_number in this village
                        $dupStmt = $db->prepare("SELECT id FROM house WHERE village_id = :v_id AND LOWER(TRIM(beneficiary_number)) = :ben");
                        $dupStmt->execute([':v_id' => $villageId, ':ben' => $benNum]);
                        if ($dupStmt->fetchColumn()) {
                            $rowErrors['beneficiary_number'][] = "Beneficiary number '{$benNumRaw}' already exists in the database for this village (ප්‍රතිලාභී අංකය '{$benNumRaw}' පද්ධතියේ දැනටමත් පවතී).";
                        }
                    }
                }

                $ownerName = isset($row['owner_name']) ? trim($row['owner_name']) : '';
                if ($ownerName === '') {
                    $rowErrors['owner_name'][] = 'Beneficiary full name is required.';
                }

                // Check DB duplicate by house_number in this village if provided
                if (!empty($row['house_number'])) {
                    $hNum = strtolower(trim($row['house_number']));
                    $dupStmt2 = $db->prepare("SELECT id FROM house WHERE village_id = :v_id AND LOWER(TRIM(house_number)) = :num");
                    $dupStmt2->execute([':v_id' => $villageId, ':num' => $hNum]);
                    if ($dupStmt2->fetchColumn()) {
                        $rowErrors['house_number'][] = "House plan/number '{$row['house_number']}' already exists in the database for this village.";
                    }
                }

                $incomingStage = isset($row['construction_stage']) ? strtolower(trim($row['construction_stage'])) : '';
                $stageId = $stagesMap[$incomingStage] ?? $defaultStageId;

                if (!empty($rowErrors)) {
                    $validationErrors[$displayRowIndex] = $rowErrors;
                } else {
                    $validatedRows[] = [
                        'raw' => $row,
                        'stage_id' => $stageId
                    ];
                }
            }

            $insertedCount = 0;
            if (!empty($validatedRows)) {
                $db->beginTransaction();

                foreach ($validatedRows as $vRow) {
                    $row = $vRow['raw'];
                    $stageId = $vRow['stage_id'];
                    $benNumRaw = trim($row['beneficiary_number']);

                    // Occupancy status mapping from ownership type
                    $ownership = $row['ownership'] ?? '';
                    $occupancyStatus = 'NOT_APPLICABLE';
                    $isSold = 0;
                    if ($ownership === 'NEW') $occupancyStatus = 'BORROWER_LIVING';
                    elseif ($ownership === 'REPAIR') $occupancyStatus = 'ABANDONED';
                    elseif ($ownership === 'RELOCATION') { $occupancyStatus = 'SOLD'; $isSold = 1; }

                    // Infrastructure issues: save as JSON array
                    $infraIssues = isset($row['infrastructure_issues']) && is_array($row['infrastructure_issues']) && !empty($row['infrastructure_issues'])
                        ? json_encode($row['infrastructure_issues'])
                        : null;
                    $hasInfra = !empty($row['infrastructure_issues']) ? 1 : 0;

                    // Valid current_status values
                    $validStatuses = ['IN_PROGRESS', 'STOPPED', 'FINISHED'];
                    $currentStatus = isset($row['current_status']) && in_array($row['current_status'], $validStatuses)
                        ? $row['current_status'] : null;

                    // Insert new house record strictly with dedicated columns
                    $insertStmt = $db->prepare("
                        INSERT INTO house (
                            village_id, house_number, beneficiary_number, owner_name, owner_nic, owner_contact,
                            permanent_address, household_members, land_area_perches, estimated_value,
                            construction_stage_id, is_land_sold, is_house_sold,
                            occupancy_status, current_status, has_infrastructure_issues, infrastructure_issues, notes
                        ) VALUES (
                            :v_id, :h_num, :ben, :name, :nic, :contact,
                            :perm_addr, 1, :perches, :est_val,
                            :stage_id, :land_sold, :house_sold,
                            :occupancy, :cur_status, :infra_flag, :infra_json, :notes
                        )
                    ");
                    $insertStmt->execute([
                        ':v_id'       => $villageId,
                        ':h_num'      => !empty($row['house_number']) ? trim($row['house_number']) : null,
                        ':ben'        => $benNumRaw,
                        ':name'       => trim($row['owner_name']),
                        ':nic'        => !empty($row['owner_nic']) ? trim($row['owner_nic']) : null,
                        ':contact'    => !empty($row['owner_contact']) ? trim($row['owner_contact']) : null,
                        ':perm_addr'  => !empty($row['permanent_address']) ? trim($row['permanent_address']) : null,
                        ':perches'    => isset($row['land_area_perches']) && $row['land_area_perches'] !== '' ? (float)$row['land_area_perches'] : null,
                        ':est_val'    => isset($row['estimated_value']) && $row['estimated_value'] !== '' ? (float)$row['estimated_value'] : null,
                        ':stage_id'   => $stageId,
                        ':land_sold'  => $isSold,
                        ':house_sold' => $isSold,
                        ':occupancy'  => $occupancyStatus,
                        ':cur_status' => $currentStatus,
                        ':infra_flag' => $hasInfra,
                        ':infra_json' => $infraIssues,
                        ':notes'      => !empty($row['notes']) ? trim($row['notes']) : null
                    ]);
                    $houseDbId = (int)$db->lastInsertId();

                    // Save Loan details if provided
                    if (isset($row['loan_amount']) && $row['loan_amount'] !== '' && (float)$row['loan_amount'] > 0) {
                        $insLoan = $db->prepare("
                            INSERT INTO loan (house_id, loan_amount, total_paid_so_far, repayment_status, notes)
                            VALUES (:h_id, :loan_amount, :total_paid, :repayment_status, :notes)
                        ");
                        $insLoan->execute([
                            ':h_id' => $houseDbId,
                            ':loan_amount'      => (float)$row['loan_amount'],
                            ':total_paid'       => isset($row['total_paid_so_far']) && $row['total_paid_so_far'] !== '' ? (float)$row['total_paid_so_far'] : 0.00,
                            ':repayment_status' => !empty($row['repayment_status']) ? $row['repayment_status'] : null,
                            ':notes'            => !empty($row['loan_notes']) ? trim($row['loan_notes']) : null
                        ]);
                    }

                    // Save Grant details if provided
                    if (isset($row['grant_amount']) && $row['grant_amount'] !== '' && (float)$row['grant_amount'] > 0) {
                        $insGrant = $db->prepare("
                            INSERT INTO grant_detail (house_id, grant_amount, notes)
                            VALUES (:house_id, :grant_amount, :notes)
                        ");
                        $insGrant->execute([
                            ':house_id'     => $houseDbId,
                            ':grant_amount' => (float)$row['grant_amount'],
                            ':notes'        => !empty($row['grant_notes']) ? trim($row['grant_notes']) : null
                        ]);
                    }

                    $insertedCount++;
                }

                $db->commit();
            }

            if (!empty($validationErrors)) {
                http_response_code(200);
                echo json_encode([
                    'success' => false,
                    'inserted_count' => $insertedCount,
                    'message' => "Registered {$insertedCount} houses. " . count($validationErrors) . " rows contain validation errors.",
                    'details' => $validationErrors
                ]);
            } else {
                http_response_code(201);
                echo json_encode([
                    'success' => true,
                    'inserted_count' => $insertedCount,
                    'message' => "Import complete. Registered {$insertedCount} new houses successfully!"
                ]);
            }

        } catch (\Exception $e) {
            if (isset($db) && $db->inTransaction()) {
                $db->rollBack();
            }
            http_response_code(500);
            echo json_encode(['error' => 'A critical database bulk house registration error occurred: ' . $e->getMessage()]);
        }
    }

    public function globalBulkStore(array $params): void {
        $body = json_decode(file_get_contents('php://input'), true);

        if (!$body || !is_array($body)) {
            http_response_code(400);
            echo json_encode(['error' => 'Malformed or missing JSON request body containing array of houses.']);
            return;
        }

        $body = $this->sanitizeInput($body);

        try {
            $db = Database::getConnection();
            $validationErrors = [];
            
            // Prefetch construction stages to resolve text labels dynamically
            $stagesList = $db->query("SELECT id, stage_order, code, label FROM construction_stage ORDER BY stage_order")->fetchAll();

            $stagesMap = [];
            $defaultStageId = (int)($stagesList[0]['id'] ?? 1);
            foreach ($stagesList as $stage) {
                $stagesMap[strtolower(trim($stage['code']))] = (int)$stage['id'];
                $stagesMap[strtolower(trim($stage['label']))] = (int)$stage['id'];
            }

            $resolvedVillages = []; // Cache of resolved village IDs to prevent duplicate SQL hits
            $seenBenInBatch = []; // Track beneficiary numbers seen in this upload batch

            // PASS 1: Validations and Village Resolvings
            foreach ($body as $index => $row) {
                $rowErrors = [];
                $displayRowIndex = $index + 1;

                $province = isset($row['province']) ? trim($row['province']) : '';
                $district = isset($row['district']) ? trim($row['district']) : '';
                $division = isset($row['division']) ? trim($row['division']) : '';
                $villageName = isset($row['village_name']) ? trim($row['village_name']) : '';

                if ($province === '' || $district === '' || $division === '' || $villageName === '') {
                    $rowErrors['village'][] = "Location details (Province, District, DS Division, Village Name) must all be provided.";
                } else {
                    // Try to resolve village
                    $cacheKey = strtolower("{$province}|{$district}|{$division}|{$villageName}");
                    if (isset($resolvedVillages[$cacheKey])) {
                        $villageId = $resolvedVillages[$cacheKey];
                    } else {
                        $vStmt = $db->prepare("
                            SELECT v.id 
                            FROM village v
                            JOIN division dv ON v.division_id = dv.id
                            JOIN district d ON dv.district_id = d.id
                            WHERE LOWER(TRIM(v.name)) = LOWER(:v_name)
                              AND LOWER(TRIM(dv.name)) = LOWER(:div_name)
                              AND LOWER(TRIM(d.name)) = LOWER(:dist_name)
                        ");
                        $vStmt->execute([
                            ':v_name' => $villageName,
                            ':div_name' => $division,
                            ':dist_name' => $district
                        ]);
                        $villageId = $vStmt->fetchColumn();
                        if ($villageId) {
                            $resolvedVillages[$cacheKey] = (int)$villageId;
                        }
                    }

                    if (!$villageId) {
                        $rowErrors['village'][] = "Village '{$villageName}' in Division '{$division}', District '{$district}' is not registered in the system.";
                    }
                }

                // If village resolved, validate duplicate house constraints
                $incomingStage = isset($row['construction_stage']) ? trim($row['construction_stage']) : '';
                $stageId = null;
                if ($incomingStage !== '') {
                    $stageId = $stagesMap[strtolower($incomingStage)] ?? null;
                }
                if (!$stageId) {
                    $stageId = (int)($stagesList[0]['id'] ?? 1);
                }

                $validatorPayload = [
                    'house_number' => $row['house_number'] ?? '',
                    'owner_name' => $row['owner_name'] ?? '',
                    'owner_nic' => $row['owner_nic'] ?? '',
                    'household_members' => $row['household_members'] ?? null,
                    'land_area_perches' => $row['land_area_perches'] ?? null,
                    'construction_stage_id' => $stageId,
                    'occupancy_status' => !empty($row['occupancy_status']) ? trim($row['occupancy_status']) : 'NOT_APPLICABLE'
                ];

                $errors = HouseValidator::validate($validatorPayload);
                if (!empty($errors)) {
                    $rowErrors = array_merge($rowErrors, $errors);
                }

                // Check Beneficiary Number: in-batch duplicate and DB duplicate
                $benNumRaw = isset($row['beneficiary_number']) ? trim($row['beneficiary_number']) : '';
                $benNum = strtolower($benNumRaw);
                if ($benNum !== '') {
                    if (isset($seenBenInBatch[$benNum])) {
                        $rowErrors['beneficiary_number'][] = "Duplicate beneficiary number '{$benNumRaw}' found in this upload at row " . $seenBenInBatch[$benNum] . ".";
                    } else {
                        $seenBenInBatch[$benNum] = $displayRowIndex;
                        if (isset($villageId) && $villageId) {
                            $dupStmt = $db->prepare("SELECT id FROM house WHERE village_id = :v_id AND LOWER(TRIM(beneficiary_number)) = :ben");
                            $dupStmt->execute([':v_id' => $villageId, ':ben' => $benNum]);
                            if ($dupStmt->fetchColumn()) {
                                $rowErrors['beneficiary_number'][] = "Beneficiary number '{$benNumRaw}' already exists in the database for village '{$row['village_name']}'.";
                            }
                        }
                    }
                }

                // Check NIC constraint globally
                $ownerNic = isset($row['owner_nic']) ? trim($row['owner_nic']) : '';
                if ($ownerNic !== '' && isset($villageId) && $villageId) {
                    $nicStmt = $db->prepare("SELECT id, village_id, house_number FROM house WHERE owner_nic = :nic");
                    $nicStmt->execute([':nic' => $ownerNic]);
                    $existingHouse = $nicStmt->fetch();

                    if ($existingHouse) {
                        $rowErrors['owner_nic'][] = "NIC number is already registered to house '{$existingHouse['house_number']}' in village ID {$existingHouse['village_id']}.";
                    }
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

            // PASS 2: Transactional Inserts Only
            $registeredCount = 0;

            $db->beginTransaction();

            foreach ($body as $row) {
                $province = trim($row['province']);
                $district = trim($row['district']);
                $division = trim($row['division']);
                $villageName = trim($row['village_name']);

                $cacheKey = strtolower("{$province}|{$district}|{$division}|{$villageName}");
                $villageId = $resolvedVillages[$cacheKey];

                $houseNumber = trim($row['house_number'] ?? '');
                $benNumRaw = trim($row['beneficiary_number'] ?? '');
                $incomingStage = isset($row['construction_stage']) ? strtolower(trim($row['construction_stage'])) : '';
                $stageId = $stagesMap[$incomingStage] ?? $defaultStageId;

                // Occupancy status mapping from ownership
                $ownership = $row['ownership'] ?? '';
                $occupancyStatus = 'NOT_APPLICABLE';
                $isSold = 0;
                if ($ownership === 'NEW') $occupancyStatus = 'BORROWER_LIVING';
                elseif ($ownership === 'REPAIR') $occupancyStatus = 'ABANDONED';
                elseif ($ownership === 'RELOCATION') { $occupancyStatus = 'SOLD'; $isSold = 1; }

                // Infrastructure issues as JSON array
                $infraIssues = isset($row['infrastructure_issues']) && is_array($row['infrastructure_issues']) && !empty($row['infrastructure_issues'])
                    ? json_encode($row['infrastructure_issues'])
                    : null;
                $hasInfra = !empty($row['infrastructure_issues']) ? 1 : 0;

                // Valid current_status values
                $validStatuses = ['IN_PROGRESS', 'STOPPED', 'FINISHED'];
                $currentStatus = isset($row['current_status']) && in_array($row['current_status'], $validStatuses)
                    ? $row['current_status'] : null;

                // Insert new house record
                $insertStmt = $db->prepare("
                    INSERT INTO house (
                        village_id, house_number, beneficiary_number, owner_name, owner_nic, owner_contact,
                        permanent_address, household_members, land_area_perches, estimated_value,
                        construction_stage_id, is_land_sold, is_house_sold,
                        occupancy_status, current_status, has_infrastructure_issues, infrastructure_issues, notes
                    ) VALUES (
                        :village_id, :house_number, :ben, :owner_name, :owner_nic, :owner_contact,
                        :perm_addr, 1, :perches, :est_val,
                        :stage_id, :land_sold, :house_sold,
                        :occupancy, :cur_status, :infra_flag, :infra_json, :notes
                    )
                ");

                $insertStmt->execute([
                    ':village_id'   => $villageId,
                    ':house_number' => !empty($houseNumber) ? $houseNumber : null,
                    ':ben'          => !empty($benNumRaw) ? $benNumRaw : null,
                    ':owner_name'   => trim($row['owner_name']),
                    ':owner_nic'    => !empty($row['owner_nic']) ? trim($row['owner_nic']) : null,
                    ':owner_contact' => !empty($row['owner_contact']) ? trim($row['owner_contact']) : null,
                    ':perm_addr'    => !empty($row['permanent_address']) ? trim($row['permanent_address']) : null,
                    ':perches'      => isset($row['land_area_perches']) && $row['land_area_perches'] !== '' ? (float)$row['land_area_perches'] : null,
                    ':est_val'      => isset($row['estimated_value']) && $row['estimated_value'] !== '' ? (float)$row['estimated_value'] : null,
                    ':stage_id'     => $stageId,
                    ':land_sold'    => $isSold,
                    ':house_sold'   => $isSold,
                    ':occupancy'    => $occupancyStatus,
                    ':cur_status'   => $currentStatus,
                    ':infra_flag'   => $hasInfra,
                    ':infra_json'   => $infraIssues,
                    ':notes'        => !empty($row['notes']) ? trim($row['notes']) : null
                ]);
                $houseDbId = (int)$db->lastInsertId();

                // Save Loan details if provided
                if (isset($row['loan_amount']) && $row['loan_amount'] !== '' && (float)$row['loan_amount'] > 0) {
                    $insLoan = $db->prepare("
                        INSERT INTO loan (house_id, loan_amount, total_paid_so_far, repayment_status, notes)
                        VALUES (:h_id, :loan_amount, :total_paid, :repayment_status, :notes)
                    ");
                    $insLoan->execute([
                        ':h_id' => $houseDbId,
                        ':loan_amount'      => (float)$row['loan_amount'],
                        ':total_paid'       => isset($row['total_paid_so_far']) && $row['total_paid_so_far'] !== '' ? (float)$row['total_paid_so_far'] : 0.00,
                        ':repayment_status' => !empty($row['repayment_status']) ? $row['repayment_status'] : null,
                        ':notes'            => !empty($row['loan_notes']) ? trim($row['loan_notes']) : null
                    ]);
                }

                // Save Grant details if provided
                if (isset($row['grant_amount']) && $row['grant_amount'] !== '' && (float)$row['grant_amount'] > 0) {
                    $insGrant = $db->prepare("
                        INSERT INTO grant_detail (house_id, grant_amount, notes)
                        VALUES (:house_id, :grant_amount, :notes)
                    ");
                    $insGrant->execute([
                        ':house_id'     => $houseDbId,
                        ':grant_amount' => (float)$row['grant_amount'],
                        ':notes'        => !empty($row['grant_notes']) ? trim($row['grant_notes']) : null
                    ]);
                }

                $registeredCount++;
            }

            $db->commit();

            http_response_code(201);
            echo json_encode([
                'message' => 'Houses registered successfully in bulk.',
                'registered_count' => $registeredCount
            ]);

        } catch (\Exception $e) {
            if (isset($db) && $db->inTransaction()) {
                $db->rollBack();
            }
            http_response_code(500);
            echo json_encode(['error' => 'A critical database transactional error occurred: ' . $e->getMessage()]);
        }
    }
}

