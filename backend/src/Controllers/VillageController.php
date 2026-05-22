<?php
namespace App\Controllers;

use App\Config\Database;
use App\Validators\VillageValidator;

class VillageController {

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
                    JOIN land_ownership_body lob ON v.ownership_body_id = lob.id
                    JOIN division dv ON v.division_id = dv.id
                    JOIN district d ON dv.district_id = d.id
                    LEFT JOIN development_project dp ON v.development_project_id = dp.id
                    WHERE 1=1";
            
            $bindings = [];

            if (!empty($filters['category'])) {
                $sql .= " AND vc.code = :category";
                $bindings['category'] = $filters['category'];
            }
            if (!empty($filters['status'])) {
                $sql .= " AND v.status = :status";
                $bindings['status'] = $filters['status'];
            }
            if (!empty($filters['division_id']) && is_numeric($filters['division_id'])) {
                $sql .= " AND v.division_id = :division_id";
                $bindings['division_id'] = (int)$filters['division_id'];
            }
            if (isset($filters['is_conservation_area']) && $filters['is_conservation_area'] !== '') {
                $sql .= " AND v.is_conservation_area = :conservation";
                $bindings['conservation'] = (int)$filters['is_conservation_area'];
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
                JOIN land_ownership_body lob ON v.ownership_body_id = lob.id
                JOIN division dv ON v.division_id = dv.id
                WHERE 1=1
            ";
            
            if (!empty($filters['category'])) $countSql .= " AND vc.code = :category";
            if (!empty($filters['status'])) $countSql .= " AND v.status = :status";
            if (!empty($filters['division_id']) && is_numeric($filters['division_id'])) $countSql .= " AND v.division_id = :division_id";
            if (isset($filters['is_conservation_area']) && $filters['is_conservation_area'] !== '') $countSql .= " AND v.is_conservation_area = :conservation";
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
                $v['ownership_body_id'] = (int)$v['ownership_body_id'];
                $v['development_project_id'] = $v['development_project_id'] ? (int)$v['development_project_id'] : null;
                $v['total_planned_houses'] = (int)$v['total_planned_houses'];
                $v['total_houses_recorded'] = (int)$v['total_houses_recorded'];
                $v['is_conservation_area'] = (bool)$v['is_conservation_area'];
                $v['infrastructure_issues'] = !empty($v['infrastructure_issues']) ? json_decode($v['infrastructure_issues'], true) : [];
                
                $v['category'] = [
                    'id' => (int)$v['category_id'],
                    'code' => $v['category_code'],
                    'name' => $v['category_name']
                ];
                $v['ownership_body'] = [
                    'id' => (int)$v['ownership_body_id'],
                    'code' => $v['ownership_body_code'],
                    'name_en' => $v['ownership_body_name_en'],
                    'name_si' => $v['ownership_body_name_si'],
                    'name_ta' => $v['ownership_body_name_ta']
                ];
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
                       dv.name as division_name, d.name as district_name,
                       dp.code as development_project_code, dp.name_en as development_project_name_en,
                       dp.name_si as development_project_name_si, dp.name_ta as development_project_name_ta
                FROM village v
                JOIN village_category vc ON v.category_id = vc.id
                JOIN land_ownership_body lob ON v.ownership_body_id = lob.id
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
            $village['is_conservation_area'] = (bool)$village['is_conservation_area'];
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

        $errors = VillageValidator::validate($body);

        if (!empty($errors)) {
            http_response_code(400);
            echo json_encode(['error' => 'Validation failed', 'details' => $errors]);
            return;
        }

        try {
            $db = Database::getConnection();
            $stmt = $db->prepare("
                INSERT INTO village (division_id, category_id, ownership_body_id, name,
                  development_project_id, grama_niladhari_division, total_planned_houses,
                  status, is_conservation_area, infrastructure_issues, boundary_type,
                  program_start_date, notes)
                VALUES (:division_id, :category_id, :ownership_body_id, :name,
                  :project_id, :gn_div, :total_planned,
                  :status, :conservation, :infra_issues, :boundary_type, :start_date, :notes)
            ");
            
            $divisionId = !empty($body['division_id']) ? (int)$body['division_id'] : null;
            if (!$divisionId) {
                $divStmt = $db->query("SELECT id FROM division LIMIT 1");
                $divisionId = (int)$divStmt->fetchColumn() ?: 1;
            }

            $categoryId = !empty($body['category_id']) ? (int)$body['category_id'] : null;
            if (!$categoryId) {
                $catStmt = $db->query("SELECT id FROM village_category LIMIT 1");
                $categoryId = (int)$catStmt->fetchColumn() ?: 1;
            }

            $ownershipBodyId = !empty($body['ownership_body_id']) ? (int)$body['ownership_body_id'] : null;
            if (!$ownershipBodyId) {
                $ownStmt = $db->query("SELECT id FROM land_ownership_body LIMIT 1");
                $ownershipBodyId = (int)$ownStmt->fetchColumn() ?: 1;
            }

            $stmt->execute([
                'division_id'    => $divisionId,
                'category_id'    => $categoryId,
                'ownership_body_id' => $ownershipBodyId,
                'name'           => !empty($body['name']) ? trim($body['name']) : 'Draft Village',
                'project_id'     => !empty($body['development_project_id']) ? (int)$body['development_project_id'] : null,
                'gn_div'         => !empty($body['grama_niladhari_division']) ? trim($body['grama_niladhari_division']) : null,
                'total_planned'  => isset($body['total_planned_houses']) && $body['total_planned_houses'] !== '' ? (int)$body['total_planned_houses'] : 0,
                'status'         => !empty($body['status']) ? $body['status'] : 'IN_PROGRESS',
                'conservation'   => (int)($body['is_conservation_area'] ?? 0),
                'infra_issues'   => (isset($body['infrastructure_issues']) && is_array($body['infrastructure_issues'])) ? json_encode($body['infrastructure_issues']) : null,
                'boundary_type'  => !empty($body['boundary_type']) ? $body['boundary_type'] : null,
                'start_date'     => !empty($body['program_start_date']) ? $body['program_start_date'] : null,
                'notes'          => !empty($body['notes']) ? trim($body['notes']) : null,
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
}
