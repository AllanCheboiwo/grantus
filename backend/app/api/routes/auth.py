from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import verify_password, create_access_token, get_password_hash
from app.models.user import User, UserRole
from app.models.client import Client, ClientUser
from app.schemas.user import UserCreate, UserResponse, UserLogin, Token
from app.schemas.client import PublicSignupRequest, PublicSignupResponse

router = APIRouter()


@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """Login and get access token"""
    user = db.query(User).filter(User.email == form_data.username).first()
    
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )
    
    access_token = create_access_token(data={"sub": str(user.id)})
    
    return Token(
        access_token=access_token,
        user=UserResponse.model_validate(user)
    )


@router.post("/register", response_model=UserResponse)
async def register(
    user_data: UserCreate,
    db: Session = Depends(get_db)
):
    """Register a new user"""
    # Check if email exists
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user
    user = User(
        email=user_data.email,
        name=user_data.name,
        role=user_data.role,
        password_hash=get_password_hash(user_data.password)
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return user


@router.post("/signup", response_model=PublicSignupResponse)
async def public_signup(
    data: PublicSignupRequest,
    db: Session = Depends(get_db)
):
    """
    Public signup for self-service users.
    Creates a user account AND a client organization automatically.
    """
    # Check if email exists
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create the client organization (self-service type)
    client = Client(
        name=data.organization_name,
        entity_type=data.entity_type,
        client_type="self_service"
    )
    db.add(client)
    db.flush()  # Get client ID
    
    # Create the user
    user = User(
        email=data.email,
        name=data.name,
        role=UserRole.client,
        password_hash=get_password_hash(data.password)
    )
    db.add(user)
    db.flush()  # Get user ID
    
    # Link user to client as owner
    client_user = ClientUser(
        client_id=client.id,
        user_id=user.id,
        client_role="owner"
    )
    db.add(client_user)
    
    db.commit()
    
    return PublicSignupResponse(
        message="Account created successfully. Please log in.",
        user_id=user.id,
        client_id=client.id
    )
