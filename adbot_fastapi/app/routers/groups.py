from fastapi import APIRouter, HTTPException
import json
import logging
from app.core.powershell_client import execute_remote_ps
from app.models.group_schemas import (
    ADGroupCreate, ADGroupUpdate, ADGroupResponse,
    ADGroupMember, ADGroupMove, ADGroupList
)

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/groups/{samaccountname}/protection-status")
def get_group_protection_status(samaccountname: str):
    """Check if a group is protected from accidental deletion"""
    try:
        ps_command = f'''
        try {{
            Import-Module ActiveDirectory -ErrorAction Stop
            $group = Get-ADGroup -Identity "{samaccountname}" -Properties ProtectedFromAccidentalDeletion
            $protectionStatus = @{{
                ProtectedFromAccidentalDeletion = $group.ProtectedFromAccidentalDeletion
                SamAccountName = $group.SamAccountName
                Name = $group.Name
            }}
            $protectionStatus | ConvertTo-Json
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
            return {
                "protection_status": data,
                "status": "success"
            }
        except json.JSONDecodeError:
            raise HTTPException(status_code=500, detail="Failed to parse protection status")
            
    except Exception as e:
        logger.error(f"Error getting group protection status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/groups/test")
def test_groups_endpoint():
    """Simple test endpoint to verify the groups router is working"""
    return {
        "message": "Groups endpoint is working",
        "status": "success",
        "timestamp": "2024-01-01T00:00:00Z"
    }

@router.get("/groups/member-counts")
def get_group_member_counts():
    """Get member counts for all groups efficiently"""
    try:
        ps_command = '''
        try {
            Import-Module ActiveDirectory -ErrorAction Stop
            
            # Get all groups first
            $groups = Get-ADGroup -Filter * -Properties Name, SamAccountName
            $memberCounts = @{}
            
            # Process groups in batches to avoid timeout
            $batchSize = 10
            for ($i = 0; $i -lt $groups.Count; $i += $batchSize) {
                $batch = $groups | Select-Object -Skip $i -First $batchSize
                foreach ($group in $batch) {
                    try {
                        $memberCount = (Get-ADGroupMember -Identity $group.SamAccountName -ErrorAction SilentlyContinue).Count
                        $memberCounts[$group.SamAccountName] = $memberCount
                    } catch {
                        $memberCounts[$group.SamAccountName] = 0
                    }
                }
            }
            
            # Convert to array format for JSON
            $result = @()
            foreach ($group in $groups) {
                $result += [PSCustomObject]@{
                    SamAccountName = $group.SamAccountName
                    MemberCount = $memberCounts[$group.SamAccountName]
                }
            }
            
            if ($result.Count -eq 0) {
                Write-Output "[]"
            } else {
                $result | ConvertTo-Json -Depth 2
            }
        } catch {
            Write-Error "PowerShell Error: $($_.Exception.Message)"
            exit 1
        }
        '''
        stdout, stderr, rc = execute_remote_ps(ps_command)
        if rc != 0:
            raise HTTPException(status_code=500, detail=f"Failed to get member counts: {stderr}")
        
        if not stdout or stdout.strip() == "":
            return {"member_counts": {}, "status": "success"}
            
        try:
            data = json.loads(stdout)
            if isinstance(data, dict):
                data = [data]
            
            # Convert to dictionary for easy lookup
            member_counts = {}
            for item in data:
                member_counts[item.get('SamAccountName', '')] = item.get('MemberCount', 0)
            
            return {
                "member_counts": member_counts,
                "status": "success"
            }
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error: {str(e)}")
            logger.error(f"Raw output: {stdout}")
            # Return empty member counts instead of failing
            return {"member_counts": {}, "status": "success", "note": "Using fallback due to parsing error"}
            
    except Exception as e:
        logger.error(f"Error getting member counts: {str(e)}")
        # Return empty member counts instead of failing
        return {"member_counts": {}, "status": "success", "note": "Using fallback due to error"}

@router.get("/groups")
def list_groups():
    """List all Active Directory groups"""
    try:
        ps_command = '''
        try {
            Import-Module ActiveDirectory -ErrorAction Stop
            $groups = Get-ADGroup -Filter * -Properties Name, SamAccountName, Description, DistinguishedName |
                      Select-Object Name, SamAccountName, Description, DistinguishedName |
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
            # Add empty Members array to each group for frontend compatibility
            for group in data:
                group['Members'] = []
            return {
                "groups": data,
                "count": len(data),
                "status": "success"
            }
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error: {str(e)}")
            logger.error(f"Raw output: {stdout}")
            raise HTTPException(status_code=500, detail=f"Failed to parse group data: {str(e)}")
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
                try {{
                    $members = @(Get-ADGroupMember -Identity "{samaccountname}" -ErrorAction SilentlyContinue | Select-Object -ExpandProperty SamAccountName)
                }} catch {{
                    $members = @()
                }}
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
        
        # First, try to remove protection from accidental deletion
        ps_command = f'''
        try {{
            Import-Module ActiveDirectory -ErrorAction Stop
            
            # Check if group exists and get its current protection status
            $group = Get-ADGroup -Identity "{samaccountname}" -Properties ProtectedFromAccidentalDeletion
            if ($group.ProtectedFromAccidentalDeletion) {{
                # Remove protection from accidental deletion
                Set-ADGroup -Identity "{samaccountname}" -ProtectedFromAccidentalDeletion $false
                Write-Output "Protection removed from group"
            }}
            
            # Now delete the group
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
        # First check if the user exists
        check_user_command = f'''
        try {{
            Import-Module ActiveDirectory -ErrorAction Stop
            $user = Get-ADUser -Identity "{member.user_samaccountname}" -ErrorAction SilentlyContinue
            if ($user) {{
                Write-Output "User exists"
            }} else {{
                Write-Error "User not found: {member.user_samaccountname}"
                exit 1
            }}
        }} catch {{
            Write-Error "PowerShell Error: $($_.Exception.Message)"
            exit 1
        }}
        '''
        
        stdout, stderr, rc = execute_remote_ps(check_user_command)
        if rc != 0:
            raise HTTPException(status_code=404, detail=f"User not found: {member.user_samaccountname}")
        
        # Then add the user to the group
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
        
        return {
            "message": "User added to group successfully",
            "group": samaccountname,
            "user": member.user_samaccountname,
            "status": "success"
        }
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
        
        return {
            "message": "User removed from group successfully",
            "group": samaccountname,
            "user": user_samaccountname,
            "status": "success"
        }
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