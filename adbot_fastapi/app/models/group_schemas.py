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
    name: str
    samaccountname: str
    description: Optional[str] = None
    members: Optional[List[str]] = None

class ADGroupMember(BaseModel):
    user_samaccountname: str

class ADGroupMove(BaseModel):
    target_ou: str 