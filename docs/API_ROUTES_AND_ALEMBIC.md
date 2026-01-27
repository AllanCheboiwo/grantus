# Grantus API Routes & Alembic Migrations

This document covers all implemented API routes and explains how Alembic database migrations work.

---

## 📡 API Overview

All API routes are prefixed with `/api` and organized by resource.

**Base URL:** `http://localhost:8000/api`

**Documentation:** 
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

---

## 🔐 Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/login` | Public | Login and get JWT token |
| POST | `/auth/register` | Public | Register new user |

### Login Request
```json
POST /api/auth/login
Content-Type: application/x-www-form-urlencoded

username=admin@grantus.ca&password=admin123
```

### Login Response
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "user": {
    "id": "uuid",
    "email": "admin@grantus.ca",
    "name": "Admin User",
    "role": "admin"
  }
}
```

### Using the Token
```
Authorization: Bearer <access_token>
```

---

## 👤 Users

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/users/me` | Any | Get current user info |
| GET | `/users/` | Admin | List all users |
| GET | `/users/{id}` | Admin | Get user by ID |
| POST | `/users/` | Admin | Create new user |
| PATCH | `/users/{id}` | Admin | Update user |
| DELETE | `/users/{id}` | Admin | Delete user |

### Create User
```json
POST /api/users/
{
  "email": "staff@example.com",
  "name": "Staff Member",
  "password": "securepass123",
  "role": "staff"  // admin, staff, or client
}
```

---

## 💰 Grants

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/grants/` | Any | List grants (with filters) |
| GET | `/grants/{id}` | Any | Get grant details |
| POST | `/grants/` | Staff | Create new grant |
| PATCH | `/grants/{id}` | Staff | Update grant |
| POST | `/grants/{id}/verify` | Staff | Verify grant status |
| DELETE | `/grants/{id}` | Staff | Delete grant |

### Filter Parameters (GET /grants/)
- `status`: open, closed, unknown
- `deadline_type`: fixed, rolling, multiple
- `province_id`: UUID
- `applicant_type_id`: UUID
- `cause_id`: UUID
- `search`: text search

### Create Grant
```json
POST /api/grants/
{
  "name": "Community Innovation Grant",
  "funder": "Foundation XYZ",
  "description": "Supports community projects",
  "source_url": "https://example.com/grant",
  "status": "open",
  "deadline_type": "fixed",
  "deadline_at": "2026-03-01",
  "amount_min": 5000,
  "amount_max": 25000,
  "cause_ids": ["uuid1", "uuid2"],
  "applicant_type_ids": ["uuid3"],
  "province_ids": ["uuid4", "uuid5"]
}
```

---

## 🏢 Clients

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/clients/` | Staff | List all clients |
| GET | `/clients/{id}` | Any | Get client details |
| POST | `/clients/` | Staff | Create new client |
| PATCH | `/clients/{id}` | Staff | Update client |
| PATCH | `/clients/{id}/eligibility` | Staff | Update eligibility profile |
| DELETE | `/clients/{id}` | Staff | Delete client |
| GET | `/clients/{id}/messages` | Any | Get client messages |
| GET | `/clients/{id}/users` | Staff | List portal users |
| POST | `/clients/{id}/users` | Staff | Create portal user |
| DELETE | `/clients/{id}/users/{user_id}` | Staff | Remove portal user |

### Create Client
```json
POST /api/clients/
{
  "name": "Community Helpers Society",
  "entity_type": "registered_charity",
  "notes": "Internal notes here",
  "cause_ids": ["uuid1"],
  "applicant_type_ids": ["uuid2"],
  "province_ids": ["uuid3"]
}
```

### Update Eligibility Profile
```json
PATCH /api/clients/{id}/eligibility
{
  "cause_ids": ["uuid1", "uuid2"],
  "applicant_type_ids": ["uuid3"],
  "province_ids": ["uuid4"],
  "eligibility_flag_ids": ["uuid5"]
}
```

---

## 🎯 Matches

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/matches/` | Staff | List matches |
| GET | `/matches/{id}` | Staff | Get match details |
| POST | `/matches/generate/{client_id}` | Staff | Generate recommendations (preview) |
| POST | `/matches/` | Staff | Save a match |
| PATCH | `/matches/{id}` | Staff | Update match status |
| DELETE | `/matches/{id}` | Staff | Delete match |

### Generate Matches (Preview)
```
POST /api/matches/generate/{client_id}
```
Returns array of potential matches with fit scores (0-100), fit levels (high/medium/low), and matching reasons. Does NOT save to database.

### Save Match
```json
POST /api/matches/
{
  "client_id": "uuid",
  "grant_id": "uuid",
  "fit_score": 85,
  "fit_level": "high",
  "reasons": {
    "matching_causes": ["Education"],
    "matching_provinces": ["BC"]
  },
  "status": "qualified"  // new, qualified, rejected, converted
}
```

### Match Status Flow
```
new → qualified → converted (becomes Application)
        ↓
     rejected
