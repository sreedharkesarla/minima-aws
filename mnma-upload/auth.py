from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
import bcrypt
import logging
from dependencies import rds_helper

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    user: dict
    message: str

@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """
    Authenticate user and return user details with roles.
    """
    try:
        # Ensure database connection
        rds_helper.ensure_connection()
        
        # Query user from database
        query = """
            SELECT 
                u.user_id,
                u.username,
                u.password_hash,
                u.email,
                u.full_name,
                u.is_active,
                u.is_superuser,
                GROUP_CONCAT(r.role_name) as roles
            FROM users u
            LEFT JOIN user_roles ur ON u.user_id = ur.user_id
            LEFT JOIN roles r ON ur.role_id = r.role_id
            WHERE u.username = %s
            GROUP BY u.user_id, u.username, u.password_hash, u.email, u.full_name, u.is_active, u.is_superuser
        """
        
        rds_helper.cursor.execute(query, (request.username,))
        user_record = rds_helper.cursor.fetchone()
        
        if not user_record:
            logger.warning(f"Login attempt failed: user not found - {request.username}")
            raise HTTPException(status_code=401, detail="Invalid username or password")
        
        # Parse user record
        user_id, username, password_hash, email, full_name, is_active, is_superuser, roles_str = user_record
        
        # Check if user is active
        if not is_active:
            logger.warning(f"Login attempt failed: user inactive - {request.username}")
            raise HTTPException(status_code=403, detail="User account is inactive")
        
        # Verify password
        try:
            # For bcrypt hashed passwords
            password_match = bcrypt.checkpw(request.password.encode('utf-8'), password_hash.encode('utf-8'))
        except Exception as e:
            logger.error(f"Password verification error: {e}")
            # Fallback to plain text comparison for development (NOT for production!)
            password_match = (request.password == password_hash)
        
        if not password_match:
            logger.warning(f"Login attempt failed: invalid password - {request.username}")
            raise HTTPException(status_code=401, detail="Invalid username or password")
        
        # Update last login timestamp
        update_query = "UPDATE users SET last_login = NOW() WHERE user_id = %s"
        rds_helper.cursor.execute(update_query, (user_id,))
        rds_helper.connection.commit()
        
        # Parse roles
        roles = roles_str.split(',') if roles_str else []
        
        # Build user response
        user = {
            "userId": user_id,
            "username": username,
            "email": email or "",
            "fullName": full_name or username,
            "roles": roles,
            "isActive": bool(is_active),
            "isSuperuser": bool(is_superuser),
            "createdAt": ""  # Can be fetched if needed
        }
        
        logger.info(f"User logged in successfully: {username}")
        
        return LoginResponse(
            user=user,
            message=f"Welcome back, {username}!"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error during login")

@router.post("/logout")
async def logout():
    """
    Logout endpoint (stateless, just returns success).
    Client should clear localStorage/sessionStorage.
    """
    return {"message": "Logged out successfully"}

@router.get("/verify")
async def verify_token():
    """
    Verify authentication token (placeholder for JWT implementation).
    """
    return {"message": "Token verification endpoint"}
