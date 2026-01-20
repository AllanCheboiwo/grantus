# Grantus - Grant Management Platform

A comprehensive grant management platform that helps staff manage grant opportunities, match them to clients (nonprofit organizations), track applications, and automatically notify clients of status updates.

## Tech Stack

- **Backend:** FastAPI (Python)
- **Frontend:** React + TypeScript + Vite
- **Database:** PostgreSQL
- **Containerization:** Docker & Docker Compose

## Features

- 📋 **Grant Database** - Manage external funding opportunities with eligibility criteria
- 🎯 **Smart Matching** - Match clients to suitable grants based on eligibility profiles
- 📊 **Application Pipeline** - Kanban-style tracking from draft to awarded/declined
- 📧 **Automated Notifications** - Email clients on status changes
- 👥 **Role-Based Access** - Admin, Staff, and Client roles
- 📝 **Audit Trail** - Full history of application events and communications

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Git

### Setup

1. Clone the repository:
```bash
git clone https://github.com/AllanCheboiwo/grantus.git
cd grantus
```

2. Copy environment file:
```bash
cp .env.example .env
```

3. Start all services:
```bash
docker compose up --build
```

4. Access the application:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

### Default Admin Login
- Email: admin@grantus.ca
- Password: admin123 (change in production!)

## Project Structure

```
grantus/
├── backend/           # FastAPI application
│   ├── app/
│   │   ├── api/       # API routes
│   │   ├── core/      # Config, security, dependencies
│   │   ├── models/    # SQLAlchemy models
│   │   ├── schemas/   # Pydantic schemas
│   │   └── services/  # Business logic
│   ├── alembic/       # Database migrations
│   └── tests/
├── frontend/          # React application
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── types/
│   └── public/
├── infra/             # Infrastructure configs
└── docker-compose.yml
```

## Development

### Backend Development
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend Development
```bash
cd frontend
npm install
npm run dev
```

### Database Migrations
```bash
cd backend
alembic upgrade head      # Apply migrations
alembic revision --autogenerate -m "description"  # Create new migration
```

## API Documentation

Once running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## License

MIT License - see LICENSE file for details.
