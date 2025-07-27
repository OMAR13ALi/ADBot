# ADBot Core Utilities Documentation

## Table of Contents

1. [PowerShell Client](#powershell-client)
2. [Configuration Management](#configuration-management)
3. [Environment Setup](#environment-setup)
4. [Security Considerations](#security-considerations)
5. [Error Handling](#error-handling)
6. [Performance Optimization](#performance-optimization)

---

## PowerShell Client

The PowerShell client is the core component that enables remote execution of Active Directory commands via WinRM.

### File: `adbot_fastapi/app/core/powershell_client.py`

#### Main Function

##### `execute_remote_ps(command: str)`

Executes PowerShell commands remotely on the Active Directory server.

**Parameters:**
- `command` (str): PowerShell command to execute

**Returns:**
- `tuple[str, str, int]`: (stdout, stderr, return_code)

**Example Usage:**
```python
from app.core.powershell_client import execute_remote_ps

# Get all AD users
ps_command = '''
try {
    Import-Module ActiveDirectory -ErrorAction Stop
    $users = Get-ADUser -Filter * -Properties Name, Enabled, EmailAddress |
             Select-Object Name, SamAccountName, Enabled, EmailAddress |
             Sort-Object Name
    if ($users.Count -eq 0) {
        Write-Output "[]"
    } else {
        $users | ConvertTo-Json -Depth 2
    }
} catch {
    Write-Error "PowerShell Error: $($_.Exception.Message)"
    exit 1
}
'''

stdout, stderr, return_code = execute_remote_ps(ps_command)

if return_code == 0:
    import json
    users = json.loads(stdout)
    print(f"Found {len(users)} users")
else:
    print(f"Error: {stderr}")
```

#### Connection Configuration

The PowerShell client uses the following WinRM configuration:

```python
WINRM_CONFIG = {
    "server": "192.168.1.10",      # AD Server IP
    "username": "Administrator",    # AD Admin username
    "password": "password",         # AD Admin password
    "ssl": False,                   # Use HTTP (not HTTPS)
    "cert_validation": False,       # Skip certificate validation
    "auth": "negotiate",           # Authentication method
    "transport": "plaintext"       # Transport method
}
```

#### Authentication Methods

The client supports multiple authentication methods:

1. **negotiate** (Recommended): Uses Windows authentication
2. **basic**: Basic HTTP authentication
3. **ntlm**: NTLM authentication
4. **kerberos**: Kerberos authentication

#### Error Handling

The PowerShell client includes comprehensive error handling:

```python
def execute_remote_ps(command: str):
    client = None
    try:
        # Create WinRM connection
        client = Client(**WINRM_CONFIG)
        
        # Execute PowerShell command
        stdout, stderr, rc = client.execute_ps(command)
        
        # Log results
        logger.info(f"Command completed with return code: {rc}")
        if stderr:
            logger.warning(f"PowerShell stderr: {stderr}")
            
        return stdout, stderr, rc
        
    except Exception as e:
        logger.error(f"Error executing PowerShell command: {str(e)}")
        raise
    finally:
        # Always close connection
        if client:
            try:
                client.close()
            except:
                pass
```

---

## Configuration Management

### File: `adbot_fastapi/app/core/config.py`

The configuration module manages all environment variables and settings.

#### Environment Variables

##### Required Variables
```bash
# WinRM Connection Settings
WINRM_SERVER=192.168.1.10        # Active Directory server IP
WINRM_USERNAME=Administrator     # AD administrator username
WINRM_PASSWORD=YourPassword      # AD administrator password

# Authentication API Settings (auth_api)
SECRET_KEY=your-super-secret-key-change-this-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=30
AUTH_API_PORT=8001

# Logging Settings
LOG_LEVEL=INFO                   # DEBUG, INFO, WARNING, ERROR
```

##### Optional Variables
```bash
# WinRM Advanced Settings
WINRM_SSL=False                  # Use SSL connection
WINRM_CERT_VALIDATION=False      # Validate SSL certificates
WINRM_AUTH=negotiate             # Authentication method
WINRM_TRANSPORT=plaintext        # Transport method

# Application Settings
API_PORT=8000                    # Main API port
CORS_ORIGINS=http://localhost:4200,http://localhost:3000  # Allowed CORS origins
```

#### Configuration Loading

The application loads configuration in the following order:

1. Environment variables
2. `.env` file in project root
3. `config.env` file (fallback)
4. Default values

```python
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Also try to load from config.env if .env doesn't exist
if not os.path.exists('.env'):
    load_dotenv('config.env')

# Get configuration values
WINRM_CONFIG = {
    "server": os.getenv("WINRM_SERVER", "localhost"),
    "username": os.getenv("WINRM_USERNAME", "Administrator"),
    "password": os.getenv("WINRM_PASSWORD", ""),
    "ssl": os.getenv("WINRM_SSL", "False").lower() == "true",
    "cert_validation": os.getenv("WINRM_CERT_VALIDATION", "False").lower() == "true",
    "auth": os.getenv("WINRM_AUTH", "negotiate"),
    "transport": os.getenv("WINRM_TRANSPORT", "plaintext")
}
```

---

## Environment Setup

### Development Environment

#### 1. Create `.env` File

```bash
# Copy the example file
cp env.example .env

# Edit with your settings
WINRM_SERVER=your-ad-server-ip
WINRM_USERNAME=your-ad-username
WINRM_PASSWORD=your-ad-password
SECRET_KEY=generate-a-secure-key
```

#### 2. Install Dependencies

**Backend (FastAPI):**
```bash
cd adbot_fastapi
pip install -r requirements.txt
```

**Authentication API:**
```bash
cd auth_api
pip install -r requirements.txt
```

**Frontend (Next.js):**
```bash
cd adbot-nextjs
npm install
```

**Legacy Frontend (Angular):**
```bash
cd adbot_frontend
npm install
```

#### 3. Start Services

**Terminal 1 - Auth API:**
```bash
cd auth_api
python main.py
# Runs on http://localhost:8001
```

**Terminal 2 - Main API:**
```bash
cd adbot_fastapi
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
# Runs on http://localhost:8000
```

**Terminal 3 - Frontend:**
```bash
cd adbot-nextjs
npm run dev
# Runs on http://localhost:3000
```

### Production Environment

#### 1. System Requirements

- Windows Server with Active Directory Domain Services
- PowerShell 5.1 or later
- WinRM configured and enabled
- Python 3.8+ on application server
- Node.js 18+ for frontend

#### 2. WinRM Configuration

On the Active Directory server, configure WinRM:

```powershell
# Enable WinRM
Enable-PSRemoting -Force

# Configure WinRM for HTTP
winrm quickconfig -force

# Set authentication methods
Set-Item WSMan:\localhost\Service\Auth\Negotiate $true
Set-Item WSMan:\localhost\Service\Auth\Basic $true

# Configure firewall (if needed)
New-NetFirewallRule -Name "WinRM-HTTP" -DisplayName "WinRM HTTP" -Protocol TCP -LocalPort 5985 -Action Allow

# Test WinRM
Test-WSMan -ComputerName localhost
```

#### 3. Service Account Setup

Create a dedicated service account for ADBot:

```powershell
# Create service account
New-ADUser -Name "ADBot-Service" -SamAccountName "adbot-svc" -Enabled $true -PasswordNeverExpires $true

# Add to required groups
Add-ADGroupMember -Identity "Domain Admins" -Members "adbot-svc"
# OR create custom group with specific permissions
```

---

## Security Considerations

### 1. Authentication Security

#### JWT Token Configuration
```python
# Use strong secret key
SECRET_KEY = os.getenv("SECRET_KEY", "generate-a-256-bit-key")

# Set appropriate token expiration
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

# Use secure JWT algorithms
ALGORITHM = "HS256"
```

#### WinRM Security
```python
# Prefer negotiate authentication over basic
WINRM_CONFIG = {
    "auth": "negotiate",  # More secure than "basic"
    "ssl": True,          # Use HTTPS in production
    "cert_validation": True,  # Validate certificates in production
}
```

### 2. Network Security

#### CORS Configuration
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-domain.com"],  # Specific origins only
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)
```

#### Firewall Rules
```bash
# Allow only necessary ports
- Port 8000: Main API (internal only)
- Port 8001: Auth API (internal only)
- Port 3000: Frontend (web accessible)
- Port 5985: WinRM HTTP (internal only)
- Port 5986: WinRM HTTPS (internal only)
```

### 3. Data Protection

#### Password Handling
```python
# Never log passwords
logger.info(f"Connecting to {server} as {username}")  # OK
logger.info(f"Using password: {password}")  # NEVER DO THIS

# Use environment variables for sensitive data
password = os.getenv("WINRM_PASSWORD")  # Good
password = "hardcoded_password"  # Bad
```

#### Input Validation
```python
from pydantic import BaseModel, validator

class ADUserCreate(BaseModel):
    samaccountname: str
    
    @validator('samaccountname')
    def validate_samaccountname(cls, v):
        # Prevent PowerShell injection
        if any(char in v for char in [';', '&', '|', '`', '$', '(', ')']):
            raise ValueError('Invalid characters in username')
        return v.lower()
```

---

## Error Handling

### 1. PowerShell Error Patterns

#### Standard Error Handling Pattern
```python
def safe_ad_operation(ps_command: str):
    """Execute AD operation with comprehensive error handling"""
    try:
        # Wrap PowerShell command with error handling
        wrapped_command = f'''
        try {{
            Import-Module ActiveDirectory -ErrorAction Stop
            {ps_command}
        }} catch {{
            Write-Error "PowerShell Error: $($_.Exception.Message)"
            exit 1
        }}
        '''
        
        stdout, stderr, rc = execute_remote_ps(wrapped_command)
        
        if rc != 0:
            raise HTTPException(
                status_code=500, 
                detail=f"PowerShell operation failed: {stderr}"
            )
            
        return stdout
        
    except Exception as e:
        logger.error(f"AD operation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
```

#### Specific Error Types
```python
def handle_ad_errors(stderr: str, operation: str):
    """Handle specific Active Directory error conditions"""
    
    error_patterns = {
        "ObjectAlreadyExistsException": {
            "status_code": 409,
            "message": f"{operation} already exists"
        },
        "ObjectNotFoundException": {
            "status_code": 404,
            "message": f"{operation} not found"
        },
        "UnauthorizedAccessException": {
            "status_code": 403,
            "message": "Insufficient permissions"
        },
        "PasswordPolicyException": {
            "status_code": 400,
            "message": "Password does not meet policy requirements"
        }
    }
    
    for pattern, error_info in error_patterns.items():
        if pattern in stderr:
            raise HTTPException(
                status_code=error_info["status_code"],
                detail=error_info["message"]
            )
    
    # Generic error
    raise HTTPException(
        status_code=500,
        detail=f"Operation failed: {stderr}"
    )
```

### 2. Connection Error Handling

#### WinRM Connection Retry Logic
```python
import time
from typing import Tuple

def execute_remote_ps_with_retry(
    command: str, 
    max_retries: int = 3,
    retry_delay: float = 1.0
) -> Tuple[str, str, int]:
    """Execute PowerShell command with retry logic"""
    
    for attempt in range(max_retries):
        try:
            return execute_remote_ps(command)
            
        except Exception as e:
            if attempt == max_retries - 1:
                # Last attempt failed
                logger.error(f"PowerShell execution failed after {max_retries} attempts")
                raise
            
            logger.warning(f"Attempt {attempt + 1} failed: {str(e)}, retrying in {retry_delay}s")
            time.sleep(retry_delay)
            retry_delay *= 2  # Exponential backoff
```

---

## Performance Optimization

### 1. PowerShell Command Optimization

#### Efficient Data Retrieval
```python
# Good: Select only needed properties
ps_command = '''
Get-ADUser -Filter * -Properties Name, Enabled, EmailAddress |
Select-Object Name, SamAccountName, Enabled, EmailAddress
'''

# Bad: Retrieve all properties
ps_command = '''
Get-ADUser -Filter * -Properties *
'''
```

#### Batch Operations
```python
def bulk_enable_users(usernames: List[str]) -> dict:
    """Enable multiple users in a single PowerShell call"""
    
    # Create PowerShell array
    users_array = "'" + "','".join(usernames) + "'"
    
    ps_command = f'''
    $users = @({users_array})
    $results = @()
    
    foreach ($user in $users) {{
        try {{
            Enable-ADAccount -Identity $user
            $results += [PSCustomObject]@{{
                Username = $user
                Status = "Success"
                Message = "User enabled successfully"
            }}
        }} catch {{
            $results += [PSCustomObject]@{{
                Username = $user
                Status = "Error"
                Message = $_.Exception.Message
            }}
        }}
    }}
    
    $results | ConvertTo-Json -Depth 2
    '''
    
    stdout, stderr, rc = execute_remote_ps(ps_command)
    return json.loads(stdout)
```

### 2. Connection Pooling

#### Simple Connection Management
```python
from threading import Lock
from typing import Optional

class ConnectionPool:
    """Simple WinRM connection pool"""
    
    def __init__(self, max_connections: int = 5):
        self.max_connections = max_connections
        self.active_connections = {}
        self.lock = Lock()
    
    def get_connection(self, thread_id: str) -> Optional[Client]:
        """Get connection for current thread"""
        with self.lock:
            if thread_id not in self.active_connections:
                if len(self.active_connections) < self.max_connections:
                    self.active_connections[thread_id] = Client(**WINRM_CONFIG)
                else:
                    return None  # Pool exhausted
            
            return self.active_connections[thread_id]
    
    def release_connection(self, thread_id: str):
        """Release connection back to pool"""
        with self.lock:
            if thread_id in self.active_connections:
                try:
                    self.active_connections[thread_id].close()
                except:
                    pass
                del self.active_connections[thread_id]

# Global connection pool
connection_pool = ConnectionPool()
```

### 3. Caching Strategies

#### Response Caching
```python
from functools import lru_cache
from datetime import datetime, timedelta

@lru_cache(maxsize=100)
def get_organizational_units():
    """Cache OU list for 5 minutes"""
    ps_command = '''
    Get-ADOrganizationalUnit -Filter * -Properties Name, DistinguishedName |
    Select-Object Name, DistinguishedName |
    Sort-Object Name
    '''
    
    stdout, stderr, rc = execute_remote_ps(ps_command)
    if rc == 0:
        return json.loads(stdout)
    return []

# Clear cache periodically
import threading
import time

def clear_cache_periodically():
    """Clear LRU cache every 5 minutes"""
    while True:
        time.sleep(300)  # 5 minutes
        get_organizational_units.cache_clear()

# Start cache cleanup thread
cache_thread = threading.Thread(target=clear_cache_periodically, daemon=True)
cache_thread.start()
```

This documentation provides comprehensive coverage of the core utilities, configuration management, and best practices for the ADBot system's backend infrastructure.