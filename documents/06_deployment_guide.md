# Deployment & Setup Guide
## Village & Housing Development Investigation System

---

**Document Version:** 1.0  
**Date:** May 2026

---

## 1. Server Requirements

| Component | Requirement |
|---|---|
| Operating System | Ubuntu 22.04 LTS or CentOS 8+ |
| Web Server | Apache 2.4+ or Nginx 1.24+ |
| PHP | 8.2 or higher |
| PHP Extensions | pdo, pdo_mysql, json, mbstring, openssl |
| MySQL | 8.0+ |
| Node.js | 20 LTS (for building React frontend) |
| Composer | 2.x |

---

## 2. Backend Setup (PHP)

### Step 1 — Clone and install dependencies

```bash
git clone https://github.com/your-org/village-system.git
cd village-system/backend
composer install --no-dev --optimize-autoloader
```

### Step 2 — Configure environment

```bash
cp .env.example .env
nano .env
# Set DB_HOST, DB_NAME, DB_USER, DB_PASS, JWT_SECRET, FRONTEND_URL
```

### Step 3 — Create database and run migrations

```bash
mysql -u root -p -e "CREATE DATABASE village_dev_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p village_dev_db < migrations/001_initial_schema.sql
```

### Step 4 — Create initial admin user

```bash
php scripts/create_admin.php \
  --name "System Admin" \
  --email "admin@gov.lk" \
  --password "change_me_123" \
  --employee-id "ADMIN001"
```

### Step 5 — Configure Apache Virtual Host

```apache
<VirtualHost *:80>
    ServerName api.village-system.gov.lk
    DocumentRoot /var/www/village-system/backend/public

    <Directory /var/www/village-system/backend/public>
        AllowOverride All
        Require all granted
    </Directory>

    ErrorLog ${APACHE_LOG_DIR}/village-api-error.log
    CustomLog ${APACHE_LOG_DIR}/village-api-access.log combined
</VirtualHost>
```

```bash
sudo a2enmod rewrite
sudo a2ensite village-api
sudo systemctl reload apache2
```

---

## 3. Frontend Setup (React)

### Step 1 — Install and build

```bash
cd village-system/frontend
npm install
```

### Step 2 — Configure environment

```bash
cp .env.example .env
# Edit VITE_API_URL=https://api.village-system.gov.lk/api/v1
```

### Step 3 — Build for production

```bash
npm run build
# Output goes to dist/
```

### Step 4 — Serve with Apache/Nginx

**Apache:**
```apache
<VirtualHost *:80>
    ServerName village-system.gov.lk
    DocumentRoot /var/www/village-system/frontend/dist

    <Directory /var/www/village-system/frontend/dist>
        AllowOverride All
        Require all granted
        FallbackResource /index.html
    </Directory>
</VirtualHost>
```

**Nginx:**
```nginx
server {
    listen 80;
    server_name village-system.gov.lk;
    root /var/www/village-system/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## 4. Directory Permissions

```bash
# Backend: allow PHP to write logs
sudo chown -R www-data:www-data /var/www/village-system/backend
sudo chmod -R 755 /var/www/village-system/backend
sudo chmod 600 /var/www/village-system/backend/.env

# Frontend
sudo chown -R www-data:www-data /var/www/village-system/frontend/dist
```

---

## 5. Development Environment (Local)

### Backend (PHP built-in server for dev)
```bash
cd backend/public
php -S localhost:8000
```

### Frontend (Vite dev server)
```bash
cd frontend
npm run dev
# Runs on http://localhost:5173
# Set VITE_API_URL=http://localhost:8000/api/v1
```

---

## 6. User Roles & Initial Accounts

| Role | Capabilities |
|---|---|
| ADMIN | Full access: manage users, all data, delete records |
| INVESTIGATOR | View all data, access dashboard and reports, resolve issues |
| FIELD_COLLECTOR | Create and update villages, houses, loans, payments, issues |

After deployment, create role accounts via admin panel or the CLI script:
```bash
php scripts/create_user.php --role FIELD_COLLECTOR --name "..." --email "..."
```

---

## 7. Backup Strategy

```bash
# Daily MySQL dump (add to cron)
mysqldump -u village_user -p village_dev_db \
  | gzip > /backups/village_db_$(date +%Y%m%d).sql.gz

# Weekly retention — keep last 30 days
find /backups -name "*.sql.gz" -mtime +30 -delete
```

---

## 8. Post-Deployment Checklist

- [ ] `.env` file is not publicly accessible
- [ ] JWT_SECRET is a random 64-character string
- [ ] Database user has only `SELECT`, `INSERT`, `UPDATE` privileges (no `DROP`, `CREATE`)
- [ ] HTTPS is configured (SSL certificate via Let's Encrypt)
- [ ] Initial admin account password changed after first login
- [ ] Seed data verified: construction stages, village categories, land ownership bodies
- [ ] CORS `FRONTEND_URL` matches actual frontend domain
- [ ] Apache/Nginx `mod_rewrite` / `try_files` working for SPA routing
- [ ] Database backup cron job active
