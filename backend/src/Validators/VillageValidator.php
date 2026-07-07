<?php
namespace App\Validators;

class VillageValidator {

    public static function validate(array $data): array {
        $errors = [];

        // Status enum validation (Optional)
        $validStatuses = ['OPEN', 'CLOSED', 'YES', 'NO'];
        if (isset($data['status']) && trim($data['status']) !== '') {
            if (!in_array($data['status'], $validStatuses)) {
                $errors['status'][] = 'A valid status is required (' . implode(', ', $validStatuses) . ').';
            }
        }

        $isDraft = false;

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

        // Ownership Body ID validation (Optional for all states)
        if (isset($data['ownership_body_id']) && $data['ownership_body_id'] !== '' && $data['ownership_body_id'] !== null) {
            if (!is_numeric($data['ownership_body_id']) || (int)$data['ownership_body_id'] <= 0) {
                $errors['ownership_body_id'][] = 'A valid government land ownership body must be selected if provided.';
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

        // Boundary type validation (Optional)
        $validBoundaries = ['MUNICIPAL', 'URBAN', 'DS', 'VILLAGE'];
        if (isset($data['boundary_type']) && trim($data['boundary_type']) !== '') {
            if (!in_array($data['boundary_type'], $validBoundaries)) {
                $errors['boundary_type'][] = 'A valid boundary type is required (MUNICIPAL, URBAN, DS, or VILLAGE).';
            }
        }

        // Conservation area validation (Optional — defaults to NONE in the controller if omitted)
        $validConservationTypes = ['NONE', 'WILDLIFE', 'FOREST', 'COASTAL', 'ARCHAEOLOGICAL', 'SACRED', 'OTHER'];
        $conservationType = !empty($data['is_conservation_area']) ? $data['is_conservation_area'] : 'NONE';
        if (!in_array($conservationType, $validConservationTypes)) {
            $errors['is_conservation_area'][] = 'Invalid conservation area type selected.';
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

        // Google map link validation (Optional, but must be valid URL if provided)
        if (isset($data['google_map_link']) && trim($data['google_map_link']) !== '') {
            if (!filter_var($data['google_map_link'], FILTER_VALIDATE_URL)) {
                $errors['google_map_link'][] = 'Invalid Google Map link format. It must be a valid URL.';
            }
        }

        return $errors;
    }
}
