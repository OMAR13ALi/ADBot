from pydantic import BaseModel
from typing import Optional

class ADOUCreate(BaseModel):
    name: str
    path: str = "OU=HR,DC=adbot,DC=local"  # Parent DN where the OU will be created
    description: Optional[str] = None

class ADOUUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class ADOUResponse(BaseModel):
    name: str
    distinguishedname: str
    description: Optional[str] = None 