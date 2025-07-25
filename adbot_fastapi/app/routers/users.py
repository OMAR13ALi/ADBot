from fastapi import APIRouter, HTTPException, Query, Path
import json
import logging
from typing import Optional, List
from app.core.powershell_client import execute_remote_ps
from app.models.user_schemas import (
    ADUserCreate, ADUserUpdate, ADUserResponse, ADUserSearch, 
    ADUserMove, ADUserPasswordReset, ADOrganizationalUnit
)
from datetime import datetime
from urllib.parse import unquote

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
    """Create a new user with detailed feedback and OU validation"""
    enabled_ps = "$true" if user.enabled else "$false"
    try:
        # Handle optional OU parameter with validation
        ou_param = ""
        if user.ou and user.ou.strip() and user.ou.lower() != "none":
            # Log the OU being used
            logger.info(f"Using OU for user creation: {user.ou}")
            ou_param = f'-Path "{user.ou}"'
            logger.info(f"OU parameter set to: {ou_param}")
        else:
            logger.info("No OU specified, user will be created in default Users container")
        
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
        
        # Log the complete command for debugging
        logger.info(f"Creating user: {user.samaccountname} with OU param: '{ou_param}'")
        
        ps_command = f'''
        try {{
            Import-Module ActiveDirectory -ErrorAction Stop
            $SecurePass = ConvertTo-SecureString "{user.password}" -AsPlainText -Force
            
            Write-Output "Starting user creation..."
            Write-Output "OU Parameter: {ou_param}"
            Write-Output "Additional Parameters: {additional_params_str}"
            
            # Create the user
            New-ADUser -Name "{user.name}" -SamAccountName "{user.samaccountname}" -AccountPassword $SecurePass -Enabled {enabled_ps} {ou_param} {additional_params_str}
            
            Write-Output "User creation command completed"
            
            # Verify user creation and location
            $createdUser = Get-ADUser -Identity "{user.samaccountname}" -Properties DistinguishedName
            $userLocation = $createdUser.DistinguishedName
            
            Write-Output "User found at: $userLocation"
            
            $result = @{{
                Message = "User created successfully"
                UserLocation = $userLocation
                RequestedOU = "{user.ou if user.ou else 'Default Users container'}"
                Success = $true
            }}
            
            $result | ConvertTo-Json
        }} catch {{
            Write-Output "Error occurred: $($_.Exception.Message)"
            Write-Output "Error type: $($_.Exception.GetType().Name)"
            
            $errorResult = @{{
                Message = "User creation failed"
                Error = $_.Exception.Message
                ErrorType = $_.Exception.GetType().Name
                Success = $false
            }}
            $errorResult | ConvertTo-Json
            Write-Error "PowerShell Error: $($_.Exception.Message)"
            exit 1
        }}
        '''
        
        stdout, stderr, rc = execute_remote_ps(ps_command)
        if rc != 0:
            logger.error(f"PowerShell command failed: {stderr}")
            raise HTTPException(status_code=500, detail=f"User creation failed: {stderr}")
        
        # Parse the result to check user location
        try:
            creation_result = json.loads(stdout)
            logger.info(f"User creation result: {creation_result}")
            
            # Check if user was created in the expected location
            if user.ou and user.ou.strip() and user.ou.lower() != "none":
                user_location = creation_result.get("UserLocation", "")
                if user.ou.lower() not in user_location.lower():
                    logger.warning(f"User created in unexpected location. Expected OU: {user.ou}, Actual location: {user_location}")
            
        except json.JSONDecodeError:
            logger.warning("Could not parse user creation result")
            creation_result = {"Message": "User created successfully", "Success": True}
        
        # Get the created user details
        try:
            created_user_response = get_user(user.samaccountname)
            return {
                "message": "User created successfully",
                "user": created_user_response.get("user"),
                "creation_details": creation_result,
                "status": "success"
            }
        except:
            return {
                "message": "User created successfully", 
                "creation_details": creation_result,
                "status": "success"
            }
            
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

