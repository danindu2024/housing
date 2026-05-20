# API Design Document
## Village & Housing Development Investigation System

---

**Document Version:** 1.0  
**Date:** May 2026  
**Base URL:** `https://your-domain.com/api/v1`  
**Format:** JSON REST API  
**Auth:** Bearer Token (JWT)

---

## 1. Authentication

### POST `/auth/login`
Authenticate a user and receive a JWT token.

**Request Body:**
```json
{ "email": "officer@ds.gov.lk", "password": "secret" }
```

**Response 200:**
```json
{
  "token": "eyJhbGci...",
  "user": {
    "id": 1,
    "full_name": "Saman Perera",
    "role": "INVESTIGATOR",
    "division_id": 3
  }
}
```

**Response 401:**
```json
{ "error": "Invalid credentials" }
```

---

### POST `/auth/logout`
Invalidate the current token.

**Headers:** `Authorization: Bearer <token>`  
**Response 200:** `{ "message": "Logged out successfully" }`

---

## 2. Reference Data Endpoints

These return seed/lookup data needed to populate dropdowns.

### GET `/reference/districts`
Returns all districts with their divisions.

**Response 200:**
```json
[
  {
    "id": 1,
    "name": "Kandy",
    "province": "Central Province",
    "divisions": [
      { "id": 1, "name": "Kundasale" },
      { "id": 2, "name": "Gangawata Korale" }
    ]
  }
]
```

---

### GET `/reference/village-categories`
Returns `[{ "id": 1, "code": "LOAN", "name": "Loan Village" }, ...]`

### GET `/reference/land-ownership-bodies`
Returns `[{ "id": 1, "code": "DS_DIVISION", "name": "DS Division" }, ...]`

### GET `/reference/construction-stages`
Returns stages ordered by `stage_order`:
```json
[
  { "id": 1, "stage_order": 1, "code": "NO_FOUNDATION", "label": "No Foundation" },
  { "id": 8, "stage_order": 8, "code": "FULLY_DEVELOPED", "label": "House Fully Developed" }
]
```

---

## 3. Village Endpoints

### GET `/villages`
List all villages with filters.

**Query Parameters:**

| Param | Type | Description |
|---|---|---|
| category | string | `LOAN` or `GRANT` |
| status | string | `COMPLETED`, `INCOMPLETE`, `IN_PROGRESS`, `ABANDONED` |
| division_id | int | Filter by division |
| is_conservation_area | bool | |
| has_infrastructure_issues | bool | |
| page | int | Pagination (default 1) |
| per_page | int | Default 20 |

