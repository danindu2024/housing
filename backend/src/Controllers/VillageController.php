<?php
namespace App\Controllers;

use App\Config\Database;
use App\Validators\VillageValidator;

class VillageController {

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

    public function index(array $params): void {
        try {
            $db = Database::getConnection();
            $filters = $_GET;

            $sql = "SELECT v.*, vc.code as category_code, vc.name as category_name,
                      lob.name_en as ownership_body_name_en, lob.name_si as ownership_body_name_si, lob.name_ta as ownership_body_name_ta, lob.code as ownership_body_code,
                      dv.name as division_name, d.name as district_name,
                      dp.code as development_project_code, dp.name_en as development_project_name_en,
                      dp.name_si as development_project_name_si, dp.name_ta as development_project_name_ta,
                      (SELECT COUNT(*) FROM house h WHERE h.village_id = v.id) as total_houses_recorded
                    FROM village v
                    JOIN village_category vc ON v.category_id = vc.id
                    LEFT JOIN land_ownership_body lob ON v.ownership_body_id = lob.id
                    JOIN division dv ON v.division_id = dv.id
                    JOIN district d ON dv.district_id = d.id
                    LEFT JOIN development_project dp ON v.development_project_id = dp.id
                    WHERE 1=1";
            
            $bindings = [];

            if (!empty($filters['search'])) {
                $sql .= " AND v.name LIKE :search";
                $bindings['search'] = '%' . trim($filters['search']) . '%';
            }
            if (!empty($filters['province'])) {
                $sql .= " AND d.province = :province";
                $bindings['province'] = trim($filters['province']);
            }
            if (!empty($filters['district_id']) && is_numeric($filters['district_id'])) {
                $sql .= " AND d.id = :district_id";
                $bindings['district_id'] = (int)$filters['district_id'];
            }
            if (!empty($filters['division_id']) && is_numeric($filters['division_id'])) {
                $sql .= " AND v.division_id = :division_id";
                $bindings['division_id'] = (int)$filters['division_id'];
            }
            if (!empty($filters['grama_niladhari_division'])) {
                $sql .= " AND v.grama_niladhari_division LIKE :gn";
                $bindings['gn'] = '%' . trim($filters['grama_niladhari_division']) . '%';
            }
            if (!empty($filters['category'])) {
                $sql .= " AND vc.code = :category";
                $bindings['category'] = $filters['category'];
            }
            if (!empty($filters['status'])) {
                $statusFilter = strtoupper(trim($filters['status']));
                if (in_array($statusFilter, ['OPEN', 'CLOSED'])) {
                    $sql .= " AND v.status = :status";
                    $bindings['status'] = $statusFilter;
                }
            }
            if (isset($filters['is_conservation_area']) && $filters['is_conservation_area'] !== '') {
                if ($filters['is_conservation_area'] === '1' || $filters['is_conservation_area'] === 'true') {
                    $sql .= " AND v.is_conservation_area <> 'NONE'";
                } elseif ($filters['is_conservation_area'] === '0' || $filters['is_conservation_area'] === 'false') {
                    $sql .= " AND v.is_conservation_area = 'NONE'";
                } else {
                    $sql .= " AND v.is_conservation_area = :conservation";
                    $bindings['conservation'] = $filters['is_conservation_area'];
                }
            }
            if (isset($filters['infrastructure_issue']) && $filters['infrastructure_issue'] !== '') {
                $sql .= " AND JSON_CONTAINS(v.infrastructure_issues, :infra_issue)";
                $bindings['infra_issue'] = '"' . $filters['infrastructure_issue'] . '"';
            }

            $sql .= " ORDER BY v.name";

            // Pagination setup
            $page = max(1, (int)($filters['page'] ?? 1));
            $perPage = min(100, (int)($filters['per_page'] ?? 20));
            $offset = ($page - 1) * $perPage;

            // Total count query helper
            $countSql = "
                SELECT COUNT(DISTINCT v.id) 
                FROM village v
                JOIN village_category vc ON v.category_id = vc.id
                LEFT JOIN land_ownership_body lob ON v.ownership_body_id = lob.id
                JOIN division dv ON v.division_id = dv.id
                JOIN district d ON dv.district_id = d.id
                WHERE 1=1
            ";
            
            if (!empty($filters['search'])) $countSql .= " AND v.name LIKE :search";
            if (!empty($filters['province'])) $countSql .= " AND d.province = :province";
            if (!empty($filters['district_id']) && is_numeric($filters['district_id'])) $countSql .= " AND d.id = :district_id";
            if (!empty($filters['division_id']) && is_numeric($filters['division_id'])) $countSql .= " AND v.division_id = :division_id";
            if (!empty($filters['grama_niladhari_division'])) $countSql .= " AND v.grama_niladhari_division LIKE :gn";
            if (!empty($filters['category'])) $countSql .= " AND vc.code = :category";
            if (!empty($filters['status'])) {
                $statusFilter = strtoupper(trim($filters['status']));
                if (in_array($statusFilter, ['OPEN', 'CLOSED'])) {
                    $countSql .= " AND v.status = :status";
                }
            }
            if (isset($filters['is_conservation_area']) && $filters['is_conservation_area'] !== '') {
                if ($filters['is_conservation_area'] === '1' || $filters['is_conservation_area'] === 'true') {
                    $countSql .= " AND v.is_conservation_area <> 'NONE'";
                } elseif ($filters['is_conservation_area'] === '0' || $filters['is_conservation_area'] === 'false') {
                    $countSql .= " AND v.is_conservation_area = 'NONE'";
                } else {
                    $countSql .= " AND v.is_conservation_area = :conservation";
                }
            }
            if (isset($filters['infrastructure_issue']) && $filters['infrastructure_issue'] !== '') $countSql .= " AND JSON_CONTAINS(v.infrastructure_issues, :infra_issue)";

            $countStmt = $db->prepare($countSql);
            $countStmt->execute($bindings);
            $total = (int)$countStmt->fetchColumn();

            // Append limits and offsets
            $sql .= " LIMIT :limit OFFSET :offset";
            $stmt = $db->prepare($sql);

            foreach ($bindings as $key => $val) {
                $stmt->bindValue(":$key", $val);
            }
            $stmt->bindValue(':limit', $perPage, \PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, \PDO::PARAM_INT);
            $stmt->execute();
            $villages = $stmt->fetchAll();

            // Cast appropriate SQL string types to types
            foreach ($villages as &$v) {
                $v['id'] = (int)$v['id'];
                $v['division_id'] = (int)$v['division_id'];
                $v['category_id'] = (int)$v['category_id'];
                $v['ownership_body_id'] = $v['ownership_body_id'] !== null ? (int)$v['ownership_body_id'] : null;
                $v['development_project_id'] = $v['development_project_id'] ? (int)$v['development_project_id'] : null;
                $v['total_planned_houses'] = (int)$v['total_planned_houses'];
                $v['total_houses_recorded'] = (int)$v['total_houses_recorded'];
                $v['is_conservation_area'] = $v['is_conservation_area'];
                $v['infrastructure_issues'] = !empty($v['infrastructure_issues']) ? json_decode($v['infrastructure_issues'], true) : [];
                
                $v['category'] = [
                    'id' => (int)$v['category_id'],
                    'code' => $v['category_code'],
                    'name' => $v['category_name']
                ];
                $v['ownership_body'] = $v['ownership_body_id'] ? [
                    'id' => (int)$v['ownership_body_id'],
                    'code' => $v['ownership_body_code'],
                    'name_en' => $v['ownership_body_name_en'],
                    'name_si' => $v['ownership_body_name_si'],
                    'name_ta' => $v['ownership_body_name_ta']
                ] : null;
                $v['division'] = [
                    'id' => (int)$v['division_id'],
                    'name' => $v['division_name'],
                    'district' => $v['district_name']
                ];
                $v['development_project'] = $v['development_project_id'] ? [
                    'id' => $v['development_project_id'],
                    'code' => $v['development_project_code'],
                    'name_en' => $v['development_project_name_en'],
                    'name_si' => $v['development_project_name_si'],
                    'name_ta' => $v['development_project_name_ta']
                ] : null;
            }

            http_response_code(200);
            echo json_encode([
                'data' => $villages,
                'meta' => [
                    'total' => $total,
                    'page' => $page,
                    'per_page' => $perPage,
                    'last_page' => (int)ceil($total / $perPage),
                ]
            ]);

        } catch (\PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'An internal database error occurred: ' . $e->getMessage()]);
        }
    }

    public function show(array $params): void {
        $id = (int)$params['id'];

        try {
            $db = Database::getConnection();

            // Fetch core village info
            $stmt = $db->prepare("
                SELECT v.*, vc.code as category_code, vc.name as category_name,
                       lob.name_en as ownership_body_name_en, lob.name_si as ownership_body_name_si, lob.name_ta as ownership_body_name_ta, lob.code as ownership_body_code,
                       dv.name as division_name, d.name as district_name, d.province as province,
                       dp.code as development_project_code, dp.name_en as development_project_name_en,
                       dp.name_si as development_project_name_si, dp.name_ta as development_project_name_ta
                FROM village v
                JOIN village_category vc ON v.category_id = vc.id
                LEFT JOIN land_ownership_body lob ON v.ownership_body_id = lob.id
                JOIN division dv ON v.division_id = dv.id
                JOIN district d ON dv.district_id = d.id
                LEFT JOIN development_project dp ON v.development_project_id = dp.id
                WHERE v.id = :id
            ");
            $stmt->execute([':id' => $id]);
            $village = $stmt->fetch();

            if (!$village) {
                http_response_code(404);
                echo json_encode(['error' => 'Village not found.']);
                return;
            }

            // Cast parameters
            $village['id'] = (int)$village['id'];
            $village['total_planned_houses'] = (int)$village['total_planned_houses'];
            $village['is_conservation_area'] = $village['is_conservation_area'];
            $village['infrastructure_issues'] = !empty($village['infrastructure_issues']) ? json_decode($village['infrastructure_issues'], true) : [];
            $village['development_project_id'] = $village['development_project_id'] ? (int)$village['development_project_id'] : null;

            // Fetch metrics
            $totalHouses = (int)$db->query("SELECT COUNT(*) FROM house WHERE village_id = $id")->fetchColumn();
            
            $fullyDeveloped = (int)$db->query("
                SELECT COUNT(*) FROM house h 
                JOIN construction_stage cs ON h.construction_stage_id = cs.id 
                WHERE h.village_id = $id AND cs.code = 'FULLY_DEVELOPED'
            ")->fetchColumn();

            $notStarted = (int)$db->query("
                SELECT COUNT(*) FROM house h 
                JOIN construction_stage cs ON h.construction_stage_id = cs.id 
                WHERE h.village_id = $id AND cs.code = 'NO_FOUNDATION'
            ")->fetchColumn();

            $underConstruction = $totalHouses - $fullyDeveloped - $notStarted;

            $landSold = (int)$db->query("SELECT COUNT(*) FROM house WHERE village_id = $id AND is_land_sold = 1")->fetchColumn();
            $houseSold = (int)$db->query("SELECT COUNT(*) FROM house WHERE village_id = $id AND is_house_sold = 1")->fetchColumn();
            $openIssues = (int)$db->query("SELECT COUNT(*) FROM issue_report WHERE village_id = $id AND status = 'OPEN'")->fetchColumn();

            $village['summary'] = [
                'total_houses' => $totalHouses,
                'fully_developed' => $fullyDeveloped,
                'under_construction' => $underConstruction,
                'not_started' => $notStarted,
                'land_sold_count' => $landSold,
                'house_sold_count' => $houseSold,
                'open_issues' => $openIssues
            ];

            http_response_code(200);
            echo json_encode($village);

        } catch (\PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Database error loading village: ' . $e->getMessage()]);
        }
    }

    public function store(array $params): void {
        $body = json_decode(file_get_contents('php://input'), true);

        if (!$body) {
            http_response_code(400);
            echo json_encode(['error' => 'Malformed or missing JSON request body.']);
            return;
        }

        $body = $this->sanitizeInput($body);



        $errors = VillageValidator::validate($body);

        if (!empty($errors)) {
            http_response_code(400);
            echo json_encode(['error' => 'Validation failed', 'details' => $errors]);
            return;
        }

        try {
            $db = Database::getConnection();
            
            $divisionId = !empty($body['division_id']) ? (int)$body['division_id'] : null;
            if (!$divisionId) {
                $divStmt = $db->query("SELECT id FROM division LIMIT 1");
                $divisionId = (int)$divStmt->fetchColumn() ?: 1;
            }

            $name = !empty($body['name']) ? trim($body['name']) : 'Draft Village';

            // Natural Key Duplicate Checking
            $dupStmt = $db->prepare("SELECT * FROM village WHERE LOWER(name) = LOWER(:name) AND division_id = :division_id");
            $dupStmt->execute([
                ':name' => $name,
                ':division_id' => $divisionId
            ]);
            $existing = $dupStmt->fetch();

            if ($existing) {
                $existingStatus = $existing['status'];
                if ($existingStatus === 'INCOMPLETE' || empty($existingStatus)) {
                    // Enrich existing draft village
                    $updateFields = [];
                    $updateBindings = [':id' => $existing['id']];

                    $fields = [
                        'category_id', 'ownership_body_id', 'development_project_id',
                        'grama_niladhari_division', 'total_planned_houses', 'status',
                        'is_conservation_area', 'infrastructure_issues', 'boundary_type',
                        'program_start_date', 'notes', 'google_map_link'
                    ];

                    foreach ($fields as $field) {
                        if (isset($body[$field]) && $body[$field] !== '' && $body[$field] !== null) {
                            $val = $body[$field];
                            if ($field === 'category_id' || $field === 'ownership_body_id' || $field === 'development_project_id') {
                                $val = $val ? (int)$val : null;
                            } elseif ($field === 'total_planned_houses') {
                                $val = (int)$val;
                            } elseif ($field === 'is_conservation_area') {
                                $val = $val ?: 'NONE';
                            } elseif ($field === 'infrastructure_issues' && is_array($val)) {
                                $val = json_encode($val);
                            } elseif ($field === 'status') {
                                $val = in_array(strtoupper(trim($val)), ['YES', 'OPEN']) ? 'OPEN' : 'CLOSED';
                            }
                            $updateFields[] = "`$field` = :$field";
                            $updateBindings[":$field"] = $val;
                        }
                    }

                    if (!empty($updateFields)) {
                        $updateSql = "UPDATE village SET " . implode(', ', $updateFields) . " WHERE id = :id";
                        $upStmt = $db->prepare($updateSql);
                        $upStmt->execute($updateBindings);
                    }

                    http_response_code(200);
                    echo json_encode([
                        'id' => (int)$existing['id'],
                        'merged' => true,
                        'message' => 'Existing draft village enriched successfully.'
                    ]);
                    return;
                } else {
                    // Block overwrite on active/finalized records
                    http_response_code(409);
                    echo json_encode([
                        'error' => 'A finalized village with this name already exists in this division.',
                        'details' => [
                            'name' => ['A village with this name already exists in this Divisional Secretariat division.']
                        ],
                        'existing' => [
                            'id' => (int)$existing['id'],
                            'name' => $existing['name'],
                            'status' => $existing['status']
                        ]
                    ]);
                    return;
                }
            }

            // Otherwise, proceed to insert a new village
            $stmt = $db->prepare("
                INSERT INTO village (division_id, category_id, ownership_body_id, name,
                  development_project_id, grama_niladhari_division, total_planned_houses,
                  status, is_conservation_area, infrastructure_issues, boundary_type,
                  program_start_date, notes, google_map_link)
                VALUES (:division_id, :category_id, :ownership_body_id, :name,
                  :project_id, :gn_div, :total_planned,
                  :status, :conservation, :infra_issues, :boundary_type, :start_date, :notes, :google_map_link)
            ");

            $categoryId = !empty($body['category_id']) ? (int)$body['category_id'] : null;
            if (!$categoryId) {
                $catStmt = $db->query("SELECT id FROM village_category LIMIT 1");
                $categoryId = (int)$catStmt->fetchColumn() ?: 1;
            }

            $ownershipBodyId = !empty($body['ownership_body_id']) ? (int)$body['ownership_body_id'] : null;

            $stmt->execute([
                'division_id'    => $divisionId,
                'category_id'    => $categoryId,
                'ownership_body_id' => $ownershipBodyId,
                'name'           => $name,
                'project_id'     => !empty($body['development_project_id']) ? (int)$body['development_project_id'] : null,
                'gn_div'         => !empty($body['grama_niladhari_division']) ? trim($body['grama_niladhari_division']) : null,
                'total_planned'  => isset($body['total_planned_houses']) && $body['total_planned_houses'] !== '' ? (int)$body['total_planned_houses'] : 0,
                'status'         => !empty($body['status']) ? (in_array(strtoupper(trim($body['status'])), ['YES', 'OPEN']) ? 'OPEN' : 'CLOSED') : null,
                'conservation'   => !empty($body['is_conservation_area']) ? $body['is_conservation_area'] : 'NONE',
                'infra_issues'   => (isset($body['infrastructure_issues']) && is_array($body['infrastructure_issues'])) ? json_encode($body['infrastructure_issues']) : null,
                'boundary_type'  => !empty($body['boundary_type']) ? $body['boundary_type'] : null,
                'start_date'     => !empty($body['program_start_date']) ? $body['program_start_date'] : null,
                'notes'          => !empty($body['notes']) ? trim($body['notes']) : null,
                'google_map_link'=> !empty($body['google_map_link']) ? trim($body['google_map_link']) : null,
            ]);

            $id = $db->lastInsertId();
            
            http_response_code(201);
            echo json_encode([
                'id' => (int)$id, 
                'message' => 'Village record initialized successfully.'
            ]);

        } catch (\PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to write village record: ' . $e->getMessage()]);
        }
    }

    public function bulkStore(array $params): void {
        $body = json_decode(file_get_contents('php://input'), true);

        if (!$body || !is_array($body)) {
            http_response_code(400);
            echo json_encode(['error' => 'Malformed or missing JSON request body containing array of villages.']);
            return;
        }

        $body = $this->sanitizeInput($body);

        try {
            $db = Database::getConnection();
            $validationErrors = [];
            $validatedRows = [];

            foreach ($body as $index => $row) {
                $rowErrors = [];
                $displayRowIndex = $index + 1; // 1-indexed for the user Excel rows

                // 1. Validate name (Mandatory for all states)
                $name = isset($row['name']) ? trim($row['name']) : '';
                if ($name === '') {
                    $rowErrors['name'][] = 'Village name (ගම්මානයේ නම) is required.';
                }

                // 2. Determine if this row is a Draft (INCOMPLETE)
                // If any of the normally mandatory fields are missing, we treat it as INCOMPLETE.
                $provinceName = isset($row['province']) ? trim($row['province']) : '';
                $districtName = isset($row['district_name']) ? trim($row['district_name']) : '';
                $divisionName = isset($row['division_name']) ? trim($row['division_name']) : '';
                $categoryCode = isset($row['category_code']) ? trim($row['category_code']) : '';
                $ownershipBodyCode = isset($row['ownership_body_code']) ? trim($row['ownership_body_code']) : '';

                $isRowDraft = ($provinceName === '' || $districtName === '' || $divisionName === '' || $categoryCode === '');
                $rawStatus = isset($row['status']) ? strtoupper(trim($row['status'])) : '';
                $status = in_array($rawStatus, ['YES', 'NO', 'OPEN', 'CLOSED']) ? $rawStatus : null;

                // 3. Resolve Location and validate hierarchy
                $resolvedDivisionId = null;
                if ($provinceName !== '' && $districtName !== '' && $divisionName !== '') {
                    // Fetch district matching district name case-insensitively
                    $districtStmt = $db->prepare("SELECT id, province FROM district WHERE LOWER(name) = LOWER(:district)");
                    $districtStmt->execute([':district' => $districtName]);
                    $district = $districtStmt->fetch();

                    if (!$district) {
                        if (!$isRowDraft) $rowErrors['district_name'][] = "District '{$districtName}' does not exist.";
                    } else {
                        // Check if province matches
                        if (strtolower(trim($district['province'])) !== strtolower($provinceName)) {
                            if (!$isRowDraft) $rowErrors['province'][] = "District '{$districtName}' does not belong to '{$provinceName}' in the database reference list.";
                        }
                        
                        // Check if division exists under this district
                        $divisionStmt = $db->prepare("SELECT id FROM division WHERE LOWER(name) = LOWER(:division) AND district_id = :district_id");
                        $divisionStmt->execute([
                            ':division' => $divisionName,
                            ':district_id' => $district['id']
                        ]);
                        $division = $divisionStmt->fetch();
                        
                        if (!$division) {
                            if (!$isRowDraft) $rowErrors['division_name'][] = "DS Division '{$divisionName}' does not exist within District '{$districtName}'.";
                        } else {
                            $resolvedDivisionId = $division['id'];
                        }
                    }
                }

                // If division ID is not resolved, fallback for drafts, otherwise raise error
                if (!$resolvedDivisionId) {
                    if ($isRowDraft) {
                        $divStmt = $db->query("SELECT id FROM division LIMIT 1");
                        $resolvedDivisionId = (int)$divStmt->fetchColumn() ?: 1;
                    } else {
                        $rowErrors['division_name'][] = 'Could not resolve Divisional Secretariat division.';
                    }
                }

                // 4. Resolve Category Code
                $categoryId = null;
                if ($categoryCode !== '') {
                    $catStmt = $db->prepare("SELECT id FROM village_category WHERE code = :code");
                    $catStmt->execute([':code' => $categoryCode]);
                    $categoryId = $catStmt->fetchColumn();
                    if (!$categoryId && !$isRowDraft) {
                        $rowErrors['category_code'][] = "Invalid category code '{$categoryCode}'.";
                    }
                }

                if (!$categoryId) {
                    $catStmt = $db->query("SELECT id FROM village_category LIMIT 1");
                    $categoryId = (int)$catStmt->fetchColumn() ?: 1;
                }

                // 5. Resolve Ownership Body Code
                $ownershipBodyId = null;
                if ($ownershipBodyCode !== '') {
                    $ownStmt = $db->prepare("SELECT id FROM land_ownership_body WHERE code = :code");
                    $ownStmt->execute([':code' => $ownershipBodyCode]);
                    $ownershipBodyId = $ownStmt->fetchColumn() ?: null;
                    if (!$ownershipBodyId && !$isRowDraft) {
                        $rowErrors['ownership_body_code'][] = "Invalid ownership body code '{$ownershipBodyCode}'.";
                    }
                }


                // 6. Construct row array for standard validation
                $rowData = [
                    'name' => $name,
                    'division_id' => $resolvedDivisionId,
                    'category_id' => $categoryId,
                    'ownership_body_id' => $ownershipBodyId,
                    'grama_niladhari_division' => isset($row['grama_niladhari_division']) ? trim($row['grama_niladhari_division']) : null,
                    'total_planned_houses' => isset($row['total_planned_houses']) ? $row['total_planned_houses'] : null,
                    'status' => $status,
                    'is_conservation_area' => (isset($row['is_conservation_area']) && $row['is_conservation_area'] !== '') ? $row['is_conservation_area'] : 'NONE',
                    'infrastructure_issues' => isset($row['infrastructure_issues']) ? $row['infrastructure_issues'] : [],
                    'boundary_type' => isset($row['boundary_type']) && trim($row['boundary_type']) !== '' ? trim($row['boundary_type']) : null,
                    'program_start_date' => isset($row['program_start_date']) && trim($row['program_start_date']) !== '' ? trim($row['program_start_date']) : null,
                    'notes' => isset($row['notes']) ? trim($row['notes']) : null,
                    'google_map_link' => isset($row['google_map_link']) ? trim($row['google_map_link']) : null,
                ];

                // 7. Run standard backend validations
                $standardErrors = VillageValidator::validate($rowData);
                if (!empty($standardErrors)) {
                    $rowErrors = array_merge($rowErrors, $standardErrors);
                }

                // If errors exist on this row, catalog them
                if (!empty($rowErrors)) {
                    $validationErrors[$displayRowIndex] = $rowErrors;
                } else {
                    $validatedRows[] = $rowData;
                }
            }

            if (!empty($validationErrors)) {
                http_response_code(400);
                echo json_encode([
                    'error' => 'Validation failed for some Excel rows.',
                    'details' => $validationErrors
                ]);
                return;
            }

            // All validations succeeded. Start atomic database transaction.
            $db->beginTransaction();

            $insertStmt = $db->prepare("
                INSERT INTO village (division_id, category_id, ownership_body_id, name,
                  grama_niladhari_division, total_planned_houses,
                  status, is_conservation_area, infrastructure_issues, boundary_type,
                  program_start_date, notes, google_map_link)
                VALUES (:division_id, :category_id, :ownership_body_id, :name,
                  :gn_div, :total_planned,
                  :status, :conservation, :infra_issues, :boundary_type, :start_date, :notes, :google_map_link)
            ");

            // Prepare duplicate checking statement
            $checkStmt = $db->prepare("SELECT * FROM village WHERE LOWER(name) = LOWER(:name) AND division_id = :division_id");

            $mergedCount = 0;
            $insertedCount = 0;
            $skippedCount = 0;

            foreach ($validatedRows as $rowData) {
                // Check if village already exists
                $checkStmt->execute([
                    ':name' => $rowData['name'],
                    ':division_id' => $rowData['division_id']
                ]);
                $existing = $checkStmt->fetch();

                if ($existing) {
                    $existingStatus = $existing['status'];
                    if ($existingStatus === 'INCOMPLETE' || empty($existingStatus)) {
                        // Merge/Enrich existing draft village!
                        $updateFields = [];
                        $updateBindings = [':id' => $existing['id']];

                        $fields = [
                            'category_id', 'ownership_body_id', 'grama_niladhari_division', 
                            'total_planned_houses', 'status', 'is_conservation_area', 
                            'infrastructure_issues', 'boundary_type', 'program_start_date', 'notes',
                            'google_map_link'
                        ];

                        foreach ($fields as $field) {
                            if (isset($rowData[$field]) && $rowData[$field] !== '' && $rowData[$field] !== null) {
                                $val = $rowData[$field];
                                if ($field === 'infrastructure_issues' && is_array($val)) {
                                    $val = json_encode($val);
                                } elseif ($field === 'status') {
                                    $val = in_array(strtoupper(trim($val)), ['YES', 'OPEN']) ? 'OPEN' : 'CLOSED';
                                }
                                $updateFields[] = "`$field` = :$field";
                                $updateBindings[":$field"] = $val;
                            }
                        }

                        if (!empty($updateFields)) {
                            $updateSql = "UPDATE village SET " . implode(', ', $updateFields) . " WHERE id = :id";
                            $upStmt = $db->prepare($updateSql);
                            $upStmt->execute($updateBindings);
                        }
                        $mergedCount++;
                    } else {
                        // Skip updating finalized village to protect it (as per rewrite policy)
                        $skippedCount++;
                    }
                } else {
                    // Fresh insert
                    $insertStmt->execute([
                        'division_id'       => $rowData['division_id'],
                        'category_id'       => $rowData['category_id'],
                        'ownership_body_id' => $rowData['ownership_body_id'],
                        'name'              => $rowData['name'],
                        'gn_div'            => $rowData['grama_niladhari_division'],
                        'total_planned'     => $rowData['total_planned_houses'] !== '' && $rowData['total_planned_houses'] !== null ? (int)$rowData['total_planned_houses'] : 0,
                        'status'            => !empty($rowData['status']) ? (in_array(strtoupper(trim($rowData['status'])), ['YES', 'OPEN']) ? 'OPEN' : 'CLOSED') : null,
                        'conservation'      => $rowData['is_conservation_area'],
                        'infra_issues'      => !empty($rowData['infrastructure_issues']) ? json_encode($rowData['infrastructure_issues']) : null,
                        'boundary_type'     => $rowData['boundary_type'],
                        'start_date'        => $rowData['program_start_date'],
                        'notes'             => $rowData['notes'],
                        'google_map_link'   => $rowData['google_map_link'],
                    ]);
                    $insertedCount++;
                }
            }

            $db->commit();

            http_response_code(201);
            echo json_encode([
                'success' => true,
                'message' => "Import complete. Registered: {$insertedCount} new records. Enriched: {$mergedCount} drafts. Skipped: {$skippedCount} finalized duplicates."
            ]);

        } catch (\PDOException $e) {
            if ($db && $db->inTransaction()) {
                $db->rollBack();
            }
            http_response_code(500);
            echo json_encode(['error' => 'Database bulk registration transaction failed: ' . $e->getMessage()]);
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

        $body = $this->sanitizeInput($body);

        $errors = VillageValidator::validate($body);
        if (!empty($errors)) {
            http_response_code(400);
            echo json_encode(['error' => 'Validation failed', 'details' => $errors]);
            return;
        }

        try {
            $db = Database::getConnection();

            // Verify village exists
            $checkStmt = $db->prepare("SELECT id FROM village WHERE id = :id");
            $checkStmt->execute([':id' => $id]);
            if (!$checkStmt->fetch()) {
                http_response_code(404);
                echo json_encode(['error' => 'Village record not found.']);
                return;
            }

            $divisionId = !empty($body['division_id']) ? (int)$body['division_id'] : null;
            if (!$divisionId) {
                $divStmt = $db->query("SELECT id FROM division LIMIT 1");
                $divisionId = (int)$divStmt->fetchColumn() ?: 1;
            }

            $name = !empty($body['name']) ? trim($body['name']) : 'Draft Village';

            $stmt = $db->prepare("
                UPDATE village SET
                  division_id = :division_id,
                  category_id = :category_id,
                  ownership_body_id = :ownership_body_id,
                  name = :name,
                  development_project_id = :project_id,
                  grama_niladhari_division = :gn_div,
                  total_planned_houses = :total_planned,
                  status = :status,
                  is_conservation_area = :conservation,
                  infrastructure_issues = :infra_issues,
                  boundary_type = :boundary_type,
                  program_start_date = :start_date,
                  notes = :notes,
                  google_map_link = :google_map_link
                WHERE id = :id
            ");

            $categoryId = !empty($body['category_id']) ? (int)$body['category_id'] : null;
            if (!$categoryId) {
                $catStmt = $db->query("SELECT id FROM village_category LIMIT 1");
                $categoryId = (int)$catStmt->fetchColumn() ?: 1;
            }

            $ownershipBodyId = !empty($body['ownership_body_id']) ? (int)$body['ownership_body_id'] : null;

            $stmt->execute([
                'id'             => $id,
                'division_id'    => $divisionId,
                'category_id'    => $categoryId,
                'ownership_body_id' => $ownershipBodyId,
                'name'           => $name,
                'project_id'     => !empty($body['development_project_id']) ? (int)$body['development_project_id'] : null,
                'gn_div'         => !empty($body['grama_niladhari_division']) ? trim($body['grama_niladhari_division']) : null,
                'total_planned'  => isset($body['total_planned_houses']) && $body['total_planned_houses'] !== '' ? (int)$body['total_planned_houses'] : 0,
                'status'         => !empty($body['status']) ? (in_array(strtoupper(trim($body['status'])), ['YES', 'OPEN']) ? 'OPEN' : 'CLOSED') : null,
                'conservation'   => !empty($body['is_conservation_area']) ? $body['is_conservation_area'] : 'NONE',
                'infra_issues'   => (isset($body['infrastructure_issues']) && is_array($body['infrastructure_issues'])) ? json_encode($body['infrastructure_issues']) : null,
                'boundary_type'  => !empty($body['boundary_type']) ? $body['boundary_type'] : null,
                'start_date'     => !empty($body['program_start_date']) ? $body['program_start_date'] : null,
                'notes'          => !empty($body['notes']) ? trim($body['notes']) : null,
                'google_map_link'=> !empty($body['google_map_link']) ? trim($body['google_map_link']) : null,
            ]);

            http_response_code(200);
            echo json_encode([
                'id' => $id,
                'message' => 'Village record updated successfully.'
            ]);

        } catch (\PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to update village record: ' . $e->getMessage()]);
        }
    }

    public function destroy(array $params): void {
        $id = (int)$params['id'];

        try {
            $db = Database::getConnection();

            // 1. Check if the village has registered houses
            $houseStmt = $db->prepare("SELECT COUNT(*) FROM house WHERE village_id = :id");
            $houseStmt->execute([':id' => $id]);
            $houseCount = (int)$houseStmt->fetchColumn();

            if ($houseCount > 0) {
                http_response_code(400);
                echo json_encode(['error' => 'Cannot delete village. Please delete all registered houses first.']);
                return;
            }

            // 2. Perform delete
            $stmt = $db->prepare("DELETE FROM village WHERE id = :id");
            $stmt->execute([':id' => $id]);

            http_response_code(200);
            echo json_encode(['message' => 'Village deleted successfully.']);

        } catch (\PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to delete village record: ' . $e->getMessage()]);
        }
    }
}
