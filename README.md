# BioBids — Biomass Supply Chain Optimization & B2B Trading Platform

A full-stack B2B marketplace connecting biomass suppliers (farmers/aggregators) with industrial buyers through real-time bidding and secure escrow payments.

**Minor Project — B.Tech CSE, Jan–Jun 2026**  
Acropolis Institute of Technology & Research, Indore | RGPV Bhopal  
**Team:** Tarun Seth · Utsav Sethiya · Vasudev Sharma · Ved Vyas  
**Supervisor:** Prof. Sushma Khatri

---

## Tech Stack

| Layer        | Technology                                  |
|-------------|---------------------------------------------|
| Frontend    | React.js (Vite) + Tailwind CSS + Socket.io  |
| Backend     | Node.js + Express.js + Socket.io            |
| Database    | MySQL + Sequelize ORM                       |
| Payments    | Razorpay (escrow simulation)                |
| Auth        | JWT + bcrypt (refresh token rotation)       |
| File Upload | Multer                                      |
| Email       | Nodemailer                                  |
| Cron Jobs   | node-cron (bid expiry, auto payment release)|

---

## Project Structure

```
software/
├── server/
│   ├── config/         db.js, razorpay.js, mailer.js
│   ├── controllers/    auth, listings, bids, orders, payments, admin, notifications
│   ├── middleware/     auth.js (JWT), upload.js (Multer)
│   ├── models/         User, Listing, ListingMedia, Bid, Order, Transaction, Dispute, Notification
│   ├── routes/         all Express routers
│   ├── sockets/        Socket.io event handlers
│   ├── utils/          notifications.js, escrow.js (cron), helpers.js, seed.js
│   └── server.js       Main entry point
├── client/
│   └── src/
│       ├── components/ shared/, supplier/, buyer/, admin/
│       ├── context/    AuthContext, SocketContext
│       ├── pages/      Landing, Login, Register, Listings, ListingDetail
│       │               supplier/ (Dashboard, MyListings, NewListing, Orders, Earnings)
│       │               buyer/    (Dashboard, Browse, MyBids, Orders, Payments)
│       │               admin/    (Dashboard, Users, Orders, Disputes, Transactions)
│       ├── services/   api.js (axios instance + all API calls)
│       └── App.jsx
├── .env                Environment config (copy from .env.example)
└── README.md
```

---

## Setup Instructions

### Prerequisites
- Node.js 18+
- MySQL 8.0+
- A Razorpay test account (free at razorpay.com)
- (Optional) Gmail app password for email notifications

### 1. Clone & Configure

```bash
git clone https://github.com/YOUR_USERNAME/biobids
cd biobids
cp .env .env.local  # Edit with your credentials
```

Edit `.env` and fill in:
- `DB_PASSWORD` — your MySQL root password
- `JWT_SECRET` — any random 32+ char string
- `JWT_REFRESH_SECRET` — another random string
- `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` — from Razorpay dashboard
- `EMAIL_USER` / `EMAIL_PASS` — Gmail + app password (optional)

### 2. Create MySQL Database

