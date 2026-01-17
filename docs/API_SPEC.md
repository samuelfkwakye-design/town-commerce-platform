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

{ "data": null, "error": { "code": "STRING", "message": "STRING", "details": {} } }

2. Authentication
2.1 Customer accounts (MVP)

Customers can sign up and log in

Guest checkout is supported

Guest checkout requires email and phone

2.2 Auth header
Authorization: Bearer <access_token>

3. Core Status Enums
OrderStatus

PENDING_PAYMENT

PENDING_FULFILMENT

PICKING

PACKED

READY_FOR_DISPATCH

OUT_FOR_DELIVERY

DELIVERED

FAILED

CANCELLED

PaymentMethod

MOMO

COD

PaymentStatus

INITIATED

PENDING

PAID

FAILED

CANCELLED

DispatchStatus

ASSIGNED

OUT_FOR_DELIVERY

DELIVERED

FAILED

4. Core Models (MVP)
Town
{
  "id": "uuid",
  "name": "Harlow",
  "region": "Greater Accra",
  "is_active": true
}

Customer
{
  "id": "uuid",
  "full_name": "Ama Mensah",
  "email": "ama@example.com",
  "phone": "024XXXXXXX"
}

Product
{
  "id": "uuid",
  "name": "Rice 5kg",
  "category": "Groceries",
  "is_active": true
}

TownProduct
{
  "town_id": "uuid",
  "product_id": "uuid",
  "price": 120.0,
  "currency": "GHS",
  "is_enabled": true,
  "available_qty": 15
}

Order
{
  "id": "uuid",
  "town_id": "uuid",
  "warehouse_id": "uuid",
  "customer_id": "uuid",
  "guest_email": "guest@example.com",
  "guest_phone": "024XXXXXXX",
  "status": "PENDING_PAYMENT",
  "payment_method": "MOMO",
  "total": 220.0,
  "currency": "GHS",
  "delivery_address": "Hse 12, Street...",
  "created_at": "2026-01-17T12:00:00Z"
}

5. Key Endpoints (MVP)
Customer Auth

POST /customers/signup
POST /customers/login
GET /customers/me

Catalogue

GET /towns/{town_id}/products

Orders

POST /towns/{town_id}/orders
GET /towns/{town_id}/orders/{order_id}
GET /towns/{town_id}/orders

Payments

POST /towns/{town_id}/payments/momo/initiate
POST /payments/momo/webhook
POST /towns/{town_id}/payments/cod/confirm

Warehouse

GET /towns/{town_id}/warehouse/orders
POST /towns/{town_id}/orders/{order_id}/pick
POST /towns/{town_id}/orders/{order_id}/pack
POST /towns/{town_id}/orders/{order_id}/ready-for-dispatch

Dispatch

POST /towns/{town_id}/dispatches
GET /towns/{town_id}/drivers/me/jobs
POST /towns/{town_id}/dispatches/{dispatch_id}/status

6. MVP Validation Rules

Guest checkout requires email and phone

Orders fail if stock is insufficient

COD orders proceed directly to fulfilment

MoMo orders must be paid before fulfilment

