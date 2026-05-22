<?php
namespace App\Controllers;

use App\Config\Database;

class ReferenceController {

    public function districts(): void {
        try {
            $db = Database::getConnection();

            // Fetch districts and divisions ordered by name
            $districts = $db->query("SELECT id, name, province FROM district ORDER BY name")->fetchAll();
            $divisions = $db->query("SELECT id, district_id, name FROM division ORDER BY name")->fetchAll();

            // Group divisions by their parent district_id
            $divisionsByDistrict = [];
            foreach ($divisions as $div) {
                $districtId = (int)$div['district_id'];
                $divisionsByDistrict[$districtId][] = [
                    'id' => (int)$div['id'],
                    'name' => $div['name']
                ];
            }

            // Construct final hierarchical tree response
            $response = [];
            foreach ($districts as $dist) {
                $id = (int)$dist['id'];
                $response[] = [
                    'id' => $id,
                    'name' => $dist['name'],
                    'province' => $dist['province'],
                    'divisions' => $divisionsByDistrict[$id] ?? []
                ];
            }

            http_response_code(200);
            echo json_encode($response);

        } catch (\PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to fetch reference location data: ' . $e->getMessage()]);
        }
    }

    public function villageCategories(): void {
        try {
            $db = Database::getConnection();
            $categories = $db->query("SELECT id, code, name, description FROM village_category ORDER BY id")->fetchAll();

            http_response_code(200);
            echo json_encode($categories);
        } catch (\PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to fetch village categories.']);
        }
    }

    public function landOwnershipBodies(): void {
        try {
            $db = Database::getConnection();
            $bodies = $db->query("SELECT id, code, name_en, name_si, name_ta, description FROM land_ownership_body ORDER BY id")->fetchAll();

            http_response_code(200);
            echo json_encode($bodies);
        } catch (\PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to fetch land ownership bodies.']);
        }
    }

    public function constructionStages(): void {
        try {
            $db = Database::getConnection();
            $stages = $db->query("SELECT id, stage_order, code, label FROM construction_stage ORDER BY stage_order")->fetchAll();

            // Cast stage_order to integer cleanly
            foreach ($stages as &$stage) {
                $stage['stage_order'] = (int)$stage['stage_order'];
            }

            http_response_code(200);
            echo json_encode($stages);
        } catch (\PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to fetch construction stages.']);
        }
    }

    public function developmentProjects(): void {
        try {
            $db = Database::getConnection();
            $projects = $db->query("SELECT id, code, name_en, name_si, name_ta FROM development_project WHERE is_active = 1 ORDER BY id")->fetchAll();

            http_response_code(200);
            echo json_encode($projects);
        } catch (\PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to fetch development projects: ' . $e->getMessage()]);
        }
    }
}
