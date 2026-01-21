# Purchase Order Creation – Product Requirements Document (PRD)

**Document Version:** 1.2  
**Status:** Draft  
**Audience:** Product, Engineering, QA, AI Coding Agents  

> **Authoritative Instruction (MANDATORY):**  
> This document is the single source of truth.  
> Implementers (human or AI) **MUST NOT** assume, infer, extend, optimize, or creatively interpret  
> any requirement not explicitly stated in this document.

---

## 1. Objective

Provide a deterministic, auditable, and manually-driven Purchase Order (PO) creation process, covering header input, line item entry, review, and submission.

---

## 2. In Scope

- Manual Purchase Order creation
- Single supplier per Purchase Order
- Multiple line items per Purchase Order
- Draft and Submitted statuses only

---

## 3. Out of Scope

- Automated PO creation
- Approval workflow logic
- Receiving, invoicing, or payment
- Inventory reservation
- Tax calculation
- Attachments

---

## 4. Actors

| Actor | Description |
|------|------------|
| Procurement User | Authorized user who creates Purchase Orders |

---

## 5. End-to-End Process Flow

1. User opens **Purchase Order List**
2. User clicks **Create Purchase Order**
3. System displays **PO Header Entry Screen**
4. User completes mandatory header fields
5. User enters one or more PO line items
6. System calculates totals
7. User saves as Draft or submits PO
8. System persists data and displays confirmation

---

## 6. Screen Flow Diagram

```
Purchase Order List
   ↓
Create Purchase Order
   ↓
PO Header Entry
   ↓
PO Line Items
   ↓
PO Review & Submit
   ↓
PO Confirmation / Detail View
```

---

## 7. Screen Definitions & Functional Requirements

### 7.1 Purchase Order List

**Purpose:** Entry point for PO creation.

**Functional Requirements**
- **FR-001**: System shall display a list of existing Purchase Orders.
- **FR-002**: System shall provide a “Create Purchase Order” action.

---

### 7.2 PO Header Entry Screen

**Purpose:** Capture top-level Purchase Order information.

#### Fields

| Field Name | Data Type | Input Type | Mandatory |
|----------|-----------|------------|-----------|
| PO Number | String | Read-only text | Yes |
| Supplier | Reference | Dropdown (single select) | Yes |
| PO Date | Date | Date picker | Yes |
| Expected Delivery Date | Date | Date picker | No |
| Currency | Reference | Dropdown (single select) | Yes |
| Notes | Text | Multiline text | No |

**Functional Requirements**
- **FR-003**: System shall allow selection of exactly one supplier.
- **FR-004**: System shall block progression if mandatory fields are missing.
- **FR-005**: System shall only auto-generate PO Number.

---

### 7.3 PO Line Items Screen

**Purpose:** Capture items being ordered.

#### Line Item Fields

| Field Name | Data Type | Input Type | Mandatory |
|----------|-----------|------------|-----------|
| Item Description | Text | Text input | Yes |
| Quantity | Decimal | Numeric input | Yes |
| Unit of Measure | Reference | Dropdown | Yes |
| Unit Price | Decimal | Numeric input | Yes |
| Line Total | Decimal | Read-only | Yes |

**Functional Requirements**
- **FR-006**: System shall allow multiple line items.
- **FR-007**: System shall calculate Line Total = Quantity × Unit Price.
- **FR-008**: System shall prevent submission without at least one line item.
- **FR-009**: System shall allow deletion of line items before submission.

---

### 7.4 PO Review & Submit Screen

**Purpose:** Final verification before persistence.

#### Display Elements

| Element | Behavior |
|-------|----------|
| Header Summary | Read-only |
| Line Items Table | Read-only |
| Subtotal | Calculated |
| Tax | Not applicable |
| Grand Total | Equals Subtotal |

**Actions**
- Save as Draft
- Submit PO

**Functional Requirements**
- **FR-010**: Subtotal shall equal sum of Line Totals.
- **FR-011**: System shall not calculate tax.
- **FR-012**: Draft save assigns status = Draft.
- **FR-013**: Submit assigns status = Submitted.
- **FR-014**: Submitted POs shall be immutable.

---

### 7.5 PO Confirmation / Detail Screen

**Purpose:** Display persisted Purchase Order.

**Functional Requirements**
- **FR-015**: System shall display PO Number, status, and totals.
- **FR-016**: System shall display all data in read-only mode.

---

## 8. Entity Definitions

### 8.1 PurchaseOrder

| Field | Type |
|-----|-----|
| id | UUID |
| po_number | String |
| supplier_id | UUID |
| po_date | Date |
| expected_delivery_date | Date |
| currency_code | String |
| status | Enum (Draft, Submitted) |
| notes | Text |
| subtotal | Decimal |
| total | Decimal |
| created_at | Timestamp |

---

### 8.2 PurchaseOrderLineItem

