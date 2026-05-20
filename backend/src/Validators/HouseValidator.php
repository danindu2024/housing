<?php
namespace App\Validators;

class HouseValidator {

    public static function validate(array $data): array {
        $errors = [];

        // House Number
        if (empty($data['house_number']) || trim($data['house_number']) === '') {
            $errors['house_number'][] = 'The house number field is required.';
        } elseif (strlen($data['house_number']) > 50) {
            $errors['house_number'][] = 'The house number cannot exceed 50 characters.';
        }

        // Owner Name
        if (empty($data['owner_name']) || trim($data['owner_name']) === '') {
            $errors['owner_name'][] = 'The owner name field is required.';
        } elseif (strlen($data['owner_name']) < 3 || strlen($data['owner_name']) > 200) {
            $errors['owner_name'][] = 'The owner name must be between 3 and 200 characters.';
        }

        // Sri Lankan NIC Format Validation (9 digits + V/X, or 12 digits)
        if (empty($data['owner_nic']) || trim($data['owner_nic']) === '') {
            $errors['owner_nic'][] = 'The National Identity Card (NIC) number is required.';
        } else {
            $nic = trim($data['owner_nic']);
            if (!preg_match('/^(?:\d{9}[vVxX]|\d{12})$/', $nic)) {
                $errors['owner_nic'][] = 'Invalid Sri Lankan NIC format (e.g. 198801234567 or 881234567V).';
            }
        }

        // Household Members Count
        if (isset($data['household_members']) && !empty($data['household_members'])) {
            if (!is_numeric($data['household_members']) || (int)$data['household_members'] < 0) {
                $errors['household_members'][] = 'Household members must be a positive integer.';
            }
        }

        // Land Area Perches
        if (isset($data['land_area_perches']) && !empty($data['land_area_perches'])) {
            if (!is_numeric($data['land_area_perches']) || (float)$data['land_area_perches'] < 0) {
                $errors['land_area_perches'][] = 'Land area (perches) must be a positive decimal value.';
            }
        }

        // Construction Stage
        if (!isset($data['construction_stage_id']) || !is_numeric($data['construction_stage_id']) || (int)$data['construction_stage_id'] <= 0) {
            $errors['construction_stage_id'][] = 'A valid construction progress stage is required.';
        }

        // Occupancy Status Enum Checks
        $validOccupancy = ['BORROWER_LIVING', 'SOLD', 'ABANDONED', 'NOT_APPLICABLE'];
        if (empty($data['occupancy_status']) || !in_array($data['occupancy_status'], $validOccupancy)) {
            $errors['occupancy_status'][] = 'Occupancy status must be one of: ' . implode(', ', $validOccupancy);
        }

        return $errors;
    }
}
