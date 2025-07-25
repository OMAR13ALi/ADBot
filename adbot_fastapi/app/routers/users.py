from fastapi import APIRouter, HTTPException, Query, Path
import json
import logging
from typing import Optional, List
from app.core.powershell_client import execute_remote_ps
from app.models.user_schemas import (
    ADUserCreate, ADUserUpdate, ADUserResponse, ADUserSearch, 
    ADUserMove, ADUserPasswordReset, ADOrganizationalUnit
)

router = APIRouter()
logger = logging.getLogger(__name__)

# OU Management Endpoints
@router.get("/organizational-units")
def list_organizational_units():
    """Get all Organizational Units - helpful for user creation"""
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
            return {"organizational_units": [], "count": 0}
            
        try:
            data = json.loads(stdout)
            if isinstance(data, dict):
                data = [data]
            return {
                "organizational_units": data,
                "count": len(data),
                "status": "success"
            }
        except json.JSONDecodeError:
            raise HTTPException(status_code=500, detail="Failed to parse OU data")
            
    except Exception as e:
        logger.error(f"Error listing OUs: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/users/default-container")
def get_default_user_container():
    """Get the default container where users are created if no OU is specified"""
    try:
        ps_command = '''
        try {
            Import-Module ActiveDirectory -ErrorAction Stop
            $domain = Get-ADDomain
            $defaultContainer = "CN=Users," + $domain.DistinguishedName
            $containerInfo = @{
                DefaultContainer = $defaultContainer
                DomainDN = $domain.DistinguishedName
                DomainName = $domain.Name
            }
            $containerInfo | ConvertTo-Json
        } catch {
            Write-Error "PowerShell Error: $($_.Exception.Message)"
            exit 1
        }
        '''
        stdout, stderr, rc = execute_remote_ps(ps_command)
        if rc != 0:
            raise HTTPException(status_code=500, detail=f"Failed to get default container: {stderr}")
        
        try:
            data = json.loads(stdout)
            return {
                "default_container": data,
                "status": "success",
                "note": "Users created without specifying an OU will be placed in the default container"
            }
        except json.JSONDecodeError:
            raise HTTPException(status_code=500, detail="Failed to parse container data")
            
    except Exception as e:
        logger.error(f"Error getting default container: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    
@router.post("/users")

def create_user(user: ADUserCreate):
    """Create a new user with detailed feedback"""
    enabled_ps = "$true" if user.enabled else "$false"
    try:
        # Handle optional OU parameter
        ou_param = ""
        if user.ou and user.ou.strip() and user.ou.lower() != "none":
            ou_param = f'-Path "{user.ou}"'
        
        # Build additional parameters
        additional_params = []
        if user.description:
            additional_params.append(f'-Description "{user.description}"')
        if user.email:
            additional_params.append(f'-EmailAddress "{user.email}"')
        if user.given_name:
            additional_params.append(f'-GivenName "{user.given_name}"')
        if user.surname:
            additional_params.append(f'-Surname "{user.surname}"')
        if user.display_name:
            additional_params.append(f'-DisplayName "{user.display_name}"')
        if user.user_principal_name:
            additional_params.append(f'-UserPrincipalName "{user.user_principal_name}"')
        if user.department:
            additional_params.append(f'-Department "{user.department}"')
        if user.title:
            additional_params.append(f'-Title "{user.title}"')
        if user.phone:
            additional_params.append(f'-OfficePhone "{user.phone}"')
        if user.manager:
            additional_params.append(f'-Manager "{user.manager}"')
        
        additional_params_str = ' '.join(additional_params)
        
        ps_command = f'''
        try {{
            Import-Module ActiveDirectory -ErrorAction Stop
            $SecurePass = ConvertTo-SecureString "{user.password}" -AsPlainText -Force
            New-ADUser -Name "{user.name}" -SamAccountName "{user.samaccountname}" -AccountPassword $SecurePass -Enabled {enabled_ps} {ou_param} {additional_params_str}
            Write-Output "User created successfully"
        }} catch {{
            Write-Error "PowerShell Error: $($_.Exception.Message)"
            exit 1
        }}
        '''
        stdout, stderr, rc = execute_remote_ps(ps_command)
        if rc != 0:
            logger.error(f"PowerShell command failed: {stderr}")
            raise HTTPException(status_code=500, detail=f"PowerShell command failed: {stderr}")
        
        # Get the created user details
        try:
            created_user_response = get_user(user.samaccountname)
            created_user = created_user_response["user"]
            return {
                "message": "User created successfully",
                "user": created_user
            }
        except:
            # If we can't get the user details, still return success
            return {"message": stdout.strip() or "User created successfully"}
            
    except Exception as e:
        logger.error(f"Error creating user: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))



# Enhanced User Management
# @router.post("/users")
# def create_user(user: ADUserCreate):
#     """Create a new user with comprehensive field support"""
#     try:
#         enabled_ps = "$true" if user.enabled else "$false"
        
#         # Build the New-ADUser command with all available parameters
#         params = [
#             f'-Name "{user.name}"',
#             f'-SamAccountName "{user.samaccountname}"',
#             f'-AccountPassword (ConvertTo-SecureString "{user.password}" -AsPlainText -Force)',
#             f'-Enabled {enabled_ps}'
#         ]
        
#         # Add optional parameters
#         if user.ou and user.ou.strip() and user.ou.lower() != "none":
#             params.append(f'-Path "{user.ou}"')
#         if user.description:
#             params.append(f'-Description "{user.description}"')
#         if user.email:
#             params.append(f'-EmailAddress "{user.email}"')
#         if user.department:
#             params.append(f'-Department "{user.department}"')
#         if user.title:
#             params.append(f'-Title "{user.title}"')
#         if user.phone:
#             params.append(f'-OfficePhone "{user.phone}"')
#         if user.manager:
#             params.append(f'-Manager "{user.manager}"')
        
#         params_str = ' '.join(params)
        
#         ps_command = f'''
#         try {{
#             Import-Module ActiveDirectory -ErrorAction Stop
#             New-ADUser {params_str}
#             Write-Output "User created successfully"
#         }} catch {{
#             Write-Error "PowerShell Error: $($_.Exception.Message)"
#             exit 1
#         }}
#         '''
        
#         stdout, stderr, rc = execute_remote_ps(ps_command)
#         if rc != 0:
#             logger.error(f"PowerShell command failed: {stderr}")
#             raise HTTPException(status_code=500, detail=f"User creation failed: {stderr}")
        
        # Get the created user details
        try:
            created_user = get_user_details(user.samaccountname)
            return {
                "message": "User created successfully",
                "user": created_user,
                "status": "success"
            }
        except:
            return {"message": "User created successfully", "status": "success"}
            
    except Exception as e:
        logger.error(f"Error creating user: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/users/{samaccountname}")
def get_user(samaccountname: str = Path(..., description="Username to lookup")):
    """Get detailed information about a specific user"""
    try:
        user_details = get_user_details(samaccountname)
        return {
            "user": user_details,
            "status": "success"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

def get_user_details(samaccountname: str) -> dict:
    """Helper function to get user details"""
    ps_command = f'''
    try {{
        Import-Module ActiveDirectory -ErrorAction Stop
        $user = Get-ADUser -Identity "{samaccountname}" -Properties *
        if ($user) {{
            $userInfo = @{{
                Name = $user.Name
                SamAccountName = $user.SamAccountName
                Enabled = $user.Enabled
                LastLogonDate = if ($user.LastLogonDate) {{ $user.LastLogonDate.ToString('yyyy-MM-dd HH:mm:ss') }} else {{ "Never" }}
                Description = $user.Description
                EmailAddress = $user.EmailAddress
                GivenName = $user.GivenName
                Surname = $user.Surname
                DisplayName = $user.DisplayName
                UserPrincipalName = $user.UserPrincipalName
                Department = $user.Department
                Title = $user.Title
                OfficePhone = $user.OfficePhone
                Manager = $user.Manager
                DistinguishedName = $user.DistinguishedName
                Created = $user.Created.ToString('yyyy-MM-dd HH:mm:ss')
                Modified = $user.Modified.ToString('yyyy-MM-dd HH:mm:ss')
                PasswordLastSet = if ($user.PasswordLastSet) {{ $user.PasswordLastSet.ToString('yyyy-MM-dd HH:mm:ss') }} else {{ "Never" }}
                AccountExpirationDate = if ($user.AccountExpirationDate) {{ $user.AccountExpirationDate.ToString('yyyy-MM-dd HH:mm:ss') }} else {{ "Never" }}
                LockedOut = $user.LockedOut
                PasswordExpired = $user.PasswordExpired
                PasswordNeverExpires = $user.PasswordNeverExpires
                MemberOf = $user.MemberOf
            }}
            $userInfo | ConvertTo-Json -Depth 3
        }} else {{
            Write-Error "User not found"
            exit 1
        }}
    }} catch {{
        Write-Error "PowerShell Error: $($_.Exception.Message)"
        exit 1
    }}
    '''
    
    stdout, stderr, rc = execute_remote_ps(ps_command)
    if rc != 0:
        raise HTTPException(status_code=404, detail=f"User not found: {stderr}")
    
    try:
        return json.loads(stdout)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Failed to parse user data")

@router.put("/users/{samaccountname}")
def update_user(samaccountname: str, user: ADUserUpdate):
    """Update user with before/after comparison"""
    try:
        # Get current user state
        current_user = get_user_details(samaccountname)
        
        # Build update parameters
        set_params = []
        changes_made = []
        
        if user.name and user.name != current_user.get("Name"):
            set_params.append(f'-Name "{user.name}"')
            changes_made.append(f"Name: '{current_user.get('Name')}' -> '{user.name}'")
            
        if user.password:
            set_params.append(f'-AccountPassword (ConvertTo-SecureString "{user.password}" -AsPlainText -Force)')
            changes_made.append("Password: Updated")
            
        logger.info(f"Checking enabled field: user.enabled={user.enabled}, current_user.Enabled={current_user.get('Enabled')}")
        if user.enabled is not None and user.enabled != current_user.get("Enabled"):
            enabled_value = "$true" if user.enabled else "$false"
            set_params.append(f'-Enabled {enabled_value}')
            changes_made.append(f"Enabled: {current_user.get('Enabled')} -> {user.enabled}")
            logger.info(f"Enabled field will be updated: {enabled_value}")
        else:
            logger.info(f"Enabled field unchanged or not provided")
            
        if user.description is not None and user.description != current_user.get("Description"):
            set_params.append(f'-Description "{user.description}"')
            changes_made.append(f"Description: '{current_user.get('Description', '')}' -> '{user.description}'")
            
        if user.email is not None and user.email != current_user.get("EmailAddress"):
            set_params.append(f'-EmailAddress "{user.email}"')
            changes_made.append(f"Email: '{current_user.get('EmailAddress', '')}' -> '{user.email}'")
            
        if user.given_name is not None and user.given_name != current_user.get("GivenName"):
            set_params.append(f'-GivenName "{user.given_name}"')
            changes_made.append(f"Given Name: '{current_user.get('GivenName', '')}' -> '{user.given_name}'")
            
        if user.surname is not None and user.surname != current_user.get("Surname"):
            set_params.append(f'-Surname "{user.surname}"')
            changes_made.append(f"Surname: '{current_user.get('Surname', '')}' -> '{user.surname}'")
            
        if user.display_name is not None and user.display_name != current_user.get("DisplayName"):
            set_params.append(f'-DisplayName "{user.display_name}"')
            changes_made.append(f"Display Name: '{current_user.get('DisplayName', '')}' -> '{user.display_name}'")
            
        if user.user_principal_name is not None and user.user_principal_name != current_user.get("UserPrincipalName"):
            set_params.append(f'-UserPrincipalName "{user.user_principal_name}"')
            changes_made.append(f"User Principal Name: '{current_user.get('UserPrincipalName', '')}' -> '{user.user_principal_name}'")
            
        if user.department is not None and user.department != current_user.get("Department"):
            set_params.append(f'-Department "{user.department}"')
            changes_made.append(f"Department: '{current_user.get('Department', '')}' -> '{user.department}'")
            
        if user.title is not None and user.title != current_user.get("Title"):
            set_params.append(f'-Title "{user.title}"')
            changes_made.append(f"Title: '{current_user.get('Title', '')}' -> '{user.title}'")
            
        if user.phone is not None and user.phone != current_user.get("OfficePhone"):
            set_params.append(f'-OfficePhone "{user.phone}"')
            changes_made.append(f"Phone: '{current_user.get('OfficePhone', '')}' -> '{user.phone}'")
            
        if user.manager is not None and user.manager != current_user.get("Manager"):
            set_params.append(f'-Manager "{user.manager}"')
            changes_made.append(f"Manager: '{current_user.get('Manager', '')}' -> '{user.manager}'")
        
        if not set_params:
            return {
                "message": "No changes detected",
                "current_user": current_user,
                "changes_made": [],
                "status": "success"
            }
        
        # Execute update
        set_params_str = ' '.join(set_params)
        logger.info(f"Update parameters: {set_params_str}")
        logger.info(f"Changes to be made: {changes_made}")
        ps_command = f'''
        try {{
            Import-Module ActiveDirectory -ErrorAction Stop
            Set-ADUser -Identity "{samaccountname}" {set_params_str}
            Write-Output "User updated successfully"
        }} catch {{
            Write-Error "PowerShell Error: $($_.Exception.Message)"
            exit 1
        }}
        '''
        
        stdout, stderr, rc = execute_remote_ps(ps_command)
        if rc != 0:
            raise HTTPException(status_code=500, detail=f"Update failed: {stderr}")
        
        # Get updated user state
        updated_user = get_user_details(samaccountname)
        
        return {
            "message": "User updated successfully",
            "changes_made": changes_made,
            "before": current_user,
            "after": updated_user,
            "status": "success"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/users/{samaccountname}/move")
def move_user(samaccountname: str, move_request: ADUserMove):
    """Move user to a different OU"""
    try:
        # Get current user location
        current_user = get_user_details(samaccountname)
        current_ou = current_user.get("DistinguishedName", "").split(",", 1)[1] if "," in current_user.get("DistinguishedName", "") else "Unknown"
        
        ps_command = f'''
        try {{
            Import-Module ActiveDirectory -ErrorAction Stop
            Move-ADObject -Identity "{current_user['DistinguishedName']}" -TargetPath "{move_request.target_ou}"
            Write-Output "User moved successfully"
        }} catch {{
            Write-Error "PowerShell Error: $($_.Exception.Message)"
            exit 1
        }}
        '''
        
        stdout, stderr, rc = execute_remote_ps(ps_command)
        if rc != 0:
            raise HTTPException(status_code=500, detail=f"Move failed: {stderr}")
        
        # Get updated user location
        updated_user = get_user_details(samaccountname)
        
        return {
            "message": "User moved successfully",
            "from_ou": current_ou,
            "to_ou": move_request.target_ou,
            "updated_user": updated_user,
            "status": "success"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error moving user: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/users/{samaccountname}/reset-password")
def reset_password(samaccountname: str, reset_request: ADUserPasswordReset):
    """Reset user password with options"""
    try:
        change_on_logon = "$true" if reset_request.force_change_on_logon else "$false"
        
        ps_command = f'''
        try {{
            Import-Module ActiveDirectory -ErrorAction Stop
            Set-ADAccountPassword -Identity "{samaccountname}" -Reset -NewPassword (ConvertTo-SecureString "{reset_request.new_password}" -AsPlainText -Force)
            Set-ADUser -Identity "{samaccountname}" -ChangePasswordAtLogon {change_on_logon}
            Write-Output "Password reset successfully"
        }} catch {{
            Write-Error "PowerShell Error: $($_.Exception.Message)"
            exit 1
        }}
        '''
        
        stdout, stderr, rc = execute_remote_ps(ps_command)
        if rc != 0:
            raise HTTPException(status_code=500, detail=f"Password reset failed: {stderr}")
        
        return {
            "message": "Password reset successfully",
            "force_change_on_logon": reset_request.force_change_on_logon,
            "status": "success"
        }
        
    except Exception as e:
        logger.error(f"Error resetting password: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/users/{samaccountname}")
def delete_user(samaccountname: str):
    """Delete a user (with confirmation of current state)"""
    try:
        # Get user info before deletion
        try:
            current_user = get_user_details(samaccountname)
        except:
            current_user = None
            
        ps_command = f'''
        try {{
            Import-Module ActiveDirectory -ErrorAction Stop
            Remove-ADUser -Identity "{samaccountname}" -Confirm:$false
            Write-Output "User deleted successfully"
        }} catch {{
            Write-Error "PowerShell Error: $($_.Exception.Message)"
            exit 1
        }}
        '''
        
        stdout, stderr, rc = execute_remote_ps(ps_command)
        if rc != 0:
            raise HTTPException(status_code=500, detail=f"Delete failed: {stderr}")
        
        return {
            "message": "User deleted successfully",
            "deleted_user": current_user,
            "status": "success"
        }
        
    except Exception as e:
        logger.error(f"Error deleting user: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))



# from fastapi import APIRouter, HTTPException, Query
# import json
# import logging
# from typing import Optional
# from app.core.powershell_client import execute_remote_ps
# from app.models.user_schemas import ADUserCreate, ADUserUpdate

# router = APIRouter()
# logger = logging.getLogger(__name__)

# @router.get("/users/{samaccountname}")
# def get_user(samaccountname: str):
#     """Get detailed information about a specific user"""
#     try:
#         ps_command = f'''
#         try {{
#            Import-Module ActiveDirectory -ErrorAction Stop
#              $user = Get-ADUser -Identity "{samaccountname}" -Properties Name, SamAccountName, Enabled, LastLogonDate, Description, EmailAddress, Department, Title, Manager, DistinguishedName, Created, Modified
#              if ($user) {{
#                  $userInfo = @{{
#                      Name = $user.Name
#                      SamAccountName = $user.SamAccountName
#                      Enabled = $user.Enabled
#                      LastLogonDate = if ($user.LastLogonDate) {{ $user.LastLogonDate.ToString('yyyy-MM-dd HH:mm:ss') }} else {{ $null }}
#                      Description = $user.Description
#                      EmailAddress = $user.EmailAddress
#                      Department = $user.Department
#                      Title = $user.Title
#                      Manager = $user.Manager
#                      DistinguishedName = $user.DistinguishedName
#                      Created = $user.Created.ToString('yyyy-MM-dd HH:mm:ss')
#                      Modified = $user.Modified.ToString('yyyy-MM-dd HH:mm:ss')
#                  }}
#                  $userInfo | ConvertTo-Json -Depth 2
#              }} else {{
#                  Write-Error "User not found"
#                  exit 1
#              }}
#          }} catch {{
#              Write-Error "PowerShell Error: $($_.Exception.Message)"
#              exit 1
#          }}
#          '''
#         stdout, stderr, rc = execute_remote_ps(ps_command)
#         if rc != 0:
#             logger.error(f"PowerShell command failed: {stderr}")
#             raise HTTPException(status_code=404, detail=f"User not found or error: {stderr}")
        
#         try:
#             user_data = json.loads(stdout)
#             return {"user": user_data, "status": "success"}
#         except json.JSONDecodeError as e:
#             logger.error(f"JSON decode error: {str(e)}")
#             raise HTTPException(status_code=500, detail="Failed to parse user data")
            
#     except Exception as e:
#         logger.error(f"Error getting user: {str(e)}")
#         raise HTTPException(status_code=500, detail=str(e))

@router.get("/users")
def list_users(
    search: Optional[str] = Query(None, description="Search by name or samaccountname"),
    enabled: Optional[bool] = Query(None, description="Filter by enabled status"),
    limit: Optional[int] = Query(100, description="Limit number of results")
):
    """List users with optional filtering and search"""
    try:
        # Build filter based on parameters
        filter_parts = []
        if search:
            filter_parts.append(f"(Name -like '*{search}*' -or SamAccountName -like '*{search}*')")
        if enabled is not None:
            filter_parts.append(f"Enabled -eq ${str(enabled).lower()}")
        
        if filter_parts:
            filter_string = " -and ".join(filter_parts)
        else:
            filter_string = "*"
        
        ps_command = f'''
        try {{
            Import-Module ActiveDirectory -ErrorAction Stop
            $users = Get-ADUser -Filter "{filter_string}" -Properties Name, SamAccountName, Enabled, LastLogonDate, Description, Department, GivenName, Surname, DisplayName, UserPrincipalName |
                     Select-Object Name, SamAccountName, Enabled, 
                     @{{Name='LastLogonDate'; Expression={{if ($_.LastLogonDate) {{$_.LastLogonDate.ToString('yyyy-MM-dd HH:mm:ss')}} else {{'Never'}}}}}},
                     Description, Department, GivenName, Surname, DisplayName, UserPrincipalName |
                     Sort-Object Name |
                     Select-Object -First {limit}
            if ($users.Count -eq 0) {{
                Write-Output "[]"
            }} else {{
                $users | ConvertTo-Json -Depth 2
            }}
        }} catch {{
            Write-Error "PowerShell Error: $($_.Exception.Message)"
            exit 1
        }}
        '''
        stdout, stderr, rc = execute_remote_ps(ps_command)
        if rc != 0:
            logger.error(f"PowerShell command failed with return code {rc}")
            logger.error(f"Error output: {stderr}")
            raise HTTPException(
                status_code=500,
                detail=f"PowerShell command failed: {stderr}"
            )
        if not stdout or stdout.strip() == "":
            return {"users": [], "message": "No users found or empty response"}
        try:
            data = json.loads(stdout)
            if isinstance(data, dict):
                data = [data]
            return {
                "users": data,
                "count": len(data),
                "status": "success",
                "filters_applied": {
                    "search": search,
                    "enabled": enabled,
                    "limit": limit
                }
            }
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error: {str(e)}")
            logger.error(f"Raw output: {stdout}")
            return {
                "error": "Failed to parse JSON response",
                "raw_output": stdout,
                "json_error": str(e)
            }
    except Exception as e:
        logger.error(f"Unexpected error in list_users: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# @router.put("/users/{samaccountname}")
# def update_user(samaccountname: str, user: ADUserUpdate):
#     """Update user - returns current state before and after update"""
#     try:
#         # First, get current user state
#         current_user_response = get_user(samaccountname)
#         current_user = current_user_response["user"]
        
#         # Build update parameters
#         set_params = []
#         changes_made = []
        
#         if user.name and user.name != current_user.get("Name"):
#             set_params.append(f'-Name "{user.name}"')
#             changes_made.append(f"Name: '{current_user.get('Name')}' -> '{user.name}'")
            
#         if user.password:
#             set_params.append(f'-AccountPassword (ConvertTo-SecureString "{user.password}" -AsPlainText -Force)')
#             changes_made.append("Password: Updated")
            
#         if user.enabled is not None and user.enabled != current_user.get("Enabled"):
#             enabled_value = "$true" if user.enabled else "$false"
#             set_params.append(f'-Enabled {enabled_value}')
#             changes_made.append(f"Enabled: {current_user.get('Enabled')} -> {user.enabled}")
        
#         if hasattr(user, 'description') and user.description is not None:
#             set_params.append(f'-Description "{user.description}"')
#             changes_made.append(f"Description: '{current_user.get('Description', '')}' -> '{user.description}'")
            
#         if hasattr(user, 'email') and user.email is not None:
#             set_params.append(f'-EmailAddress "{user.email}"')
#             changes_made.append(f"Email: '{current_user.get('EmailAddress', '')}' -> '{user.email}'")
        
#         if not set_params:
#             return {
#                 "message": "No changes detected",
#                 "current_user": current_user,
#                 "changes_made": []
#             }
        
#         set_params_str = ' '.join(set_params)
#         ps_command = f'''
#         try {{
#             Import-Module ActiveDirectory -ErrorAction Stop
#             Set-ADUser -Identity "{samaccountname}" {set_params_str}
#             Write-Output "User updated successfully"
#         }} catch {{
#             Write-Error "PowerShell Error: $($_.Exception.Message)"
#             exit 1
#         }}
#         '''
        
#         stdout, stderr, rc = execute_remote_ps(ps_command)
#         if rc != 0:
#             logger.error(f"PowerShell command failed: {stderr}")
#             raise HTTPException(status_code=500, detail=f"PowerShell command failed: {stderr}")
        
#         # Get updated user state
#         updated_user_response = get_user(samaccountname)
#         updated_user = updated_user_response["user"]
        
#         return {
#             "message": "User updated successfully",
#             "changes_made": changes_made,
#             "before": current_user,
#             "after": updated_user
#         }
        
#     except HTTPException:
#         raise
#     except Exception as e:
#         logger.error(f"Error updating user: {str(e)}")
#         raise HTTPException(status_code=500, detail=str(e))

# @router.post("/users")
# def create_user(user: ADUserCreate):
#     """Create a new user with detailed feedback"""
#     enabled_ps = "$true" if user.enabled else "$false"
#     try:
#         # Handle optional OU parameter
#         ou_param = ""
#         if user.ou and user.ou.strip() and user.ou.lower() != "none":
#             ou_param = f'-Path "{user.ou}"'
        
#         ps_command = f'''
#         try {{
#             Import-Module ActiveDirectory -ErrorAction Stop
#             $SecurePass = ConvertTo-SecureString "{user.password}" -AsPlainText -Force
#             New-ADUser -Name "{user.name}" -SamAccountName "{user.samaccountname}" -AccountPassword $SecurePass -Enabled {enabled_ps} {ou_param}
#             Write-Output "User created successfully"
#         }} catch {{
#             Write-Error "PowerShell Error: $($_.Exception.Message)"
#             exit 1
#         }}
#         '''
#         stdout, stderr, rc = execute_remote_ps(ps_command)
#         if rc != 0:
#             logger.error(f"PowerShell command failed: {stderr}")
#             raise HTTPException(status_code=500, detail=f"PowerShell command failed: {stderr}")
        
#         # Get the created user details
#         try:
#             created_user_response = get_user(user.samaccountname)
#             created_user = created_user_response["user"]
#             return {
#                 "message": "User created successfully",
#                 "user": created_user
#             }
#         except:
#             # If we can't get the user details, still return success
#             return {"message": stdout.strip() or "User created successfully"}
            
#     except Exception as e:
#         logger.error(f"Error creating user: {str(e)}")
#         raise HTTPException(status_code=500, detail=str(e))

# @router.delete("/users/{samaccountname}")
# def delete_user(samaccountname: str):
#     """Delete a user (with confirmation of current state)"""
#     try:
#         # Get user info before deletion
#         try:
#             current_user_response = get_user(samaccountname)
#             current_user = current_user_response["user"]
#         except:
#             current_user = None
            
#         ps_command = f'''
#         try {{
#             Import-Module ActiveDirectory -ErrorAction Stop
#             Remove-ADUser -Identity "{samaccountname}" -Confirm:$false
#             Write-Output "User deleted successfully"
#         }} catch {{
#             Write-Error "PowerShell Error: $($_.Exception.Message)"
#             exit 1
#         }}
#         '''
#         stdout, stderr, rc = execute_remote_ps(ps_command)
#         if rc != 0:
#             logger.error(f"PowerShell command failed: {stderr}")
#             raise HTTPException(status_code=500, detail=f"PowerShell command failed: {stderr}")
        
#         return {
#             "message": "User deleted successfully",
#             "deleted_user": current_user
#         }
#     except Exception as e:
#         logger.error(f"Error deleting user: {str(e)}")
#         raise HTTPException(status_code=500, detail=str(e))

# @router.get("/test_connection")
# def test_connection():
#     try:
#         ps_command = "Write-Output 'Connection successful'; $env:COMPUTERNAME"
#         stdout, stderr, rc = execute_remote_ps(ps_command)
#         return {
#             "status": "success" if rc == 0 else "error",
#             "return_code": rc,
#             "stdout": stdout,
#             "stderr": stderr
#         }
#     except Exception as e:
#         logger.error(f"Connection test failed: {str(e)}")
#         raise HTTPException(status_code=500, detail=f"Connection test failed: {str(e)}")

# @router.get("/test_ad_module")
# def test_ad_module():
#     try:
#         ps_command = """
#         try {
#             Import-Module ActiveDirectory -ErrorAction Stop
#             Write-Output 'AD module loaded'
#         } catch {
#             Write-Output 'Error: ' + $_
#         }
#         """
#         stdout, stderr, rc = execute_remote_ps(ps_command)
#         return {
#             "stdout": stdout,
#             "stderr": stderr,
#             "rc": rc
#         }
#     except Exception as e:
#         return {"error": str(e)}

# @router.get("/test_get_aduser")
# def test_get_aduser():
#     try:
#         ps_command = """
#         try {
#             Import-Module ActiveDirectory -ErrorAction Stop
#             Get-ADUser -Filter * | Select-Object -First 1 | ConvertTo-Json
#         } catch {
#             Write-Output 'Error: ' + $_
#         }
#         """
#         stdout, stderr, rc = execute_remote_ps(ps_command)
#         return {
#             "stdout": stdout,
#             "stderr": stderr,
#             "rc": rc
#         }
#     except Exception as e:
#         return {"error": str(e)}



        



# from fastapi import APIRouter, HTTPException
# import json
# import logging
# from app.core.powershell_client import execute_remote_ps
# from app.models.user_schemas import ADUserCreate, ADUserUpdate

# router = APIRouter()
# logger = logging.getLogger(__name__)

# @router.get("/test_connection")
# def test_connection():
#     try:
#         ps_command = "Write-Output 'Connection successful'; $env:COMPUTERNAME"
#         stdout, stderr, rc = execute_remote_ps(ps_command)
#         return {
#             "status": "success" if rc == 0 else "error",
#             "return_code": rc,
#             "stdout": stdout,
#             "stderr": stderr
#         }
#     except Exception as e:
#         logger.error(f"Connection test failed: {str(e)}")
#         raise HTTPException(status_code=500, detail=f"Connection test failed: {str(e)}")

# @router.get("/list_users")
# def list_users():
#     try:
#         ps_command = '''
#         try {
#             Import-Module ActiveDirectory -ErrorAction Stop
#             $users = Get-ADUser -Filter * -Properties Name, SamAccountName, Enabled, LastLogonDate |
#                      Select-Object Name, SamAccountName, Enabled, LastLogonDate |
#                      Sort-Object Name
#             if ($users.Count -eq 0) {
#                 Write-Output "[]"
#             } else {
#                 $users | ConvertTo-Json -Depth 2
#             }
#         } catch {
#             Write-Error "PowerShell Error: $($_.Exception.Message)"
#             exit 1
#         }
#         '''
#         stdout, stderr, rc = execute_remote_ps(ps_command)
#         if rc != 0:
#             logger.error(f"PowerShell command failed with return code {rc}")
#             logger.error(f"Error output: {stderr}")
#             raise HTTPException(
#                 status_code=500,
#                 detail=f"PowerShell command failed: {stderr}"
#             )
#         if not stdout or stdout.strip() == "":
#             return {"users": [], "message": "No users found or empty response"}
#         try:
#             data = json.loads(stdout)
#             if isinstance(data, dict):
#                 data = [data]
#             return {
#                 "users": data,
#                 "count": len(data),
#                 "status": "success"
#             }
#         except json.JSONDecodeError as e:
#             logger.error(f"JSON decode error: {str(e)}")
#             logger.error(f"Raw output: {stdout}")
#             return {
#                 "error": "Failed to parse JSON response",
#                 "raw_output": stdout,
#                 "json_error": str(e)
#             }
#     except Exception as e:
#         logger.error(f"Unexpected error in list_users: {str(e)}")
#         raise HTTPException(status_code=500, detail=str(e))

# @router.post("/users")
# def create_user(user: ADUserCreate):
#     enabled_ps = "$true" if user.enabled else "$false"
#     try:
#         # Handle optional OU parameter
#         ou_param = ""
#         if user.ou and user.ou.strip() and user.ou.lower() != "none":
#             ou_param = f'-Path "{user.ou}"'
        
#         ps_command = f'''
#         try {{
#             Import-Module ActiveDirectory -ErrorAction Stop
#             $SecurePass = ConvertTo-SecureString "{user.password}" -AsPlainText -Force
#             New-ADUser -Name "{user.name}" -SamAccountName "{user.samaccountname}" -AccountPassword $SecurePass -Enabled {enabled_ps} {ou_param}
#             Write-Output "User created successfully"
#         }} catch {{
#             Write-Error "PowerShell Error: $($_.Exception.Message)"
#             exit 1
#         }}
#         '''
#         stdout, stderr, rc = execute_remote_ps(ps_command)
#         if rc != 0:
#             logger.error(f"PowerShell command failed: {stderr}")
#             raise HTTPException(status_code=500, detail=f"PowerShell command failed: {stderr}")
#         return {"message": stdout.strip() or "User created successfully"}
#     except Exception as e:
#         logger.error(f"Error creating user: {str(e)}")
#         raise HTTPException(status_code=500, detail=str(e))

# @router.put("/users/{samaccountname}")
# def update_user(samaccountname: str, user: ADUserUpdate):
#     try:
#         set_params = []
#         if user.name:
#             set_params.append(f'-Name "{user.name}"')
#         if user.password:
#             set_params.append(f'-AccountPassword (ConvertTo-SecureString "{user.password}" -AsPlainText -Force)')
#         if user.enabled is not None:
#             enabled_value = "$true" if user.enabled else "$false"
#             set_params.append(f'-Enabled {enabled_value}')
        
#         if not set_params:
#             raise HTTPException(status_code=400, detail="No fields to update.")
        
#         set_params_str = ' '.join(set_params)
#         ps_command = f'''
#         try {{
#             Import-Module ActiveDirectory -ErrorAction Stop
#             Set-ADUser -Identity "{samaccountname}" {set_params_str}
#             Write-Output "User updated successfully"
#         }} catch {{
#             Write-Error "PowerShell Error: $($_.Exception.Message)"
#             exit 1
#         }}
#         '''
#         stdout, stderr, rc = execute_remote_ps(ps_command)
#         if rc != 0:
#             logger.error(f"PowerShell command failed: {stderr}")
#             raise HTTPException(status_code=500, detail=f"PowerShell command failed: {stderr}")
#         return {"message": stdout.strip() or "User updated successfully"}
#     except Exception as e:
#         logger.error(f"Error updating user: {str(e)}")
#         raise HTTPException(status_code=500, detail=str(e))

# @router.delete("/users/{samaccountname}")
# def delete_user(samaccountname: str):
#     try:
#         ps_command = f'''
#         try {{
#             Import-Module ActiveDirectory -ErrorAction Stop
#             Remove-ADUser -Identity "{samaccountname}" -Confirm:$false
#             Write-Output "User deleted successfully"
#         }} catch {{
#             Write-Error "PowerShell Error: $($_.Exception.Message)"
#             exit 1
#         }}
#         '''
#         stdout, stderr, rc = execute_remote_ps(ps_command)
#         if rc != 0:
#             logger.error(f"PowerShell command failed: {stderr}")
#             raise HTTPException(status_code=500, detail=f"PowerShell command failed: {stderr}")
#         return {"message": stdout.strip() or "User deleted successfully"}
#     except Exception as e:
#         logger.error(f"Error deleting user: {str(e)}")
#         raise HTTPException(status_code=500, detail=str(e))

# @router.get("/test_ad_module")
# def test_ad_module():
#     try:
#         ps_command = """
#         try {
#             Import-Module ActiveDirectory -ErrorAction Stop
#             Write-Output 'AD module loaded'
#         } catch {
#             Write-Output 'Error: ' + $_
#         }
#         """
#         stdout, stderr, rc = execute_remote_ps(ps_command)
#         return {
#             "stdout": stdout,
#             "stderr": stderr,
#             "rc": rc
#         }
#     except Exception as e:
#         return {"error": str(e)}

# @router.get("/test_get_aduser")
# def test_get_aduser():
#     try:
#         ps_command = """
#         try {
#             Import-Module ActiveDirectory -ErrorAction Stop
#             Get-ADUser -Filter * | Select-Object -First 1 | ConvertTo-Json
#         } catch {
#             Write-Output 'Error: ' + $_
#         }
#         """
#         stdout, stderr, rc = execute_remote_ps(ps_command)
#         return {
#             "stdout": stdout,
#             "stderr": stderr,
#             "rc": rc
#         }
#     except Exception as e:
#         return {"error": str(e)}

