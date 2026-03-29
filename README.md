
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

## Instructions


## How to Use the Application

Deployed the version through Digitial Ocean App

http://134.122.6.117:5174/

---
## 1. Login / Sign Up

Users can either **log in with existing credentials** or **create a new account**.

### Demo Login Credentials

You may log in using the following credentials:

- **Email:** alihassan.shaikh@mail.utoronto.ca  
- **Password:** SPENDWISE

<img width="674" height="698" alt="Login Page" src="https://github.com/user-attachments/assets/fc5c7404-976e-43c1-bfad-23fa6ebc26dd" />

### Create a New Account

If you create a new account, you will be asked several questions about your financial situation, such as:

- Current monthly expenses
- Total income
- Scholarships or financial aid
- Other relevant financial information

These responses will be used in **D4** to generate **personalized financial insights and recommendations**.

<img width="1353" height="788" alt="Dashboard Page" src="https://github.com/user-attachments/assets/f8e8f599-7649-42f8-9cc4-c7e74e37aa45" />

### After Login

After successfully logging in, users will be redirected to the **main dashboard** where they can view and manage their financial data.(Screenshot in the second section)



### Future Improvements

In future versions, we plan to integrate **University of Toronto authentication (UofT SSO)** so students can log in using their university accounts.

---

## 2. Dashboard

The **Dashboard** is the main landing page after a user logs in.

From here, users can quickly view an overview of their financial activity and key information.

### Features

On the dashboard, users can:

- View an overview of their spending
- See financial alerts
- Check upcoming deadlines
- View a daily financial tip

<img width="743" height="377" alt="Dashboard Overview" src="https://github.com/user-attachments/assets/cdc8a97f-7ee0-4a30-8932-17de3f52ca64" />

---

## Bank Connection (D3 Feature)

The **Bank Connection** feature allows users to connect their bank accounts to SpendWise in order to sync and analyze transactions.

### Current Implementation

- The **Plaid API** is used to connect bank accounts.
- The system currently runs in the **Plaid Sandbox environment**, which allows users to connect **dummy bank accounts for testing purposes**.
- The full connection pipeline has been implemented **end-to-end**.
- Further testing will be required before moving from **Sandbox → Development environment**.

### Connecting a Bank Account

For a new user, the dashboard will show a **"Connect Bank Account"** option.

When connecting an account:

1. A Plaid connection window will appear.
2. Users can select a **test bank account**.
3. A verification code can be entered if prompted.
4. Users can connect **one bank account at a time**.

<img width="576" height="739" alt="Bank Connection" src="https://github.com/user-attachments/assets/fc0b9cbd-21eb-45d8-92c5-afa4c25bba3d" />

---

### Connected Bank Account

Once connected, the bank account will appear on the dashboard.

Currently, users must select **Last Month** because the Plaid sandbox provides transactions for **February 2026**.

<img width="1437" height="796" alt="Connected Bank Account" src="https://github.com/user-attachments/assets/c6573b61-4d2e-44db-b156-ff090fd45765" />

---

### Dashboard Summary

The dashboard provides a quick summary of:

- Connected bank accounts
- Financial status
- Recent transactions
- Alerts and insights

---

## Future Improvements (D4)

Planned enhancements include:

- Support for **multiple connected bank accounts**
- Ability to connect **real bank accounts** (outside the sandbox environment)
- Support for **multiple months of transaction data**
- Expanded financial insights and analytics


---

## 3. Scholarship Page

Navigate to the **Scholarship** section from the navigation menu.

On this page you can:
- Browse scholarships from UofT campuses and colleges
- Match to my profile to see scholarships ranked by eligibility (edit your profile first for better matches)
- Filter by campus, year, faculty, discipline, and other criteria
- Save scholarships with the bookmark icon; they appear in “View saved” and in **Upcoming Deadlines** (Dashboard and this page)
- View saved to see only your saved scholarships, each with a **status**: Saved / Planned, In Progress, or Submitted (manage status on the My Scholarships page)
- Use the Upcoming Deadlines panel (fixed on the right) to see saved scholarships ordered by due date

