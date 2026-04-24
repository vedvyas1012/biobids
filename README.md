# BioBids — Biomass Supply Chain Optimization & B2B Trading Platform

A full-stack B2B marketplace connecting biomass suppliers (farmers/aggregators) with industrial buyers through real-time bidding and secure escrow payments.

**Minor Project — B.Tech CSE, Jan–Jun 2026**  
Acropolis Institute of Technology & Research, Indore | RGPV Bhopal  
**Team:** Tarun Seth · Utsav Sethiya · Vasudev Sharma · Ved Vyas  
**Supervisor:** Prof. Sushma Khatri

---

## Tech Stack

| Layer        | Technology                                       |
|-------------|--------------------------------------------------|
| Frontend    | React.js (Vite) + Tailwind CSS + Socket.io       |
| Backend     | Node.js + Express.js + Socket.io                 |
| Database    | MySQL + Sequelize ORM                            |
| Payments    | Escrow.com API (real escrow for B2B transactions)|
| Auth        | JWT + bcrypt (refresh token rotation)            |
| File Upload | Multer                                           |
| Email       | Nodemailer                                       |
| Cron Jobs   | node-cron (bid expiry, auto payment release)     |

---

## Project Structure

```
software/
├── server/
│   ├── config/         db.js, escrow.js, mailer.js
│   ├── controllers/    auth, listings, bids, orders, payments, admin, notifications
│   ├── middleware/     auth.js (JWT), upload.js (Multer)
│   ├── models/         User, Listing, ListingMedia, Bid, Order, Transaction, Dispute, Notification
│   ├── routes/         all Express routers
│   ├── sockets/        Socket.io event handlers
│   ├── utils/          notifications.js, escrow.js (cron), escrowService.js, helpers.js, seed.js, registerWebhook.js
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
- An Escrow.com account — sandbox at [escrow-sandbox.com](https://www.escrow-sandbox.com) or production at [escrow.com](https://www.escrow.com)
- (Optional) Gmail app password for email notifications

### 1. Clone & Configure

```bash
git clone https://github.com/YOUR_USERNAME/biobids
cd biobids
cp .env.example .env   # Edit with your credentials
```

Edit `.env` and fill in:
- `DB_PASSWORD` — your MySQL root password
- `JWT_SECRET` — any random 32+ char string
- `JWT_REFRESH_SECRET` — another random string
- `ESCROW_EMAIL` — your Escrow.com account email
- `ESCROW_API_KEY` — from Escrow.com Account Settings → API Keys
- `ESCROW_BASE_URL` — `https://api.escrow-sandbox.com/2017-09-01` (sandbox) or `https://api.escrow.com/2017-09-01` (production)
- `ESCROW_WEBHOOK_URL` — your public server URL + `/api/payments/webhook`
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
npm run dev     # Starts on http://localhost:5001
```

### 4. Install & Run Frontend

```bash
cd client
npm install
npm run dev     # Starts on http://localhost:3000
```

Open **http://localhost:3000**

### 5. Register Webhook (production only)

After deploying and setting `ESCROW_WEBHOOK_URL` in `.env`:

```bash
node server/utils/registerWebhook.js
```

Follow the printed instructions to add the webhook URL in your Escrow.com dashboard under **Account Settings → API → Webhooks**.

---

## Escrow.com Payment Flow

BioBids uses the [Escrow.com API](https://www.escrow.com/api/docs) to hold buyer payments in escrow during B2B biomass transactions:

1. **Supplier accepts bid** → Order created with status `AWAITING_PAYMENT`
2. **Buyer initiates escrow** → `POST /api/payments/initiate/:order_id`  
   BioBids creates an Escrow.com transaction and returns a payment URL
3. **Buyer funds escrow** → Buyer opens Escrow.com payment page and pays  
   Escrow.com sends a webhook → Order becomes `PAYMENT_ESCROWED`
4. **Supplier dispatches** → Calls Escrow.com `ship_merchandise` action → `IN_TRANSIT`
5. **Buyer confirms delivery** → Calls Escrow.com `receive_merchandise` → funds released → `COMPLETED`
6. **Buyer raises dispute** → Calls Escrow.com `reject_merchandise` → `DISPUTED`  
   Escrow.com handles dispute resolution; admin can also intervene
7. **Auto-release**: if buyer doesn't respond within 7 days of dispatch, payment auto-releases via cron job

Amounts stored in **paise** (integers) in DB; converted to **USD** when calling Escrow.com API (at ₹83/USD).

---

## Demo Accounts (after seeding)

All passwords: `password123`

| Role     | Email                  |
|---------|------------------------|
| Admin   | admin@biobids.com      |
| Supplier| ravi@supplier.com      |
| Buyer   | buyer1@biobids.com     |

---

## Supported Biomass Types

| Type              | Key              |
|------------------|-----------------|
| Rice Husk        | `rice_husk`      |
| Sugarcane Bagasse| `sugarcane_bagasse` |
| Wood Chips       | `wood_chips`     |
| Cotton Stalks    | `cotton_stalks`  |
| Wheat Straw      | `wheat_straw`    |
| Corn Cobs        | `corn_cobs`      |
| Bamboo           | `bamboo`         |
| Mustard Husk     | `mustard_husk`   |
| Sugarcane Husk   | `sugarcane_husk` |
| Peanut Husk      | `peanut_husk`    |
| Other            | `other`          |

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

POST   /api/payments/initiate/:order_id (buyer) — creates Escrow.com transaction
GET    /api/payments/status/:order_id   — returns order + escrow transaction status
POST   /api/payments/webhook            — Escrow.com webhook receiver (unauthenticated)
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

| Event                 | Direction        | Payload                                |
|-----------------------|-----------------|----------------------------------------|
| `join_listing_room`   | Client → Server | `{ listing_id }`                       |
| `new_bid`             | Server → Room   | `{ listingId, bid }`                   |
| `bid_updated`         | Server → Room   | `{ listingId, bid }`                   |
| `bid_accepted`        | Server → Room   | `{ listingId, bidId, orderId }`        |
| `payment_escrowed`    | Server → User   | `{ orderId }`                          |
| `order_status_updated`| Server → Room   | `{ orderId, status }`                  |
| `payment_released`    | Server → User   | `{ orderId }`                          |

---

## Business Rules

1. A buyer cannot bid on their own listing
2. Bids auto-expire 48 hours after placement
3. Payment must be escrowed before dispatch is allowed
4. Partial/fractional bidding supported — multiple buyers can win different lots
5. Payment auto-releases to supplier 7 days after dispatch
6. Escrow.com webhook updates order status on all payment events
7. All monetary amounts stored in **paise** (integer) in DB; converted to USD for Escrow.com

---

## References

- Ministry of Power — Biomass Co-firing Policy: https://powermin.gov.in
- SAMARTH Mission: https://samarth.powermin.gov.in
- BiofuelCircle: https://www.biofuelcircle.com
- Buyofuel: https://buyofuel.com
- Escrow.com API Docs: https://www.escrow.com/api/docs
