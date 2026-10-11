# ============================================================
# RiskLens — User Authentication API Routes
# ============================================================

import logging
from fastapi import APIRouter, HTTPException, Depends, status
from app.schemas.user import UserRegister, UserLogin, UserResponse, AuthResponse
from app.core.security import get_password_hash, verify_password, create_access_token
from app.db.repositories.user_repo import create_user, get_user_by_email, get_user_by_id
from app.db.repositories.portfolio_repo import get_portfolio_by_user_id, create_initial_portfolio
from app.api.deps import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: UserRegister):
    """Register a new user account and initialize their MongoDB portfolio."""
    try:
        existing = await get_user_by_email(payload.email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this email address already exists.",
            )

        pwd_hash = get_password_hash(payload.password)
        user = await create_user(
            name=payload.name,
            email=payload.email,
            password_hash=pwd_hash,
            risk_preference=payload.risk_preference or "moderate",
        )

        # Initialize blank/clean portfolio for the newly registered user
        portfolio = await create_initial_portfolio(
            user_id=user["id"],
            name=f"{user['name']}'s Portfolio",
            holdings=[]
        )

        token = create_access_token(data={"sub": user["id"], "email": user["email"]})

        return {
            "token": token,
            "user": UserResponse(
                id=user["id"],
                name=user["name"],
                email=user["email"],
                risk_preference=user.get("risk_preference", "moderate"),
                created_at=user.get("created_at"),
            ),
            "portfolio": portfolio,
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Registration error for %s: %s", payload.email, exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(exc)}",
        )


@router.post("/login", response_model=AuthResponse)
async def login(payload: UserLogin):
    """Authenticate existing user credentials and return their MongoDB data."""
    try:
        user = await get_user_by_email(payload.email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
            )

        if not verify_password(payload.password, user.get("password_hash", "")):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
            )

        portfolio = await get_portfolio_by_user_id(user["id"])
        if not portfolio:
            portfolio = await create_initial_portfolio(
                user_id=user["id"],
                name=f"{user['name']}'s Portfolio",
                holdings=[]
            )

        token = create_access_token(data={"sub": user["id"], "email": user["email"]})

        return {
            "token": token,
            "user": UserResponse(
                id=user["id"],
                name=user["name"],
                email=user["email"],
                risk_preference=user.get("risk_preference", "moderate"),
                created_at=user.get("created_at"),
            ),
            "portfolio": portfolio,
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Login error for %s: %s", payload.email, exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Authentication failed: {str(exc)}",
        )


@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """Fetch profile and active portfolio for the authenticated session."""
    portfolio = await get_portfolio_by_user_id(current_user["id"])
    if not portfolio:
        portfolio = await create_initial_portfolio(
            user_id=current_user["id"],
            name=f"{current_user['name']}'s Portfolio",
            holdings=[]
        )

    return {
        "user": {
            "id": current_user["id"],
            "name": current_user["name"],
            "email": current_user["email"],
            "risk_preference": current_user.get("risk_preference", "moderate"),
            "created_at": current_user.get("created_at"),
        },
        "portfolio": portfolio,
    }