This helps you quickly find and track funding opportunities that match your profile.

<img width="1280" height="800" alt="image" src="https://github.com/user-attachments/assets/c451a2e9-0b54-426d-97de-55587136dc83" />


---

## 4. Spending Page

Navigate to the **Spending** section to view your monthly financial activity.

Features available on this page:

- **Monthly Transactions**  
  View all transactions for a selected month (e.g., February 2026). The page summarizes:
  - Total monthly expenses
  - Estimated monthly savings opportunities

- **Savings Suggestions**  
  The system analyzes your spending and identifies potential savings using common **student discounts or promotional offers** (e.g., Uber Eats, DoorDash).  
  For example, if a user spends more than **5 times or over $300** with a specific service, the backend calculates how much could be saved by applying available discounts.

- **Investment Perspective**  
  The platform highlights potential savings so users can redirect that money toward **future investments or financial goals**.

- **Transaction Syncing**  
  Users must click **Sync** to retrieve the latest transaction data from Plaid.

- **Filtering**  
  Users can filter transactions to analyze spending patterns.

⚠️ **Current Limitation (D4):**  
Due to Plaid limitations in this stage of development, only **last month's transactions** are currently supported. Future updates will expand this to support **multiple months and more customizable analysis**.

---

### Future Improvements

Planned enhancements include:
- **Smart financial tips** when overspending in certain categories
- **Improved multi-month transaction analysis**

<img width="1124" height="747" alt="image" src="https://github.com/user-attachments/assets/2c6e3619-b7c4-4a33-9901-7221cc1eb0be" />



---

## 5. Student Codes (Discounts)

The **Student Codes** feature allows users to access verified student discount codes that can help reduce everyday spending.

### Current Implementation

- The **backend functionality** has been fully implemented.
- The **UI/UX interface** allows users to easily browse and explore available discount codes.
- Initially, discount codes were added **manually**, but the system now uses a **Python scraper** to automatically collect and populate the database with **SPC and other student discount codes**.
- Users can **search and filter** available discounts based on membership or category.

<img width="1280" height="1186" alt="Student Codes Page" src="https://github.com/user-attachments/assets/a1e1fff1-6a4e-47e2-b5f1-64626f1b309c" />

### Purpose

This feature helps students quickly find relevant discounts and potentially reduce their spending on services such as food delivery, retail purchases, and subscriptions.

---

### Future Improvements (D4)

- **Personalized Discount Recommendations**  
  Based on a user's spending patterns, the system will recommend relevant student discount codes directly on the **dashboard**.

- **Spending-Based Insights**  
  The platform will analyze transaction history and suggest **trending or high-value discount codes** that align with the user's spending habits.

- **Dashboard Integration**  
  Recommended discount codes will appear directly on the **dashboard**, allowing users to quickly discover savings opportunities without needing to manually search for them.



---

## 6. Bank Connection

The bank connection feature allows users to connect their bank accounts to Spendwise.

Currently:
The plaid API is being used in a sandbox environment to allow users to connect dummy bank accounts. Further testing is required before the 
sandbox environment will be able to switch to a dev env. This feature has been implemented end to end.



---

## 7. Profile & My Scholarships

**Profile (navbar)**  
Click your profile icon to open a dropdown with your name, major/year, and links to:
- Edit Profile — opens the Profile page where you can set faculty, major, year, degree, status, and campus (used for scholarship matching).
- My Scholarships — opens a Kanban board of your saved scholarships.
- Log out

**My Scholarships**  
On the My Scholarships page you can:
- See saved scholarships in three columns: **Saved / Planned**, **In Progress**, and **Submitted**
- Drag and drop cards between columns to update their status
- Each card shows title, amount, deadline, and a color-coded status pill

**Settings (navbar)**  
Click the settings icon to:
- Switch theme between light and dark mode (saved for your next visit)
- Report a bug (opens a form that emails a bug report)


---

## 8. Investments Feature

**Built interactive 3-step flow turning real savings data into personalized portfolio recommendations.**

Investment Guidance
Click "Investments" tile to access goal simulator where you:

