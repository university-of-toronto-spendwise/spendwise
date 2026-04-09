## UofT SpendWise
​
> _Note:_ This document is intended to be relatively short. Be concise and precise. Assume the reader has no prior knowledge of your application and is non-technical. 
​

## Description about the project
# SpendWise

SpendWise is a centralized financial support platform built specifically for UofT students. As OSAP grants shrink and student debt rises, students need smarter, proactive tools — not more spreadsheets.

## The Problem
- Reduced non-repayable grants and increased reliance on loans  
- Fragmented and outdated scholarship information  
- No centralized system to track OSAP, scholarships, and expenses  
- Students miss eligible funding and manually manage deadlines  
- Financial planning is reactive instead of strategic  

## Our Solution

### 📊 Financial Tracking & Planning
- Central dashboard for tuition, OSAP, scholarships, and expenses  
- Clear breakdown of loans vs. non-repayable funding  
- Helps students understand and manage debt early  

### 🎯 Personalized Scholarship Matching
- Profile-based eligibility matching  
- Ranked, relevant scholarship results  
- Clear explanations for matches  
- Reduces time spent on ineligible applications  

### 💰 Centralized Funding & Cost-Saving Hub
- Curated, up-to-date scholarship listings  
- Toronto-specific utilities and cost-saving resources  
- Verified student discounts and promo codes  
- One streamlined platform instead of scattered websites  

SpendWise empowers students to discover funding, reduce living costs, and manage their finances with clarity and confidence.

# SpendWise — Local Development Setup

This guide gets a new developer running SpendWise locally in under 10 minutes.

For the full technical reference (API docs, deployment, CI/CD, maintenance), see [HANDOVER.md](./HANDOVER.md).

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) v4.x+ (includes Compose V2)
- Git

Python and Node.js do **not** need to be installed locally — everything runs inside Docker containers.

---

## 1. Clone the Repository

```bash
git clone https://github.com/csc301-2026-s/spendwise.git
cd spendwise
git checkout dev
```

---

## 2. Start the Containers

```bash
docker compose up -d --build
```

This builds and starts four services: `db` (PostgreSQL), `backend` (Django), `frontend` (React/Vite), and `nginx` (reverse proxy).

First build takes a few minutes. Subsequent starts are faster:

```bash
docker compose up -d
```

---

## 3. Apply Database Migrations

Run this once after first build, and again whenever you pull changes that include new migrations:

```bash
docker compose exec backend python manage.py migrate
```

---

## 4. Seed Initial Data (Recommended)

Populate scholarship listings and student discount codes. Safe to skip if you only need auth/spending features:

```bash
# UofT undergrad and grad scholarship listings
docker compose exec backend python manage.py ingest_awardexplorer
docker compose exec backend python manage.py ingest_awardexplorer --level grad

# Student discount codes (SPC, UNiDAYS, Student Beans)
docker compose exec backend python manage.py sync_student_codes
```

These commands are idempotent — safe to re-run at any time.

---

## 5. Open the App

| Service | URL |
|---|---|
| Frontend | http://localhost:5174 |
| Backend API | http://localhost:8000/api/ |
| Django Admin | http://localhost:8000/admin/ |
| PostgreSQL | localhost:**5433** |

**Demo login credentials:**
- Email: `alihassan.shaikh@mail.utoronto.ca`
- Password: `SPENDWISE`

---

## Day-to-Day Development

### Branch workflow

All work branches off `dev`. Never commit directly to `dev`.

```bash
git checkout dev
git pull
git checkout -b feature/<jira-id>-short-description
```

Open a PR into `dev` when ready. PRs require review from at least two team members before merging.

### Viewing logs

```bash
docker compose logs -f backend
docker compose logs -f frontend
```

### Stopping containers

```bash
docker compose down          # stops containers, keeps data volumes
docker compose down -v       # stops containers AND wipes the database (destructive)
```

### After pulling changes

```bash
docker compose up -d --build                              # rebuild if dependencies changed
docker compose exec backend python manage.py migrate      # apply any new migrations
```

---

## Running Tests

