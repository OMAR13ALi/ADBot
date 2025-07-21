from fastapi import APIRouter, HTTPException
import json
import logging
from app.core.powershell_client import execute_remote_ps
from app.models.group_schemas import (
    ADGroupCreate, ADGroupUpdate, ADGroupResponse,
    ADGroupMember, ADGroupMove
)

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/groups")
def list_groups():
    """List all Active Directory groups"""
    try:
        ps_command = '''
        try {
            Import-Module ActiveDirectory -ErrorAction Stop
            $groups = Get-ADGroup -Filter * -Properties Name, SamAccountName, Description |
                      Select-Object Name, SamAccountName, Description |
                      Sort-Object Name
            if ($groups.Count -eq 0) {
                Write-Output "[]"
            } else {
                $groups | ConvertTo-Json -Depth 2
            }
        } catch {
            Write-Error "PowerShell Error: $($_.Exception.Message)"
            exit 1
        }
        '''
        stdout, stderr, rc = execute_remote_ps(ps_command)
        if rc != 0:
            raise HTTPException(status_code=500, detail=f"Failed to get groups: {stderr}")
        if not stdout or stdout.strip() == "":
            return {"groups": [], "count": 0}
        try:
            data = json.loads(stdout)
            if isinstance(data, dict):
                data = [data]
            return {
                "groups": data,
                "count": len(data),
                "status": "success"
            }
        except json.JSONDecodeError:
            raise HTTPException(status_code=500, detail="Failed to parse group data")
    except Exception as e:
        logger.error(f"Error listing groups: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/groups/{samaccountname}")