```

---

## 📝 Applications

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/applications/` | Any | List applications |
| GET | `/applications/pipeline` | Staff | Get stage counts |
| GET | `/applications/{id}` | Any | Get application |
| POST | `/applications/` | Staff | Create application |
| PATCH | `/applications/{id}` | Staff | Update application |
| DELETE | `/applications/{id}` | Staff | Delete application |
| GET | `/applications/{id}/events` | Any | Get timeline events |
| POST | `/applications/{id}/events` | Staff | Add event/note |

### Filter Parameters (GET /applications/)
- `client_id`: UUID
- `stage`: draft, in_progress, submitted, awarded, declined, reporting, closed
- `assigned_to_user_id`: UUID

### Pipeline View
```
GET /api/applications/pipeline
→ { "draft": 5, "in_progress": 3, "submitted": 2, ... }
```

### Create Application
```json
POST /api/applications/
{
  "client_id": "uuid",
  "grant_id": "uuid",
  "match_id": "uuid",  // optional - links to match
  "stage": "draft",
  "internal_deadline_at": "2026-02-15",
  "amount_requested": 15000,
  "assigned_to_user_id": "uuid"  // optional - defaults to current user
}
```

### Application Stages
```
draft → in_progress → submitted → awarded → reporting → closed
                          ↓
                       declined → closed
```

### Add Note/Event
```json
POST /api/applications/{id}/events
{
  "event_type": "note",  // note, doc_request
  "note": "Waiting for financial statements"
}
```

---

## ✉️ Invites

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/invites/client/{client_id}` | Staff | List pending invites |
| POST | `/invites/client/{client_id}` | Staff | Create & send invite |
| POST | `/invites/{id}/resend` | Staff | Resend invite email |
| DELETE | `/invites/{id}` | Staff | Cancel invite |
| GET | `/invites/verify/{token}` | Public | Verify invite token |
| POST | `/invites/accept` | Public | Accept invite, create account |

### Create Invite
```json
POST /api/invites/client/{client_id}
{
  "email": "contact@client.org",
  "name": "John Smith",
  "client_role": "owner"  // owner or viewer
}
```
Sends an email with an invite link that expires in 7 days.

### Accept Invite
```json
POST /api/invites/accept
{
  "token": "abc123xyz...",
  "password": "newpassword123"
}
```
Creates the user account and links them to the client organization.

---

## 🌐 Client Portal

These endpoints are for client users viewing their own organization's data.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/portal/my-client` | Client | Get my organization |
| GET | `/portal/applications` | Client | List my applications |
| GET | `/portal/applications/{id}` | Client | Get application detail |
| GET | `/portal/applications/{id}/events` | Client | Get application events |

**Note:** Portal endpoints automatically scope data to the logged-in client user's organization.

---

## 📚 Lookups

Reference data endpoints (no authentication required).

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/lookups/causes` | List all causes |
| GET | `/lookups/applicant-types` | List applicant types |
| GET | `/lookups/provinces` | List provinces |
| GET | `/lookups/eligibility-flags` | List eligibility flags |

---

## 🔒 Authentication Levels

| Level | Description | Endpoints |
|-------|-------------|-----------|
| **Public** | No auth required | Login, Register, Verify Invite, Accept Invite, Lookups |
| **Any** | Any authenticated user | Get current user, View grants, View applications |
| **Client** | Client role only | Portal endpoints |
| **Staff** | Staff or Admin | Create/update grants, clients, applications |
| **Admin** | Admin only | Manage users |

---

# 🗃️ Alembic Database Migrations

## What is Alembic?

Alembic is a database migration tool for SQLAlchemy. It tracks and applies changes to your database schema over time.

**Think of it like Git, but for your database schema:**
- Each migration is a "commit" of database changes
- You can upgrade (apply changes) or downgrade (revert changes)
- Migrations are versioned and ordered

## Why Use Migrations?

1. **Version Control:** Track all database changes in code
2. **Reproducibility:** Recreate database from scratch
3. **Team Collaboration:** Everyone runs the same migrations
4. **Deployment:** Safely update production databases
5. **Rollback:** Revert changes if something breaks

## File Structure

```
backend/
├── alembic.ini              # Alembic configuration
└── alembic/
    ├── env.py               # Runtime configuration
    ├── script.py.mako       # Migration template
    └── versions/            # Migration files
        ├── 001_initial_schema.py
        └── 002_add_client_invites.py
