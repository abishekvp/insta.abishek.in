# InstaVault Pro 🚀
### Production Monolithic Instagram Story Saver, 30-Day TTL Archiver & Admin Intelligence Suite

InstaVault Pro is a production-grade, monolithic application built to archive Instagram stories with an automated **30-day storage expiration policy (TTL)**, complete with an **Admin Management Portal**, dynamic database-driven product configurations, and deep Instagram audience intelligence tools.

---

## 🌟 Key Architecture

### 1. Dynamic Admin Product Configuration
All product-related configurations and OAuth integrations are managed live by Administrators in the database via the **Admin Portal (`/admin`)**:
* **`app_base_url`**: Application canonical URL (e.g. `http://localhost:5500` or `https://insta.abishek.in`).
* **`ig_oauth_client_id`**: Meta / Instagram App ID.
* **`ig_oauth_client_secret`**: Meta / Instagram App Secret (encrypted & protected).
* **`ig_oauth_redirect_uri`**: Whitelisted OAuth callback URL (auto-derives from `app_base_url` when blank).
* **`ig_oauth_scopes`**: Comma-separated list of OAuth scopes/permissions with multi-scope selector UI.
* **`story_ttl_days`**: Story retention period in days before automated deletion (default `30` days, adjustable to any value).
* **`auto_purge_interval_minutes`**: Interval for background media unlinking cron jobs.
* **`max_stories_per_user`**: Story storage quota per user account.
* **`max_watchlist_targets`**: Quota of VIP friends allowed per user's auto-archiver list.
* **`auto_archiver_enabled`**: Global switch to enable or pause background crawlers.
* **`allow_user_registrations`**: Open or close public user signups.
* **`maintenance_mode`**: Toggle system maintenance mode.
* **`announcement_banner`**: Broadcast notification displayed to users across the app.

### 2. Strict Production Environment (Zero Hardcoded Defaults)
In production mode, the application enforces strict environment validation. Critical secrets and connection paths must be explicitly provided in `.env`:
* **`DATABASE_URL`**: Cloud PostgreSQL connection string where all records, accounts, and media BLOBs are maintained (e.g. `postgres://user:password@db.prisma.io:5432/postgres?sslmode=require`).
* **`APP_SECRET`**: Master cryptographic key for AES-256-GCM encryption and HMAC token signing (minimum 32 characters).
* **`PORT`**: Network port (e.g. `5500`).

### 3. User & Admin Management CLI Commands

#### Make User Admin:
```bash
# Promote existing user or create new admin with generated password
npm run make:admin -- admin@example.com

# Or specify custom initial password and name:
npm run make:admin -- admin@example.com "MySecurePass123!" "Abishek V"
```

#### Set User Password (CLI):
```bash
# Set a new explicit password for any registered user:
npm run set:password -- user@example.com "MyNewSecurePassword#2026"

# Or generate a strong random temporary password automatically:
npm run set:password -- user@example.com
```

### 4. Self-Service Profile & Password Management on the Site
Authenticated users can manage their account directly on the site via **Account & Security (`/security`)** or by clicking their avatar in the navigation bar:
* **Change Display Name**: Update full name in real time (`POST /api/auth/change-name`), immediately updating the navigation bar and audit logs.
* **Change Password**: Securely update account credentials with required current password verification (`POST /api/auth/change-password`), enforcing minimum 8 characters and uniqueness from current password.
* **Admin Portal Password Reset**: Administrators can also set/reset any user's password directly from the user table in the Admin Portal (`/admin`).

### 5. Instagram Account Connection Methods

InstaVault Pro provides two account integration methods depending on your security, automation, and compliance requirements:

#### Option 1: Official Instagram OAuth Login (Recommended)
Connect via Meta's **Instagram API with Instagram Login** (Graph API):
* **Security & Compliance**: Users log in on Instagram's own official consent screen. The server never sees or stores Instagram passwords or session cookies.
* **Token Management**: Exchanged for a long-lived OAuth access token (~60 days), encrypted at rest using AES-256-GCM.
* **Setup (via Admin Portal or `.env`)**:
  1. Create an application at [Meta for Developers](https://developers.facebook.com/apps).
  2. Add the **Instagram** product and configure **Instagram Login**.
  3. Navigate to **Admin Portal (`/admin`)** &gt; **Product Configurations** &gt; **Instagram OAuth & Meta Graph API** (or set `IG_OAUTH_CLIENT_ID` and `IG_OAUTH_CLIENT_SECRET` in `.env`).
  4. Copy the auto-calculated redirect URI with one click (default: `http://localhost:5500/api/auth/instagram/oauth/callback`) and whitelist it under Meta App Settings.
  5. Select multiple scopes using the interactive scope picker (e.g., `instagram_business_basic`, `instagram_business_manage_messages`, `instagram_business_content_publish`).

#### Option 2: Manual Self-Paste `sessionid` (Personal Automation)
For personal testing or private automation where browser session access is preferred:
* **Manual Paste Only**: Due to the Same-Origin Policy and browser security boundaries, websites cannot "scan" or extract cookies from other domains. Users manually copy their own `sessionid` from browser DevTools into the modal.
* **Encrypted at Rest**: Pasted session cookies are encrypted using AES-256-GCM before storage.
* **Terms of Service Notice**: Driving Instagram using a browser session cookie is an unofficial integration method and violates Instagram's Terms of Service, carrying risks of checkpoint challenges or account suspension. A risk acknowledgement is required in the UI before linking.

**CLI Session Linker:**
```bash
# Link an account directly using sessionid:
npm run session:fetch -- "6528919%3AbB7j9x1f82y%3A12%3AY4z9"

# Or link to a specific user by email:
npm run session:fetch -- "6528919%3AbB7j9x1f82y%3A12%3AY4z9" admin@example.com
```

---

## 🛠️ Tech Stack

- **Monolith Server**: Node.js, Express 4, TypeScript, Helmet, CORS, Express Rate Limit, Node-Cron
- **Database**: Cloud PostgreSQL via `pg` connection pool with dynamic schema initialization and BYTEA binary BLOB media storage
- **Security**: AES-256-GCM credential encryption, HMAC-SHA256 bearer tokens, Scrypt password hashing with unique salts
- **Frontend**: React 18, React Router 6, Tailwind CSS, Lucide Icons, Vite 6
- **Storage**: Pure database binary BLOB persistence with automated 30-day TTL media purging (zero local filesystem processing)

---

## 🚀 Getting Started

### 1. Configure `.env`
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure all required variables are set:
```env
PORT=5500
DATABASE_URL="postgres://username:password@db.prisma.io:5432/postgres?sslmode=require"
APP_SECRET="prod-instavault-enterprise-master-cryptographic-key-64ch-sec"
```

### 2. Create Initial Administrator
Run the admin CLI command:
```bash
npm run make:admin -- admin@abishek.in Password123! "Abishek V"
```

### 3. Build & Run Monolith
```bash
# Compile React SPA into dist/client & TypeScript backend into dist/server
npm run build

# Start the monolithic production server
npm start
```

Visit **[http://localhost:5500](http://localhost:5500)** in your browser!

---

## 🛡️ Admin Portal Features (`/admin`)

- **Live Product Configurations**: Change story retention days, quotas, maintenance modes, and crawler intervals with immediate persistence.
- **User Management**: View all registered users, promote to Admin, demote to User, suspend, or delete accounts.
- **Storage Health**: Monitor database file size, active disk usage, and 30-day TTL reclaimed storage.
- **Force Storage Purge**: Instantly trigger the 30-day TTL cleanup engine on demand.

---

## 📜 License
MIT © Abishek V
