# SpendWise — Developer Handover & API Documentation

This document is the technical reference for developers taking over or contributing to SpendWise. It covers architecture, the full API reference, environment setup, deployment, CI/CD, and maintenance procedures.

For end-user instructions, see [README.md](./README.md).

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Repository Structure](#2-repository-structure)
3. [Tech Stack](#3-tech-stack)
4. [Environment Configuration](#4-environment-configuration)
5. [Local Development Setup](#5-local-development-setup)
6. [Database Management](#6-database-management)
7. [API Reference](#7-api-reference)
8. [CI/CD Pipeline](#8-cicd-pipeline)
9. [Production Deployment](#9-production-deployment)
10. [Third-Party Services](#10-third-party-services)
11. [Testing](#11-testing)
12. [Maintenance Procedures](#12-maintenance-procedures)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. Architecture Overview

SpendWise is a containerised full-stack web application composed of four services orchestrated by Docker Compose:

```
 Browser
    │
    ▼
 Nginx (reverse proxy — ports 80 / 443)
    │                  │
    ▼                  ▼
 React/Vite       Django REST API
 (port 5174)      (port 8000)
                       │
                       ▼
                  PostgreSQL 15
                  (port 5432)
```

**Request flow:**
- All public traffic enters through Nginx.
- Static frontend assets are served by the React/Vite dev server (production builds via Nginx directly).
- API calls (`/api/*`) are proxied by Vite to the Django backend during development, and by Nginx in production.
- The Django backend connects to a PostgreSQL database and to external APIs (Plaid, Alpha Vantage).
- Authentication is JWT-based; tokens are stored in the browser and sent in `Authorization: Bearer <token>` headers.

---

## 2. Repository Structure

```
spendwise/
├── backend/                     # Django REST API
│   ├── accounts/                # Auth, user profiles
│   ├── scholarships/            # Scholarship listings & matching
│   ├── transactions/            # Plaid bank integration
│   ├── spending/                # Spending analysis, savings tips
│   ├── student_codes/           # Student discount codes
│   ├── investments/             # Goals, portfolios, ML recommendations
│   ├── project_tests/           # All automated tests
│   ├── config/                  # Django settings & URL routing
│   ├── manage.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/                    # React + Vite SPA
│   ├── src/
│   │   ├── components/          # Page & feature components
│   │   ├── context/             # ThemeContext (dark mode)
│   │   ├── utils/               # Shared helpers (api.js, auth.js)
│   │   └── styles/              # Global CSS
│   ├── package.json
│   ├── vite.config.js
│   └── Dockerfile
├── .github/
│   └── workflows/
│       ├── ci.yml               # Lint + test on every PR
│       └── deploy.yml           # Auto-deploy to DigitalOcean on push to dev
├── docker-compose.yml           # Service orchestration
├── nginx.conf                   # Reverse proxy & SSL config
├── README.md                    # User-facing guide
└── HANDOVER.md                  # This document
```

---

## 3. Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Backend framework | Django + Django REST Framework | 5.0+ |
| Language | Python | 3.12 |
| Database | PostgreSQL | 15 |
| Authentication | JWT (djangorestframework-simplejwt) | — |
| Frontend framework | React | 19.2.0 |
| Frontend build tool | Vite | 7.3.1 |
| HTTP client (FE) | Axios | 1.13.6 |
| Charts | Recharts | 3.8.1 |
| Routing (FE) | React Router DOM | 6.0.0 |
| Containerisation | Docker + Docker Compose | — |
| Reverse proxy | Nginx | alpine |
| SSL | Let's Encrypt / Certbot | — |
| CI/CD | GitHub Actions | — |
| Bank data | Plaid API | sandbox |
| Stock data | yfinance + Alpha Vantage | — |
| ML | scikit-learn, pandas, numpy | 1.5.1 / 2.2.2 / 1.26.4 |

---

## 4. Environment Configuration

### Backend (`backend/.env`)

Create `backend/.env` with the following variables (a template is shown below; for local development the values in `docker-compose.yml` are already set):

```env
# Database
POSTGRES_DB=app
POSTGRES_USER=app
POSTGRES_PASSWORD=app
POSTGRES_HOST=db          # use "db" inside Docker, "localhost" for bare-metal
POSTGRES_PORT=5432

# Plaid (bank integration) — sandbox credentials
PLAID_CLIENT_ID=<your-plaid-client-id>
PLAID_SECRET=<your-plaid-secret>

# Email backend (use console for local, SMTP for production)
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend

# UofT Award Explorer scraper (no changes needed)
AWARD_EXPLORER_POST_URL=https://awardexplorer.utoronto.ca/award/search
AWARD_EXPLORER_UNDERGRAD_BASE_URL=https://awardexplorer.utoronto.ca
AWARD_EXPLORER_UNDERGRAD_REPORT_ID=46862
AWARD_EXPLORER_UNDERGRAD_REPORT_NAME=Undergraduate Awards
AWARD_EXPLORER_GRAD_BASE_URL=https://awardexplorer.utoronto.ca
AWARD_EXPLORER_GRAD_REPORT_ID=46864
AWARD_EXPLORER_GRAD_REPORT_NAME=Graduate Awards

# Optional: Alpha Vantage (investment asset data)
ALPHA_VANTAGE_API_KEY=<your-api-key>
```

> **Production note:** In production, override `POSTGRES_HOST`, `EMAIL_BACKEND`, and `PLAID_SECRET` with real values. Never commit secrets to Git.

### Frontend

The frontend has no separate `.env` file. During development, Vite proxies `/api/*` requests to `http://backend:8000` (configured in `vite.config.js`). In production, Nginx handles the routing.

---

## 5. Local Development Setup

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (v4.x+, includes Compose V2)
- Git

### Steps

```bash
# 1. Clone and switch to the dev branch
git clone https://github.com/csc301-2026-s/spendwise.git
cd spendwise
git checkout dev

# 2. Start all containers (builds images on first run)
docker compose up -d --build

# 3. Apply database migrations
docker compose exec backend python manage.py migrate

# 4. (Optional, one-time) Seed scholarship and discount code data
docker compose exec backend python manage.py ingest_awardexplorer
docker compose exec backend python manage.py ingest_awardexplorer --level grad
docker compose exec backend python manage.py sync_student_codes
```

### Service URLs

| Service | URL | Notes |
|---|---|---|
| Frontend | http://localhost:5174 | React/Vite dev server |
| Backend API | http://localhost:8000/api/ | Django REST API |
| Django Admin | http://localhost:8000/admin/ | Superuser required |
| PostgreSQL | localhost:5433 | Mapped to host port 5433 |

### Demo Credentials

| Email | Password |
|---|---|
| alihassan.shaikh@mail.utoronto.ca | SPENDWISE |

### Useful Commands

```bash
# View logs for a specific service
docker compose logs -f backend

# Open a Django shell
docker compose exec backend python manage.py shell

# Create a superuser
docker compose exec backend python manage.py createsuperuser

# Stop containers (keeps data volumes)
docker compose down

# Stop and wipe all data (destructive)
docker compose down -v
```

---

## 6. Database Management

### Schema Migrations

Django manages the schema via migrations. After changing any model:

```bash
# Inside the backend container
docker compose exec backend python manage.py makemigrations
docker compose exec backend python manage.py migrate
```

### Data Ingestion

SpendWise uses management commands to populate catalog data from external sources:

```bash
# Scrape UofT undergrad scholarships from Award Explorer
docker compose exec backend python manage.py ingest_awardexplorer

# Scrape UofT grad scholarships
docker compose exec backend python manage.py ingest_awardexplorer --level grad

# Scrape student discount codes (SPC, UNiDAYS, Student Beans)
docker compose exec backend python manage.py sync_student_codes
```

These commands are idempotent (safe to re-run). Re-run them periodically to keep scholarship and discount data current.

### Backups

```bash
# Dump the database to a file
docker compose exec db pg_dump -U app app > backup_$(date +%Y%m%d).sql

# Restore from a dump
docker compose exec -T db psql -U app app < backup_YYYYMMDD.sql
```

---

## 7. API Reference

All endpoints are prefixed with `/api/`. The backend runs at `http://localhost:8000` locally.

Authentication uses JWT. Include the access token in all protected requests:
```
Authorization: Bearer <access_token>
```

---

### 7.1 Authentication (`/api/`)

#### Register

```
POST /api/register/
```

Creates a new user and sends a 6-digit email verification code.

**Request body:**
```json
{
  "email": "student@mail.utoronto.ca",
  "password": "SecurePass123",
  "first_name": "Jane",
  "last_name": "Doe"
}
```

**Response `201`:**
```json
{
  "message": "Verification code sent to email."
}
```

---

#### Verify Email

```
POST /api/register/verify/
```

Verifies the email code and activates the account.

**Request body:**
```json
{
  "email": "student@mail.utoronto.ca",
  "code": "482931"
}
```

**Response `200`:**
```json
{
  "message": "Account activated successfully."
}
```

---

#### Login

```
POST /api/login/
```

Returns JWT access and refresh tokens.

**Request body:**
```json
{
  "email": "student@mail.utoronto.ca",
  "password": "SecurePass123"
}
```

**Response `200`:**
```json
{
  "access": "<jwt_access_token>",
  "refresh": "<jwt_refresh_token>"
}
```

---

#### Refresh Token

```
POST /api/token/refresh/
```

**Request body:**
```json
{
  "refresh": "<jwt_refresh_token>"
}
```

**Response `200`:**
```json
{
  "access": "<new_jwt_access_token>"
}
```

---

#### Get / Update Profile

```
GET  /api/profile/
PUT  /api/profile/
```

**GET response `200`:**
```json
{
  "id": 1,
  "email": "student@mail.utoronto.ca",
  "first_name": "Jane",
  "last_name": "Doe",
  "faculty": "Engineering",
  "major": "Computer Science",
  "year_of_study": 2,
  "degree_type": "undergraduate",
  "student_status": "full-time",
  "campus": "St. George",
  "total_earnings": 1500.00,
  "total_expenses": 900.00,
  "scholarships_aid": 500.00,
  "gpa": 3.7
}
```

**PUT request body** (any subset of fields above):
```json
{
  "faculty": "Arts & Science",
  "major": "Economics",
  "gpa": 3.5
}
```

---

### 7.2 Scholarships (`/api/scholarships/`)

#### List Scholarships

```
GET /api/scholarships/scholarships/
```

**Query parameters:**

| Parameter | Type | Description |
|---|---|---|
| `campus` | string | Filter by campus (e.g., `St. George`) |
| `year` | integer | Filter by year of study |
| `faculty` | string | Filter by faculty |
| `discipline` | string | Filter by discipline |
| `search` | string | Keyword search |
| `page` | integer | Pagination |

**Response `200`:**
```json
{
  "count": 150,
  "next": "/api/scholarships/scholarships/?page=2",
  "previous": null,
  "results": [
    {
      "id": 42,
      "title": "University of Toronto Scholars Program",
      "amount": 7500,
      "deadline": "2025-03-01",
      "campus": "St. George",
      "faculty": "All",
      "award_type": "entrance",
      "is_saved": false
    }
  ]
}
```

---

#### Get Scholarship Detail

```
GET /api/scholarships/scholarships/<id>/
```

**Response `200`:**
```json
{
  "id": 42,
  "title": "University of Toronto Scholars Program",
  "description": "Award for students with outstanding academic achievement...",
  "amount": 7500,
  "deadline": "2025-03-01",
  "campus": "St. George",
  "faculty": "All",
  "discipline": null,
  "year_of_study": null,
  "award_type": "entrance",
  "student_level": "undergraduate",
  "eligibility_criteria": "...",
  "is_saved": false,
  "saved_status": null
}
```

---

#### Get Scholarships Metadata

```
GET /api/scholarships/scholarships/meta/
```

Returns distinct filter values for populating dropdowns.

**Response `200`:**
```json
{
  "campuses": ["St. George", "Mississauga", "Scarborough"],
  "faculties": ["Arts & Science", "Engineering", ...],
  "award_types": ["entrance", "in-course", "graduate"]
}
```

---

#### Match Scholarships to Profile

```
POST /api/scholarships/scholarships/match/
```

Returns scholarships ranked by eligibility based on the authenticated user's profile.

**Response `200`:**
```json
[
  {
    "id": 42,
    "title": "...",
    "match_score": 0.92,
    "match_reason": "Faculty and year of study match",
    ...
  }
]
```

---

#### Save / Unsave a Scholarship

```
POST /api/scholarships/scholarships/<id>/save/
```

Toggles saved state. Returns updated saved status.

**Response `200`:**
```json
{
  "saved": true,
  "id": 15
}
```

---

#### List Saved Scholarships

```
GET /api/scholarships/scholarships/saved/
```

Returns the authenticated user's saved scholarships with current status.

---

#### Saved Scholarships Stats

```
GET /api/scholarships/scholarships/saved/stats/
```

**Response `200`:**
```json
{
  "total_saved": 8,
  "by_status": {
    "saved": 4,
    "in_progress": 2,
    "submitted": 2
  },
  "upcoming_deadlines": [...]
}
```

---

#### Update Scholarship Status

```
PUT /api/scholarships/scholarships/saved/<saved_id>/status/
```

Updates the Kanban status of a saved scholarship.

**Request body:**
```json
{
  "status": "in_progress"
}
```

Valid values: `saved`, `in_progress`, `submitted`.

---

### 7.3 Bank Transactions / Plaid (`/api/plaid/`)

> The Plaid integration runs in **sandbox mode**. Use Plaid's test credentials during local development. Moving to production requires a Plaid Development or Production key.

#### Create Plaid Link Token

```
POST /api/plaid/link-token/
```

Generates a short-lived token used to initialise the Plaid Link widget in the frontend.

**Response `200`:**
```json
{
  "link_token": "link-sandbox-..."
}
```

---

#### Exchange Public Token

```
POST /api/plaid/exchange-token/
```

Called after the user completes Plaid Link. Exchanges the one-time public token for a persistent access token stored server-side.

**Request body:**
```json
{
  "public_token": "public-sandbox-..."
}
```

**Response `200`:**
```json
{
  "item_id": "abc123",
  "message": "Bank account connected successfully."
}
```

---

#### List Connected Bank Items

```
GET /api/plaid/items/
```

**Response `200`:**
```json
[
  {
    "item_id": "abc123",
    "institution_name": "Chase",
    "connected_at": "2025-02-01T10:00:00Z"
  }
]
```

---

#### List Bank Accounts

```
GET /api/plaid/bank-accounts/
```

Returns all accounts across all connected items.

---

#### Get Item Details

```
GET /api/plaid/items/<item_id>/
```

---

#### Get Accounts for Item

```
GET /api/plaid/items/<item_id>/accounts/
```

---

#### Get Transactions for Item

```
GET /api/plaid/items/<item_id>/transactions/
```

**Query parameters:**

| Parameter | Type | Description |
|---|---|---|
| `month` | integer | Month (1–12) |
| `year` | integer | Year |
| `account_id` | string | Filter to specific account |

---

### 7.4 Spending Analysis (`/api/spending/`)

#### Get Spending Summary

```
GET /api/spending/
```

Returns categorised spending analysis for the specified month, including savings suggestions.

**Query parameters:**

| Parameter | Type | Description |
|---|---|---|
| `month` | integer | Month (1–12, default: current) |
| `year` | integer | Year (default: current) |
| `account_id` | string | Limit to one account |

**Response `200`:**
```json
{
  "month": 2,
  "year": 2026,
  "total_expenses": 1842.50,
  "estimated_savings": 128.00,
  "categories": {
    "Food & Drink": 420.00,
    "Transport": 210.00,
    "Shopping": 380.00
  },
  "savings_suggestions": [
    {
      "merchant": "Uber Eats",
      "total_spent": 320.00,
      "frequency": 7,
      "suggested_saving": 48.00,
      "tip": "Apply the student discount code for 15% off."
    }
  ],
  "transactions": [...]
}
```

---

### 7.5 Student Codes (`/api/student-codes/`)

#### List SPC Codes

```
GET /api/student-codes/spc/
```

Returns Student Price Card discount codes.

---

#### List All Codes

```
GET /api/student-codes/all/
```

Returns codes from all providers (SPC, UNiDAYS, Student Beans).

**Query parameters:**

| Parameter | Type | Description |
|---|---|---|
| `search` | string | Search by merchant name |
| `category` | string | Filter by category |
| `provider` | string | `spc`, `unidays`, or `student_beans` |

---

#### Trending Codes

```
GET /api/student-codes/trending/
```

Returns codes currently trending based on usage patterns.

---

#### Recommended Codes

```
GET /api/student-codes/recommended/
```

Returns codes recommended for the authenticated user based on their transaction history.

---

### 7.6 Investments (`/api/investments/`)

#### Investment Goals

```
GET  /api/investments/goals/
POST /api/investments/goals/
```

**POST request body:**
```json
{
  "name": "New Laptop",
  "target_amount": 1500.00,
  "target_date": "2025-09-01",
  "risk_level": "balanced",
  "monthly_contribution": 200.00
}
```

**GET response `200`:**
```json
[
  {
    "id": 1,
    "name": "New Laptop",
    "target_amount": 1500.00,
    "target_date": "2025-09-01",
    "risk_level": "balanced",
    "monthly_contribution": 200.00,
    "created_at": "2025-01-15T08:30:00Z"
  }
]
```

---

#### Practice Portfolios

```
GET  /api/investments/portfolios/
POST /api/investments/portfolios/
```

**POST request body:**
```json
{
  "name": "My Balanced Portfolio",
  "goal_id": 1,
  "holdings": [
    {"symbol": "VFV.TO", "allocation": 60},
    {"symbol": "ZAG.TO", "allocation": 40}
  ]
}
```

---

#### ML Recommendations

```
GET  /api/investments/ml/
POST /api/investments/ml/
```

**POST request body:**
```json
{
  "goal_id": 1,
  "risk_tolerance": "moderate"
}
```

Returns a machine-learning generated portfolio allocation optimised for the user's goal and risk level.

---

#### Asset Search

```
GET /api/investments/assets/search/?q=apple
```

**Response `200`:**
```json
[
  {"symbol": "AAPL", "name": "Apple Inc.", "exchange": "NASDAQ"}
]
```

---

#### Asset Detail

```
GET /api/investments/assets/detail/?symbol=AAPL
```

---

#### Asset Chart Data

```
GET /api/investments/assets/chart/?symbol=AAPL&period=1mo
```

**Supported periods:** `1d`, `5d`, `1mo`, `3mo`, `6mo`, `1y`, `2y`, `5y`

---

#### Asset Performance

```
GET /api/investments/assets/performance/
```

Returns performance metrics for a set of assets.

---

#### Portfolio Recommendations

```
GET /api/investments/recommendations/
```

Returns pre-built portfolio recommendations (Conservative, Balanced, Growth, Custom).

---

## 8. CI/CD Pipeline

### Continuous Integration (`ci.yml`)

Runs automatically on every pull request and push to `dev`.

**Steps:**
1. Check out code
2. Set up Python 3.11
3. Install dependencies from `requirements.txt`
4. Run `flake8` linting (max line length: 120)
5. Spin up a PostgreSQL service container
6. Run Django migrations and system checks
7. Run the full test suite with `coverage`
8. Enforce minimum **80% test coverage** — PRs fail if coverage drops below this threshold
9. Upload HTML coverage report as a GitHub Actions artifact

### Continuous Deployment (`deploy.yml`)

Runs automatically on every push to `dev`.

**Steps:**
1. SSH into the DigitalOcean droplet using a stored secret key
2. `git pull` the latest `dev` branch
3. Run `docker compose down && docker compose up -d --build`
4. Prune unused Docker images

**Required GitHub Secrets:**

| Secret | Description |
|---|---|
| `SSH_HOST` | IP address of the DigitalOcean droplet |
| `SSH_USERNAME` | SSH user (typically `root`) |
| `SSH_PRIVATE_KEY` | Private key for SSH access |

---

## 9. Production Deployment

SpendWise is deployed on a **DigitalOcean droplet** at `http://134.122.6.117:5174/`.

The domain `spendwise.info` is configured with SSL/TLS certificates managed by Certbot.

### Manual Deployment Steps

If you need to deploy manually (e.g., to a new server):

```bash
# 1. Provision an Ubuntu 22.04 droplet on DigitalOcean (or equivalent)

# 2. Install Docker
curl -fsSL https://get.docker.com | sh

# 3. Clone the repository
git clone https://github.com/csc301-2026-s/spendwise.git
cd spendwise
git checkout dev

# 4. Set production environment variables
# Edit backend/.env with production values (real PLAID keys, SMTP config, etc.)

# 5. Start services
docker compose up -d --build

# 6. Run migrations and seed data
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py ingest_awardexplorer
docker compose exec backend python manage.py ingest_awardexplorer --level grad
docker compose exec backend python manage.py sync_student_codes

# 7. Obtain SSL certificates (replace the domain as needed)
docker compose run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  -d spendwise.info -d www.spendwise.info \
  --email admin@spendwise.info --agree-tos --no-eff-email

# 8. Reload Nginx
docker compose exec nginx nginx -s reload
```

### SSL Certificate Renewal

Certbot certificates expire every 90 days. Set up a cron job to auto-renew:

```bash
# Run as root on the production server
0 3 * * * docker compose -f /path/to/spendwise/docker-compose.yml run --rm certbot renew && docker compose -f /path/to/spendwise/docker-compose.yml exec nginx nginx -s reload
```

---

## 10. Third-Party Services

### Plaid (Bank Integration)

- **Dashboard:** https://dashboard.plaid.com
- **Documentation:** https://plaid.com/docs/
- **Environment:** Currently `sandbox`. To move to production:
  1. Apply for Plaid Development access
  2. Update `PLAID_CLIENT_ID` and `PLAID_SECRET` in the environment
  3. Change `PLAID_ENV=development` in the Django settings
  4. Test with real bank credentials

**Sandbox test credentials:**
- Username: `user_good`
- Password: `pass_good`
- Verification code (if prompted): `1234`

### Alpha Vantage (Stock / Asset Data)

- **Dashboard:** https://www.alphavantage.co/
- Free tier: 25 requests/day. For production use, upgrade to a paid plan.
- Set `ALPHA_VANTAGE_API_KEY` in the backend environment.

### UofT Award Explorer (Scholarship Data)

- Data is scraped from `https://awardexplorer.utoronto.ca` using the `ingest_awardexplorer` management command.
- No API key required; the scraper uses `requests` + `BeautifulSoup4`.
- Re-run periodically to keep scholarship data current (recommended: once per academic term).

---

## 11. Testing

### Running Tests

```bash
# Run all tests
docker compose exec backend python manage.py test project_tests

# Run with coverage
docker compose exec backend bash -c "cd /app && coverage run manage.py test project_tests && coverage report"

# Generate HTML coverage report
docker compose exec backend bash -c "cd /app && coverage html"
# Open backend/htmlcov/index.html in your browser
```

### Test Structure

| File | Coverage Area |
|---|---|
| `project_tests/tests_accounts.py` | Registration, email verification, login, profile |
| `project_tests/tests_scholarship.py` | Scholarship listing, filtering, matching, save/status |
| `project_tests/tests_transcations.py` | Plaid link/exchange token, transaction sync |
| `project_tests/tests_spending.py` | Recurring merchants, spending analysis, savings tips |
| `project_tests/tests_codes.py` | Student code listing and filtering |
| `project_tests/tests_investment.py` | Goals, portfolios, ML recommendations |

### Frontend Tests

```bash
docker compose exec frontend npm test
```

Frontend tests use **Vitest**.

### Coverage Requirement

The CI pipeline enforces a minimum of **80% backend test coverage**. PRs that lower coverage below this threshold will fail.

---

## 12. Maintenance Procedures

### Keeping Scholarship Data Current

UofT scholarship listings change each academic term. Run the ingestion commands at the start of each semester:

```bash
docker compose exec backend python manage.py ingest_awardexplorer
docker compose exec backend python manage.py ingest_awardexplorer --level grad
```

### Keeping Student Codes Current

Student discount codes change frequently. Run monthly or more often:

```bash
docker compose exec backend python manage.py sync_student_codes
```

### Adding a New Feature

1. Create a Jira ticket for the feature.
2. Branch off `dev` with the naming convention `feature/<jira-id>-short-description`.
3. Implement the feature (backend model → migrations → serializer → views → URLs, then frontend).
4. Write tests; ensure coverage remains above 80%.
5. Open a PR into `dev`, request review from at least two team members.
6. After approval and merge, the CI/CD pipeline deploys automatically.

### Upgrading Dependencies

**Python:**
```bash
pip list --outdated           # Review outdated packages
# Update requirements.txt
docker compose up --build     # Rebuild containers
```

**Node:**
```bash
npm outdated                  # Review outdated packages
npm update
docker compose up --build
```

### Database Schema Changes

1. Edit the relevant Django model.
2. Generate and apply migrations:
   ```bash
   docker compose exec backend python manage.py makemigrations <app_name>
   docker compose exec backend python manage.py migrate
   ```
3. Commit the migration files to Git — they are part of the codebase.

---

## 13. Troubleshooting

### Containers fail to start

```bash
docker compose down
docker compose up --build
```

If the database container fails due to a port conflict (5433 already in use), stop any local PostgreSQL instance or change the host port in `docker-compose.yml`.

### `relation does not exist` / database errors

Migrations haven't been applied:
```bash
docker compose exec backend python manage.py migrate
```

### Frontend shows blank page or `NETWORK ERROR`

- Verify the backend container is running: `docker compose ps`
- Check backend logs: `docker compose logs backend`
- Confirm the Vite proxy in `frontend/vite.config.js` points to `http://backend:8000`

### Plaid Link not opening

- Confirm `PLAID_CLIENT_ID` and `PLAID_SECRET` are set correctly in the environment.
- Sandbox credentials must be used in sandbox mode.

### SSL certificate errors in production

```bash
docker compose run --rm certbot renew
docker compose exec nginx nginx -s reload
```

### Test coverage below 80%

Add tests for any new code paths before merging. Use the HTML coverage report to identify uncovered lines:
```bash
docker compose exec backend bash -c "coverage html && echo 'Open backend/htmlcov/index.html'"
```

---

## Handover Checklist

The following items should be confirmed before handover to a new team:

- [ ] Access to the GitHub repository (`csc301-2026-s/spendwise`)
- [ ] GitHub Actions secrets updated with new SSH credentials for the production server
- [ ] Access to the DigitalOcean account (or migration to a new hosting provider)
- [ ] Plaid dashboard credentials transferred (or new account created)
- [ ] Alpha Vantage API key transferred (or new key generated)
- [ ] `backend/.env` file shared securely (never committed to Git)
- [ ] Database backup taken and stored safely
- [ ] Certbot SSL certificate renewal cron job verified on production server
- [ ] New team members added to the GitHub repository

---

*For user-facing documentation, see [README.md](./README.md).*