- Review auto-filled savings baseline from spending analysis
- Set financial goal (laptop/tuition/travel) with target amount/date/risk level
- Compare 4 portfolios (Conservative/Balanced/Growth/Custom) vs savings-only
- See projected value + investing edge ($80/mo advantage example)
- Save goal + portfolio to track progress across SpendWise
  *4 options: Conservative, Balanced, Growth, Custom*

<img width="1600" height="1034" alt="image" src="https://github.com/user-attachments/assets/427e7727-3f08-474b-b3ba-df6c0d4426d1" />

#### Future Improvements

- ML-powered custom portfolios analyzing real-time market data (Yahoo Finance/Alpha Vantage)
- Personalized allocation recommendations based on spending patterns + risk tolerance
- Auto-rebalancing alerts when portfolio drifts from target allocations
- Integration with actual brokerage APIs for live tracking

## Summary

SpendWise centralizes:
- Financial tracking with a personalized dashboard
- Scholarship discovery, saving, and status tracking (Saved / In Progress / Submitted)
- Profile-based matching and upcoming deadlines
- Spending management and transaction insights
- Student discounts and codes

All in one platform designed to simplify financial decision-making for UofT students.

Since D2, we have:

- **Plaid integration** — Real-time transaction sync in sandbox mode; connect bank accounts and view transactions.
- **User profile** — Academic profile (faculty, major, year, etc.) used for scholarship matching; editable from the dedicated Profile page and navbar.
- **Filtering and insights** — Filter transactions by period, account, category, and date; Saving Tips panel with tailored suggestions.
- **Scholarships workflow** — Save scholarships, track status (Saved / In Progress / Submitted), Kanban board (My Scholarships), profile-based matching, and Upcoming Deadlines on Dashboard and Scholarships page.
- **Theme and settings** — Light/dark mode (persisted) and Report a bug from the navbar settings dropdown.

 ---
 
# Development Environment Setup

This project uses **Docker Compose** to orchestrate the Django (Backend), React (Frontend), and PostgreSQL (Database) services.

---

## Prerequisites

Before you begin, ensure you have:

- **Docker Desktop** (Docker Compose V2 (Desktop Version 4.X onwards))
- **Git**
- **Python 3.10+** (only if using local virtual environment)

---

## Working with the `dev` Branch

After cloning the repository, follow these steps to work on the remote `dev` branch.

### 1) Clone the Repository

```bash
git clone https://github.com/csc301-2026-s/spendwise.git
cd spendwise
git fetch --all
git checkout -b dev origin/dev
```

---

### 2)  Create a Local Virtual Environment

> ⚠️ Not required when running everything through Docker.  
> Useful if you want to run Django commands locally.

Create a virtual environment:

```bash
python3 -m venv venv
```

Activate the virtual environment:

```bash
source venv/bin/activate
```
Install the dependencies:

```bash
python3 -m pip install -r backend/requirements.txt
```
Deactivate when done:

```bash
deactivate
```

---

### 3) Start all containers, migrate, and (optional) load scholarships

1. **Build images** (when dependencies or Dockerfiles change):

   ```bash
   docker compose build
   ```

   Use **`docker compose up -d --build`** to build and start in one step. The `-d` flag is for **`up`** (run detached), not for `build` — `docker compose build -d` is invalid.

2. **Start containers** in the background:

   ```bash
   docker compose up -d
   ```

3. **Apply database migrations** (always run this inside the **backend** container so Django can reach Postgres):

   ```bash
   docker compose exec backend python manage.py migrate
   ```

