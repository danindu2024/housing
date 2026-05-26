<?php
namespace App\Controllers;

use App\Config\Database;

class DashboardController {

    private function getFilterQuery(array $filters, array &$bindings): string {
        $where = " WHERE 1=1";

        if (!empty($filters['province'])) {
            $where .= " AND d.province = :province";
            $bindings['province'] = $filters['province'];
        }
        if (!empty($filters['district_id']) && is_numeric($filters['district_id'])) {
            $where .= " AND d.id = :district_id";
            $bindings['district_id'] = (int)$filters['district_id'];
        }
        if (!empty($filters['division_id']) && is_numeric($filters['division_id'])) {
            $where .= " AND v.division_id = :division_id";
            $bindings['division_id'] = (int)$filters['division_id'];
        }
        if (!empty($filters['category'])) {
            $where .= " AND vc.code = :category";
            $bindings['category'] = $filters['category'];
        }
        if (!empty($filters['status'])) {
            $where .= " AND v.status = :status";
            $bindings['status'] = $filters['status'];
        }
        if (!empty($filters['ownership_body_id']) && is_numeric($filters['ownership_body_id'])) {
            $where .= " AND v.ownership_body_id = :ownership_body_id";
            $bindings['ownership_body_id'] = (int)$filters['ownership_body_id'];
        }

        return $where;
    }

