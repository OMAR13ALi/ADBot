from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime

class ADUserBase(BaseModel):
    """Base schema with common user fields"""
    name: str = Field(..., description="Display name (e.g., 'John Doe')")
    description: Optional[str] = Field(None, description="User description")
    email: Optional[str] = Field(None, description="Email address")
    department: Optional[str] = Field(None, description="Department")
    title: Optional[str] = Field(None, description="Job title")
    phone: Optional[str] = Field(None, description="Phone number")
    manager: Optional[str] = Field(None, description="Manager's SamAccountName")

class ADUserCreate(ADUserBase):
    """Schema for creating a new user"""
    samaccountname: str = Field(..., description="Username (e.g., 'john.doe')")
    password: str = Field(..., min_length=8, description="Password (min 8 characters)")
    enabled: bool = Field(True, description="Whether the account is enabled")
    ou: Optional[str] = Field(None, description="Organizational Unit DN (e.g., 'OU=HR,DC=domain,DC=com')")
    given_name: Optional[str] = Field(None, description="Given name")
    surname: Optional[str] = Field(None, description="Surname")
    display_name: Optional[str] = Field(None, description="Display name")
    user_principal_name: Optional[str] = Field(None, description="User Principal Name")
    
    @validator('samaccountname')
    def validate_samaccountname(cls, v):
        if not v.replace('.', '').replace('-', '').replace('_', '').isalnum():
            raise ValueError('SamAccountName should contain only letters, numbers, dots, hyphens, and underscores')
        return v.lower()

class ADUserUpdate(BaseModel):
    """Schema for updating an existing user - all fields optional"""
    name: Optional[str] = Field(None, description="Display name")
    password: Optional[str] = Field(None, min_length=8, description="New password")
    enabled: Optional[bool] = Field(None, description="Enable/disable account")
    description: Optional[str] = Field(None, description="User description")
    email: Optional[str] = Field(None, description="Email address")
    given_name: Optional[str] = Field(None, description="Given name")
    surname: Optional[str] = Field(None, description="Surname")
    display_name: Optional[str] = Field(None, description="Display name")
    user_principal_name: Optional[str] = Field(None, description="User Principal Name")
    department: Optional[str] = Field(None, description="Department")
    title: Optional[str] = Field(None, description="Job title")
    phone: Optional[str] = Field(None, description="Phone number")
    manager: Optional[str] = Field(None, description="Manager's SamAccountName")

class ADUserResponse(ADUserBase):
    """Schema for returning user information"""
    samaccountname: str
    enabled: bool
    last_logon_date: Optional[str] = None
    distinguished_name: str
    created: str
    modified: str
    password_last_set: Optional[str] = None
    account_expires: Optional[str] = None

class ADUserList(BaseModel):
    """Schema for listing users with pagination info"""
    users: list[ADUserResponse]
    count: int
    total_available: Optional[int] = None
    filters_applied: dict

class ADOperationResponse(BaseModel):
    """Schema for operation responses"""
    message: str
    status: str = "success"
    changes_made: Optional[list[str]] = None
    before: Optional[dict] = None
    after: Optional[dict] = None

# Additional schemas for specific operations
class ADUserSearch(BaseModel):
    """Schema for search parameters"""
    search: Optional[str] = Field(None, description="Search term for name or username")
    enabled: Optional[bool] = Field(None, description="Filter by enabled status")
    department: Optional[str] = Field(None, description="Filter by department")
    ou: Optional[str] = Field(None, description="Filter by Organizational Unit")
    limit: int = Field(100, ge=1, le=1000, description="Maximum results to return")
    offset: int = Field(0, ge=0, description="Number of results to skip")

class ADUserMove(BaseModel):
    """Schema for moving users between OUs"""
    target_ou: str = Field(..., description="Target Organizational Unit DN")
    
class ADUserPasswordReset(BaseModel):
    """Schema for password reset operations"""
    new_password: str = Field(..., min_length=8, description="New password")
    force_change_on_logon: bool = Field(False, description="Force user to change password on next logon")

class ADUserBulkOperation(BaseModel):
    """Schema for bulk operations"""
    samaccountnames: list[str] = Field(..., description="List of usernames to operate on")
    operation: str = Field(..., description="Operation type: enable, disable, delete, move")
    parameters: Optional[dict] = Field(None, description="Additional parameters for the operation")

# OU-related schemas
class ADOrganizationalUnit(BaseModel):
    """Schema for OU information"""
    name: str
    distinguished_name: str
    description: Optional[str] = None
    
class ADOUList(BaseModel):
    """Schema for listing OUs"""
    organizational_units: list[ADOrganizationalUnit]
    count: int







# from pydantic import BaseModel, Field
# from typing import Optional

# class ADUserCreate(BaseModel):
#     name: str = Field(..., example="John Doe2")
#     samaccountname: str = Field(..., example="jdoe2")
#     password: str = Field(..., example="StrongPassword123!")
#     ou: Optional[str] = Field(None, example="OU=Users,DC=adbot,DC=local")
#     enabled: Optional[bool] = True

# class ADUserUpdate(BaseModel):
#     name: Optional[str] = None
#     password: Optional[str] = None
#     enabled: Optional[bool] = None 