from fastapi import APIRouter, HTTPException
import json
import logging
from app.core.powershell_client import execute_remote_ps
from app.models.computer_schemas import ADComputerCreate, ADComputerUpdate, ADComputerResponse

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/computers")
def list_computers():
    """List all Active Directory computers"""
    try:
        ps_command = '''
        try {
            Import-Module ActiveDirectory -ErrorAction Stop
            $computers = Get-ADComputer -Filter * -Properties Name, SamAccountName, Description, Enabled, OperatingSystem, LastLogonDate, DistinguishedName |
                         Select-Object Name, SamAccountName, Description, Enabled, OperatingSystem, LastLogonDate, DistinguishedName |
                         Sort-Object Name
            if ($computers.Count -eq 0) {
                Write-Output "[]"
            } else {
                $computers | ConvertTo-Json -Depth 2
            }
        } catch {
            Write-Error "PowerShell Error: $($_.Exception.Message)"
            exit 1
        }
        '''
        stdout, stderr, rc = execute_remote_ps(ps_command)
        if rc != 0:
            raise HTTPException(status_code=500, detail=f"Failed to get computers: {stderr}")
        if not stdout or stdout.strip() == "":
            return {"computers": [], "count": 0}
        try:
            data = json.loads(stdout)
            if isinstance(data, dict):
                data = [data]
            return {
                "computers": data,
                "count": len(data),
                "status": "success"
            }
        except json.JSONDecodeError:
            raise HTTPException(status_code=500, detail="Failed to parse computer data")
    except Exception as e:
        logger.error(f"Error listing computers: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/computers/domain/{domain_name}")
def list_computers_by_domain(domain_name: str):
    """List all AD computers under a specific domain distinguished name (e.g., DC=adbot,DC=local)"""
    try:
        ps_command = f'''
        try {{
            Import-Module ActiveDirectory -ErrorAction Stop
            $computers = Get-ADComputer -Filter * -SearchBase "{domain_name}" -Properties Name, SamAccountName, Description, Enabled, OperatingSystem, LastLogonDate, DistinguishedName |
                         Select-Object Name, SamAccountName, Description, Enabled, OperatingSystem, LastLogonDate, DistinguishedName |
                         Sort-Object Name
            if ($computers.Count -eq 0) {{
                Write-Output "[]"
            }} else {{
                $computers | ConvertTo-Json -Depth 2
            }}
        }} catch {{
            Write-Error "PowerShell Error: $($_.Exception.Message)"
            exit 1
        }}
        '''
        stdout, stderr, rc = execute_remote_ps(ps_command)
        if rc != 0:
            raise HTTPException(status_code=500, detail=f"Failed to get computers for domain: {stderr}")
        if not stdout or stdout.strip() == "":
            return {"computers": [], "count": 0}
        try:
            data = json.loads(stdout)
            if isinstance(data, dict):
                data = [data]
            return {
                "computers": data,
                "count": len(data),
                "status": "success",
                "domain": domain_name
            }
        except json.JSONDecodeError:
            raise HTTPException(status_code=500, detail="Failed to parse computer data")
    except Exception as e:
        logger.error(f"Error listing computers for domain: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 