    public function summary(): void {
        try {
            $db = Database::getConnection();
            $filters = $_GET;
            $bindings = [];
            
            $whereClause = $this->getFilterQuery($filters, $bindings);

            // 1. Villages summary statistics
            // Total and Status count
            $villageQuery = "
                SELECT 
                    COUNT(v.id) as total,
                    SUM(CASE WHEN v.status = 'COMPLETED' THEN 1 ELSE 0 END) as status_completed,
                    SUM(CASE WHEN v.status = 'INCOMPLETE' THEN 1 ELSE 0 END) as status_incomplete,
                    SUM(CASE WHEN v.status = 'IN_PROGRESS' THEN 1 ELSE 0 END) as status_in_progress,
                    SUM(CASE WHEN v.status = 'ABANDONED' THEN 1 ELSE 0 END) as status_abandoned,
                    SUM(v.total_planned_houses) as total_planned_houses,
                    SUM(v.is_conservation_area) as conservation_area_villages,
                    SUM(CASE WHEN (v.infrastructure_issues IS NOT NULL AND v.infrastructure_issues <> '[]' AND v.infrastructure_issues <> '') THEN 1 ELSE 0 END) as infra_issue_villages
                FROM village v
                JOIN village_category vc ON v.category_id = vc.id
                JOIN division dv ON v.division_id = dv.id
                JOIN district d ON dv.district_id = d.id
                $whereClause
            ";
            
            $stmt = $db->prepare($villageQuery);
            $stmt->execute($bindings);
            $vStats = $stmt->fetch(\PDO::FETCH_ASSOC);

            // Category breakdown
            $categoryQuery = "
                SELECT 
                    vc.id, vc.code, vc.name,
                    COUNT(v.id) as count
                FROM village v
                JOIN village_category vc ON v.category_id = vc.id
                JOIN division dv ON v.division_id = dv.id
                JOIN district d ON dv.district_id = d.id
                $whereClause
                GROUP BY vc.id, vc.code, vc.name
            ";
            $stmt = $db->prepare($categoryQuery);
            $stmt->execute($bindings);
            $categoryBreakdown = $stmt->fetchAll(\PDO::FETCH_ASSOC);

            // Ownership Breakdown
            $ownershipQuery = "
                SELECT 
                    lob.id, lob.code, lob.name_en as name,
                    COUNT(v.id) as count
                FROM village v
                JOIN land_ownership_body lob ON v.ownership_body_id = lob.id
                JOIN village_category vc ON v.category_id = vc.id
                JOIN division dv ON v.division_id = dv.id
                JOIN district d ON dv.district_id = d.id
                $whereClause
                GROUP BY lob.id, lob.code, lob.name_en
            ";
            $stmt = $db->prepare($ownershipQuery);
            $stmt->execute($bindings);
            $ownershipBreakdown = $stmt->fetchAll(\PDO::FETCH_ASSOC);

            // 2. Houses metrics
            // We join with the same filtered villages to apply geography and other filters
            $houseQuery = "
                SELECT 
                    COUNT(h.id) as total,
                    SUM(CASE WHEN cs.stage_order = 8 THEN 1 ELSE 0 END) as fully_developed,
                    SUM(CASE WHEN cs.stage_order > 1 AND cs.stage_order < 8 THEN 1 ELSE 0 END) as under_construction,
                    SUM(CASE WHEN cs.stage_order <= 1 THEN 1 ELSE 0 END) as not_started,
                    SUM(h.is_land_sold) as land_sold,
                    SUM(h.is_house_sold) as house_sold
                FROM house h
                JOIN village v ON h.village_id = v.id
                JOIN village_category vc ON v.category_id = vc.id
                JOIN division dv ON v.division_id = dv.id
                JOIN district d ON dv.district_id = d.id
                LEFT JOIN construction_stage cs ON h.construction_stage_id = cs.id
                $whereClause
            ";
            $stmt = $db->prepare($houseQuery);
            $stmt->execute($bindings);
            $hStats = $stmt->fetch(\PDO::FETCH_ASSOC);

            // Occupancy breakdown for houses
            $occupancyQuery = "
                SELECT 
                    h.occupancy_status,
                    COUNT(h.id) as count
                FROM house h
                JOIN village v ON h.village_id = v.id
                JOIN village_category vc ON v.category_id = vc.id
                JOIN division dv ON v.division_id = dv.id
                JOIN district d ON dv.district_id = d.id
                $whereClause
                GROUP BY h.occupancy_status
            ";
            $stmt = $db->prepare($occupancyQuery);
            $stmt->execute($bindings);
            $occupancyBreakdown = $stmt->fetchAll(\PDO::FETCH_ASSOC);

            // 3. Loans metrics (only relevant for Loan villages/houses)
            $loanQuery = "
                SELECT 
                    COUNT(l.id) as total,
                    SUM(CASE WHEN l.repayment_status = 'FULLY_PAID' THEN 1 ELSE 0 END) as fully_paid,
                    SUM(CASE WHEN l.repayment_status = 'PAYING' OR l.repayment_status = 'CURRENTLY_PAYING' THEN 1 ELSE 0 END) as currently_paying,
                    SUM(CASE WHEN l.repayment_status = 'PARTIALLY_PAID' THEN 1 ELSE 0 END) as partially_paid,
                    SUM(CASE WHEN l.repayment_status = 'NOT_PAID' THEN 1 ELSE 0 END) as not_paid,
                    SUM(l.loan_amount) as total_disbursed,
                    SUM(l.total_paid_so_far) as total_recovered
                FROM loan l
                JOIN house h ON l.house_id = h.id
                JOIN village v ON h.village_id = v.id
                JOIN village_category vc ON v.category_id = vc.id
                JOIN division dv ON v.division_id = dv.id
                JOIN district d ON dv.district_id = d.id
                $whereClause
            ";
            $stmt = $db->prepare($loanQuery);
            $stmt->execute($bindings);
            $lStats = $stmt->fetch(\PDO::FETCH_ASSOC);

            // Format numbers nicely
            $totalVillages = (int)($vStats['total'] ?? 0);
            $totalPlannedHouses = (int)($vStats['total_planned_houses'] ?? 0);
            $totalHouses = (int)($hStats['total'] ?? 0);

            http_response_code(200);
            echo json_encode([
                'villages' => [
                    'total' => $totalVillages,
                    'category_breakdown' => $categoryBreakdown,
                    'completed' => (int)($vStats['status_completed'] ?? 0),
                    'incomplete' => (int)($vStats['status_incomplete'] ?? 0),
                    'in_progress' => (int)($vStats['status_in_progress'] ?? 0),
                    'abandoned' => (int)($vStats['status_abandoned'] ?? 0),
                    'ownership_breakdown' => $ownershipBreakdown
                ],
                'houses' => [
                    'total' => $totalHouses,
                    'total_planned' => $totalPlannedHouses,
                    'fully_developed' => (int)($hStats['fully_developed'] ?? 0),
                    'under_construction' => (int)($hStats['under_construction'] ?? 0),
                    'not_started' => (int)($hStats['not_started'] ?? 0)
                ],
                'loans' => [
                    'total' => (int)($lStats['total'] ?? 0),
                    'fully_paid' => (int)($lStats['fully_paid'] ?? 0),
                    'currently_paying' => (int)($lStats['currently_paying'] ?? 0),
                    'partially_paid' => (int)($lStats['partially_paid'] ?? 0),
                    'not_paid' => (int)($lStats['not_paid'] ?? 0),
                    'total_disbursed' => (float)($lStats['total_disbursed'] ?? 0.0),
                    'total_recovered' => (float)($lStats['total_recovered'] ?? 0.0)
                ],
                'occupancy' => $occupancyBreakdown,
                'land_issues' => [
                    'conservation_area_villages' => (int)($vStats['conservation_area_villages'] ?? 0),
                    'infrastructure_issue_villages' => (int)($vStats['infra_issue_villages'] ?? 0),
                    'land_sold_houses' => (int)($hStats['land_sold'] ?? 0),
                    'house_sold_houses' => (int)($hStats['house_sold'] ?? 0)
                ]
            ]);

        } catch (\PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'An internal database error occurred: ' . $e->getMessage()]);
        }
    }

    public function constructionProgress(): void {
        try {
            $db = Database::getConnection();
            $filters = $_GET;
            $bindings = [];
            
            $whereClause = $this->getFilterQuery($filters, $bindings);

            // Fetch stage labels and counts of houses in each stage
            $progressQuery = "
                SELECT 
                    cs.label as stage_label,
                    cs.stage_order,
                    COUNT(h.id) as count
                FROM construction_stage cs
                LEFT JOIN house h ON h.construction_stage_id = cs.id
                LEFT JOIN village v ON h.village_id = v.id
                LEFT JOIN village_category vc ON v.category_id = vc.id
                LEFT JOIN division dv ON v.division_id = dv.id
                LEFT JOIN district d ON dv.district_id = d.id
                " . (!empty($whereClause) ? str_replace("WHERE 1=1", "WHERE 1=1", $whereClause) : "") . "
                GROUP BY cs.id, cs.label, cs.stage_order
                ORDER BY cs.stage_order ASC
            ";
            
            $stmt = $db->prepare($progressQuery);
            $stmt->execute($bindings);
            $stages = $stmt->fetchAll(\PDO::FETCH_ASSOC);

            // Ensure all 8 stages are represented in the order, even if count is 0
            foreach ($stages as &$s) {
                $s['stage_order'] = (int)$s['stage_order'];
                $s['count'] = (int)$s['count'];
            }

            http_response_code(200);
            echo json_encode($stages);

        } catch (\PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'An internal database error occurred: ' . $e->getMessage()]);
        }
    }
}
