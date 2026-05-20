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
                      lob.name as ownership_body_name, lob.code as ownership_body_code,
                      dv.name as division_name, d.name as district_name,
                      (SELECT COUNT(*) FROM house h WHERE h.village_id = v.id) as total_houses_recorded
                    FROM village v
                    JOIN village_category vc ON v.category_id = vc.id
                    JOIN land_ownership_body lob ON v.ownership_body_id = lob.id
                    JOIN division dv ON v.division_id = dv.id
                    JOIN district d ON dv.district_id = d.id
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
            if (isset($filters['has_infrastructure_issues']) && $filters['has_infrastructure_issues'] !== '') {
                $sql .= " AND v.has_infrastructure_issues = :infra_issues";
                $bindings['infra_issues'] = (int)$filters['has_infrastructure_issues'];
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
            if (isset($filters['has_infrastructure_issues']) && $filters['has_infrastructure_issues'] !== '') $countSql .= " AND v.has_infrastructure_issues = :infra_issues";

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
                $v['total_planned_houses'] = (int)$v['total_planned_houses'];
                $v['total_houses_recorded'] = (int)$v['total_houses_recorded'];
                $v['is_conservation_area'] = (bool)$v['is_conservation_area'];
                $v['has_infrastructure_issues'] = (bool)$v['has_infrastructure_issues'];
                $v['gps_lat'] = $v['gps_lat'] ? (float)$v['gps_lat'] : null;
                $v['gps_lng'] = $v['gps_lng'] ? (float)$v['gps_lng'] : null;
                
                $v['category'] = [
                    'id' => (int)$v['category_id'],
                    'code' => $v['category_code'],
                    'name' => $v['category_name']
                ];
                $v['ownership_body'] = [
                    'id' => (int)$v['ownership_body_id'],
                    'code' => $v['ownership_body_code'],
                    'name' => $v['ownership_body_name']
                ];
                $v['division'] = [
                    'id' => (int)$v['division_id'],
                    'name' => $v['division_name'],
                    'district' => $v['district_name']
                ];
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
                       lob.name as ownership_body_name, lob.code as ownership_body_code,
                       dv.name as division_name, d.name as district_name
                FROM village v
                JOIN village_category vc ON v.category_id = vc.id
                JOIN land_ownership_body lob ON v.ownership_body_id = lob.id
                JOIN division dv ON v.division_id = dv.id
                JOIN district d ON dv.district_id = d.id
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
            $village['has_infrastructure_issues'] = (bool)$village['has_infrastructure_issues'];
            $village['gps_lat'] = $village['gps_lat'] ? (float)$village['gps_lat'] : null;
            $village['gps_lng'] = $village['gps_lng'] ? (float)$village['gps_lng'] : null;

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
                  development_project, grama_niladhari_division, gps_lat, gps_lng, total_planned_houses,
                  status, is_conservation_area, has_infrastructure_issues,
                  program_start_date, program_end_date, notes)
                VALUES (:division_id, :category_id, :ownership_body_id, :name,
                  :project, :gn_div, :gps_lat, :gps_lng, :total_planned,
                  :status, :conservation, :infra_issues, :start_date, :end_date, :notes)
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
                'project'        => !empty($body['development_project']) ? trim($body['development_project']) : null,
                'gn_div'         => !empty($body['grama_niladhari_division']) ? trim($body['grama_niladhari_division']) : null,
                'gps_lat'        => isset($body['gps_lat']) && $body['gps_lat'] !== '' ? (float)$body['gps_lat'] : null,
                'gps_lng'        => isset($body['gps_lng']) && $body['gps_lng'] !== '' ? (float)$body['gps_lng'] : null,
                'total_planned'  => isset($body['total_planned_houses']) && $body['total_planned_houses'] !== '' ? (int)$body['total_planned_houses'] : 0,
                'status'         => !empty($body['status']) ? $body['status'] : 'IN_PROGRESS',
                'conservation'   => (int)($body['is_conservation_area'] ?? 0),
                'infra_issues'   => (int)($body['has_infrastructure_issues'] ?? 0),
                'start_date'     => !empty($body['program_start_date']) ? $body['program_start_date'] : null,
                'end_date'       => !empty($body['program_end_date']) ? $body['program_end_date'] : null,
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
