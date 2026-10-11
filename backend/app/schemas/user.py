# ============================================================
# RiskLens — User & Auth Pydantic Schemas
# ============================================================

from pydantic import BaseModel, EmailStr, Field
from typing import Optional


class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=60)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    risk_preference: Optional[str] = Field("moderate", description="conservative, moderate, aggressive")


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    risk_preference: str = "moderate"
    created_at: Optional[str] = None


class AuthResponse(BaseModel):
    token: str
    user: UserResponse
    portfolio: Optional[dict] = None