@router.put("/users/enable/{samaccountname}")
def enable_user(samaccountname: str):
    """Enable a user account"""
    try:
        logger.info(f"Enabling user: {samaccountname}")
        
        ps_command = f'''
        try {{
            Import-Module ActiveDirectory -ErrorAction Stop
            
            # Check if user exists first
            $user = Get-ADUser -Identity "{samaccountname}" -ErrorAction Stop
            
            # Enable the user account
            Enable-ADAccount -Identity "{samaccountname}" -ErrorAction Stop
            
            # Verify the change
            $updatedUser = Get-ADUser -Identity "{samaccountname}" -Properties Enabled -ErrorAction Stop
            
            $result = @{{
                Message = "User enabled successfully"
                SamAccountName = $updatedUser.SamAccountName
                Name = $updatedUser.Name
                Enabled = $updatedUser.Enabled
                Success = $true
            }}
            
            $result | ConvertTo-Json -Depth 3
        }} catch [Microsoft.ActiveDirectory.Management.ADIdentityNotFoundException] {{
            $errorResult = @{{
                Message = "User not found"
                Error = "User '{samaccountname}' does not exist in Active Directory"
                Success = $false
            }}
            $errorResult | ConvertTo-Json -Depth 3
            exit 1
        }} catch {{
            $errorResult = @{{
                Message = "Failed to enable user"
                Error = $_.Exception.Message
                Success = $false
            }}
            $errorResult | ConvertTo-Json -Depth 3
            exit 1
        }}
        '''
        
        stdout, stderr, rc = execute_remote_ps(ps_command)
        
        if rc != 0:
            logger.error(f"Enable user failed - Return code: {rc}, stderr: {stderr}")
            try:
                error_result = json.loads(stdout) if stdout else {"error": stderr}
                raise HTTPException(status_code=500, detail=error_result)
            except json.JSONDecodeError:
                raise HTTPException(status_code=500, detail=f"Failed to enable user: {stderr}")
        
        try:
            result = json.loads(stdout)
            logger.info(f"User {samaccountname} enabled successfully: {result}")
            return {
                "operation": "enable",
                "samaccountname": samaccountname,
                "result": result,
                "status": "success"
            }
        except json.JSONDecodeError as e:
            logger.warning(f"JSON decode error, but operation might have succeeded: {e}")
            return {
                "operation": "enable",
                "samaccountname": samaccountname,
                "message": "User enabled successfully",
                "raw_output": stdout,
                "status": "success"
            }
            
    except Exception as e:
        logger.error(f"Error enabling user {samaccountname}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/users/disable/{samaccountname}")
def disable_user(samaccountname: str):
    """Disable a user account"""
    try:
        logger.info(f"Disabling user: {samaccountname}")
        
        ps_command = f'''
        try {{
            Import-Module ActiveDirectory -ErrorAction Stop
            
            # Check if user exists first
            $user = Get-ADUser -Identity "{samaccountname}" -ErrorAction Stop
            
            # Disable the user account
            Disable-ADAccount -Identity "{samaccountname}" -ErrorAction Stop
            
            # Verify the change
            $updatedUser = Get-ADUser -Identity "{samaccountname}" -Properties Enabled -ErrorAction Stop
            
            $result = @{{
                Message = "User disabled successfully"
                SamAccountName = $updatedUser.SamAccountName
                Name = $updatedUser.Name
                Enabled = $updatedUser.Enabled
                Success = $true
            }}
            
            $result | ConvertTo-Json -Depth 3
        }} catch [Microsoft.ActiveDirectory.Management.ADIdentityNotFoundException] {{
            $errorResult = @{{
                Message = "User not found"
                Error = "User '{samaccountname}' does not exist in Active Directory"
                Success = $false
            }}
            $errorResult | ConvertTo-Json -Depth 3
            exit 1
        }} catch {{
            $errorResult = @{{
                Message = "Failed to disable user"
                Error = $_.Exception.Message
                Success = $false
            }}
            $errorResult | ConvertTo-Json -Depth 3
            exit 1
        }}
        '''
        
        stdout, stderr, rc = execute_remote_ps(ps_command)
        
        if rc != 0:
            logger.error(f"Disable user failed - Return code: {rc}, stderr: {stderr}")
            try:
                error_result = json.loads(stdout) if stdout else {"error": stderr}
                raise HTTPException(status_code=500, detail=error_result)
            except json.JSONDecodeError:
                raise HTTPException(status_code=500, detail=f"Failed to disable user: {stderr}")
        
        try:
            result = json.loads(stdout)
            logger.info(f"User {samaccountname} disabled successfully: {result}")
            return {
                "operation": "disable",
                "samaccountname": samaccountname,
                "result": result,
                "status": "success"
            }
        except json.JSONDecodeError as e:
            logger.warning(f"JSON decode error, but operation might have succeeded: {e}")
            return {
                "operation": "disable",
                "samaccountname": samaccountname,
                "message": "User disabled successfully",
                "raw_output": stdout,
                "status": "success"
            }
            
    except Exception as e:
        logger.error(f"Error disabling user {samaccountname}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/users/status/{samaccountname}")
