<?php
namespace App\Validators;

class VillageValidator {

    public static function validate(array $data): array {
        $errors = [];

        // Resolve status first (defaults to IN_PROGRESS if not specified)
        $status = !empty($data['status']) ? trim($data['status']) : 'IN_PROGRESS';
        $isDraft = ($status === 'INCOMPLETE');

        // Status enum validation (aligned with DB DDL ENUM)
        $validStatuses = ['IN_PROGRESS', 'COMPLETED', 'INCOMPLETE', 'ABANDONED'];
        if (!empty($data['status']) && trim($data['status']) !== '') {
            if (!in_array($data['status'], $validStatuses)) {
                $errors['status'][] = 'A valid status is required (' . implode(', ', $validStatuses) . ').';
            }
        }

        // Name validation (Mandatory for all states)
        if (empty($data['name']) || trim($data['name']) === '') {
            $errors['name'][] = 'Village name (ගම්මානයේ නම) is required.';
        } else {
            if (strlen($data['name']) < 3 || strlen($data['name']) > 200) {
                $errors['name'][] = 'The name must be between 3 and 200 characters.';
            }
        }

        // Division ID validation
        if (!$isDraft) {
            // Strict check for active/finalized records
            if (empty($data['division_id']) || !is_numeric($data['division_id']) || (int)$data['division_id'] <= 0) {
                $errors['division_id'][] = 'A valid Divisional Secretariat (DS) Division must be selected.';
            }
        } else {
            // Relaxed check for Draft
            if (isset($data['division_id']) && $data['division_id'] !== '' && $data['division_id'] !== null) {
                if (!is_numeric($data['division_id']) || (int)$data['division_id'] <= 0) {
                    $errors['division_id'][] = 'A valid Divisional Secretariat (DS) Division must be selected.';
                }
            }
        }

        // Category ID validation
        if (!$isDraft) {
            if (empty($data['category_id']) || !is_numeric($data['category_id']) || (int)$data['category_id'] <= 0) {
                $errors['category_id'][] = 'A valid village category (Loan or Grant) is required.';
            }
        } else {
            if (isset($data['category_id']) && $data['category_id'] !== '' && $data['category_id'] !== null) {
                if (!is_numeric($data['category_id']) || (int)$data['category_id'] <= 0) {
                    $errors['category_id'][] = 'A valid village category (Loan or Grant) is required.';
                }
            }
        }

        // Ownership Body ID validation
        if (!$isDraft) {
            if (empty($data['ownership_body_id']) || !is_numeric($data['ownership_body_id']) || (int)$data['ownership_body_id'] <= 0) {
                $errors['ownership_body_id'][] = 'A valid government land ownership body is required.';
            }
        } else {
            if (isset($data['ownership_body_id']) && $data['ownership_body_id'] !== '' && $data['ownership_body_id'] !== null) {
                if (!is_numeric($data['ownership_body_id']) || (int)$data['ownership_body_id'] <= 0) {
                    $errors['ownership_body_id'][] = 'A valid government land ownership body is required.';
                }
            }
        }

        // Development Project ID validation (Optional for all states)
        if (isset($data['development_project_id']) && $data['development_project_id'] !== '' && $data['development_project_id'] !== null) {
            if (!is_numeric($data['development_project_id']) || (int)$data['development_project_id'] <= 0) {
                $errors['development_project_id'][] = 'Invalid development project selected.';
            }
        }

        // House Count validation
        if (!$isDraft) {
            if (!isset($data['total_planned_houses']) || $data['total_planned_houses'] === '') {
                $errors['total_planned_houses'][] = 'Total planned houses is required.';
            } elseif (!is_numeric($data['total_planned_houses']) || (int)$data['total_planned_houses'] < 0) {
                $errors['total_planned_houses'][] = 'Total planned houses must be a non-negative integer.';
            }
        } else {
            if (isset($data['total_planned_houses']) && $data['total_planned_houses'] !== '' && $data['total_planned_houses'] !== null) {
                if (!is_numeric($data['total_planned_houses']) || (int)$data['total_planned_houses'] < 0) {
                    $errors['total_planned_houses'][] = 'Total planned houses must be a non-negative integer.';
                }
            }
        }

        // Boundary type validation (Optional for all states)
        $validBoundaries = ['URBAN', 'DS', 'VILLAGE'];
        if (!empty($data['boundary_type']) && trim($data['boundary_type']) !== '') {
            if (!in_array($data['boundary_type'], $validBoundaries)) {
                $errors['boundary_type'][] = 'A valid boundary type is required (URBAN, DS, or VILLAGE).';
            }
        }

        // Infrastructure issues array validation (Optional for all states)
        $validInfra = ['WATER', 'ELECTRICITY', 'ACCESS_ROADS', 'INTERNAL_ROADS', 'OTHER'];
        if (isset($data['infrastructure_issues']) && is_array($data['infrastructure_issues'])) {
            foreach ($data['infrastructure_issues'] as $issue) {
                if (!in_array($issue, $validInfra)) {
                    $errors['infrastructure_issues'][] = 'Invalid infrastructure issue selected: ' . $issue;
                }
            }
        }

        // Dates checks (Optional for all states)
        if (isset($data['program_start_date']) && !empty($data['program_start_date'])) {
            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $data['program_start_date'])) {
                $errors['program_start_date'][] = 'Program start date must match the format YYYY-MM-DD.';
            }
        }

        return $errors;
    }
}
