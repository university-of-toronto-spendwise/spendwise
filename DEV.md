# Development Environment Setup

This project uses **Docker Compose** to orchestrate the Django (Backend), React (Frontend), and PostgreSQL (Database) services. Follow the steps below to get your local environment running.

---

## Prerequisites

Before you begin, ensure you have the following installed:
* **Docker Desktop** (latest version recommended)
* **Git**
---

## Getting Started

### 1. Clone the Repository
```bash
git clone [https://github.com/redpinecube/spendwise.git](https://github.com/redpinecube/spendwise.git)
```

### 2. Start all Containers
```bash
docker compose up --build
```


Here is how the traffic flows:

| Service   | External Port (Browser/Host) | Internal Alias (Docker Net) | Destination / Purpose       |
|-----------|------------------------------|----------------------------|----------------------------|
| Frontend  | http://localhost:5173        | frontend:5173             | React/Vite Dev Server      |
| Backend   | http://localhost:8000        | backend:8000              | Django REST API            |
| Database  | localhost:5432               | db:5432                   | PostgreSQL Instance        |

### Dependency Changes: 
If you add a package to requirements.txt or package.json, you must rebuild.
