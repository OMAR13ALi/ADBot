#!/usr/bin/env python3
"""
AD Bot Authentication API

A FastAPI-based authentication service that validates Windows credentials
and establishes WinRM connections for AD Bot.
"""

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional
import jwt
import logging
from datetime import datetime, timedelta
import os
from pypsrp.client import Client
from dotenv import load_dotenv
import uvicorn

# Load environment variables
load_dotenv()
# Also try to load from config.env if .env doesn't exist
if not os.path.exists('.env'):
    load_dotenv('config.env')

# Configure logging
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-super-secret-key-change-this-in-production")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
AUTH_API_PORT = int(os.getenv("AUTH_API_PORT", "8001"))

# Create FastAPI app
app = FastAPI(
    title="AD Bot Authentication API",
    description="Authentication service for AD Bot with WinRM validation",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200", "http://localhost:3000", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# Pydantic models
class LoginRequest(BaseModel):
    username: str
    password: str
    server_ip: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    expires_in: int
    user_info: dict

class HealthResponse(BaseModel):
    status: str
    timestamp: str
    service: str
    version: str

class VerifyResponse(BaseModel):
    valid: bool
    user_info: Optional[dict] = None
    expires_at: Optional[str] = None

# Utility functions
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm="HS256")
    return encoded_jwt

def verify_token(token: str):
    """Verify JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.JWTError:
        return None

def test_winrm_connection(server_ip: str, username: str, password: str):
    """Test WinRM connection to validate credentials"""
    logger.info(f"Testing WinRM connection to {server_ip} as {username}")
    
    # Try basic authentication first
    for auth_method in ["basic", "negotiate"]:
        try:
            logger.info(f"Attempting {auth_method} authentication")
            client = Client(
                server=server_ip,
                username=username,
                password=password,
                ssl=False,
                cert_validation=False,
                auth=auth_method,
                transport="plaintext"
            )
            
            # Test with a simple command
            stdout, stderr, rc = client.execute_ps("Get-ComputerInfo | Select-Object WindowsProductName, TotalPhysicalMemory")
            
            if rc == 0:
                logger.info(f"✓ {auth_method} authentication successful")
                client.close()
                return True, auth_method, stdout
            else:
                logger.warning(f"✗ {auth_method} authentication failed with return code {rc}")
                client.close()
                
        except Exception as e:
            logger.error(f"✗ {auth_method} authentication error: {str(e)}")
            continue
    
    return False, None, None

# Dependency to get current user from token
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current user from JWT token"""
    token = credentials.credentials
    payload = verify_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return payload

# API Endpoints
@app.get("/", response_class=HTMLResponse)
async def root():
    """Login page"""
    try:
        with open("templates/login.html", "r", encoding="utf-8") as f:
            html_content = f.read()
        return HTMLResponse(content=html_content)
    except FileNotFoundError:
        return HTMLResponse(content="""
        <html>
            <body>
                <h1>ADBot Authentication API</h1>
                <p>API is running! Visit <a href="/docs">/docs</a> for API documentation.</p>
                <p>Login template not found. Please ensure templates/login.html exists.</p>
            </body>
        </html>
        """)

@app.get("/status", response_model=dict)
async def api_status():
    """API status endpoint"""
    return {
        "message": "AD Bot Authentication API is running!",
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/auth/health", response_model=HealthResponse)
async def health_check():
    """Detailed health check"""
    return HealthResponse(
        status="healthy",
        timestamp=datetime.utcnow().isoformat(),
        service="AD Bot Authentication API",
        version="1.0.0"
    )

@app.post("/auth/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """Authenticate user and return JWT token"""
    logger.info(f"Login attempt for user: {request.username} on server: {request.server_ip}")
    
    try:
        # Test WinRM connection
        success, auth_method, system_info = test_winrm_connection(
            request.server_ip, 
            request.username, 
            request.password
        )
        
        if not success:
            logger.warning(f"Authentication failed for {request.username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials or unable to connect to server"
            )
        
        # Create JWT token
        token_data = {
            "sub": request.username,
            "server_ip": request.server_ip,
            "auth_method": auth_method,
            "authenticated_at": datetime.utcnow().isoformat()
        }
        
        access_token = create_access_token(data=token_data)
        
        logger.info(f"✓ Login successful for {request.username}")
        
        return LoginResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user_info={
                "username": request.username,
                "server_ip": request.server_ip,
                "auth_method": auth_method,
                "system_info": system_info.strip() if system_info else None
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during authentication"
        )

@app.get("/auth/verify", response_model=VerifyResponse)
async def verify_token_endpoint(current_user: dict = Depends(get_current_user)):
    """Verify JWT token"""
    logger.info(f"Token verification for user: {current_user.get('sub')}")
    
    return VerifyResponse(
        valid=True,
        user_info={
            "username": current_user.get("sub"),
            "server_ip": current_user.get("server_ip"),
            "auth_method": current_user.get("auth_method"),
            "authenticated_at": current_user.get("authenticated_at")
        },
        expires_at=datetime.fromtimestamp(current_user.get("exp")).isoformat()
    )

@app.post("/auth/logout")
async def logout():
    """Logout endpoint (client-side token removal)"""
    logger.info("Logout request received")
    return {
        "message": "Logged out successfully. Please remove the token from client storage.",
        "timestamp": datetime.utcnow().isoformat()
    }

if __name__ == "__main__":
    logger.info(f"Starting AD Bot Authentication API on port {AUTH_API_PORT}")
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=AUTH_API_PORT,
        reload=True,
        log_level="info"
    ) 