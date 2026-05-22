<?php
namespace App\Validators;

class VillageValidator {

    public static function validate(array $data): array {
        $errors = [];

        // Name validation (Optional)
        if (!empty($data['name']) && trim($data['name']) !== '') {
            if (strlen($data['name']) < 3 || strlen($data['name']) > 200) {
                $errors['name'][] = 'The name must be between 3 and 200 characters.';
            }
        }

        // Development Project ID validation (Optional)
        if (isset($data['development_project_id']) && $data['development_project_id'] !== '') {
            if (!is_numeric($data['development_project_id']) || (int)$data['development_project_id'] <= 0) {
                $errors['development_project_id'][] = 'Invalid development project selected.';
            }
        }

        // IDs validation (Optional)
        if (isset($data['division_id']) && $data['division_id'] !== '') {
            if (!is_numeric($data['division_id']) || (int)$data['division_id'] <= 0) {
                $errors['division_id'][] = 'A valid Divisional Secretariat (DS) Division must be selected.';
            }
        }

        if (isset($data['category_id']) && $data['category_id'] !== '') {
            if (!is_numeric($data['category_id']) || (int)$data['category_id'] <= 0) {
                $errors['category_id'][] = 'A valid village category (Loan or Grant) is required.';
            }
        }

        if (isset($data['ownership_body_id']) && $data['ownership_body_id'] !== '') {
            if (!is_numeric($data['ownership_body_id']) || (int)$data['ownership_body_id'] <= 0) {
                $errors['ownership_body_id'][] = 'A valid government land ownership body is required.';
            }
        }

        // House Count validation (Optional)
        if (isset($data['total_planned_houses']) && $data['total_planned_houses'] !== '') {
            if (!is_numeric($data['total_planned_houses']) || (int)$data['total_planned_houses'] < 0) {
                $errors['total_planned_houses'][] = 'Total planned houses must be a non-negative integer.';
            }
        }

        // Status enum validation (Optional)
        $validStatuses = ['OPEN', 'CLOSED'];
        if (!empty($data['status']) && trim($data['status']) !== '') {
            if (!in_array($data['status'], $validStatuses)) {
                $errors['status'][] = 'A valid status is required (' . implode(', ', $validStatuses) . ').';
            }
        }

        // Boundary type validation (Optional)
        $validBoundaries = ['URBAN', 'DS', 'VILLAGE'];
        if (!empty($data['boundary_type']) && trim($data['boundary_type']) !== '') {
            if (!in_array($data['boundary_type'], $validBoundaries)) {
                $errors['boundary_type'][] = 'A valid boundary type is required (URBAN, DS, or VILLAGE).';
            }
        }


        // Infrastructure issues array validation (Optional)
        $validInfra = ['WATER', 'ELECTRICITY', 'ACCESS_ROADS', 'INTERNAL_ROADS', 'OTHER'];
        if (isset($data['infrastructure_issues']) && is_array($data['infrastructure_issues'])) {
            foreach ($data['infrastructure_issues'] as $issue) {
                if (!in_array($issue, $validInfra)) {
                    $errors['infrastructure_issues'][] = 'Invalid infrastructure issue selected: ' . $issue;
                }
            }
        }
        // Dates checks (Optional)
        if (isset($data['program_start_date']) && !empty($data['program_start_date'])) {
            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $data['program_start_date'])) {
                $errors['program_start_date'][] = 'Program start date must match the format YYYY-MM-DD.';
            }
        }


        return $errors;
    }
}
