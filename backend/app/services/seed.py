"""
Seed data for the Grantus database
Run this after migrations to populate lookup tables and create admin user
"""
from datetime import date, timedelta
from decimal import Decimal
from sqlalchemy.orm import Session
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.models.lookup import Cause, ApplicantType, Province, EligibilityFlag
from app.models.grant import Grant, GrantStatus, DeadlineType
from app.models.client import Client


def seed_provinces(db: Session):
    """Seed Canadian provinces and territories"""
    provinces = [
        ("AB", "Alberta"),
        ("BC", "British Columbia"),
        ("MB", "Manitoba"),
        ("NB", "New Brunswick"),
        ("NL", "Newfoundland and Labrador"),
        ("NS", "Nova Scotia"),
        ("NT", "Northwest Territories"),
        ("NU", "Nunavut"),
        ("ON", "Ontario"),
        ("PE", "Prince Edward Island"),
        ("QC", "Quebec"),
        ("SK", "Saskatchewan"),
        ("YT", "Yukon"),
    ]
    
    count = 0
    for code, name in provinces:
        existing = db.query(Province).filter(Province.code == code).first()
        if not existing:
            db.add(Province(code=code, name=name, country_code="CA"))
            count += 1
    
    db.commit()
    print(f"✓ Seeded {count} new provinces (total: {len(provinces)})")


def seed_causes(db: Session):
    """Seed cause categories"""
    causes = [
        "Arts & Culture",
        "Children & Youth",
        "Community Development",
        "Disabilities",
        "Education & Literacy",
        "Employment & Training",
        "Environment & Conservation",
        "Food Security",
        "Health & Wellness",
        "Homelessness & Housing",
        "Human Rights",
        "Immigration & Refugees",
        "Indigenous Peoples",
        "Mental Health",
        "Poverty Reduction",
        "Seniors",
        "Social Services",
        "Sports & Recreation",
        "Women & Girls",
    ]
    
    count = 0
    for name in causes:
        existing = db.query(Cause).filter(Cause.name == name).first()
        if not existing:
            db.add(Cause(name=name))
            count += 1
    
    db.commit()
    print(f"✓ Seeded {count} new causes (total: {len(causes)})")


def seed_applicant_types(db: Session):
    """Seed applicant types"""
    types = [
        "Registered Charity",
        "Nonprofit Organization",
        "Charitable Foundation",
        "First Nations Band",
        "Indigenous Organization",
        "Social Enterprise",
        "Cooperative",
        "Community Association",
        "Educational Institution",
        "Healthcare Organization",
        "Religious Organization",
        "Municipality",
        "Individual (Sponsored)",
    ]
    
    count = 0
    for name in types:
        existing = db.query(ApplicantType).filter(ApplicantType.name == name).first()
        if not existing:
            db.add(ApplicantType(name=name))
            count += 1
    
    db.commit()
    print(f"✓ Seeded {count} new applicant types (total: {len(types)})")


def seed_eligibility_flags(db: Session):
    """Seed eligibility flags"""
    flags = [
        "Indigenous-led",
        "Women-led",
        "Youth-led",
        "Black-led",
        "LGBTQ2S+-led",
        "Disability-led",
        "Immigrant-led",
        "Rural/Remote",
        "Francophone",
    ]
    
    count = 0
    for name in flags:
        existing = db.query(EligibilityFlag).filter(EligibilityFlag.name == name).first()
        if not existing:
            db.add(EligibilityFlag(name=name))
            count += 1
    
    db.commit()
    print(f"✓ Seeded {count} new eligibility flags (total: {len(flags)})")


def seed_admin_user(db: Session):
    """Create default admin user"""
    admin_email = "admin@grantus.ca"
    existing = db.query(User).filter(User.email == admin_email).first()
    
    if not existing:
        admin = User(
            email=admin_email,
            name="Admin User",
            role=UserRole.admin,
            password_hash=get_password_hash("admin123"),
            is_active=True
        )
        db.add(admin)
        db.commit()
        print(f"✓ Created admin user: {admin_email} / admin123")
    else:
        print(f"✓ Admin user already exists: {admin_email}")
    
    return db.query(User).filter(User.email == admin_email).first()


