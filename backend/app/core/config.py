from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "Grantus"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # Database
    DATABASE_URL: str = "postgresql://grantus:grantus_secret@localhost:5432/grantus"
    
    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"
    
    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]
    
    # Email (Resend)
    RESEND_API_KEY: str = ""
    EMAIL_FROM: str = "Grantus <noreply@allancheboiwo.com>"
    
    # Frontend URL (for invite links)
    FRONTEND_URL: str = "http://localhost:5173"
    
    # Stripe (Payments)
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_PRICE_MONTHLY: str = ""  # price_xxx from Stripe Dashboard
    STRIPE_PRICE_ANNUAL: str = ""   # price_yyy from Stripe Dashboard
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