def get_user_status(samaccountname: str):
    """Get the current enabled/disabled status of a user"""
    try:
        logger.info(f"Getting status for user: {samaccountname}")
        
        ps_command = f'''
        try {{
            Import-Module ActiveDirectory -ErrorAction Stop
            
            $user = Get-ADUser -Identity "{samaccountname}" -Properties Enabled, Name, SamAccountName
            $result = @{{
                Name = $user.Name
                SamAccountName = $user.SamAccountName
                Enabled = $user.Enabled
                Status = if ($user.Enabled) {{ "Enabled" }} else {{ "Disabled" }}
            }}
            
            $result | ConvertTo-Json
        }} catch {{
            Write-Output "Error: $($_.Exception.Message)"
            $errorResult = @{{
                Message = "Failed to get user status"
                Error = $_.Exception.Message
                Success = $false
            }}
            $errorResult | ConvertTo-Json
            Write-Error "PowerShell Error: $($_.Exception.Message)"
            exit 1
        }}
        '''
        
        stdout, stderr, rc = execute_remote_ps(ps_command)
        if rc != 0:
            logger.error(f"Get user status failed: {stderr}")
            raise HTTPException(status_code=404, detail=f"User not found: {stderr}")
        
        try:
            result = json.loads(stdout)
            return {
                "user_status": result,
                "status": "success"
            }
        except json.JSONDecodeError:
            raise HTTPException(status_code=500, detail="Failed to parse user status")
            
    except Exception as e:
        logger.error(f"Error getting user status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/users/test-ou-placement")
def test_ou_placement(ou_dn: str):
    """Test OU placement by creating a test user (for troubleshooting)"""
    try:
        test_username = f"test_user_{int(datetime.now().timestamp())}"
        
        ps_command = f'''
        try {{
            Import-Module ActiveDirectory -ErrorAction Stop
            
            # First validate the OU
            $ou = Get-ADOrganizationalUnit -Identity "{ou_dn}" -ErrorAction Stop
            Write-Output "OU exists: $($ou.DistinguishedName)"
            
            # Create a test user
            $SecurePass = ConvertTo-SecureString "TempPass123!" -AsPlainText -Force
            New-ADUser -Name "Test User" -SamAccountName "{test_username}" -AccountPassword $SecurePass -Enabled $false -Path "{ou_dn}"
            
            # Check where the user was created
            $createdUser = Get-ADUser -Identity "{test_username}" -Properties DistinguishedName
            $userLocation = $createdUser.DistinguishedName
            
            # Clean up - delete the test user
            Remove-ADUser -Identity "{test_username}" -Confirm:$false
            
            $result = @{{
                Message = "OU placement test successful"
                RequestedOU = "{ou_dn}"
                ActualLocation = $userLocation
                LocationMatch = $userLocation.Contains("{ou_dn}")
                TestUserCreated = $true
                TestUserDeleted = $true
            }}
            
            $result | ConvertTo-Json
        }} catch {{
            $errorResult = @{{
                Message = "OU placement test failed"
                Error = $_.Exception.Message
                RequestedOU = "{ou_dn}"
                Success = $false
            }}
            $errorResult | ConvertTo-Json
            Write-Error "PowerShell Error: $($_.Exception.Message)"
            exit 1
        }}
        '''
        
        stdout, stderr, rc = execute_remote_ps(ps_command)
        if rc != 0:
            logger.error(f"OU placement test failed: {stderr}")
            raise HTTPException(status_code=500, detail=f"OU placement test failed: {stderr}")
        
        try:
            result = json.loads(stdout)
            return {
                "test_result": result,
                "status": "success"
            }
        except json.JSONDecodeError:
            return {
                "message": "OU placement test completed but could not parse result",
                "raw_output": stdout,
                "status": "partial_success"
            }
            
    except Exception as e:
        logger.error(f"Error testing OU placement: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/users/debug-ou/{samaccountname}")
