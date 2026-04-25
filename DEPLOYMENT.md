# BioBids Deployment on biobid.in (Hostinger VPS)

## Prerequisites
- Hostinger VPS — Ubuntu 22.04
- Domain `biobid.in` pointing to VPS IP (set A record in Hostinger DNS)
- Node.js 22+, MySQL 8.0+, Nginx, PM2, Certbot

---

## Step 1 — Server Setup

```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs mysql-server nginx certbot python3-certbot-nginx
npm install -g pm2
```

---

## Step 2 — MySQL Setup

```bash
sudo mysql_secure_installation
sudo mysql -u root -p
```

```sql
CREATE DATABASE biomass_platform CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'biobids'@'localhost' IDENTIFIED BY 'your_strong_password';
GRANT ALL PRIVILEGES ON biomass_platform.* TO 'biobids'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

## Step 3 — Upload Code

```bash
git clone https://github.com/vedvyas1012/biobids /var/www/biobids
cd /var/www/biobids
cp .env.example .env
nano .env            # Fill in all values
chmod 600 .env       # Restrict permissions — only the app user should read this file
```

Key `.env` values for production:
```dotenv
NODE_ENV=production
DB_USER=biobids
DB_PASSWORD=your_strong_password
CLIENT_URL=https://biobid.in
ESCROW_BASE_URL=https://api.escrow.com/2017-09-01
ESCROW_WEBHOOK_URL=https://biobid.in/api/payments/webhook
```

---

## Step 4 — Build Frontend

```bash
cd /var/www/biobids/client
npm install
npm run build   # Creates client/dist/
```

---

## Step 5 — Seed DB & Start Backend

```bash
cd /var/www/biobids/server
npm install
mysql -u biobids -p biomass_platform < migrations/001_escrow_updates.sql
npm run seed
pm2 start server.js --name biobids
pm2 startup && pm2 save
```

---

## Step 6 — Nginx Config

Create `/etc/nginx/sites-available/biobid.in`:

```nginx
server {
    server_name biobid.in www.biobid.in;

    location / {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }

    client_max_body_size 50M;
}
```

```bash
sudo ln -s /etc/nginx/sites-available/biobid.in /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

## Step 7 — SSL Certificate (HTTPS)

```bash
sudo certbot --nginx -d biobid.in -d www.biobid.in
```

Certbot auto-renews every 90 days. Verify with:
```bash
sudo certbot renew --dry-run
```

---

## Step 8 — Register Escrow Webhook

```bash
node /var/www/biobids/server/utils/registerWebhook.js
```

Then add the printed URL in Escrow.com dashboard:
**Account Settings → API → Webhooks**

---

## Redeployment (after code changes)

```bash
cd /var/www/biobids
git pull
cd client && npm run build
cd ../server && pm2 restart biobids
```

---

## Useful PM2 Commands

```bash
pm2 logs biobids          # live logs
pm2 status                # process health
pm2 restart biobids       # restart after .env changes
pm2 stop biobids          # stop
```
