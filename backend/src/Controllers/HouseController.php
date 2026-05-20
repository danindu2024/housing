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

            $sql = "SELECT h.*, cs.code as stage_code, cs.label as stage_label,
                      (SELECT COUNT(*) FROM loan l WHERE l.house_id = h.id) as has_loan
                    FROM house h
                    JOIN construction_stage cs ON h.construction_stage_id = cs.id
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

            $sql .= " ORDER BY h.house_number";
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
                $h['has_loan'] = (int)$h['has_loan'] > 0;

                $h['construction_stage'] = [
                    'id' => $h['construction_stage_id'],
                    'code' => $h['stage_code'],
                    'label' => $h['stage_label']
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
                       v.name as village_name, vc.code as village_category_code
                FROM house h
                JOIN construction_stage cs ON h.construction_stage_id = cs.id
                JOIN village v ON h.village_id = v.id
                JOIN village_category vc ON v.category_id = vc.id
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
            $house['construction_stage_id'] = (int)$house['construction_stage_id'];
            $house['is_land_sold'] = (bool)$house['is_land_sold'];
            $house['is_house_sold'] = (bool)$house['is_house_sold'];
            $house['has_infrastructure_issues'] = (bool)$house['has_infrastructure_issues'];

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
                $loan['monthly_installment'] = (float)$loan['monthly_installment'];
                $loan['repayment_months'] = (int)$loan['repayment_months'];
                $loan['total_paid_so_far'] = (float)$loan['total_paid_so_far'];
                $loan['balance_remaining'] = $loan['loan_amount'] - $loan['total_paid_so_far'];
                
                $house['loan'] = $loan;
            } else {
                $house['loan'] = null;
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

            // Check if house number is unique inside this village
            $dupHouseStmt = $db->prepare("SELECT COUNT(*) FROM house WHERE village_id = :village_id AND house_number = :house_number");
            $dupHouseStmt->execute([
                ':village_id' => $villageId,
                ':house_number' => trim($body['house_number'])
            ]);
            if ((int)$dupHouseStmt->fetchColumn() > 0) {
                http_response_code(400);
                echo json_encode([
                    'error' => 'Validation failed',
                    'details' => ['house_number' => ['This house number is already registered within this village.']]
                ]);
                return;
            }

            // Check if NIC is unique globally
            $dupNicStmt = $db->prepare("SELECT COUNT(*) FROM house WHERE owner_nic = :owner_nic");
            $dupNicStmt->execute([':owner_nic' => trim($body['owner_nic'])]);
            if ((int)$dupNicStmt->fetchColumn() > 0) {
                http_response_code(400);
                echo json_encode([
                    'error' => 'Validation failed',
                    'details' => ['owner_nic' => ['National Identity Card (NIC) number is already registered to another house.']]
                ]);
                return;
            }

            // Insert house record
            $stmt = $db->prepare("
                INSERT INTO house (village_id, house_number, owner_name, owner_nic, owner_contact,
                  household_members, land_area_perches, construction_stage_id,
                  is_land_sold, is_house_sold, occupancy_status, has_infrastructure_issues, notes)
                VALUES (:village_id, :house_number, :owner_name, :owner_nic, :owner_contact,
                  :members, :perches, :stage_id,
                  :land_sold, :house_sold, :occupancy, :infra_issues, :notes)
            ");

            $stmt->execute([
                'village_id' => $villageId,
                'house_number' => trim($body['house_number']),
                'owner_name' => trim($body['owner_name']),
                'owner_nic' => trim($body['owner_nic']),
                'owner_contact' => !empty($body['owner_contact']) ? trim($body['owner_contact']) : null,
                'members' => isset($body['household_members']) && $body['household_members'] !== '' ? (int)$body['household_members'] : null,
                'perches' => isset($body['land_area_perches']) && $body['land_area_perches'] !== '' ? (float)$body['land_area_perches'] : null,
                'stage_id' => (int)$body['construction_stage_id'],
                'land_sold' => (int)($body['is_land_sold'] ?? 0),
                'house_sold' => (int)($body['is_house_sold'] ?? 0),
                'occupancy' => $body['occupancy_status'],
                'infra_issues' => (int)($body['has_infrastructure_issues'] ?? 0),
                'notes' => !empty($body['notes']) ? trim($body['notes']) : null
            ]);

            $id = $db->lastInsertId();

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
            $checkStmt = $db->prepare("SELECT id FROM house WHERE id = :id");
            $checkStmt->execute([':id' => $id]);
            if (!$checkStmt->fetch()) {
                http_response_code(404);
                echo json_encode(['error' => 'House record not found.']);
                return;
            }

            // Build dynamic update query to allow updating individual columns safely
            $updateFields = [];
            $bindings = [':id' => $id];

            if (isset($body['owner_name'])) {
                $updateFields[] = "owner_name = :owner_name";
                $bindings['owner_name'] = trim($body['owner_name']);
            }
            if (isset($body['owner_contact'])) {
                $updateFields[] = "owner_contact = :owner_contact";
                $bindings['owner_contact'] = trim($body['owner_contact']);
            }
            if (isset($body['household_members'])) {
                $updateFields[] = "household_members = :members";
                $bindings['members'] = $body['household_members'] !== '' ? (int)$body['household_members'] : null;
            }
            if (isset($body['land_area_perches'])) {
                $updateFields[] = "land_area_perches = :perches";
                $bindings['perches'] = $body['land_area_perches'] !== '' ? (float)$body['land_area_perches'] : null;
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
            if (isset($body['has_infrastructure_issues'])) {
                $updateFields[] = "has_infrastructure_issues = :infra_issues";
                $bindings['infra_issues'] = (int)$body['has_infrastructure_issues'];
            }
            if (isset($body['notes'])) {
                $updateFields[] = "notes = :notes";
                $bindings['notes'] = trim($body['notes']);
            }

            if (empty($updateFields)) {
                http_response_code(400);
                echo json_encode(['error' => 'No modifiable fields were supplied in the request body.']);
                return;
            }

            $sql = "UPDATE house SET " . implode(', ', $updateFields) . " WHERE id = :id";
            $stmt = $db->prepare($sql);
            $stmt->execute($bindings);

            http_response_code(200);
            echo json_encode(['message' => 'House record updated successfully.']);

        } catch (\PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to update house record: ' . $e->getMessage()]);
        }
    }
}