def debug_user_location(samaccountname: str):
    """Debug where a user is actually located in AD"""
    try:
        ps_command = f'''
        try {{
            Import-Module ActiveDirectory -ErrorAction Stop
            $user = Get-ADUser -Identity "{samaccountname}" -Properties DistinguishedName, CanonicalName
            
            $userInfo = @{{
                SamAccountName = $user.SamAccountName
                DistinguishedName = $user.DistinguishedName
                CanonicalName = $user.CanonicalName
                ParentContainer = $user.DistinguishedName -replace "^CN=[^,]+,"
            }}
            
            $userInfo | ConvertTo-Json
        }} catch {{
            Write-Error "PowerShell Error: $($_.Exception.Message)"
            exit 1
        }}
        '''
        
        stdout, stderr, rc = execute_remote_ps(ps_command)
        if rc != 0:
            raise HTTPException(status_code=404, detail=f"User not found: {stderr}")
        
        try:
            user_info = json.loads(stdout)
            return {
                "user_location": user_info,
                "status": "success"
            }
        except json.JSONDecodeError:
            raise HTTPException(status_code=500, detail="Failed to parse user location data")
            
    except Exception as e:
        logger.error(f"Error debugging user location: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/users/validate-ou/{ou_dn}")
def validate_ou(ou_dn: str):
    """Validate if an OU exists and is accessible"""
    try:
        decoded_ou = unquote(ou_dn)
        logger.info(f"Validating OU: {decoded_ou}")
        
        ps_command = f'''
        try {{
            Import-Module ActiveDirectory -ErrorAction Stop
            
            Write-Output "Validating OU: {decoded_ou}"
            
            # Try to get the OU
            $ou = Get-ADOrganizationalUnit -Identity "{decoded_ou}" -ErrorAction Stop
            
            Write-Output "OU found successfully"
            
            # Check if we can create objects in this OU
            $ouInfo = @{{
                Name = $ou.Name
                DistinguishedName = $ou.DistinguishedName
                CanonicalName = $ou.CanonicalName
                ProtectedFromAccidentalDeletion = $ou.ProtectedFromAccidentalDeletion
                ObjectClass = $ou.ObjectClass
                WhenCreated = $ou.WhenCreated.ToString('yyyy-MM-dd HH:mm:ss')
            }}
            
            $ouInfo | ConvertTo-Json
        }} catch {{
            Write-Output "Error validating OU: $($_.Exception.Message)"
            
            $errorInfo = @{{
                Error = $_.Exception.Message
                ErrorType = $_.Exception.GetType().Name
                RequestedOU = "{decoded_ou}"
            }}
            $errorInfo | ConvertTo-Json
            Write-Error "OU validation failed: $($_.Exception.Message)"
            exit 1
        }}
        '''
        
        stdout, stderr, rc = execute_remote_ps(ps_command)
        
        logger.info(f"OU validation stdout: {stdout}")
        logger.info(f"OU validation stderr: {stderr}")
        logger.info(f"OU validation return code: {rc}")
        
        if rc != 0:
            try:
                error_data = json.loads(stdout)
                return {
                    "valid": False,
                    "error": error_data,
                    "status": "error"
                }
            except:
                return {
                    "valid": False,
                    "error": stderr,
                    "status": "error"
                }
        
        try:
            ou_data = json.loads(stdout)
            return {
                "valid": True,
                "ou_info": ou_data,
                "status": "success"
            }
        except json.JSONDecodeError:
            return {
                "valid": False,
                "error": "Could not parse OU data",
                "raw_output": stdout,
                "status": "error"
            }
            
    except Exception as e:
        logger.error(f"Error validating OU: {str(e)}")
        return {
            "valid": False,
            "error": str(e),
            "status": "error"
        }

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

