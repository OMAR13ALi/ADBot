from fastapi import APIRouter, HTTPException
import json
import logging
from app.core.powershell_client import execute_remote_ps
from app.models.user_schemas import ADUserCreate, ADUserUpdate

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/test_connection")
def test_connection():
    try:
        ps_command = "Write-Output 'Connection successful'; $env:COMPUTERNAME"
        stdout, stderr, rc = execute_remote_ps(ps_command)
        return {
            "status": "success" if rc == 0 else "error",
            "return_code": rc,
            "stdout": stdout,
            "stderr": stderr
        }
    except Exception as e:
        logger.error(f"Connection test failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Connection test failed: {str(e)}")