def seed_demo_grants(db: Session, admin_user: User):
    """Create demo grants for testing"""
    existing_count = db.query(Grant).count()
    if existing_count >= 5:
        print(f"✓ Demo grants already exist ({existing_count} grants)")
        return
    
    # Get lookups
    bc = db.query(Province).filter(Province.code == "BC").first()
    on = db.query(Province).filter(Province.code == "ON").first()
    ab = db.query(Province).filter(Province.code == "AB").first()
    
    charity = db.query(ApplicantType).filter(ApplicantType.name == "Registered Charity").first()
    nonprofit = db.query(ApplicantType).filter(ApplicantType.name == "Nonprofit Organization").first()
    
    health = db.query(Cause).filter(Cause.name == "Health & Wellness").first()
    education = db.query(Cause).filter(Cause.name == "Education & Literacy").first()
    environment = db.query(Cause).filter(Cause.name == "Environment & Conservation").first()
    community = db.query(Cause).filter(Cause.name == "Community Development").first()
    youth = db.query(Cause).filter(Cause.name == "Children & Youth").first()
    
    indigenous_flag = db.query(EligibilityFlag).filter(EligibilityFlag.name == "Indigenous-led").first()
    
    demo_grants = [
        {
            "name": "Vancouver Foundation Community Grant",
            "funder": "Vancouver Foundation",
            "description": "Supporting community-led initiatives in British Columbia that address local needs and create lasting change.",
            "source_url": "https://www.vancouverfoundation.ca/grants",
            "status": GrantStatus.open,
            "deadline_type": DeadlineType.rolling,
            "amount_min": Decimal("5000"),
            "amount_max": Decimal("50000"),
            "provinces": [bc] if bc else [],
            "applicant_types": [charity, nonprofit] if charity and nonprofit else [],
            "causes": [community, health] if community and health else [],
        },
        {
            "name": "Ontario Trillium Foundation - Seed Grant",
            "funder": "Ontario Trillium Foundation",
            "description": "Seed grants for new ideas and emerging organizations working to build healthy and vibrant communities.",
            "source_url": "https://www.otf.ca/our-grants",
            "status": GrantStatus.open,
            "deadline_type": DeadlineType.fixed,
            "deadline_at": date.today() + timedelta(days=45),
            "amount_min": Decimal("10000"),
            "amount_max": Decimal("75000"),
            "provinces": [on] if on else [],
            "applicant_types": [charity, nonprofit] if charity and nonprofit else [],
            "causes": [community, youth, education] if community and youth and education else [],
        },
        {
            "name": "RBC Foundation Future Launch",
            "funder": "RBC Foundation",
            "description": "Helping young people gain meaningful employment through skills development and work experience programs.",
            "source_url": "https://www.rbc.com/community-social-impact/",
            "status": GrantStatus.open,
            "deadline_type": DeadlineType.fixed,
            "deadline_at": date.today() + timedelta(days=30),
            "amount_min": Decimal("25000"),
            "amount_max": Decimal("100000"),
            "provinces": [],  # National
            "applicant_types": [charity, nonprofit] if charity and nonprofit else [],
            "causes": [youth, education] if youth and education else [],
        },
        {
            "name": "TD Friends of the Environment Foundation",
            "funder": "TD Bank",
            "description": "Supporting environmental projects that help green and protect the environment in local communities across Canada.",
            "source_url": "https://www.td.com/ca/en/about-td/ready-commitment/funding",
            "status": GrantStatus.open,
            "deadline_type": DeadlineType.multiple,
            "deadline_at": date.today() + timedelta(days=60),
            "amount_min": Decimal("2000"),
            "amount_max": Decimal("15000"),
            "provinces": [],  # National
            "applicant_types": [charity, nonprofit] if charity and nonprofit else [],
            "causes": [environment] if environment else [],
        },
        {
            "name": "First Nations Health Authority Wellness Grant",
            "funder": "First Nations Health Authority",
            "description": "Supporting Indigenous-led health and wellness initiatives in British Columbia.",
            "source_url": "https://www.fnha.ca/",
            "status": GrantStatus.open,
            "deadline_type": DeadlineType.rolling,
            "amount_min": Decimal("10000"),
            "amount_max": Decimal("50000"),
            "provinces": [bc] if bc else [],
            "applicant_types": [charity, nonprofit] if charity and nonprofit else [],
            "causes": [health] if health else [],
            "eligibility_flags": [indigenous_flag] if indigenous_flag else [],
        },
    ]
    
    count = 0
    for grant_data in demo_grants:
        existing = db.query(Grant).filter(Grant.name == grant_data["name"]).first()
        if not existing:
            provinces = grant_data.pop("provinces", [])
            applicant_types = grant_data.pop("applicant_types", [])
            causes = grant_data.pop("causes", [])
            eligibility_flags = grant_data.pop("eligibility_flags", [])
            
            grant = Grant(
                **grant_data,
                created_by_user_id=admin_user.id
            )
            grant.provinces = [p for p in provinces if p]
            grant.applicant_types = [t for t in applicant_types if t]
            grant.causes = [c for c in causes if c]
            grant.eligibility_flags = [f for f in eligibility_flags if f]
            
            db.add(grant)
            count += 1
    
    db.commit()
    print(f"✓ Seeded {count} demo grants")


