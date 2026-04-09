# SpendWise

SpendWise is a centralized financial support platform built for University of Toronto students. As OSAP grants shrink and student debt rises, students need smarter, proactive tools — not more spreadsheets.

## How to Use the Application

Deployed the version through Digitial Ocean App

https://spendwise.info/

---

## The Problem

- Reduced non-repayable grants and increased reliance on loans
- Fragmented and outdated scholarship information
- No centralized system to track OSAP, scholarships, and expenses
- Students miss eligible funding and manually manage deadlines
- Financial planning is reactive instead of strategic

---

## Features

| Feature | Description |
|---|---|
| **Dashboard** | Overview of spending, financial alerts, upcoming scholarship deadlines, and daily financial tips |
| **Scholarship Discovery** | Browse UofT scholarships, filter by campus/faculty/year, and get ranked matches based on your academic profile |
| **My Scholarships** | Kanban board to track saved scholarships through three stages: Saved/Planned → In Progress → Submitted |
| **Spending Analysis** | View monthly transactions from your connected bank account, with savings suggestions based on your spending patterns |
| **Student Codes** | Browse and search verified student discount codes from SPC, UNiDAYS, and Student Beans |
| **Investment Planning** | Set financial goals, compare portfolio strategies (Conservative/Balanced/Growth/Custom), and get ML-powered recommendations |
| **Bank Connection** | Connect your bank account via Plaid to automatically sync transactions |
| **Dark Mode** | Full light/dark theme toggle, persisted between sessions |

---

## Accessing the Application

**Live deployment:** http://134.122.6.117:5174/

**Demo login credentials:**
- Email: `alihassan.shaikh@mail.utoronto.ca`
- Password: `SPENDWISE`

---

## Quick Start (Local)

Requirements: [Docker Desktop](https://www.docker.com/products/docker-desktop/) and Git.

```bash
git clone https://github.com/csc301-2026-s/spendwise.git
cd spendwise
git checkout dev

docker compose up -d --build
docker compose exec backend python manage.py migrate

# Optional: seed scholarship and discount code data (recommended on first run)
docker compose exec backend python manage.py ingest_awardexplorer
docker compose exec backend python manage.py ingest_awardexplorer --level grad
docker compose exec backend python manage.py sync_student_codes
```

Open http://localhost:5174 in your browser.

---

## User Guide

### 1. Login / Sign Up

Create a new account or log in with existing credentials. New accounts require email verification with a 6-digit code.

During onboarding, you will be asked for your academic profile (faculty, major, year, campus) and basic financial information. This data is used to provide personalized scholarship matches and financial insights.

![Login Page](https://github.com/user-attachments/assets/fc5c7404-976e-43c1-bfad-23fa6ebc26dd)

---

### 2. Dashboard

The dashboard is your financial home base. It shows:
- A summary of your connected bank accounts and recent spending
- Financial alerts (e.g., overspending in a category)
- Upcoming scholarship deadlines for scholarships you have saved
- A daily financial tip

![Dashboard Overview](https://github.com/user-attachments/assets/cdc8a97f-7ee0-4a30-8932-17de3f52ca64)

---

### 3. Connecting a Bank Account

SpendWise uses **Plaid** to securely connect your bank account. The current implementation uses Plaid's **sandbox environment** (test accounts only — no real banking credentials are used or stored).

To connect:
1. Click **Connect Bank Account** on the dashboard.
2. A Plaid window will appear. Select a test bank.
3. Use username `user_good` / password `pass_good`.
4. Once connected, your transactions will appear in the Spending page.

> Note: Plaid sandbox provides transactions for **February 2026**. Select "Last Month" in the Spending page to view them.

---

### 4. Scholarships

Navigate to **Scholarships** from the navigation bar.

- **Browse:** Scroll through all UofT scholarships.
- **Filter:** Narrow results by campus, year, faculty, discipline, or keyword.
- **Match to Profile:** Click "Match to my profile" for ranked results based on your academic profile. Update your profile first for best results.
- **Save:** Click the bookmark icon to save a scholarship. Saved scholarships appear in the **Upcoming Deadlines** panel and on the My Scholarships page.

![Scholarships Page](https://github.com/user-attachments/assets/c451a2e9-0b54-426d-97de-55587136dc83)

---

### 5. My Scholarships (Kanban Board)

Access via the profile dropdown in the navigation bar.

Manage saved scholarships across three stages by dragging and dropping cards:
- **Saved / Planned** — scholarships you intend to apply for
- **In Progress** — applications currently underway
- **Submitted** — applications you have submitted

Each card shows the title, award amount, deadline, and a colour-coded status.

---

### 6. Spending Analysis

Navigate to **Spending** from the navigation bar.

Click **Sync** to fetch the latest transactions from your connected bank account. The page displays:
- Total monthly expenses
- Spending breakdown by category
- **Savings Suggestions:** If you spend heavily with a merchant that offers student discounts, the system calculates how much you could save by applying available codes.

![Spending Page](https://github.com/user-attachments/assets/2c6e3619-b7c4-4a33-9901-7221cc1eb0be)

---

### 7. Student Codes

Navigate to **Student Codes** from the navigation bar.

Browse and search verified discount codes from:
- **SPC** (Student Price Card)
- **UNiDAYS**
- **Student Beans**

Filter by category or search by merchant name. The **Recommended** tab shows codes relevant to your spending patterns.

![Student Codes Page](https://github.com/user-attachments/assets/a1e1fff1-6a4e-47e2-b5f1-64626f1b309c)

---

### 8. Investment Planning

Navigate to **Investments** from the dashboard or navigation bar.

The three-step investment flow:
1. **Review your savings baseline** — auto-populated from your spending analysis.
2. **Set a financial goal** — choose a goal (e.g., laptop, tuition, travel), target amount, date, and risk tolerance.
3. **Compare portfolios** — see projected values for Conservative, Balanced, Growth, and Custom strategies vs. saving alone.

Save your goal and chosen portfolio to track progress across SpendWise.

![Investment Planning](https://github.com/user-attachments/assets/427e7727-3f08-474b-b3ba-df6c0d4426d1)

---

### 9. Profile & Settings

**Profile:** Click your profile icon in the navigation bar → **Edit Profile** to update your faculty, major, year, degree type, campus, and financial details.

**Settings:** Click the settings icon in the navigation bar to:
- Toggle **Dark Mode** (preference is saved)
- **Report a Bug** via a form that sends an email report

---

## Architecture Summary

```
Browser → Nginx → React Frontend (port 5174)
                → Django REST API (port 8000) → PostgreSQL
                                              → Plaid API
                                              → Alpha Vantage API
```

The full technical architecture, API reference, and developer setup are documented in [HANDOVER.md](./HANDOVER.md).

---

## Changelog Since D2

- **Plaid integration** — Real-time transaction sync in sandbox mode
- **Spending analysis** — Monthly breakdown, recurring merchant detection, savings suggestions
- **Investment planning** — Goal simulator, portfolio builder, ML-powered recommendations
- **My Scholarships** — Drag-and-drop Kanban board with status tracking
- **Student Codes** — Automated scraper for SPC, UNiDAYS, and Student Beans
- **User profile** — Academic profile used for scholarship matching
- **Dark mode** — Persisted light/dark theme
- **CI/CD** — GitHub Actions pipeline with automated tests and deployment to DigitalOcean
- **SSL/TLS** — HTTPS via Let's Encrypt / Certbot on the production server

---

## License

The repository is private during development. Upon public release, the project will be licensed under the **MIT License**.
