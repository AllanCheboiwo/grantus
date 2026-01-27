# Grantus Data Models & Relationships

This document explains the database models, their schemas, and how they interact.

---

## 📊 Entity Relationship Diagram (Text)

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│    User     │◄────────│ ClientUser  │────────►│   Client    │
│  (admin,    │         │  (junction) │         │(organization)│
│staff,client)│         └─────────────┘         └──────┬──────┘
└──────┬──────┘                                        │
       │                                               │
       │ creates/owns                                  │ has
       ▼                                               ▼
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│    Grant    │◄────────│    Match    │────────►│(from Client)│
│(opportunity)│         │(recommendation)       └─────────────┘
└──────┬──────┘         └──────┬──────┘
       │                       │
       │ applied to            │ converts to
       ▼                       ▼
┌─────────────────────────────────────────────────────────────┐
│                        Application                          │
│            (Client applying to a Grant)                     │
└─────────────────────────────────────────────────────────────┘
       │
       │ has many
       ▼
┌─────────────┐         ┌─────────────┐
│Application  │         │   Message   │
│   Event     │         │(comm log)   │
└─────────────┘         └─────────────┘
```

---

## 🔐 User Model

**Table:** `users`

The User model represents all system users with role-based access.

### Fields
| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `email` | String | Unique, indexed |
| `name` | String | Display name |
| `role` | Enum | `admin`, `staff`, or `client` |
| `password_hash` | String | Hashed password |
| `is_active` | Boolean | Account status |
| `created_at` | DateTime | Timestamp |
| `updated_at` | DateTime | Timestamp |

### Roles
- **Admin**: Full system access, can create staff users
- **Staff**: Can manage grants, clients, applications
- **Client**: Portal access only, sees their own organization data

### Relationships
```
User ──┬──► ClientUser (many) ──► belongs to Client organizations
       ├──► Match (many) ──► owns/assigned matches
       ├──► Application (many) ──► assigned applications
       └──► Grant (many) ──► created grants
```

---

## 🏢 Client Model

**Table:** `clients`

Represents client organizations (nonprofits, charities, etc.) seeking grants.

### Fields
| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `name` | String | Organization name |
| `entity_type` | String | charity, nonprofit, business, etc. |
| `notes` | Text | Internal notes |
| `created_at` | DateTime | Timestamp |
| `updated_at` | DateTime | Timestamp |

### Relationships
```
Client ──┬──► ClientUser (many) ──► portal users
         ├──► Match (many) ──► grant recommendations
         ├──► Application (many) ──► grant applications
         ├──► Message (many) ──► communication log
         │
         │  (Eligibility Profile - Many-to-Many)
         ├──►► Cause (many)
         ├──►► ApplicantType (many)
         ├──►► Province (many)
         └──►► EligibilityFlag (many)
```

---

## 👥 ClientUser Model (Junction Table)

**Table:** `client_users`

Links Users to Client organizations with specific roles.

### Fields
| Field | Type | Description |
|-------|------|-------------|
| `client_id` | UUID | FK to Client (composite PK) |
| `user_id` | UUID | FK to User (composite PK) |
| `client_role` | String | `owner` or `viewer` |

### Purpose
- A User with role=`client` can belong to one or more Client organizations
- `owner`: Full access to client data
- `viewer`: Read-only access

---

## 💰 Grant Model

**Table:** `grants`

Represents external grant opportunities that clients can apply for.

### Fields
| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `name` | String | Grant name |
| `funder` | String | Organization offering the grant |
| `description` | Text | Grant description |
| `source_url` | String | Link to grant page |
| `notes` | Text | Internal notes |
| `status` | Enum | `open`, `closed`, `unknown` |
| `deadline_type` | Enum | `fixed`, `rolling`, `multiple` |
| `deadline_at` | Date | For fixed deadline |
| `next_deadline_at` | Date | For multiple rounds |
| `amount_min` | Decimal | Minimum funding amount |
| `amount_max` | Decimal | Maximum funding amount |
| `currency` | String | Default: CAD |
| `created_by_user_id` | UUID | FK to User who created |
| `created_at` | DateTime | Timestamp |
| `updated_at` | DateTime | Timestamp |

### Relationships
```
Grant ──┬──► Match (many) ──► recommendations to clients
        ├──► Application (many) ──► client applications
        ├──► User (one) ──► created_by
        │
        │  (Eligibility Criteria - Many-to-Many)
        ├──►► Cause (many)
        ├──►► ApplicantType (many)
        ├──►► Province (many)
        └──►► EligibilityFlag (many)
