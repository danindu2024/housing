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
            
            // Prefetch construction stages to resolve text labels dynamically
            $stagesList = $db->query("SELECT id, stage_order, code, label FROM construction_stage ORDER BY stage_order")->fetchAll();
            
            // Map labels and codes case-insensitively
            $stagesMap = [];
            foreach ($stagesList as $stage) {
                $stagesMap[strtolower(trim($stage['code']))] = (int)$stage['id'];
                $stagesMap[strtolower(trim($stage['label']))] = (int)$stage['id'];
            }

            // We do a first pass to validate all rows transactionally
            foreach ($body as $index => $row) {
                $rowErrors = [];
                $displayRowIndex = $index + 1;

                // Validate basic fields using HouseValidator
                // Map incoming stage label to stage ID
                $incomingStage = isset($row['construction_stage']) ? trim($row['construction_stage']) : '';
                $stageId = null;
                if ($incomingStage !== '') {
                    $stageId = $stagesMap[strtolower($incomingStage)] ?? null;
                }
                
                // Fallback to first stage if not found/empty
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

                // Add to list of errors
                if (!empty($errors)) {
                    $rowErrors = array_merge($rowErrors, $errors);
                }

                // Check NIC globally, but only if it's not a duplicate within the same house record
                $ownerNic = isset($row['owner_nic']) ? trim($row['owner_nic']) : '';
                if ($ownerNic !== '') {
                    $nicStmt = $db->prepare("SELECT id, village_id, house_number FROM house WHERE owner_nic = :nic");
                    $nicStmt->execute([':nic' => $ownerNic]);
                    $existingHouse = $nicStmt->fetch();

                    if ($existingHouse) {
                        // If this NIC belongs to a DIFFERENT house (different village or different house number)
                        if ((int)$existingHouse['village_id'] !== $villageId || strtolower(trim($existingHouse['house_number'])) !== strtolower(trim($row['house_number'] ?? ''))) {
                            $rowErrors['owner_nic'][] = "NIC number is already registered to house '{$existingHouse['house_number']}' in village ID {$existingHouse['village_id']}.";
                        }
                    }
                }

                if (!empty($rowErrors)) {
                    $validationErrors[$displayRowIndex] = $rowErrors;
                }
            }

            // If there are validation errors, halt and report them
            if (!empty($validationErrors)) {
                http_response_code(400);
                echo json_encode([
                    'error' => 'Input validation failed for some rows.',
                    'details' => $validationErrors
                ]);
                return;
            }

            // Second pass: Perform transactional merges/updates and insertions
            $registeredCount = 0;
            $enrichedCount = 0;
            
            $db->beginTransaction();

            foreach ($body as $row) {
                $houseNumber = trim($row['house_number']);
                $incomingStage = isset($row['construction_stage']) ? trim($row['construction_stage']) : '';
                $stageId = $stagesMap[strtolower($incomingStage)] ?? (int)($stagesList[0]['id'] ?? 1);

                // Check if duplicate house exists in this village
                $dupStmt = $db->prepare("SELECT id FROM house WHERE village_id = :village_id AND LOWER(house_number) = LOWER(:num)");
                $dupStmt->execute([
                    ':village_id' => $villageId,
                    ':num' => $houseNumber
                ]);
                $existingHouseId = $dupStmt->fetchColumn();

                if ($existingHouseId) {
                    // Enrich existing house record (Rewrite Policy)
                    $updateFields = [];
                    $bindings = [':id' => $existingHouseId];

                    $fieldsMap = [
                        'owner_name' => 'owner_name',
                        'owner_nic' => 'owner_nic',
                        'owner_contact' => 'owner_contact',
                        'household_members' => 'household_members',
                        'land_area_perches' => 'land_area_perches',
                        'is_land_sold' => 'is_land_sold',
                        'is_house_sold' => 'is_house_sold',
                        'occupancy_status' => 'occupancy_status',
                        'has_infrastructure_issues' => 'has_infrastructure_issues',
                        'notes' => 'notes'
                    ];

                    foreach ($fieldsMap as $payloadKey => $dbCol) {
                        if (isset($row[$payloadKey]) && $row[$payloadKey] !== '' && $row[$payloadKey] !== null) {
                            $updateFields[] = "{$dbCol} = :{$dbCol}";
                            if ($dbCol === 'household_members' || $dbCol === 'is_land_sold' || $dbCol === 'is_house_sold' || $dbCol === 'has_infrastructure_issues') {
                                $bindings[$dbCol] = (int)$row[$payloadKey];
                            } elseif ($dbCol === 'land_area_perches') {
                                $bindings[$dbCol] = (float)$row[$payloadKey];
                            } else {
                                $bindings[$dbCol] = trim($row[$payloadKey]);
                            }
                        }
                    }

                    // Always overwrite construction stage to the highest/latest stage specified
                    $updateFields[] = "construction_stage_id = :stage_id";
                    $bindings['stage_id'] = $stageId;

                    if (!empty($updateFields)) {
                        $sql = "UPDATE house SET " . implode(', ', $updateFields) . " WHERE id = :id";
                        $stmt = $db->prepare($sql);
                        $stmt->execute($bindings);
                    }
                    $enrichedCount++;
                } else {
                    // Insert new house record
                    $insertStmt = $db->prepare("
                        INSERT INTO house (village_id, house_number, owner_name, owner_nic, owner_contact,
                          household_members, land_area_perches, construction_stage_id,
                          is_land_sold, is_house_sold, occupancy_status, has_infrastructure_issues, notes)
                        VALUES (:village_id, :house_number, :owner_name, :owner_nic, :owner_contact,
                          :members, :perches, :stage_id,
                          :land_sold, :house_sold, :occupancy, :infra_issues, :notes)
                    ");

                    $insertStmt->execute([
                        ':village_id' => $villageId,
                        ':house_number' => $houseNumber,
                        ':owner_name' => trim($row['owner_name']),
                        ':owner_nic' => trim($row['owner_nic']),
                        ':owner_contact' => !empty($row['owner_contact']) ? trim($row['owner_contact']) : null,
                        ':members' => isset($row['household_members']) && $row['household_members'] !== '' ? (int)$row['household_members'] : null,
                        ':perches' => isset($row['land_area_perches']) && $row['land_area_perches'] !== '' ? (float)$row['land_area_perches'] : null,
                        ':stage_id' => $stageId,
                        ':land_sold' => (int)($row['is_land_sold'] ?? 0),
                        ':house_sold' => (int)($row['is_house_sold'] ?? 0),
                        ':occupancy' => !empty($row['occupancy_status']) ? trim($row['occupancy_status']) : 'NOT_APPLICABLE',
                        ':infra_issues' => (int)($row['has_infrastructure_issues'] ?? 0),
                        ':notes' => !empty($row['notes']) ? trim($row['notes']) : null
                    ]);
                    $registeredCount++;
                }
            }

            $db->commit();

            http_response_code(201);
            echo json_encode([
                'message' => "Successfully uploaded house ledger registry. (Registered: {$registeredCount}, Enriched/Updated: {$enrichedCount})."
            ]);

        } catch (\Exception $e) {
            if (isset($db) && $db->inTransaction()) {
                $db->rollBack();
            }
            http_response_code(500);
            echo json_encode(['error' => 'A critical database transactional error occurred: ' . $e->getMessage()]);
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
            foreach ($stagesList as $stage) {
                $stagesMap[strtolower(trim($stage['code']))] = (int)$stage['id'];
                $stagesMap[strtolower(trim($stage['label']))] = (int)$stage['id'];
            }

            $resolvedVillages = []; // Keep cache of resolved villages to prevent duplicate SQL hits

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

                // Check NIC constraint globally (except within same resolved house)
                $ownerNic = isset($row['owner_nic']) ? trim($row['owner_nic']) : '';
                if ($ownerNic !== '' && isset($villageId) && $villageId) {
                    $nicStmt = $db->prepare("SELECT id, village_id, house_number FROM house WHERE owner_nic = :nic");
                    $nicStmt->execute([':nic' => $ownerNic]);
                    $existingHouse = $nicStmt->fetch();

                    if ($existingHouse) {
                        if ((int)$existingHouse['village_id'] !== $villageId || strtolower(trim($existingHouse['house_number'])) !== strtolower(trim($row['house_number'] ?? ''))) {
                            $rowErrors['owner_nic'][] = "NIC number is already registered to house '{$existingHouse['house_number']}' in village ID {$existingHouse['village_id']}.";
                        }
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

            // PASS 2: Transactional Merges / Updates & Inserts
            $registeredCount = 0;
            $enrichedCount = 0;

            $db->beginTransaction();

            foreach ($body as $row) {
                $province = trim($row['province']);
                $district = trim($row['district']);
                $division = trim($row['division']);
                $villageName = trim($row['village_name']);

                $cacheKey = strtolower("{$province}|{$district}|{$division}|{$villageName}");
                $villageId = $resolvedVillages[$cacheKey];

                $houseNumber = trim($row['house_number']);
                $incomingStage = isset($row['construction_stage']) ? trim($row['construction_stage']) : '';
                $stageId = $stagesMap[strtolower($incomingStage)] ?? (int)($stagesList[0]['id'] ?? 1);

                // Check if duplicate house exists in this resolved village
                $dupStmt = $db->prepare("SELECT id FROM house WHERE village_id = :village_id AND LOWER(house_number) = LOWER(:num)");
                $dupStmt->execute([
                    ':village_id' => $villageId,
                    ':num' => $houseNumber
                ]);
                $existingHouseId = $dupStmt->fetchColumn();

                if ($existingHouseId) {
                    // Enrich existing house record (Rewrite Policy)
                    $updateFields = [];
                    $bindings = [':id' => $existingHouseId];

                    $fieldsMap = [
                        'owner_name' => 'owner_name',
                        'owner_nic' => 'owner_nic',
                        'owner_contact' => 'owner_contact',
                        'household_members' => 'household_members',
                        'land_area_perches' => 'land_area_perches',
                        'is_land_sold' => 'is_land_sold',
                        'is_house_sold' => 'is_house_sold',
                        'occupancy_status' => 'occupancy_status',
                        'has_infrastructure_issues' => 'has_infrastructure_issues',
                        'notes' => 'notes'
                    ];

                    foreach ($fieldsMap as $payloadKey => $dbCol) {
                        if (isset($row[$payloadKey]) && $row[$payloadKey] !== '' && $row[$payloadKey] !== null) {
                            $updateFields[] = "{$dbCol} = :{$dbCol}";
                            if ($dbCol === 'household_members' || $dbCol === 'is_land_sold' || $dbCol === 'is_house_sold' || $dbCol === 'has_infrastructure_issues') {
                                $bindings[$dbCol] = (int)$row[$payloadKey];
                            } elseif ($dbCol === 'land_area_perches') {
                                $bindings[$dbCol] = (float)$row[$payloadKey];
                            } else {
                                $bindings[$dbCol] = trim($row[$payloadKey]);
                            }
                        }
                    }

                    // Always overwrite construction stage to highest stage
                    $updateFields[] = "construction_stage_id = :stage_id";
                    $bindings['stage_id'] = $stageId;

                    if (!empty($updateFields)) {
                        $sql = "UPDATE house SET " . implode(', ', $updateFields) . " WHERE id = :id";
                        $stmt = $db->prepare($sql);
                        $stmt->execute($bindings);
                    }
                    $enrichedCount++;
                } else {
                    // Insert new house record
                    $insertStmt = $db->prepare("
                        INSERT INTO house (village_id, house_number, owner_name, owner_nic, owner_contact,
                          household_members, land_area_perches, construction_stage_id,
                          is_land_sold, is_house_sold, occupancy_status, has_infrastructure_issues, notes)
                        VALUES (:village_id, :house_number, :owner_name, :owner_nic, :owner_contact,
                          :members, :perches, :stage_id,
                          :land_sold, :house_sold, :occupancy, :infra_issues, :notes)
                    ");

                    $insertStmt->execute([
                        ':village_id' => $villageId,
                        ':house_number' => $houseNumber,
                        ':owner_name' => trim($row['owner_name']),
                        ':owner_nic' => trim($row['owner_nic']),
                        ':owner_contact' => !empty($row['owner_contact']) ? trim($row['owner_contact']) : null,
                        ':members' => isset($row['household_members']) && $row['household_members'] !== '' ? (int)$row['household_members'] : null,
                        ':perches' => isset($row['land_area_perches']) && $row['land_area_perches'] !== '' ? (float)$row['land_area_perches'] : null,
                        ':stage_id' => $stageId,
                        ':land_sold' => (int)($row['is_land_sold'] ?? 0),
                        ':house_sold' => (int)($row['is_house_sold'] ?? 0),
                        ':occupancy' => !empty($row['occupancy_status']) ? trim($row['occupancy_status']) : 'NOT_APPLICABLE',
                        ':infra_issues' => (int)($row['has_infrastructure_issues'] ?? 0),
                        ':notes' => !empty($row['notes']) ? trim($row['notes']) : null
                    ]);
                    $registeredCount++;
                }
            }

            $db->commit();

            http_response_code(201);
            echo json_encode([
                'message' => "Successfully uploaded house ledger registry. (Registered: {$registeredCount}, Enriched/Updated: {$enrichedCount})."
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

