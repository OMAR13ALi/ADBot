from fastapi import APIRouter, HTTPException, Body
import json
import logging
from app.core.powershell_client import execute_remote_ps
from app.models.ou_schemas import ADOUCreate, ADOUUpdate, ADOUResponse
from urllib.parse import unquote

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/ous/{distinguished_name}/protection-status")
def get_ou_protection_status(distinguished_name: str):
    """Check if an OU is protected from accidental deletion"""
    try:
        dn = unquote(distinguished_name)
        ps_command = f'''
        try {{
            Import-Module ActiveDirectory -ErrorAction Stop
            $ou = Get-ADOrganizationalUnit -Identity "{dn}" -Properties ProtectedFromAccidentalDeletion
            $protectionStatus = @{{
                ProtectedFromAccidentalDeletion = $ou.ProtectedFromAccidentalDeletion
                DistinguishedName = $ou.DistinguishedName
                Name = $ou.Name
            }}
            $protectionStatus | ConvertTo-Json
        }} catch {{
            Write-Error "PowerShell Error: $($_.Exception.Message)"
            exit 1
        }}
        '''
        stdout, stderr, rc = execute_remote_ps(ps_command)
        if rc != 0:
            raise HTTPException(status_code=404, detail=f"OU not found: {stderr}")
        
        try:
            data = json.loads(stdout)
            return {
                "protection_status": data,
                "status": "success"
            }
        except json.JSONDecodeError:
            raise HTTPException(status_code=500, detail="Failed to parse protection status")
            
    except Exception as e:
        logger.error(f"Error getting OU protection status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/ous/domain-info")
def get_domain_info():
    """Get domain information for OU creation"""
    try:
        ps_command = '''
        try {
            Import-Module ActiveDirectory -ErrorAction Stop
            $domain = Get-ADDomain
            $domainInfo = @{
                DomainDN = $domain.DistinguishedName
                DomainName = $domain.Name
                NetBIOSName = $domain.NetBIOSName
            }
            $domainInfo | ConvertTo-Json
        } catch {
            Write-Error "PowerShell Error: $($_.Exception.Message)"
            exit 1
        }
        '''
        stdout, stderr, rc = execute_remote_ps(ps_command)
        if rc != 0:
            raise HTTPException(status_code=500, detail=f"Failed to get domain info: {stderr}")
        
        try:
            data = json.loads(stdout)
            return {
                "domain_info": data,
                "status": "success"
            }
        except json.JSONDecodeError:
            raise HTTPException(status_code=500, detail="Failed to parse domain info")
            
    except Exception as e:
        logger.error(f"Error getting domain info: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/ous")
def list_ous():
    """List all Organizational Units (OUs)"""
    try:
        ps_command = '''
        try {
            Import-Module ActiveDirectory -ErrorAction Stop
            $ous = Get-ADOrganizationalUnit -Filter * -Properties Name, DistinguishedName, Description |
                   Select-Object Name, DistinguishedName, Description |
                   Sort-Object Name
            if ($ous.Count -eq 0) {
                Write-Output "[]"
            } else {
                $ous | ConvertTo-Json -Depth 2
            }
        } catch {
            Write-Error "PowerShell Error: $($_.Exception.Message)"
            exit 1
        }
        '''
        stdout, stderr, rc = execute_remote_ps(ps_command)
        if rc != 0:
            raise HTTPException(status_code=500, detail=f"Failed to get OUs: {stderr}")
        if not stdout or stdout.strip() == "":
            return {"ous": [], "count": 0}
        try:
            data = json.loads(stdout)
            if isinstance(data, dict):
                data = [data]
            return {
                "ous": data,
                "count": len(data),
                "status": "success"
            }
        except json.JSONDecodeError:
            raise HTTPException(status_code=500, detail="Failed to parse OU data")
    except Exception as e:
        logger.error(f"Error listing OUs: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/ous/{distinguished_name}")
def get_ou(distinguished_name: str):
    """Get details of a specific OU"""
    try:
        dn = unquote(distinguished_name)
        ps_command = f'''
        try {{
            Import-Module ActiveDirectory -ErrorAction Stop
            $ou = Get-ADOrganizationalUnit -Identity "{dn}" -Properties *
            if ($ou) {{
                $ouInfo = @{{
                    Name = $ou.Name
                    DistinguishedName = $ou.DistinguishedName
                    Description = $ou.Description
                }}
                $ouInfo | ConvertTo-Json -Depth 2
            }} else {{
                Write-Error "OU not found"
                exit 1
            }}
        }} catch {{
            Write-Error "PowerShell Error: $($_.Exception.Message)"
            exit 1
        }}
        '''
        stdout, stderr, rc = execute_remote_ps(ps_command)
        if rc != 0:
            raise HTTPException(status_code=404, detail=f"OU not found: {stderr}")
        try:
            data = json.loads(stdout)
            return {"ou": data, "status": "success"}
        except json.JSONDecodeError:
            raise HTTPException(status_code=500, detail="Failed to parse OU data")
    except Exception as e:
        logger.error(f"Error getting OU: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ous")