```

---

## 🎯 Match Model

**Table:** `matches`

Stored recommendation linking a Client to a Grant (potential fit).

### Fields
| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `client_id` | UUID | FK to Client |
| `grant_id` | UUID | FK to Grant |
| `fit_score` | Integer | 0-100 match score |
| `fit_level` | String | high, medium, low |
| `reasons` | JSONB | Explainable matching output |
| `notes` | Text | Internal notes |
| `status` | Enum | `new`, `qualified`, `rejected`, `converted` |
| `owner_user_id` | UUID | FK to User (staff assigned) |
| `created_at` | DateTime | Timestamp |
| `updated_at` | DateTime | Timestamp |

### Status Flow
```
new ──► qualified ──► converted (to Application)
  │         │
  └─────────┴──► rejected
```

### Unique Constraint
One Match per Client-Grant pair.

### Relationships
```
Match ──┬──► Client (one)
        ├──► Grant (one)
        ├──► User (one) ──► owner
        └──► Application (one, optional) ──► when converted
```

---

## 📝 Application Model

**Table:** `applications`

Client's application to a specific grant.

### Fields
| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `client_id` | UUID | FK to Client |
| `grant_id` | UUID | FK to Grant |
| `match_id` | UUID | FK to Match (optional) |
| `stage` | Enum | Application stage |
| `internal_deadline_at` | Date | Internal deadline |
| `submitted_at` | DateTime | When submitted |
| `decision_at` | DateTime | When decision received |
| `amount_requested` | Decimal | Amount requested |
| `amount_awarded` | Decimal | Amount awarded (if any) |
| `assigned_to_user_id` | UUID | FK to User (staff) |
| `cycle_year` | Integer | Optional year tracking |
| `round_label` | String | Optional round label |
| `created_at` | DateTime | Timestamp |
| `updated_at` | DateTime | Timestamp |

### Stage Flow (Pipeline)
```
draft ──► in_progress ──► submitted ──┬──► awarded ──► reporting ──► closed
                                      │
                                      └──► declined ──► closed
```

### Relationships
```
Application ──┬──► Client (one)
              ├──► Grant (one)
              ├──► Match (one, optional)
              ├──► User (one) ──► assigned_to
              ├──► ApplicationEvent (many) ──► timeline
              └──► Message (many) ──► communications
```

---

## 📅 ApplicationEvent Model

**Table:** `application_events`

Timeline events for tracking application progress.

### Fields
| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `application_id` | UUID | FK to Application |
| `event_type` | Enum | Type of event |
| `from_stage` | String | Previous stage |
| `to_stage` | String | New stage |
| `note` | Text | Event note/details |
| `created_by_user_id` | UUID | FK to User |
| `created_at` | DateTime | Timestamp |

### Event Types
- `status_change`: Stage transition
- `note`: General note added
- `doc_request`: Document requested
- `submission`: Application submitted
- `decision`: Decision received

---

## ✉️ ClientInvite Model

**Table:** `client_invites`

Pending invitations for client portal users.

### Fields
| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `email` | String | Invitee email |
| `name` | String | Invitee name (optional) |
| `client_id` | UUID | FK to Client |
| `client_role` | String | `owner` or `viewer` |
| `token` | String | Unique invite token |
| `expires_at` | DateTime | Expiry (7 days default) |
| `created_by_user_id` | UUID | FK to User (staff) |
| `created_at` | DateTime | Timestamp |

### Flow
```
Staff creates invite ──► Email sent with link ──► User clicks link
                                                        │
                                                        ▼
                              User sets password ──► User account created
                                                        │
                                                        ▼
                                              ClientUser link created
                                                        │
                                                        ▼
                                               Invite deleted