@router.get("/users/check-permissions")
def check_ad_permissions():
    """Simple permission check for enable/disable operations"""
    try:
        logger.info("Checking basic AD permissions")
        
        ps_command = '''
        try {
            Import-Module ActiveDirectory -ErrorAction Stop
            
            # Get current user
            $currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent()
            
            # Get domain info
            $domain = Get-ADDomain
            
            # Try to get a test user
            $testUser = Get-ADUser -Filter * -ResultSetSize 1 -ErrorAction Stop
            
            $result = @{
                CurrentUser = $currentUser.Name
                DomainName = $domain.Name
                CanAccessAD = $true
                Success = $true
            }
            
            $result | ConvertTo-Json
            
        } catch {
            $errorResult = @{
                Error = $_.Exception.Message
                Success = $false
            }
            $errorResult | ConvertTo-Json
            Write-Error "Permission check failed: $($_.Exception.Message)"
            exit 1
        }
        '''
        
        stdout, stderr, rc = execute_remote_ps(ps_command)
        if rc != 0:
            logger.error(f"Permission check failed: {stderr}")
            raise HTTPException(status_code=500, detail=f"Permission check failed: {stderr}")
        
        try:
            result = json.loads(stdout)
            return {
                "permission_check": result,
                "status": "success"
            }
        except json.JSONDecodeError:
            return {
                "message": "Permission check completed but could not parse result",
                "raw_output": stdout,
                "status": "partial_success"
            }
            
    except Exception as e:
        logger.error(f"Error checking permissions: {str(e)}")
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

# Bulk operations
@router.put("/users/bulk-enable")
def bulk_enable_users(samaccountnames: list[str]):
    """Enable multiple user accounts"""
    results = []
    
    for samaccountname in samaccountnames:
        try:
            result = enable_user(samaccountname)
            results.append({
                "samaccountname": samaccountname,
                "success": True,
                "result": result
            })
        except HTTPException as e:
            results.append({
                "samaccountname": samaccountname,
                "success": False,
                "error": str(e.detail)
            })
        except Exception as e:
            results.append({
                "samaccountname": samaccountname,
                "success": False,
                "error": str(e)
            })
    
    return {
        "operation": "bulk_enable",
        "total": len(samaccountnames),
        "successful": len([r for r in results if r["success"]]),
        "failed": len([r for r in results if not r["success"]]),
        "results": results
    }


@router.put("/users/bulk-disable")
def bulk_disable_users(samaccountnames: list[str]):
    """Disable multiple user accounts"""
    results = []
    
    for samaccountname in samaccountnames:
        try:
            result = disable_user(samaccountname)
            results.append({
                "samaccountname": samaccountname,
                "success": True,
                "result": result
            })
        except HTTPException as e:
            results.append({
                "samaccountname": samaccountname,
                "success": False,
                "error": str(e.detail)
            })
        except Exception as e:
            results.append({
                "samaccountname": samaccountname,
                "success": False,
                "error": str(e)
            })
    
    return {
        "operation": "bulk_disable",
        "total": len(samaccountnames),
        "successful": len([r for r in results if r["success"]]),
        "failed": len([r for r in results if not r["success"]]),
        "results": results
    }

@router.put("/users/reset-and-enable/{samaccountname}")
def reset_password_and_enable_user(samaccountname: str, new_password: str = "TempPassword123!"):
    """Reset user password and enable account"""
    try:
        logger.info(f"Resetting password and enabling user: {samaccountname}")
        
        ps_command = f'''
        try {{
            Import-Module ActiveDirectory -ErrorAction Stop
            
            # Check if user exists first
            $user = Get-ADUser -Identity "{samaccountname}" -ErrorAction Stop
            
            # Reset password first
            $SecurePassword = ConvertTo-SecureString "{new_password}" -AsPlainText -Force
            Set-ADAccountPassword -Identity "{samaccountname}" -NewPassword $SecurePassword -Reset -ErrorAction Stop
            
            # Set password to change at next logon (optional)
            Set-ADUser -Identity "{samaccountname}" -ChangePasswordAtLogon $true -ErrorAction Stop
            
            # Now enable the account
            Enable-ADAccount -Identity "{samaccountname}" -ErrorAction Stop
            
            # Verify the changes
            $updatedUser = Get-ADUser -Identity "{samaccountname}" -Properties Enabled -ErrorAction Stop
            
            $result = @{{
                Message = "User password reset and account enabled successfully"
                SamAccountName = $updatedUser.SamAccountName
                Name = $updatedUser.Name
                Enabled = $updatedUser.Enabled
                PasswordReset = $true
                ChangePasswordAtLogon = $true
                Success = $true
            }}
            
            $result | ConvertTo-Json -Depth 3
        }} catch [Microsoft.ActiveDirectory.Management.ADIdentityNotFoundException] {{
            $errorResult = @{{
                Message = "User not found"
                Error = "User '{samaccountname}' does not exist in Active Directory"
                Success = $false
            }}
            $errorResult | ConvertTo-Json -Depth 3
            exit 1
        }} catch {{
            $errorResult = @{{
                Message = "Failed to reset password and enable user"
                Error = $_.Exception.Message
                Success = $false
            }}
            $errorResult | ConvertTo-Json -Depth 3
            exit 1
        }}
        '''
        
        stdout, stderr, rc = execute_remote_ps(ps_command)
        
        if rc != 0:
            logger.error(f"Reset and enable failed - Return code: {rc}, stderr: {stderr}")
            try:
                error_result = json.loads(stdout) if stdout else {"error": stderr}
                raise HTTPException(status_code=500, detail=error_result)
            except json.JSONDecodeError:
                raise HTTPException(status_code=500, detail=f"Failed to reset and enable user: {stderr}")
        
        try:
            result = json.loads(stdout)
            logger.info(f"User {samaccountname} password reset and enabled successfully: {result}")
            return {
                "operation": "reset_and_enable",
                "samaccountname": samaccountname,
                "result": result,
                "status": "success"
            }
        except json.JSONDecodeError as e:
            logger.warning(f"JSON decode error, but operation might have succeeded: {e}")
            return {
                "operation": "reset_and_enable",
                "samaccountname": samaccountname,
                "message": "User password reset and enabled successfully",
                "raw_output": stdout,
                "status": "success"
            }
            
    except Exception as e:
        logger.error(f"Error resetting password and enabling user {samaccountname}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/users/force-enable/{samaccountname}")