| Field | Type |
|-----|-----|
| id | UUID |
| purchase_order_id | UUID |
| description | Text |
| quantity | Decimal |
| uom | String |
| unit_price | Decimal |
| line_total | Decimal |

---

### 8.3 Supplier (Reference Entity)

| Field | Type |
|-----|-----|
| id | UUID |
| name | String |

---

## 9. Validation Rules

- **VR-001**: Quantity must be greater than zero.
- **VR-002**: Unit Price must be zero or greater.
- **VR-003**: At least one line item is required to submit.
- **VR-004**: Submitted POs cannot be edited.

---

## 10. Test Cases (Functional)

### 10.1 Header Validation

| TC ID | Related FR | Scenario | Expected Result |
|-----|------------|----------|----------------|
| TC-001 | FR-003 | Attempt save without supplier | Inline validation error shown |
| TC-002 | FR-004 | Attempt proceed without PO Date | Progression blocked |
| TC-003 | FR-005 | Save PO for first time | PO Number generated |

---

### 10.2 Line Item Validation

| TC ID | Related FR | Scenario | Expected Result |
|-----|------------|----------|----------------|
| TC-004 | FR-006 | Add multiple line items | All items persisted |
| TC-005 | FR-007 | Enter quantity and unit price | Line total calculated |
| TC-006 | FR-008 | Submit with zero line items | Submission blocked |
| TC-007 | FR-009 | Delete line item | Item removed |

---

### 10.3 Status & Submission

| TC ID | Related FR | Scenario | Expected Result |
|-----|------------|----------|----------------|
| TC-008 | FR-012 | Save as Draft | Status = Draft |
| TC-009 | FR-013 | Submit PO | Status = Submitted |
| TC-010 | FR-014 | Edit submitted PO | Edit blocked |

---

## 11. Explicit Non-Assumptions

- No approval workflow
- No tax logic
- No background automation
- No inferred defaults
- No hidden system behavior

---

## 12. UI & Validation Standards (ADDED)

- Validation errors MUST be displayed as inline text directly below the offending field.
- Validation text color MUST be red.
- No modal dialogs, toast notifications, or page redirects may be used for validation errors.
- Submission actions MUST remain disabled until all mandatory fields are valid.

---

## 13. Initial State Definition (ADDED)

When the user clicks **Create Purchase Order**:

- All input fields MUST initialize as empty or null.
- PO Date MUST NOT default to the current date.
- Currency MUST NOT default to any value.
- PO Number MUST NOT be generated until first save.

---

## 14. Data Type & Precision Standards (ADDED)

| Field | Data Type |
|------|----------|
| Quantity | Decimal (18,4) |
| Unit Price | Decimal (18,4) |
| Line Total | Decimal (18,4) |
| Subtotal | Decimal (18,4) |
| Total | Decimal (18,4) |

---

## 15. State Transition Matrix (ADDED)

| Current Status | Action | Resulting Status | Permitted Actor |
|---------------|--------|------------------|-----------------|
| New | Save as Draft | Draft | Procurement User |
| Draft | Save as Draft | Draft | Procurement User |
| Draft | Submit | Submitted | Procurement User |
| Submitted | Edit | BLOCKED | N/A |

---

## 16. Negative Constraints – Forbidden Implementations (ADDED)

| Component | Forbidden Behavior |
|---------|-------------------|
| Buttons | Do not add buttons not listed in Actions |
| Modals | Do not use modals for data entry |
| Defaults | Do not auto-populate fields unless stated |
| Search | Do not implement fuzzy search |

---

## 17. Formatting & Localization Standards (ADDED)

- Date format MUST be ISO-8601 (`YYYY-MM-DD`).
- Currency display MUST prefix amount with the selected currency symbol.
- No locale-based auto-formatting is permitted.

---

## 18. QA Test Cases – Control & Compliance (ADDED)

### 18.1 UI Compliance

| TC ID | Related Section | Scenario | Expected Result |
|-----|----------------|----------|----------------|
| QA-001 | §12 | Trigger validation error | Inline red error text |
| QA-002 | §12 | Submit with missing fields | Submit disabled |

---

### 18.2 Initial State

| TC ID | Related Section | Scenario | Expected Result |
|-----|----------------|----------|----------------|
| QA-003 | §13 | Open Create PO | All fields empty |
| QA-004 | §13 | Open Create PO | PO Date is null |

---

### 18.3 Precision & Calculation

| TC ID | Related Section | Scenario | Expected Result |
|-----|----------------|----------|----------------|
| QA-005 | §14 | Enter 1.3333 × 2.5555 | Accurate decimal result |
| QA-006 | §14 | Sum line totals | No rounding drift |

---

### 18.4 State Enforcement

| TC ID | Related Section | Scenario | Expected Result |
|-----|----------------|----------|----------------|
| QA-007 | §15 | Edit Submitted PO | Operation blocked |
| QA-008 | §15 | Draft → Submit | Status transition valid |

---

**End of Document**
