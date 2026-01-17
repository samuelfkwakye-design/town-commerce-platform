# Architecture
## Town Commerce Platform

_Last updated: 2026-01-17_

---

## 1. Architecture Overview

The platform is a town-based commerce system designed for fast, local fulfilment. Each town is operationally isolated (inventory, drivers, warehouse workflow) while managed under a single platform.

### Key principles
- **Town isolation by design**: all operational data is scoped by `town_id`.
- **Single platform, multi-town scale**: grow from 1 to 100+ towns without redesign.
- **Operational traceability**: auditable order and status event tracking.
- **Payments modularity**: MoMo and COD handled as a separate payments module.
- **MVP simplicity**: role-based web apps first; native mobile later if needed.

---

## 2. High-level Components

### Client Applications
1. **Customer Web App (mobile-first)**
   - Browse town catalogue, cart, checkout, track orders.
2. **Ops Web App (Warehouse + Driver MVP)**
   - Warehouse: pick/pack, stock updates, assign driver.
   - Driver: view jobs, update statuses, confirm delivery/payment.
3. **Admin Web App**
   - Manage towns, users/roles, catalogue, ops oversight, metrics.

### Backend Services
4. **API Service**
   - Auth, towns, catalogue, inventory, orders, dispatch, payments, notifications.
5. **Background Worker**
   - Payment confirmations (webhooks/polling), notification sending, scheduled tasks.
6. **Data Stores**
   - PostgreSQL (system of record)
   - Redis (queues, caching, rate limiting)

---

## 3. Data Model (MVP Minimum)

### Identity & Access
- `users` (admin, warehouse_staff, driver)
- `roles`, `permissions`
- `user_towns` (which towns a user can operate in)

### Town Operations
- `towns`
- `warehouses` (typically 1 per town initially)
- `drivers` (driver metadata linked to user)

### Catalogue & Inventory
- `products` (global product definition)
- `town_products` (town-specific enabling + pricing)
- `inventory` (town_id, warehouse_id, product_id, stock_qty, reserved_qty)

### Orders & Fulfilment
- `orders` (town_id, customer, totals, status)
- `order_items`
- `fulfilments` (picked/packed workflow)
- `dispatches` (driver assignment + delivery lifecycle)
- `order_status_events` (audit trail)

### Payments
- `payments` (method: momo | cod, status, references)
- `refunds` (post-MVP)

---

## 4. Core Workflows

### 4.1 Customer Order Flow
1. Customer selects town
2. Customer browses products available in that town
3. Checkout:
   - delivery address, phone
   - payment method: MoMo or COD
4. Backend creates:
   - Order
   - Order items
   - Payment record
   - Stock reservation (increment `reserved_qty`)

### 4.2 Warehouse Fulfilment Flow
1. Warehouse views order queue for their town
2. Pick and pack items
3. Mark order as `READY_FOR_DISPATCH`

### 4.3 Dispatch & Delivery Flow
1. Dispatcher assigns driver (manual for MVP)
2. Driver updates statuses:
   - `OUT_FOR_DELIVERY`
   - `DELIVERED` or `FAILED`

### 4.4 Payment Confirmation
- **MoMo**: payment confirmed via provider webhook or polling worker
- **COD**: driver confirms cash collected at delivery
- Update payment record and order status accordingly

### 4.5 Stock Finalisation
- On delivery success: decrement stock and release reservation
- On cancel/failure: release reservation back to stock

---

## 5. Town Isolation Enforcement

Town isolation is enforced at:
- **API level**: all read/write endpoints require `town_id` and validate access.
- **User permissions**: staff/drivers only access their assigned towns.
- **Catalogue/inventory**: customers only see `town_products` for their town.

---

## 6. Error Handling & Dispute Support

### Audit trail
All status changes are recorded in `order_status_events` including:
- timestamp
- actor (user/system)
- from_status → to_status
- notes (optional)

### Failure modes
- Payment pending / delayed confirmation (MoMo)
- Driver cannot reach customer
- Partial stock availability (handled pre-checkout via reservations)

---

## 7. Suggested Repo Structure


---

## 8. MVP vs Post-MVP

### MVP
- Role-based web apps
- Manual driver assignment
- MoMo + COD payment records
- Town-isolated catalogue/inventory/orders
- Basic notifications (SMS optional)

### Post-MVP
- Route optimisation
- Native driver app (offline-first)
- Promotions, vouchers, loyalty
- Advanced analytics dashboards
- Cross-town fulfilment
