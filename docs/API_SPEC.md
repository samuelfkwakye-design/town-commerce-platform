# API Specification (MVP)
## Town Commerce Platform

_Last updated: 2026-01-17_

---

## 1. Overview

Base URL: `/api/v1`  
Auth: JWT (Bearer token) for protected endpoints  
IDs: UUID  
Time: ISO8601 UTC  
Content-Type: `application/json`

### 1.1 Town isolation (critical)
For any town-scoped resource, the API MUST enforce `town_id` access:
- Customers only access their own orders within their selected town
- Staff and drivers only access towns assigned to them
- Admin can access all towns

### 1.2 Response format

Success:
```json
{ "data": {}, "error": null }
Error:

json
Copy code
{ "data": null, "error": { "code": "STRING", "message": "STRING", "details": {} } }
2. Authentication
2.1 Customer accounts (MVP)
Customers can sign up and log in

Guest checkout is supported

Guest checkout requires email and phone

2.2 Auth header
text
Copy code
Authorization: Bearer <access_token>
3. Core Status Enums (MVP)
3.1 OrderStatus
PENDING_PAYMENT

PENDING_FULFILMENT

PICKING

PACKED

READY_FOR_DISPATCH

OUT_FOR_DELIVERY

DELIVERED

FAILED

CANCELLED

3.2 PaymentMethod
MOMO

COD

3.3 PaymentStatus
INITIATED

PENDING

PAID

FAILED

CANCELLED

3.4 DispatchStatus
ASSIGNED

OUT_FOR_DELIVERY

DELIVERED

FAILED

4. Key Endpoints (MVP)
4.1 Customer Auth
POST /customers/signup

POST /customers/login

GET /customers/me

4.2 Towns
GET /towns

4.3 Catalogue
GET /towns/{town_id}/products

4.4 Orders
POST /towns/{town_id}/orders

GET /towns/{town_id}/orders/{order_id}

GET /towns/{town_id}/orders

4.5 Payments
POST /towns/{town_id}/payments/momo/initiate

POST /payments/momo/webhook

POST /towns/{town_id}/payments/cod/confirm

4.6 Warehouse Fulfilment
GET /towns/{town_id}/warehouse/orders

POST /towns/{town_id}/orders/{order_id}/pick

POST /towns/{town_id}/orders/{order_id}/pack

POST /towns/{town_id}/orders/{order_id}/ready-for-dispatch

4.7 Dispatch (Driver)
POST /towns/{town_id}/dispatches

GET /towns/{town_id}/drivers/me/jobs

POST /towns/{town_id}/dispatches/{dispatch_id}/status

5. MVP Validation Rules
Guest checkout requires: guest_email, guest_phone

Orders fail if stock is insufficient

COD orders proceed directly to fulfilment

MoMo orders must be paid before fulfilment begins