```

---

## 📬 Message Model

**Table:** `messages`

Communication log for emails/notifications sent to clients.

### Fields
| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `client_id` | UUID | FK to Client |
| `application_id` | UUID | FK to Application (optional) |
| `channel` | Enum | `email` or `portal` |
| `subject` | String | Message subject |
| `body` | Text | Message content |
| `sent_to` | String | Recipient email |
| `sent_at` | DateTime | When sent |
| `created_by_user_id` | UUID | FK to User |
| `created_at` | DateTime | Timestamp |

---

## 📚 Lookup Tables

These are reference tables used for tagging and filtering.

### Cause
**Table:** `causes`
- Examples: Education, Healthcare, Environment, Arts & Culture

### ApplicantType  
**Table:** `applicant_types`
- Examples: Registered Charity, Nonprofit, First Nations, Social Enterprise

### Province
**Table:** `provinces`
- Canadian provinces/territories with codes (BC, ON, AB, etc.)

### EligibilityFlag
**Table:** `eligibility_flags`
- Examples: Indigenous-led, Women-led, Youth-led, Rural/Remote

---

## 🔗 Many-to-Many Association Tables

These junction tables link Grants and Clients to lookup values:

| Table | Links |
|-------|-------|
| `grant_causes` | Grant ↔ Cause |
| `grant_applicant_types` | Grant ↔ ApplicantType |
| `grant_provinces` | Grant ↔ Province |
| `grant_eligibility_flags` | Grant ↔ EligibilityFlag |
| `client_causes` | Client ↔ Cause |
| `client_applicant_types` | Client ↔ ApplicantType |
| `client_provinces` | Client ↔ Province |
| `client_eligibility_flags` | Client ↔ EligibilityFlag |

---

## 🔄 How Models & Schemas Interact

### Models (SQLAlchemy)
- Define database structure
- Handle relationships and foreign keys
- Used for database operations (CRUD)

### Schemas (Pydantic)
- Define API request/response shapes
- Validate incoming data
- Serialize outgoing data
- Separate from database models

### Example Flow: Creating an Application

```
1. Frontend sends POST /api/applications with ApplicationCreate schema
   
2. Backend validates data against Pydantic schema
   
3. Backend creates SQLAlchemy Application model instance
   
4. Database saves the record
   
5. Backend returns ApplicationResponse schema (serialized model)
```

### Schema Pattern

```python
# Create schema (for POST requests)
class ApplicationCreate(BaseModel):
    client_id: UUID
    grant_id: UUID
    amount_requested: Optional[Decimal]

# Update schema (for PUT/PATCH requests)  
class ApplicationUpdate(BaseModel):
    stage: Optional[ApplicationStage]
    amount_requested: Optional[Decimal]

# Response schema (for API responses)
class ApplicationResponse(BaseModel):
    id: UUID
    client_id: UUID
    grant_id: UUID
    stage: ApplicationStage
    client: ClientResponse  # Nested
    grant: GrantResponse    # Nested
    
    class Config:
        from_attributes = True  # Allows ORM model → Pydantic
```

---

## 📈 Key Business Flows

### 1. Grant Matching
```
Grant eligibility ─┐
                   ├─► Compare ─► Match created with fit_score
Client profile ────┘
```

### 2. Application Pipeline
```
Match (qualified) ─► Convert to Application ─► Work through stages ─► Decision
```

### 3. Client Portal Access
```
Staff invites client ─► Client accepts ─► Client logs in ─► Sees their applications
```
