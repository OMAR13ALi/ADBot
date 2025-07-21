from pydantic import BaseModel
from typing import Optional

class ADComputerCreate(BaseModel):
    name: str
    samaccountname: str
    description: Optional[str] = None
    ou: Optional[str] = None

class ADComputerUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    enabled: Optional[bool] = None

class ADComputerResponse(BaseModel):
    name: str
    samaccountname: str
    description: Optional[str] = None
    distinguishedname: Optional[str] = None
    enabled: Optional[bool] = None
    operating_system: Optional[str] = None
    last_logon_date: Optional[str] = None 