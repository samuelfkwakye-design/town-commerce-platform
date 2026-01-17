# Database Schema (MVP)
## Town Commerce Platform (PostgreSQL)

_Last updated: 2026-01-17_

---

## 1. Goals

This schema supports the MVP platform requirements:
- Town-based operations with strict town isolation
- 1 warehouse per town (MVP)
- Customer accounts + optional guest checkout (email + phone required)
- Town-specific catalogue and inventory
- Orders, fulfilment workflow, dispatch/driver workflow
- Payments: MoMo + Cash on Delivery
- Audit trail of order status changes

---

## 2. Key Design Rules

### 2.1 Town isolation
All operational tables include `town_id` and queries must scope by `town_id`.

### 2.2 IDs and timestamps
- Use UUID primary keys
- Use `created_at`, `updated_at` on mutable tables

### 2.3 Money
Store money as integer minor units where possible (e.g., pesewas) or numeric with strict rounding rules.
For simplicity in MVP docs, we use `numeric(12,2)`.

---

## 3. Core Tables

## 3.1 towns
Stores towns that customers can select.

**Columns**
- id (uuid, PK)
- name (text, unique)
- region (text, nullable)
- is_active (boolean)
- created_at, updated_at

**Indexes/Constraints**
- unique(name)

---

## 3.2 warehouses (MVP: 1 per town)
**Columns**
- id (uuid, PK)
- town_id (uuid, FK -> towns.id)
- name (text)
- address (text, nullable)
- is_active (boolean)
- created_at, updated_at

**Constraints**
- unique(town_id)  ← enforces 1 warehouse per town in MVP

---

## 3.3 users (staff + drivers + admins)
Platform staff accounts (not customers).

**Columns**
- id (uuid, PK)
- email (text, nullable, unique)
- phone (text, nullable, unique)
- password_hash (text)
- full_name (text)
- role (text)  ← ADMIN | WAREHOUSE | DRIVER
- is_active (boolean)
- created_at, updated_at

**Notes**
- Role is stored directly for MVP simplicity (can normalise later).

---

## 3.4 user_towns (access control)
Which towns a staff/driver can operate in.

**Columns**
- user_id (uuid, FK -> users.id)
- town_id (uuid, FK -> towns.id)

**Constraints**
- PK(user_id, town_id)

---

## 3.5 customers (customer accounts)
Customer login accounts.

**Columns**
- id (uuid, PK)
- full_name (text)
- email (text, unique)
- phone (text, unique)
- password_hash (text)
- is_active (boolean)
- created_at, updated_at

---

## 3.6 products (master catalogue)
Global product definitions.

**Columns**
- id (uuid, PK)
- name (text)
- category (text, nullable)
- image_url (text, nullable)
- is_active (boolean)
- created_at, updated_at

**Indexes**
- (name)
- (category)

---

## 3.7 town_products (town-specific availability/pricing)
Controls what is offered in each town.

**Columns**
- town_id (uuid, FK -> towns.id)
- product_id (uuid, FK -> products.id)
- price (numeric(12,2))
- currency (text) default 'GHS'
- is_enabled (boolean)
- created_at, updated_at

**Constraints**
- PK(town_id, product_id)

---

## 3.8 inventory (per town, per warehouse, per product)
Tracks stock and reservations.

**Columns**
- town_id (uuid, FK -> towns.id)
- warehouse_id (uuid, FK -> warehouses.id)
- product_id (uuid, FK -> products.id)
- stock_qty (integer) default 0
- reserved_qty (integer) default 0
- updated_at

**Derived**
- available_qty = stock_qty - reserved_qty (computed in query)

**Constraints**
- PK(town_id, warehouse_id, product_id)
- CHECK(stock_qty >= 0)
- CHECK(reserved_qty >= 0)
- CHECK(stock_qty >= reserved_qty)

---

## 4. Orders & Fulfilment

## 4.1 orders
Core order record.