4. **Load scholarship data** from U of T Award Explorer (requires network; can take several minutes). Ingest **undergraduate** and **graduate** catalogs separately:

   ```bash
   docker compose exec backend python manage.py ingest_awardexplorer --level undergrad
   docker compose exec backend python manage.py ingest_awardexplorer --level grad
   ```

   Optional: prune overdue saved-scholarship rows without a full ingest:

   ```bash
   docker compose exec backend python manage.py scholarships_cleanup
   ```

   **Saved scholarships vs monthly deficit (API for integrations):** `GET /api/scholarships/saved/deficit-impact/` (JWT required) returns the user’s profile-based **monthly deficit**, count and nominal dollar total of saved awards, a probability-weighted **potential** amount, and **remaining deficit** after that potential. Optional query: `?probability=0.8` (must be in `(0, 1]`; default from env below). Catalog award amounts are not normalized to monthly; the JSON `notes` and `disclaimer` fields explain that the figures are illustrative.

   **Backend environment variables** (optional; see `backend/config/settings.py`):

   | Variable | Purpose |
   |----------|---------|
   | `SCHOLARSHIP_ASSUMED_WIN_PROBABILITY` | Default probability for `potential_amount` when `probability` is omitted (default `0.8`). |
   | `AWARD_EXPLORER_POST_URL` | POST endpoint for paginated Award Explorer export. |
   | `AWARD_EXPLORER_UNDERGRAD_BASE_URL` | Undergrad catalog page URL. |
   | `AWARD_EXPLORER_UNDERGRAD_REPORT_ID` | Report id for undergrad ingest. |
   | `AWARD_EXPLORER_UNDERGRAD_REPORT_NAME` | Report name string sent with undergrad requests. |
   | `AWARD_EXPLORER_GRAD_BASE_URL` | Graduate catalog page URL. |
   | `AWARD_EXPLORER_GRAD_REPORT_ID` | Report id for graduate ingest. |
   | `AWARD_EXPLORER_GRAD_REPORT_NAME` | Report name string sent with graduate requests. |

5. **Stop containers** (keeps database data in the Docker volume):

   ```bash
   docker compose down
   ```

#### Running `manage.py` on your Mac vs inside Docker

Compose sets **`POSTGRES_HOST=db`**, which is the **Postgres service name on the Docker network**. It only resolves **inside** containers (e.g. the `backend` container). If you run `python3 manage.py …` from your laptop in `backend/`, Django will try to connect to host `db` and fail with a DNS error.

- **Recommended:** run Django commands through the backend container, as above (`docker compose exec backend python manage.py …`).
- **If you use a local venv** on the host, point Django at the published port: set **`POSTGRES_HOST=127.0.0.1`**, **`POSTGRES_PORT=5433`**, and the same **`POSTGRES_DB` / `POSTGRES_USER` / `POSTGRES_PASSWORD`** as in `docker-compose.yml`, with **`docker compose up -d`** running so Postgres is listening.

On macOS, use **`python3`** if the `python` command is not installed.

---


## Service Access / Traffic Flow

| Service   | Host URL                  | Docker Alias     | Purpose                    |
|------------|--------------------------|------------------|----------------------------|
| Frontend   | http://localhost:5174    | frontend:5174    | React/Vite Dev Server      |
| Backend    | http://localhost:8000    | backend:8000     | Django REST API            |
| Database   | localhost:5433           | db:5432          | PostgreSQL (host maps 5433 → container 5432) |

---

## Dependency Changes

If you add or modify dependencies:

- Python → `requirements.txt`
- Node → `package.json`

Rebuild containers:

```bash
docker compose up --build
```

---

## Notes

- Data is persisted via Docker volumes.
- Avoid running `docker compose down -v` unless you want to wipe the database.
- If containers fail to start, try:

```bash
docker compose down
docker compose up --build
```
 
 ## Deployment and GitHub Workflow

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

### Deployment

- For local deployment, each team member must clone the repository and follow the Development Environment Setup instructions.
- Ensure all prerequisites are installed (Docker, Git, Python if using a local virtual environment).
- Create the virtual environment (if needed), configure `.env` files, and run:

  ```bash
  docker compose up --build
  ```

---

## Coding Standards and Guidelines


All folders and file names must use lowercase and follow Django’s default project structure. We maintain consistent code organization by structuring backend files according to features and will document our workflow to ensure clarity, scalability, and team alignment.

---
  
## License

- The repository will remain **private** during development.
- Upon public release, the project will be licensed under the **MIT License (MIT)**.
- The MIT License allows others to use, modify, and distribute the software with proper attribution while limiting liability.
- Keeping the repository private during development protects unfinished work and prevents premature external use.