def force_enable_user(samaccountname: str):
    """Force enable a user account (bypasses password policy checks)"""
    try:
        logger.info(f"Force enabling user: {samaccountname}")
        
        ps_command = f'''
        try {{
            Import-Module ActiveDirectory -ErrorAction Stop
            
            # Check if user exists first
            $user = Get-ADUser -Identity "{samaccountname}" -ErrorAction Stop
            
            # Try to enable using Set-ADUser instead of Enable-ADAccount
            Set-ADUser -Identity "{samaccountname}" -Enabled $true -ErrorAction Stop
            
            # Verify the change
            $updatedUser = Get-ADUser -Identity "{samaccountname}" -Properties Enabled -ErrorAction Stop
            
            $result = @{{
                Message = "User force enabled successfully"
                SamAccountName = $updatedUser.SamAccountName
                Name = $updatedUser.Name
                Enabled = $updatedUser.Enabled
                Method = "Force Enable (Set-ADUser)"
                Success = $true
            }}
            
            $result | ConvertTo-Json -Depth 3
        }} catch [Microsoft.ActiveDirectory.Management.ADIdentityNotFoundException] {{
            $errorResult = @{{
                Message = "User not found"
                Error = "User '{samaccountname}' does not exist in Active Directory"
                Success = $false
            }}
            $errorResult | ConvertTo-Json -Depth 3
            exit 1
        }} catch {{
            $errorResult = @{{
                Message = "Failed to force enable user"
                Error = $_.Exception.Message
                Success = $false
            }}
            $errorResult | ConvertTo-Json -Depth 3
            exit 1
        }}
        '''
        
        stdout, stderr, rc = execute_remote_ps(ps_command)
        
        if rc != 0:
            logger.error(f"Force enable failed - Return code: {rc}, stderr: {stderr}")
            try:
                error_result = json.loads(stdout) if stdout else {"error": stderr}
                raise HTTPException(status_code=500, detail=error_result)
            except json.JSONDecodeError:
                raise HTTPException(status_code=500, detail=f"Failed to force enable user: {stderr}")
        
        try:
            result = json.loads(stdout)
            logger.info(f"User {samaccountname} force enabled successfully: {result}")
            return {
                "operation": "force_enable",
                "samaccountname": samaccountname,
                "result": result,
                "status": "success"
            }
        except json.JSONDecodeError as e:
            logger.warning(f"JSON decode error, but operation might have succeeded: {e}")
            return {
                "operation": "force_enable",
                "samaccountname": samaccountname,
                "message": "User force enabled successfully",
                "raw_output": stdout,
                "status": "success"
            }
            
    except Exception as e:
        logger.error(f"Error force enabling user {samaccountname}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