def create_ou(ou: ADOUCreate):
    """Create a new Organizational Unit (OU)"""
    try:
        desc_param = f'-Description "{ou.description}"' if ou.description else ''
        ps_command = f'''
        try {{
            Import-Module ActiveDirectory -ErrorAction Stop
            New-ADOrganizationalUnit -Name "{ou.name}" -Path "{ou.path}" {desc_param}
            Write-Output "OU created successfully"
        }} catch {{
            Write-Error "PowerShell Error: $($_.Exception.Message)"
            exit 1
        }}
        '''
        stdout, stderr, rc = execute_remote_ps(ps_command)
        if rc != 0:
            raise HTTPException(status_code=500, detail=f"Failed to create OU: {stderr}")
        # Get the created OU details
        try:
            # Compose the new DN
            new_dn = f"OU={ou.name},{ou.path}"
            ou_details = get_ou(new_dn)
            return {"message": "OU created successfully", "ou": ou_details["ou"]}
        except:
            return {"message": stdout.strip() or "OU created successfully"}
    except Exception as e:
        logger.error(f"Error creating OU: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/ous/{distinguished_name}")
def update_ou(distinguished_name: str, ou: ADOUUpdate):
    """Update an OU (name, description)"""
    try:
        dn = unquote(distinguished_name)
        set_params = []
        if ou.name:
            set_params.append(f'-Name "{ou.name}"')
        if ou.description is not None:
            set_params.append(f'-Description "{ou.description}"')
        if not set_params:
            return {"message": "No changes detected", "status": "success"}
        set_params_str = ' '.join(set_params)
        ps_command = f'''
        try {{
            Import-Module ActiveDirectory -ErrorAction Stop
            Set-ADOrganizationalUnit -Identity "{dn}" {set_params_str}
            Write-Output "OU updated successfully"
        }} catch {{
            Write-Error "PowerShell Error: $($_.Exception.Message)"
            exit 1
        }}
        '''
        stdout, stderr, rc = execute_remote_ps(ps_command)
        if rc != 0:
            raise HTTPException(status_code=500, detail=f"Failed to update OU: {stderr}")
        # Get updated OU details
        try:
            ou_details = get_ou(dn)
            return {"message": "OU updated successfully", "ou": ou_details["ou"]}
        except:
            return {"message": stdout.strip() or "OU updated successfully"}
    except Exception as e:
        logger.error(f"Error updating OU: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/ous/{distinguished_name}")
def delete_ou(distinguished_name: str):
    """Delete an OU"""
    try:
        dn = unquote(distinguished_name)
        # Get OU info before deletion
        try:
            ou_details = get_ou(dn)
            ou_info = ou_details["ou"]
        except:
            ou_info = None
        
        # First, try to remove protection from accidental deletion
        ps_command = f'''
        try {{
            Import-Module ActiveDirectory -ErrorAction Stop
            
            # Check if OU exists and get its current protection status
            $ou = Get-ADOrganizationalUnit -Identity "{dn}" -Properties ProtectedFromAccidentalDeletion
            if ($ou.ProtectedFromAccidentalDeletion) {{
                # Remove protection from accidental deletion
                Set-ADOrganizationalUnit -Identity "{dn}" -ProtectedFromAccidentalDeletion $false
                Write-Output "Protection removed from OU"
            }}
            
            # Now delete the OU
            Remove-ADOrganizationalUnit -Identity "{dn}" -Confirm:$false
            Write-Output "OU deleted successfully"
        }} catch {{
            Write-Error "PowerShell Error: $($_.Exception.Message)"
            exit 1
        }}
        '''
        stdout, stderr, rc = execute_remote_ps(ps_command)
        if rc != 0:
            raise HTTPException(status_code=500, detail=f"Failed to delete OU: {stderr}")
        return {"message": "OU deleted successfully", "deleted_ou": ou_info, "status": "success"}
    except Exception as e:
        logger.error(f"Error deleting OU: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 