def seed_demo_clients(db: Session):
    """Create demo clients for testing"""
    existing_count = db.query(Client).count()
    if existing_count >= 3:
        print(f"✓ Demo clients already exist ({existing_count} clients)")
        return
    
    # Get lookups
    bc = db.query(Province).filter(Province.code == "BC").first()
    on = db.query(Province).filter(Province.code == "ON").first()
    
    charity = db.query(ApplicantType).filter(ApplicantType.name == "Registered Charity").first()
    nonprofit = db.query(ApplicantType).filter(ApplicantType.name == "Nonprofit Organization").first()
    
    health = db.query(Cause).filter(Cause.name == "Health & Wellness").first()
    education = db.query(Cause).filter(Cause.name == "Education & Literacy").first()
    environment = db.query(Cause).filter(Cause.name == "Environment & Conservation").first()
    community = db.query(Cause).filter(Cause.name == "Community Development").first()
    youth = db.query(Cause).filter(Cause.name == "Children & Youth").first()
    
    demo_clients = [
        {
            "name": "Youth Empowerment Society",
            "entity_type": "Registered Charity",
            "notes": "Focus on youth education and employment programs in Vancouver.",
            "provinces": [bc] if bc else [],
            "applicant_types": [charity] if charity else [],
            "causes": [youth, education] if youth and education else [],
        },
        {
            "name": "GreenFuture Environmental Alliance",
            "entity_type": "Nonprofit Organization",
            "notes": "Environmental conservation and climate action initiatives across Canada.",
            "provinces": [bc, on] if bc and on else [],
            "applicant_types": [nonprofit] if nonprofit else [],
            "causes": [environment, community] if environment and community else [],
        },
        {
            "name": "Community Wellness Centre",
            "entity_type": "Registered Charity",
            "notes": "Mental health and wellness services for underserved communities in Ontario.",
            "provinces": [on] if on else [],
            "applicant_types": [charity] if charity else [],
            "causes": [health, community] if health and community else [],
        },
    ]
    
    count = 0
    for client_data in demo_clients:
        existing = db.query(Client).filter(Client.name == client_data["name"]).first()
        if not existing:
            provinces = client_data.pop("provinces", [])
            applicant_types = client_data.pop("applicant_types", [])
            causes = client_data.pop("causes", [])
            
            client = Client(**client_data)
            client.provinces = [p for p in provinces if p]
            client.applicant_types = [t for t in applicant_types if t]
            client.causes = [c for c in causes if c]
            
            db.add(client)
            count += 1
    
    db.commit()
    print(f"✓ Seeded {count} demo clients")


def run_seeds(db: Session):
    """Run all seed functions"""
    print("\n🌱 Seeding database...")
    print("-" * 40)
    
    seed_provinces(db)
    seed_causes(db)
    seed_applicant_types(db)
    seed_eligibility_flags(db)
    admin_user = seed_admin_user(db)
    seed_demo_grants(db, admin_user)
    seed_demo_clients(db)
    
    print("-" * 40)
    print("✅ Database seeding complete!\n")


if __name__ == "__main__":
    from app.core.database import SessionLocal
    
    db = SessionLocal()
    try:
        run_seeds(db)
    finally:
        db.close()
