from fastapi import APIRouter, HTTPException
import json
import logging
from app.core.powershell_client import execute_remote_ps

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/dashboard/health")
def health_check():
    """Simple health check endpoint"""
    return {
        "status": "healthy",
        "message": "Dashboard service is running",
        "timestamp": "2024-01-01T00:00:00Z"
    }

@router.get("/dashboard/stats")
def get_dashboard_stats():
    """Get basic statistics about the Active Directory environment"""
    try:
        ps_command = '''
        try {
            Import-Module ActiveDirectory -ErrorAction Stop
            
            # Get counts for different AD objects
            $userCount = (Get-ADUser -Filter *).Count
            $groupCount = (Get-ADGroup -Filter *).Count
            $computerCount = (Get-ADComputer -Filter *).Count
            $ouCount = (Get-ADOrganizationalUnit -Filter *).Count
            
            # Create stats object
            $stats = @{
                total_users = $userCount
                total_groups = $groupCount
                total_computers = $computerCount
                total_ous = $ouCount
            }
            
            $stats | ConvertTo-Json
        } catch {
            Write-Error "PowerShell Error: $($_.Exception.Message)"
            exit 1
        }
        '''
        
        stdout, stderr, rc = execute_remote_ps(ps_command)
        if rc != 0:
            raise HTTPException(status_code=500, detail=f"Failed to get dashboard stats: {stderr}")
        
        try:
            data = json.loads(stdout)
            return {
                "data": data,
                "status": "success"
            }
        except json.JSONDecodeError:
            raise HTTPException(status_code=500, detail="Failed to parse dashboard stats")
            
    except Exception as e:
        logger.error(f"Error getting dashboard stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 