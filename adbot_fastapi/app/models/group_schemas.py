from pydantic import BaseModel
from typing import Optional, List

class ADGroupCreate(BaseModel):
    name: str
    samaccountname: str
    description: Optional[str] = None
    path: Optional[str] = None

class ADGroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class ADGroupResponse(BaseModel):
    Name: str
    SamAccountName: str
    Description: Optional[str] = None
    Members: Optional[List[str]] = None
    DistinguishedName: Optional[str] = None

class ADGroupMember(BaseModel):
    user_samaccountname: str

class ADGroupMove(BaseModel):
    target_ou: str

class ADGroupList(BaseModel):
    """Schema for listing groups with pagination info"""
    groups: list[ADGroupResponse]
    count: int
    status: str = "success" 