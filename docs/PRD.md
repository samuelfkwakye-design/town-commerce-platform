# Product Requirements Document (PRD)
## Town Commerce Platform

_Last updated: 2026-01-17_

---

## 1. Product Overview

The Town Commerce Platform is a scalable, town-based digital commerce system designed to enable fast, localised ordering and fulfilment of goods through town-specific warehouses and dedicated drivers.

Each town operates as a semi-independent node with its own inventory, drivers, and order flow, while being managed under a single national platform.

The system supports both online and offline-friendly payment methods, including Mobile Money (MoMo) and Cash on Delivery (COD), to suit emerging and mixed-economy markets.

---

## 2. Problem Statement

Existing e-commerce platforms:
- are overly centralised
- struggle with last-mile logistics
- fail to localise inventory at town level
- are not optimised for cash-based or mobile money economies

Customers experience:
- long delivery times
- cancelled orders due to stock mismatch
- poor communication with drivers
- limited payment flexibility

---

## 3. Goals & Objectives

### Primary Goals
- Enable same-day or next-day delivery within towns
- Localise inventory by town warehouse
- Support scalable growth from 1 town to 100+ towns
- Support non-card payment systems (MoMo, COD)
- Provide operational visibility to staff and managers

### Success Metrics
- Order fulfilment rate per town
- Average delivery time
- Payment completion rate
- Driver utilisation rate
- Customer repeat usage

---

## 4. User Types

### 4.1 Customers
- Browse products available in their town
- Place orders
- Choose payment method
- Track order status

### 4.2 Drivers
- Receive delivery assignments
- View pickup location (warehouse)
- Update delivery status
- Confirm cash or MoMo payments

### 4.3 Warehouse Staff
- Manage local inventory
- Pick and pack orders
- Assign orders to drivers

### 4.4 Admin / Platform Managers
- Create and manage towns
- Monitor performance metrics
- Manage users and permissions
- Configure payment options

---

## 5. Core Features (MVP)

### 5.1 Town-Based Architecture
- Each town has:
  - a warehouse
  - its own inventory
  - assigned drivers
- Customers only see products available in their town

### 5.2 Product Catalogue
- Town-specific product availability
- Local pricing and stock visibility

### 5.3 Ordering System
- Add to cart
- Checkout
- Payment selection
- Order confirmation

### 5.4 Payments
- Mobile Money (MoMo)
- Cash on Delivery
- Payment status tracking

### 5.5 Delivery Workflow
- Warehouse fulfilment
- Driver assignment
- Order status updates

---

## 6. Non-Functional Requirements

- Scalable to 100+ towns
- Fault-tolerant town operations
- Secure handling of payments and personal data
- Role-based access control
- Mobile-first design

---

## 7. Out of Scope (MVP)

- Cross-town fulfilment
- Advanced recommendations
- Subscriptions
- International payments

---

## 8. Assumptions & Constraints

- Internet connectivity may be unreliable
- Cash payments remain important
- Drivers may use low-end Android devices
- Simplicity and robustness are prioritised

---

## 9. Future Enhancements

- Route optimisation
- Promotions and vouchers
- Loyalty programmes
- Analytics dashboards
- AI-based demand forecasting

---