**Columns**
- id (uuid, PK)
- town_id (uuid, FK -> towns.id)
- warehouse_id (uuid, FK -> warehouses.id)
- customer_id (uuid, FK -> customers.id, nullable)  ← null for guest orders
- guest_email (text, nullable)
- guest_phone (text, nullable)
- delivery_address (text)
- status (text)  ← OrderStatus enum
- payment_method (text)  ← MOMO | COD
- subtotal (numeric(12,2))
- delivery_fee (numeric(12,2))
- total (numeric(12,2))
- currency (text) default 'GHS'
- notes (text, nullable)
- created_at, updated_at

**Guest checkout rule**
- If customer_id IS NULL, then guest_email and guest_phone MUST be present.
(Enforce via application logic in MVP; can add DB CHECK later.)

**Indexes**
- (town_id, status, created_at)
- (customer_id, created_at)

---

## 4.2 order_items
**Columns**
- id (uuid, PK)
- order_id (uuid, FK -> orders.id)
- product_id (uuid, FK -> products.id)
- qty (integer)
- unit_price (numeric(12,2))
- line_total (numeric(12,2))

**Constraints**
- CHECK(qty >= 1)

**Indexes**
- (order_id)

---

## 4.3 order_status_events (audit trail)
Every meaningful change is logged.

**Columns**
- id (uuid, PK)
- order_id (uuid, FK -> orders.id)
- town_id (uuid)  ← denormalised for fast town queries
- actor_type (text) ← SYSTEM | CUSTOMER | USER
- actor_id (uuid, nullable) ← customer_id or user_id, nullable for SYSTEM
- from_status (text, nullable)
- to_status (text)
- note (text, nullable)
- created_at

**Indexes**
- (town_id, created_at)
- (order_id, created_at)

---

## 5. Dispatch & Drivers

## 5.1 dispatches
Driver assignment + delivery lifecycle.

**Columns**
- id (uuid, PK)
- town_id (uuid, FK -> towns.id)
- order_id (uuid, FK -> orders.id)
- driver_user_id (uuid, FK -> users.id)
- status (text) ← DispatchStatus enum
- assigned_at (timestamptz)
- updated_at (timestamptz)
- failure_reason (text, nullable)

**Constraints**
- unique(order_id)  ← 1 dispatch per order in MVP

**Indexes**
- (town_id, status)
- (driver_user_id, status)

---

## 6. Payments

## 6.1 payments
One payment record per order (MVP).

**Columns**
- id (uuid, PK)
- town_id (uuid, FK -> towns.id)
- order_id (uuid, FK -> orders.id)
- method (text) ← MOMO | COD
- status (text) ← PaymentStatus enum
- amount (numeric(12,2))
- currency (text) default 'GHS'
- provider (text, nullable) ← e.g. "MTN_MOMO"
- provider_reference (text, nullable, unique)
- paid_at (timestamptz, nullable)
- created_at, updated_at

**Constraints**
- unique(order_id)  ← 1 payment per order in MVP

**Indexes**
- (town_id, status, created_at)

---

## 7. Suggested Postgres DDL (optional MVP)

This section is optional; a developer can translate the above into SQL migrations.
Key constraints to implement early:
- unique(warehouses.town_id)
- PKs and FKs as defined
- inventory checks: stock/reserved
- unique(dispatches.order_id)
- unique(payments.order_id)

---

## 8. MVP Query Patterns

### 8.1 Customer product listing
- Filter by town_id
- Join town_products + products
- Join inventory to compute available_qty

### 8.2 Create order (reservation)
- Validate available_qty >= requested qty for each product
- Insert order + items
- Increment reserved_qty in inventory per item
- Insert payment record

### 8.3 Fulfilment & dispatch
- Update order statuses and append order_status_events
- Create dispatch when driver assigned
- Driver updates dispatch.status and order.status

### 8.4 Payment updates
- MoMo webhook updates payments.status
- COD confirm updates payments.status
- If paid: update order.status (PENDING_PAYMENT -> PENDING_FULFILMENT)