**Response 200:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Mahaweli 5B Uda Gammana",
      "category": { "id": 1, "code": "LOAN", "name": "Loan Village" },
      "ownership_body": { "id": 2, "code": "MAHAWELI", "name": "Mahaweli Authority" },
      "division": { "id": 3, "name": "Polonnaruwa", "district": "Polonnaruwa" },
      "status": "COMPLETED",
      "total_planned_houses": 50,
      "total_houses_recorded": 48,
      "is_conservation_area": false,
      "has_infrastructure_issues": true,
      "program_start_date": "2015-01-01",
      "program_end_date": "2019-12-31"
    }
  ],
  "meta": { "total": 120, "page": 1, "per_page": 20, "last_page": 6 }
}
```

---

### POST `/villages`
Create a new village record.

**Request Body:**
```json
{
  "division_id": 3,
  "category_id": 1,
  "ownership_body_id": 2,
  "name": "Mahaweli 5B Uda Gammana",
  "grama_niladhari_division": "Hingurakgoda",
  "gps_lat": 8.0362,
  "gps_lng": 80.9784,
  "total_planned_houses": 50,
  "status": "COMPLETED",
  "is_conservation_area": false,
  "has_infrastructure_issues": true,
  "program_start_date": "2015-01-01",
  "program_end_date": "2019-12-31",
  "notes": "Road access incomplete"
}
```

**Response 201:** Full village object

---

### GET `/villages/{id}`
Get full detail for a single village, including house summary counts.

**Response 200:**
```json
{
  "id": 1,
  "name": "...",
  "summary": {
    "total_houses": 48,
    "fully_developed": 30,
    "under_construction": 12,
    "not_started": 6,
    "land_sold_count": 3,
    "house_sold_count": 5,
    "open_issues": 7
  }
}
```

---

### PUT `/villages/{id}`
Update village data. Same body as POST.

### DELETE `/villages/{id}`
Soft-delete a village (admin only).

---

## 4. House Endpoints

### GET `/villages/{village_id}/houses`
List all houses in a village.

**Query Parameters:** `stage_code`, `occupancy_status`, `is_house_sold`, `is_land_sold`

**Response 200:**
```json
{
  "data": [
    {
      "id": 5,
      "house_number": "H-005",
      "owner_name": "Nimal Perera",
      "owner_nic": "198801234567",
      "household_members": 4,
      "construction_stage": {
        "id": 8, "code": "FULLY_DEVELOPED", "label": "House Fully Developed"
      },
      "occupancy_status": "BORROWER_LIVING",
      "is_land_sold": false,
      "is_house_sold": false,
      "has_loan": true
    }
  ]
}
```

---

### POST `/villages/{village_id}/houses`
Add a house to a village.

**Request Body:**
```json
{
  "house_number": "H-005",
  "owner_name": "Nimal Perera",
  "owner_nic": "198801234567",
  "owner_contact": "0771234567",
  "household_members": 4,
  "land_area_perches": 12.5,
  "construction_stage_id": 8,
  "is_land_sold": false,
  "is_house_sold": false,
  "occupancy_status": "BORROWER_LIVING",
  "has_infrastructure_issues": false,
  "notes": ""
}
```

**Response 201:** Full house object

---

### GET `/houses/{id}`
Full detail for one house including loan summary and issues.

### PUT `/houses/{id}`
Update house data.

---

## 5. Loan Endpoints

### GET `/houses/{house_id}/loan`
Get the loan for a house (loan village only).

**Response 200:**
```json
{
  "id": 10,
  "house_id": 5,
  "loan_amount": 500000.00,
  "approved_by_name": "K.D. Gunawardena",
  "approved_by_designation": "Project Officer",
  "approved_by_institution": "Mahaweli Authority",
  "approval_date": "2016-03-15",
  "repayment_start_date": "2016-09-01",
  "monthly_installment": 4167.00,
  "repayment_months": 120,
  "repayment_status": "PARTIALLY_PAID",
  "total_paid_so_far": 125000.00,
  "balance_remaining": 375000.00,
  "payments_count": 30,
  "default_reason": null
}
```

---

### POST `/houses/{house_id}/loan`
Create a loan for a house.

**Request Body:**
```json
{
  "loan_amount": 500000.00,
  "approved_by_name": "K.D. Gunawardena",
  "approved_by_designation": "Project Officer",
  "approved_by_institution": "Mahaweli Authority",
  "approval_date": "2016-03-15",
  "repayment_start_date": "2016-09-01",
  "monthly_installment": 4167.00,
  "repayment_months": 120
}
```

---

### PUT `/loans/{id}`
Update loan status or details.

---

### GET `/loans/{loan_id}/payments`
List all payments for a loan.

### POST `/loans/{loan_id}/payments`
Record a new payment.

**Request Body:**
```json
{
  "payment_date": "2024-05-01",
  "amount_paid": 4167.00,
  "payment_method": "BANK",
  "receipt_number": "BNK-2024-00512"
}
```

---

### POST `/loans/{loan_id}/default-reason`
Record reason for non-payment.

**Request Body:**
```json
{
  "reason_code": "HOUSE_SOLD",
  "reason_detail": "Original borrower sold the house in 2021 without bank consent. New occupant refuses to pay."
}
```

---

## 6. Issue Report Endpoints

### GET `/issues`
List all issue reports with filters.

**Query Parameters:** `village_id`, `house_id`, `issue_type`, `severity`, `status`

### POST `/issues`
Create a new issue report.

**Request Body:**
```json
{
  "village_id": null,
  "house_id": 5,
  "issue_type": "LOAN_DEFAULT",
  "description": "Borrower has not made any payment since 2022.",
  "severity": "HIGH",
  "reported_date": "2026-05-10"
}
```

### PUT `/issues/{id}`
Update issue status or resolution.

```json
{
  "status": "RESOLVED",
  "resolved_date": "2026-05-18",
  "resolution_notes": "Payment plan arranged with DS Division."
}
```

---

## 7. Dashboard Endpoints

All dashboard endpoints require `INVESTIGATOR` or `ADMIN` role.

### GET `/dashboard/summary`
Top-level KPI summary.

**Response 200:**
```json
{
  "villages": {
    "total": 120,
    "loan": 75,
    "grant": 45,
    "completed": 80,
    "incomplete": 25,
    "in_progress": 15
  },
  "houses": {
    "total": 4200,
    "fully_developed": 2800,
    "under_construction": 1100,
    "not_started": 300
  },
  "loans": {
    "total": 1861,
    "fully_paid": 420,
    "currently_paying": 710,
    "partially_paid": 390,
    "not_paid": 341
  },
  "occupancy": {
    "borrower_living": 1900,
    "sold": 450,
    "abandoned": 200,
    "not_yet_complete": 1650
  },
  "land_issues": {
    "conservation_area_villages": 12,
    "infrastructure_issue_villages": 34,
    "land_sold_houses": 280,
    "house_sold_houses": 450
  },
  "open_issues": 312
}
```

---

### GET `/dashboard/construction-progress`
House count by construction stage for a bar/funnel chart.

**Response 200:**
```json
[
  { "stage": "No Foundation", "count": 150 },
  { "stage": "Foundation Done", "count": 200 },
  { "stage": "Lintel Done", "count": 180 },
  { "stage": "Windows Done", "count": 210 },
  { "stage": "Reached Roof Level", "count": 260 },
  { "stage": "Roof Done", "count": 400 },
  { "stage": "Plastering Done", "count": 600 },
  { "stage": "House Fully Developed", "count": 2200 }
]
```

---

### GET `/dashboard/loan-approvers`
Loan approver leaderboard for corruption analysis.

**Response 200:**
```json
[
  {
    "approved_by_name": "K.D. Gunawardena",
    "approved_by_institution": "Mahaweli Authority",
    "total_loans": 148,
    "total_value": 74000000,
    "defaulted": 62,
    "default_rate": 41.9
  }
]
```

---

### GET `/dashboard/common-problems`
Problem frequency table with suggested solutions.

**Response 200:**
```json
[
  {
    "issue_type": "LOAN_DEFAULT",
    "count": 341,
    "suggested_solution": "Arrange repayment restructuring via DS Division. Investigate approving officer."
  },
  {
    "issue_type": "HOUSE_ABANDONED",
    "count": 200,
    "suggested_solution": "Verify ownership status. Notify housing authority for re-allocation."
  }
]
```

---

### GET `/dashboard/ownership-body-issues`
Issue breakdown by land ownership body.

**Response 200:**
```json
[
  {
    "ownership_body": "Mahaweli Authority",
    "total_villages": 42,
    "conservation_violations": 8,
    "infrastructure_issues": 15,
    "open_issues": 78
  }
]
```

---

## 8. Error Response Format

All errors follow this structure:

```json
{
  "error": "Validation failed",
  "details": {
    "owner_nic": ["The NIC field is required.", "NIC already exists."],
    "loan_amount": ["Must be a positive number."]
  }
}
```

**HTTP Status Codes:**

| Code | Meaning |
|---|---|
| 200 | OK |
| 201 | Created |
| 400 | Bad Request / Validation Error |
| 401 | Unauthorized |
| 403 | Forbidden (insufficient role) |
| 404 | Not Found |
| 500 | Internal Server Error |