```bash
# Run all backend tests
docker compose exec backend python manage.py test project_tests

# Run with coverage report
docker compose exec backend bash -c "coverage run manage.py test project_tests && coverage report"

# Generate HTML coverage report (open backend/htmlcov/index.html)
docker compose exec backend bash -c "coverage run manage.py test project_tests && coverage html"
```

The CI pipeline enforces a minimum of **80% coverage**. Keep this in mind before opening a PR.

```bash
# Frontend tests
docker compose exec frontend npm test
```

---

## Adding Dependencies

**Python:** Add the package to `backend/requirements.txt`, then rebuild:

```bash
docker compose up -d --build
```

**Node:** Add the package to `frontend/package.json`, then rebuild, or install directly into the running container:

```bash
docker compose exec frontend npm install <package-name>
docker compose up -d --build
```

---

## Useful Commands

```bash
# Open a Django shell
docker compose exec backend python manage.py shell

# Create a superuser for Django Admin
docker compose exec backend python manage.py createsuperuser

# Generate new migrations after changing a model
docker compose exec backend python manage.py makemigrations <app_name>

# Check for Django configuration errors
docker compose exec backend python manage.py check
```

---

## Environment Variables

The backend reads from `backend/.env`. For local development, the defaults in `docker-compose.yml` are already set — no `.env` file is required to get started.

If you need to override a value (e.g., a real Plaid key), create `backend/.env`:

```env
PLAID_CLIENT_ID=your-client-id
PLAID_SECRET=your-secret
```

See [HANDOVER.md § Environment Configuration](./HANDOVER.md#4-environment-configuration) for the full list of variables.

---

## Troubleshooting

**Containers won't start:**
```bash
docker compose down
docker compose up -d --build
```

**`relation does not exist` errors:** Migrations haven't been applied — run `docker compose exec backend python manage.py migrate`.

**Frontend shows blank page / network errors:** Check that the backend container is healthy with `docker compose ps` and inspect logs with `docker compose logs backend`.

**Port 5433 already in use:** Stop any local PostgreSQL instance, or change the host port in `docker-compose.yml`.

**`node_modules` issues after pulling:** Rebuild the frontend container with `docker compose up -d --build frontend`.


 ## Local Deployment and GitHub Workflow

### Git/GitHub Workflow

- We follow a **feature-branch workflow** integrated with **Jira**.
- Every task begins with a Jira ticket. The developer assigns the ticket to themselves and creates a branch using the naming convention:  
  `feature/<jira-ticket-id>-short-description`
- Branches are created from `dev` (our main working branch). No one works directly on `dev`.
- All changes are submitted through **Pull Requests (PRs) into `dev`**.
- Each PR must be reviewed by **at least two team members**, including:
  - The **Team Coordinator**
  - A team member working on the same feature area (e.g., backend/frontend)
- We use a **PR template** that requires:
  - Description of changes
  - Testing details
  - AI usage disclosure (if applicable)
- Reviewers are expected to leave meaningful comments before approval.
- The developer who opens the PR is responsible for addressing feedback.
- Once approved and merged, the corresponding Jira ticket is marked as complete.

**Why this workflow?**  
This structure ensures accountability through Jira tracking, improves collaboration through structured reviews, and maintains code quality by preventing direct changes to the main development branch.

---

### Local Deployment

- For local deployment, each team member must clone the repository and follow the Development Environment Setup instructions.
- Ensure all prerequisites are installed (Docker, Git, Python if using a local virtual environment).
- Create the virtual environment (if needed), configure `.env` files, and run:

  ```bash
  docker compose up --build
---

## Coding Standards and Guidelines

All folders and file names must use lowercase and follow Django’s default project structure. We maintain consistent code organization by structuring backend files according to features and will document our workflow to ensure clarity, scalability, and team alignment.
---

## License

- The repository will remain **private** during development.
- Upon public release, the project will be licensed under the **MIT License (MIT)**.
- The MIT License allows others to use, modify, and distribute the software with proper attribution while limiting liability.
- Keeping the repository private during development protects unfinished work and prevents premature external use.