```sql
CREATE DATABASE biomass_platform CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3. Install & Run Backend

```bash
cd server
npm install
npm run seed    # Creates tables + demo data
npm run dev     # Starts on http://localhost:5000
```

### 4. Install & Run Frontend

```bash
cd client
npm install
npm run dev     # Starts on http://localhost:3000
```

Open **http://localhost:3000**

---

## Demo Accounts (after seeding)

All passwords: `password123`

| Role     | Email                    |
|---------|--------------------------|
| Admin   | admin@biobids.com        |
| Supplier| ravi@supplier.com        |
| Buyer   | buyer1@biobids.com       |

---

## Key Features

### Biomass Listing
- Suppliers create listings with quantity, quality specs (moisture %, calorific value), location, and min price
- Upload photos/quality certificates (Multer)
- Status lifecycle: `ACTIVE → BIDDING → AWARDED → IN_TRANSIT → DELIVERED → COMPLETED`

### Real-Time Bidding
- Socket.io rooms per listing for live bid updates
- Fractional bidding: buyers can bid on partial quantities (e.g., 10 of 50 tonnes)
- Bids auto-expire after 48 hours
- Supplier accepts/rejects bids from their dashboard

### Escrow Payment Flow (Razorpay)
1. Supplier accepts bid → Order created (`AWAITING_PAYMENT`)
2. Buyer pays via Razorpay → Funds held in escrow (`PAYMENT_ESCROWED`)
3. Supplier dispatches with vehicle details → (`IN_TRANSIT`)
4. Buyer confirms delivery → Payment released to supplier (`COMPLETED`)
5. Buyer raises dispute → Admin reviews and resolves
6. **Auto-release**: if buyer doesn't respond within 7 days of dispatch, payment auto-releases

### Notifications
- In-app bell with unread count (polls every 30s)
- Email via Nodemailer for key events (dev mode: logs to console)

### Analytics
- Admin: GMV, orders by region, biomass type distribution, monthly revenue charts
- Supplier: Earnings, avg bid price received
- Buyer: Total spend, orders by biomass type

---

## API Reference

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh-token

GET    /api/listings          ?type=&location_state=&quantity_min=&moisture_max=&price_max=
POST   /api/listings          (supplier, multipart)
GET    /api/listings/:id
PUT    /api/listings/:id      (supplier, owner only)
DELETE /api/listings/:id      (supplier, owner only)
GET    /api/listings/supplier/my

POST   /api/listings/:id/bids (buyer)
GET    /api/listings/:id/bids
PUT    /api/bids/:id/accept   (supplier)
PUT    /api/bids/:id/reject   (supplier)
GET    /api/bids/my           (buyer)

GET    /api/orders
GET    /api/orders/:id
POST   /api/orders/:id/dispatch         (supplier)
POST   /api/orders/:id/confirm-delivery (buyer)
POST   /api/orders/:id/dispute          (buyer)

POST   /api/payments/create-order (buyer)
POST   /api/payments/verify       (buyer, Razorpay callback)
GET    /api/payments/transactions

GET    /api/notifications
PUT    /api/notifications/:id/read
PUT    /api/notifications/read-all

GET    /api/admin/analytics
GET    /api/admin/users
GET    /api/admin/orders
GET    /api/admin/disputes
POST   /api/admin/disputes/:id/resolve
```

---

## Socket.io Events

| Event                | Direction        | Payload                                |
|---------------------|-----------------|----------------------------------------|
| `join_listing_room`  | Client → Server | `{ listing_id }`                       |
| `new_bid`            | Server → Room   | `{ listingId, bid }`                   |
| `bid_updated`        | Server → Room   | `{ listingId, bid }`                   |
| `bid_accepted`       | Server → Room   | `{ listingId, bidId, orderId }`        |
| `payment_escrowed`   | Server → User   | `{ orderId }`                          |
| `order_status_update`| Server → User   | `{ orderId, status }`                  |
| `payment_released`   | Server → User   | `{ orderId }`                          |

---

## Business Rules

1. A buyer cannot bid on their own listing
2. Bids auto-expire 48 hours after placement
3. Payment must be escrowed before dispatch is allowed
4. Partial/fractional bidding supported — multiple buyers can win different lots
5. Payment auto-releases to supplier 7 days after dispatch
6. Razorpay webhook signature verified before payment status update
7. All monetary amounts stored in **paise** (integer) in DB

---

## References

- Ministry of Power — Biomass Co-firing Policy: https://powermin.gov.in
- SAMARTH Mission: https://samarth.powermin.gov.in
- BiofuelCircle: https://www.biofuelcircle.com
- Buyofuel: https://buyofuel.com
- Razorpay Docs: https://razorpay.com/docs
