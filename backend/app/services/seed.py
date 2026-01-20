"""
Seed data for the Grantus database
Run this after migrations to populate lookup tables and create admin user
"""
from sqlalchemy.orm import Session
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.models.lookup import Cause, ApplicantType, Province, EligibilityFlag


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
    
    for code, name in provinces:
        existing = db.query(Province).filter(Province.code == code).first()
        if not existing:
            db.add(Province(code=code, name=name, country_code="CA"))
    
    db.commit()
    print(f"✓ Seeded {len(provinces)} provinces")


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
    
    for name in causes:
        existing = db.query(Cause).filter(Cause.name == name).first()
        if not existing:
            db.add(Cause(name=name))
    
    db.commit()
    print(f"✓ Seeded {len(causes)} causes")


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
    
    for name in types:
        existing = db.query(ApplicantType).filter(ApplicantType.name == name).first()
        if not existing:
            db.add(ApplicantType(name=name))
    
    db.commit()
    print(f"✓ Seeded {len(types)} applicant types")


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
    
    for name in flags:
        existing = db.query(EligibilityFlag).filter(EligibilityFlag.name == name).first()
        if not existing:
            db.add(EligibilityFlag(name=name))
    
    db.commit()
    print(f"✓ Seeded {len(flags)} eligibility flags")


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


def run_seeds(db: Session):
    """Run all seed functions"""
    print("\n🌱 Seeding database...")
    seed_provinces(db)
    seed_causes(db)
    seed_applicant_types(db)
    seed_eligibility_flags(db)
    seed_admin_user(db)
    print("✓ Database seeding complete!\n")


if __name__ == "__main__":
    from app.core.database import SessionLocal
    
    db = SessionLocal()
    try:
        run_seeds(db)
    finally:
        db.close()
