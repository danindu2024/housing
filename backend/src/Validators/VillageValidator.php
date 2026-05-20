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

        // Development Project validation (Optional)
        $validProjects = [
            '40th Anniversary',
            '41st Anniversary',
            'Grama Shakthi',
            'Grant Model Village',
            'Loan Model Village',
            'Adarsha Gammana',
            'North Province',
            'Welioya Programme'
        ];
        if (!empty($data['development_project']) && trim($data['development_project']) !== '') {
            if (!in_array(trim($data['development_project']), $validProjects)) {
                $errors['development_project'][] = 'Invalid development project selected.';
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
        $validStatuses = ['IN_PROGRESS', 'COMPLETED', 'INCOMPLETE', 'ABANDONED'];
        if (!empty($data['status']) && trim($data['status']) !== '') {
            if (!in_array($data['status'], $validStatuses)) {
                $errors['status'][] = 'A valid status is required (' . implode(', ', $validStatuses) . ').';
            }
        }

        // GPS checks (Optional)
        if (isset($data['gps_lat']) && !empty($data['gps_lat']) && !is_numeric($data['gps_lat'])) {
            $errors['gps_lat'][] = 'GPS Latitude must be a numeric decimal value.';
        }
        if (isset($data['gps_lng']) && !empty($data['gps_lng']) && !is_numeric($data['gps_lng'])) {
            $errors['gps_lng'][] = 'GPS Longitude must be a numeric decimal value.';
        }

        // Dates checks (Optional)
        if (isset($data['program_start_date']) && !empty($data['program_start_date'])) {
            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $data['program_start_date'])) {
                $errors['program_start_date'][] = 'Program start date must match the format YYYY-MM-DD.';
            }
        }
        if (isset($data['program_end_date']) && !empty($data['program_end_date'])) {
            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $data['program_end_date'])) {
                $errors['program_end_date'][] = 'Program end date must match the format YYYY-MM-DD.';
            }
        }

        return $errors;
    }
}