```

## Configuration Files

### alembic.ini
Main configuration file:
```ini
[alembic]
script_location = alembic     # Where migration scripts live
prepend_sys_path = .          # Add current dir to Python path
```

### env.py
Runtime configuration that:
- Loads your SQLAlchemy models
- Gets the database URL from environment
- Connects to the database
- Runs migrations

```python
# Key lines in env.py:
from app.core.database import Base
from app.models import *  # Load all models

database_url = os.getenv("DATABASE_URL")
target_metadata = Base.metadata  # SQLAlchemy knows your tables
```

## Migration File Anatomy

Each migration file has:

```python
"""Description of changes

Revision ID: 002
Revises: 001              # Previous migration (forms a chain)
Create Date: 2026-01-22
"""

revision = '002'          # This migration's ID
down_revision = '001'     # Must run 001 first

def upgrade() -> None:
    """Apply the changes"""
    op.create_table('new_table', ...)

def downgrade() -> None:
    """Revert the changes"""
    op.drop_table('new_table')
```

## Common Alembic Commands

### Check Current Status
```bash
# Inside Docker:
docker compose exec backend alembic current

# Shows which migration the database is at
```

### Apply All Migrations
```bash
docker compose exec backend alembic upgrade head
```
`head` means "latest migration"

### Apply Specific Migration
```bash
docker compose exec backend alembic upgrade 002
```

### Revert Last Migration
```bash
docker compose exec backend alembic downgrade -1
```

### Revert to Specific Migration
```bash
docker compose exec backend alembic downgrade 001
```

### Show Migration History
```bash
docker compose exec backend alembic history
```

### Create New Migration (Manual)
```bash
docker compose exec backend alembic revision -m "add new column"
```
Creates empty migration file for you to fill in.

### Create Migration (Auto-generate)
```bash
docker compose exec backend alembic revision --autogenerate -m "add new column"
```
Alembic compares your models to database and generates changes automatically.

## How Migrations Work

### The Chain
Migrations form a linked chain:
```
None → 001 → 002 → 003 → ...
```

Each migration knows its predecessor via `down_revision`.

### The alembic_version Table
Alembic creates a special table in your database:
```sql
SELECT * FROM alembic_version;
-- Returns: version_num = '002' (current migration)
```

### Running Migrations
When you run `alembic upgrade head`:
1. Alembic checks `alembic_version` table
2. Finds migrations not yet applied
3. Runs them in order
4. Updates `alembic_version`

## Common Operations

### Create a New Table
```python
def upgrade():
    op.create_table(
        'new_table',
        sa.Column('id', postgresql.UUID(), primary_key=True),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now())
    )

def downgrade():
    op.drop_table('new_table')
```

### Add a Column
```python
def upgrade():
    op.add_column('users', sa.Column('phone', sa.String()))

def downgrade():
    op.drop_column('users', 'phone')
```

### Create an Index
```python
def upgrade():
    op.create_index('ix_users_email', 'users', ['email'])

def downgrade():
    op.drop_index('ix_users_email')
```

### Add Foreign Key
```python
def upgrade():
    op.add_column('posts', sa.Column('author_id', postgresql.UUID()))
    op.create_foreign_key(
        'fk_posts_author',
        'posts', 'users',
        ['author_id'], ['id']
    )

def downgrade():
    op.drop_constraint('fk_posts_author', 'posts')
    op.drop_column('posts', 'author_id')
```

## Best Practices

### 1. Never Edit Applied Migrations
Once a migration has been applied (especially in production), don't modify it. Create a new migration instead.

### 2. Test Downgrade
Always test your `downgrade()` function works correctly.

### 3. Keep Migrations Small
One logical change per migration is easier to manage.

### 4. Descriptive Names
Use clear names: `add_client_invites`, `remove_legacy_columns`

### 5. Review Auto-generated Migrations
Autogenerate is helpful but not perfect. Always review before applying.

## Our Migrations

### 001_initial_schema.py
Creates all initial tables:
- users
- clients
- client_users
- grants
- matches
- applications
- application_events
- messages
- Lookup tables (causes, provinces, etc.)
- Junction tables (grant_causes, client_causes, etc.)

### 002_add_client_invites.py
Adds the client invitation system:
- client_invites table
- Indexes for token and email lookups

## When Docker Starts

Our `entrypoint.sh` automatically runs:
```bash
alembic upgrade head
python -c "from app.services.seed import seed_database; seed_database()"
```

This ensures the database schema is always up-to-date when the container starts.

---

## 📖 Quick Reference

### Apply migrations
```bash
docker compose exec backend alembic upgrade head
```

### Check status
```bash
docker compose exec backend alembic current
```

### Create migration
```bash
docker compose exec backend alembic revision --autogenerate -m "description"
```

### Rollback one
```bash
docker compose exec backend alembic downgrade -1
```

### View history
```bash
docker compose exec backend alembic history
```
