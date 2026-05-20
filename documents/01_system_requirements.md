# System Requirements Document
## Village & Housing Development Investigation System
### 2015–2019 Model Village Development Programme

---

**Document Version:** 1.0  
**Date:** May 2026  
**Project Type:** Government Investigation & Data Collection System  
**Technology Stack:** PHP (Backend), React (Frontend), MySQL (Database)

---

## 1. Project Overview

The Sri Lankan government launched the 2015–2019 Model Village Development Programme, which provided housing support to citizens through two mechanisms: **loans** and **grants**. This system is designed to investigate what actually happened on the ground — tracking village status, house construction progress, land ownership, loan repayment, and identifying systemic problems.

---

## 2. Stakeholders

| Stakeholder | Role |
|---|---|
| Government Investigators | Primary data consumers; view dashboard and reports |
| Field Data Collectors | Enter village and house-level data on-site |
| System Administrators | Manage users, categories, and reference data |
| DS Division Officers | Land ownership authority |
| Mahaweli Authority Officers | Land ownership authority |
| LRC (Land Reform Commission) | Land ownership authority |
| Housing Authority Officers | Land ownership authority |
| Department of Wildlife Conservation | Land ownership / conservation area authority |

---

## 3. Functional Requirements

### 3.1 Village Management

- **FR-V01:** The system shall support two village types: **Loan Villages** and **Grant Villages**.
- **FR-V02:** The system shall record overall village status: Completed, Incomplete, or In Progress.
- **FR-V03:** The system shall allow marking individual villages as having land issues (wild conservation area, inadequate infrastructure).
- **FR-V04:** The system shall support linking a village to a government land ownership body (DS Division, Mahaweli Authority, LRC, Housing Authority, Wildlife).
- **FR-V05:** The system shall record the geographic division, district, and GPS location of each village.

### 3.2 House Management

- **FR-H01:** The system shall record each house within a village, including owner identity (NIC, name, contact).
- **FR-H02:** The system shall track construction progress through defined stages:
  1. No Foundation
  2. Foundation Done
  3. Lintel Done
  4. Windows Done
  5. Reached Roof Level
  6. Roof Done
  7. Plastering Done
  8. Fully Developed (Complete)
- **FR-H03:** Within completed villages, the system shall flag houses that remain unfinished.
- **FR-H04:** The system shall track the **occupancy/ownership status** of fully constructed houses:
  - Loan Borrower Living in House
  - House Sold
  - No One in the House (Abandoned)
- **FR-H05:** The system shall record whether a house or its land has been sold.

### 3.3 Loan Tracking

- **FR-L01:** The system shall only apply loan tracking to houses in **Loan Villages**.
- **FR-L02:** For each loan, the system shall record:
  - Loan amount
  - Approved by (officer name, designation, institution)
  - Approval date
  - Repayment schedule (monthly installment, duration)
- **FR-L03:** The system shall track each loan payment made (date, amount, method).
- **FR-L04:** The system shall classify loan repayment status:
  - Not Paid (no payment made)
  - Partially Paid (paying but behind schedule)
  - Currently Paying (on schedule)
  - Fully Paid
- **FR-L05:** If a loan is not paid or partially paid, the system shall record the stated reason:
  - Financial hardship
  - House sold — new owner not paying
  - Borrower deceased
  - Disputes with authority
  - No awareness of payment obligation
  - Other (free text)
- **FR-L06:** The system shall record the loan approving officer to support corruption investigation queries.

### 3.4 Land Issue Tracking

- **FR-LN01:** The system shall flag whether a land parcel is located in a **Wildlife Conservation Area**.
- **FR-LN02:** The system shall flag whether a land parcel has **inadequate infrastructure** (road access, water, electricity).
- **FR-LN03:** The system shall track land **ownership body** from the following government authorities:
  - DS Division
  - Mahaweli Authority
  - LRC (Land Reform Commission)
  - Housing Authority
  - Wildlife Conservation Department
- **FR-LN04:** The system shall flag whether the land has been **sold** by the original beneficiary.

### 3.5 Problem Tracking & Solutions

- **FR-P01:** The system shall allow recording of issues per house or per village (issue type, description, severity).
- **FR-P02:** Common issue categories shall include: Loan default, Construction stalled, Land sold, No occupant, Conservation land violation, Infrastructure problem, Ownership dispute.
- **FR-P03:** The system shall generate a summary of common problems across all villages and suggest standard solution templates.

### 3.6 Dashboard & Reporting

- **FR-D01:** Dashboard shall display total villages by type (Loan/Grant), and by status (Complete/Incomplete).
- **FR-D02:** Dashboard shall display total houses, grouped by construction stage.
- **FR-D03:** Dashboard shall display loan repayment statistics: total loans, paid, partially paid, defaulted.
- **FR-D04:** Dashboard shall display occupancy breakdown for completed houses.
- **FR-D05:** Dashboard shall show a count of land issues by type.
- **FR-D06:** Dashboard shall list most common problems with frequency counts.
- **FR-D07:** Investigators shall be able to drill down from village → house → loan/progress/issues.

---

## 4. Non-Functional Requirements

| ID | Requirement |
|---|---|
| NFR-01 | The system must be accessible via web browser (desktop-first). |
| NFR-02 | PHP backend must expose a RESTful JSON API consumed by the React frontend. |
| NFR-03 | All data entry forms must validate input client-side (React) and server-side (PHP). |
| NFR-04 | The system must support role-based access: Admin, Investigator, Field Collector. |
| NFR-05 | The database must use MySQL with foreign key constraints enforced. |
| NFR-06 | API responses must return within 2 seconds for dashboard queries. |
| NFR-07 | The system must be deployable on a standard LAMP stack. |

---

## 5. Assumptions & Constraints

- One beneficiary per house (one loan per house in loan villages).
- A village is classified as Loan or Grant at creation and cannot be changed.
- Land ownership body is recorded per village (not per individual house).
- Construction progress stages are sequential; the system records the **current highest stage reached**.
- Loan approver data is entered manually by investigators based on physical records.
- The system is not integrated with any existing government database at this stage.