def get_group(samaccountname: str):
    """Get details of a specific AD group, including members"""
    try:
        ps_command = f'''
        try {{
            Import-Module ActiveDirectory -ErrorAction Stop
            $group = Get-ADGroup -Identity "{samaccountname}" -Properties *
            if ($group) {{
                $members = Get-ADGroupMember -Identity "{samaccountname}" | Select-Object -ExpandProperty SamAccountName
                $groupInfo = @{{
                    Name = $group.Name
                    SamAccountName = $group.SamAccountName
                    Description = $group.Description
                    Members = $members
                    DistinguishedName = $group.DistinguishedName
                }}
                $groupInfo | ConvertTo-Json -Depth 3
            }} else {{
                Write-Error "Group not found"
                exit 1
            }}
        }} catch {{
            Write-Error "PowerShell Error: $($_.Exception.Message)"
            exit 1
        }}
        '''
        stdout, stderr, rc = execute_remote_ps(ps_command)
        if rc != 0:
            raise HTTPException(status_code=404, detail=f"Group not found: {stderr}")
        try:
            data = json.loads(stdout)
            return {"group": data, "status": "success"}
        except json.JSONDecodeError:
            raise HTTPException(status_code=500, detail="Failed to parse group data")
    except Exception as e:
        logger.error(f"Error getting group: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    
@router.post("/groups")
def create_group(group: ADGroupCreate):
    """Create a new AD group"""
    try:
        desc_param = f'-Description "{group.description}"' if group.description else ''
        path_param = f'-Path "{group.path}"' if group.path else ''
        
        ps_command = f'''
        try {{
            Import-Module ActiveDirectory -ErrorAction Stop
            New-ADGroup -Name "{group.name}" -SamAccountName "{group.samaccountname}" -GroupScope Global {desc_param} {path_param}
            Write-Output "Group created successfully"
        }} catch {{
            Write-Error "PowerShell Error: $($_.Exception.Message)"
            exit 1
        }}
        '''
        stdout, stderr, rc = execute_remote_ps(ps_command)
        if rc != 0:
            raise HTTPException(status_code=500, detail=f"Failed to create group: {stderr}")
        # Get the created group details
        try:
            group_details = get_group(group.samaccountname)
            return {"message": "Group created successfully", "group": group_details["group"]}
        except:
            return {"message": stdout.strip() or "Group created successfully"}
    except Exception as e:
        logger.error(f"Error creating group: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# @router.post("/groups")
# def create_group(group: ADGroupCreate):
#     """Create a new AD group"""
#     try:
#         desc_param = f'-Description "{group.description}"' if group.description else ''
#         ps_command = f'''
#         try {{
#             Import-Module ActiveDirectory -ErrorAction Stop
#             New-ADGroup -Name "{group.name}" -SamAccountName "{group.samaccountname}" -GroupScope Global {desc_param}
#             Write-Output "Group created successfully"
#         }} catch {{
#             Write-Error "PowerShell Error: $($_.Exception.Message)"
#             exit 1
#         }}
#         '''
#         stdout, stderr, rc = execute_remote_ps(ps_command)
#         if rc != 0:
#             raise HTTPException(status_code=500, detail=f"Failed to create group: {stderr}")
#         # Get the created group details
#         try:
#             group_details = get_group(group.samaccountname)
#             return {"message": "Group created successfully", "group": group_details["group"]}
#         except:
#             return {"message": stdout.strip() or "Group created successfully"}
#     except Exception as e:
#         logger.error(f"Error creating group: {str(e)}")
#         raise HTTPException(status_code=500, detail=str(e))

@router.put("/groups/{samaccountname}")
def update_group(samaccountname: str, group: ADGroupUpdate):
    """Update an AD group (name, description)"""
    try:
        set_params = []
        if group.name:
            set_params.append(f'-Name "{group.name}"')
        if group.description is not None:
            set_params.append(f'-Description "{group.description}"')
        if not set_params:
            return {"message": "No changes detected", "status": "success"}
        set_params_str = ' '.join(set_params)
        ps_command = f'''
        try {{
            Import-Module ActiveDirectory -ErrorAction Stop
            Set-ADGroup -Identity "{samaccountname}" {set_params_str}
            Write-Output "Group updated successfully"
        }} catch {{
            Write-Error "PowerShell Error: $($_.Exception.Message)"
            exit 1
        }}
        '''
        stdout, stderr, rc = execute_remote_ps(ps_command)
        if rc != 0:
            raise HTTPException(status_code=500, detail=f"Failed to update group: {stderr}")
        # Get updated group details
        try:
            group_details = get_group(samaccountname)
            return {"message": "Group updated successfully", "group": group_details["group"]}
        except:
            return {"message": stdout.strip() or "Group updated successfully"}
    except Exception as e:
        logger.error(f"Error updating group: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/groups/{samaccountname}")
def delete_group(samaccountname: str):
    """Delete an AD group"""
    try:
        # Get group info before deletion
        try:
            group_details = get_group(samaccountname)
            group_info = group_details["group"]
        except:
            group_info = None
        ps_command = f'''
        try {{
            Import-Module ActiveDirectory -ErrorAction Stop
            Remove-ADGroup -Identity "{samaccountname}" -Confirm:$false
            Write-Output "Group deleted successfully"
        }} catch {{
            Write-Error "PowerShell Error: $($_.Exception.Message)"
            exit 1
        }}
        '''
        stdout, stderr, rc = execute_remote_ps(ps_command)
        if rc != 0:
            raise HTTPException(status_code=500, detail=f"Failed to delete group: {stderr}")
        return {"message": "Group deleted successfully", "deleted_group": group_info, "status": "success"}
    except Exception as e:
        logger.error(f"Error deleting group: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/groups/{samaccountname}/members")
def add_user_to_group(samaccountname: str, member: ADGroupMember):
    """Add a user to a group"""
    try:
        ps_command = f'''
        try {{
            Import-Module ActiveDirectory -ErrorAction Stop
            Add-ADGroupMember -Identity "{samaccountname}" -Members "{member.user_samaccountname}"
            Write-Output "User added to group successfully"
        }} catch {{
            Write-Error "PowerShell Error: $($_.Exception.Message)"
            exit 1
        }}
        '''
        stdout, stderr, rc = execute_remote_ps(ps_command)
        if rc != 0:
            raise HTTPException(status_code=500, detail=f"Failed to add user to group: {stderr}")
        return {"message": "User added to group successfully"}
    except Exception as e:
        logger.error(f"Error adding user to group: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/groups/{samaccountname}/members/{user_samaccountname}")
def remove_user_from_group(samaccountname: str, user_samaccountname: str):
    """Remove a user from a group"""
    try:
        ps_command = f'''
        try {{
            Import-Module ActiveDirectory -ErrorAction Stop
            Remove-ADGroupMember -Identity "{samaccountname}" -Members "{user_samaccountname}" -Confirm:$false
            Write-Output "User removed from group successfully"
        }} catch {{
            Write-Error "PowerShell Error: $($_.Exception.Message)"
            exit 1
        }}
        '''
        stdout, stderr, rc = execute_remote_ps(ps_command)
        if rc != 0:
            raise HTTPException(status_code=500, detail=f"Failed to remove user from group: {stderr}")
        return {"message": "User removed from group successfully"}
    except Exception as e:
        logger.error(f"Error removing user from group: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/groups/{samaccountname}/move")
def move_group(samaccountname: str, move_request: ADGroupMove):
    """Move a group to a different OU"""
    try:
        # Get current group details to find the distinguished name
        group_details = get_group(samaccountname)
        if "group" not in group_details or "DistinguishedName" not in group_details["group"]:
            raise HTTPException(status_code=404, detail="Could not find group to move or group details are incomplete.")
        
        distinguished_name = group_details["group"]["DistinguishedName"]

        ps_command = f'''
        try {{
            Import-Module ActiveDirectory -ErrorAction Stop
            Move-ADObject -Identity "{distinguished_name}" -TargetPath "{move_request.target_ou}"
            Write-Output "Group moved successfully"
        }} catch {{
            Write-Error "PowerShell Error: $($_.Exception.Message)"
            exit 1
        }}
        '''
        stdout, stderr, rc = execute_remote_ps(ps_command)
        if rc != 0:
            raise HTTPException(status_code=500, detail=f"Failed to move group: {stderr}")
        
        return {
            "message": "Group moved successfully",
            "to_ou": move_request.target_ou
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error moving group: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 