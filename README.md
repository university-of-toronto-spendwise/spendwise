
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

After running the application locally (see Development Environment Setup instructions below),  open:

http://localhost:5174

---

## 1. Login / Sign Up

- Log in using the provided credentials, or
  email: admin5@gmail.com
  password: SPENDWISE1
- Create a new account through the registration page.
- After successful login, you will be redirected to the **Dashboard**.

<img width="674" height="698" alt="image" src="https://github.com/user-attachments/assets/fc5c7404-976e-43c1-bfad-23fa6ebc26dd" />



---

## 2. Dashboard

The Dashboard is the main landing page after login.

Here you can:
- View an overview of your spending
- See financial alerts
- Check upcoming deadlines
- View a daily financial tip

This page provides a quick summary of your financial status.

<img width="1236" height="839" alt="image" src="https://github.com/user-attachments/assets/01dd8e83-f0e6-4d75-adb8-859a3e6606d0" />


---

## 3. Scholarship Page

Navigate to the **Scholarship** section from the navigation menu.

On this page, you can:
- Browse scholarships from all three UofT campuses and colleges
- Filter scholarships by:
  - Campus
  - Year
  - Faculty
  - Discipline

This helps students quickly identify funding opportunities that match their profile.

<img width="1280" height="800" alt="image" src="https://github.com/user-attachments/assets/c451a2e9-0b54-426d-97de-55587136dc83" />


---

## 4. Spending Page

Navigate to the **Spending** section.

Here you can:
- View your recent transactions
- Track your spending activity

Future improvements (planned):
- Monthly spending breakdown
- Smart tips when overspending in certain categories

<img width="1073" height="834" alt="image" src="https://github.com/user-attachments/assets/8c80d4ca-dee9-45b6-a3c0-dd27af8f900f" />


---

## 5. Student Codes (Discounts)

The Student Codes feature allows access to verified student discount codes.

Currently:
- Backend functionality is implemented.
- Codes are managed through Django Admin.
- Four different student categories have been configured.

Discount codes can be accessed via:
http://localhost:8000/admin

Frontend integration is partially completed.

<img width="909" height="431" alt="image" src="https://github.com/user-attachments/assets/3adccfcc-a0b5-4658-aae7-5f035dfdab1e" />


---

## Summary

SpendWise centralizes:
- Financial tracking
- Scholarship discovery
- Spending management
- Student discounts

All in one platform designed to simplify financial decision-making for UofT students.
 
# Development Environment Setup

This project uses **Docker Compose** to orchestrate the Django (Backend), React (Frontend), and PostgreSQL (Database) services.

---

## Prerequisites

Before you begin, ensure you have:

- **Docker Desktop** (latest version recommended)
- **Git**
- **Python 3.10+** (only if using local virtual environment)

---

## Working with the `dev` Branch

After cloning the repository, follow these steps to work on the remote `dev` branch.

### 1) Clone the Repository

```bash
git clone https://github.com/redpinecube/spendwise.git
cd spendwise
git fetch --all
git checkout -b dev origin/dev
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

Deactivate when done:

```bash
deactivate
```

---

### 4) Start All Containers

Build and start services:



Run in background:

```bash

docker compose up -d --build
```

Run scholarship explorer migration:

```bash
docker compose exec backend python manage.py ingest_awardexplorer

```

Stop containers:

```bash
docker compose down
```

---


## Service Access / Traffic Flow

| Service   | Host URL                  | Docker Alias     | Purpose                    |
|------------|--------------------------|------------------|----------------------------|
| Frontend   | http://localhost:5174    | frontend:5174    | React/Vite Dev Server      |
| Backend    | http://localhost:8000    | backend:8000     | Django REST API            |
| Database   | localhost:5432           | db:5432          | PostgreSQL Instance        |

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
---

## Coding Standards and Guidelines

All folders and file names must use lowercase and follow Django’s default project structure. We maintain consistent code organization by structuring backend files according to features and will document our workflow to ensure clarity, scalability, and team alignment.
---

## License

- The repository will remain **private** during development.
- Upon public release, the project will be licensed under the **MIT License (MIT)**.
- The MIT License allows others to use, modify, and distribute the software with proper attribution while limiting liability.
- Keeping the repository private during development protects unfinished work and prevents premature external use.

