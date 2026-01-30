from fastapi import APIRouter
from app.api.routes import auth, users, grants, clients, matches, applications, lookups, portal, invites, subscriptions, managed_service_requests

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(managed_service_requests.router, prefix="/managed-service-requests", tags=["Managed Service Requests"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(grants.router, prefix="/grants", tags=["Grants"])
api_router.include_router(clients.router, prefix="/clients", tags=["Clients"])
api_router.include_router(matches.router, prefix="/matches", tags=["Matches"])
api_router.include_router(applications.router, prefix="/applications", tags=["Applications"])
api_router.include_router(lookups.router, prefix="/lookups", tags=["Lookups"])
api_router.include_router(portal.router, prefix="/portal", tags=["Client Portal"])
api_router.include_router(invites.router, prefix="/invites", tags=["Invites"])
api_router.include_router(subscriptions.router, tags=["Subscriptions"])
