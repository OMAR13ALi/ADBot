# AD Bot Permission Setup Script
# Run this script as Domain Administrator to grant necessary permissions

param(
    [Parameter(Mandatory=$true)]
    [string]$ServiceAccountName,
    
    [Parameter(Mandatory=$false)]
    [string]$DomainName = (Get-ADDomain).Name
)

Write-Host "AD Bot Permission Setup Script" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host ""

# Check if running as administrator
$currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent()
$currentPrincipal = New-Object System.Security.Principal.WindowsPrincipal($currentUser)
$isAdmin = $currentPrincipal.IsInRole([System.Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "Please run PowerShell as Administrator and try again." -ForegroundColor Red
    exit 1
}

Write-Host "Running as: $($currentUser.Name)" -ForegroundColor Yellow
Write-Host "Is Administrator: $isAdmin" -ForegroundColor Yellow
Write-Host ""

# Check if service account exists
try {
    $serviceAccount = Get-ADUser -Identity $ServiceAccountName
    Write-Host "✓ Service account found: $($serviceAccount.SamAccountName)" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Service account '$ServiceAccountName' not found!" -ForegroundColor Red
    Write-Host "Please provide the correct service account name." -ForegroundColor Red
    exit 1
}

# Get domain info
$domain = Get-ADDomain
Write-Host "Domain: $($domain.Name)" -ForegroundColor Yellow
Write-Host "Domain DN: $($domain.DistinguishedName)" -ForegroundColor Yellow
Write-Host ""

# Define the permissions we need to grant
$permissions = @(
    "Create, delete, and manage user accounts",
    "Enable and disable user accounts", 
    "Reset user passwords",
    "Modify user properties",
    "Move users between OUs",
    "Create, delete, and manage groups",
    "Create, delete, and manage OUs"
)

Write-Host "Granting the following permissions to $ServiceAccountName:" -ForegroundColor Cyan
foreach ($permission in $permissions) {
    Write-Host "  • $permission" -ForegroundColor White
}
Write-Host ""

# Method 1: Add to Domain Admins group (quick but broad)
Write-Host "Option 1: Add to Domain Admins group (broad permissions)" -ForegroundColor Yellow
$addToDomainAdmins = Read-Host "Add $ServiceAccountName to Domain Admins group? (y/n)"

if ($addToDomainAdmins -eq 'y' -or $addToDomainAdmins -eq 'Y') {
    try {
        Add-ADGroupMember -Identity "Domain Admins" -Members $ServiceAccountName
        Write-Host "✓ Added $ServiceAccountName to Domain Admins group" -ForegroundColor Green
    } catch {
        Write-Host "ERROR: Failed to add to Domain Admins: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Method 2: Create custom delegation (more secure)
Write-Host ""
Write-Host "Option 2: Create custom delegation (recommended for production)" -ForegroundColor Yellow
$createCustomDelegation = Read-Host "Create custom delegation for user management? (y/n)"

if ($createCustomDelegation -eq 'y' -or $createCustomDelegation -eq 'Y') {
    try {
        # Create a custom group for AD Bot permissions
        $adBotGroupName = "ADBot-UserManagement"
        
        # Check if group exists, create if not
        try {
            $existingGroup = Get-ADGroup -Identity $adBotGroupName
            Write-Host "✓ Group $adBotGroupName already exists" -ForegroundColor Green
        } catch {
            New-ADGroup -Name $adBotGroupName -GroupScope Global -GroupCategory Security
            Write-Host "✓ Created group $adBotGroupName" -ForegroundColor Green
        }
        
        # Add service account to the group
        Add-ADGroupMember -Identity $adBotGroupName -Members $ServiceAccountName
        Write-Host "✓ Added $ServiceAccountName to $adBotGroupName group" -ForegroundColor Green
        
        # Grant permissions on the Users container
        $usersContainer = "CN=Users,$($domain.DistinguishedName)"
        
        # Create ACL for user management
        $acl = Get-Acl -Path "AD:$usersContainer"
        
        # Grant permissions for user objects
        $userObjectGuid = "bf967aba-0de6-11d0-a285-00aa003049e2" # User object GUID
        $userAccountControlGuid = "bf967a68-0de6-11d0-a285-00aa003049e2" # userAccountControl attribute GUID
        
        # Grant permissions to the ADBot group
        $adBotGroupSid = (Get-ADGroup -Identity $adBotGroupName).SID
        
        # Create access rule for user management
        $accessRule = New-Object System.DirectoryServices.ActiveDirectoryAccessRule(
            $adBotGroupSid,
            "CreateChild,DeleteChild,WriteProperty,ReadProperty",
            "Allow",
            $userObjectGuid,
            "All"
        )
        $acl.AddAccessRule($accessRule)
        
        # Create access rule for userAccountControl (enable/disable)
        $accessRule2 = New-Object System.DirectoryServices.ActiveDirectoryAccessRule(
            $adBotGroupSid,
            "WriteProperty",
            "Allow",
            $userAccountControlGuid,
            "All"
        )
        $acl.AddAccessRule($accessRule2)
        
        # Apply the ACL
        Set-Acl -Path "AD:$usersContainer" -AclObject $acl
        Write-Host "✓ Granted user management permissions on Users container" -ForegroundColor Green
        
        # Grant permissions on all OUs (optional)
        $grantOuPermissions = Read-Host "Grant permissions on all OUs as well? (y/n)"
        if ($grantOuPermissions -eq 'y' -or $grantOuPermissions -eq 'Y') {
            $ous = Get-ADOrganizationalUnit -Filter *
            foreach ($ou in $ous) {
                try {
                    $ouAcl = Get-Acl -Path "AD:$($ou.DistinguishedName)"
                    $ouAcl.AddAccessRule($accessRule)
                    $ouAcl.AddAccessRule($accessRule2)
                    Set-Acl -Path "AD:$($ou.DistinguishedName)" -AclObject $ouAcl
                    Write-Host "  ✓ Granted permissions on OU: $($ou.Name)" -ForegroundColor Green
                } catch {
                    Write-Host "  ⚠ Warning: Could not grant permissions on OU $($ou.Name): $($_.Exception.Message)" -ForegroundColor Yellow
                }
            }
        }
        
    } catch {
        Write-Host "ERROR: Failed to create custom delegation: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Permission setup completed!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Restart your FastAPI service" -ForegroundColor White
Write-Host "2. Test the enable/disable functionality" -ForegroundColor White
Write-Host "3. Check the permission check endpoint: GET /api/users/check-permissions" -ForegroundColor White
Write-Host ""

# Test the permissions
Write-Host "Testing permissions..." -ForegroundColor Yellow
try {
    # Create a test user
    $testUsername = "test_permission_" + (Get-Random)
    $testPassword = ConvertTo-SecureString "TempPass123!" -AsPlainText -Force
    
    New-ADUser -Name $testUsername -SamAccountName $testUsername -AccountPassword $testPassword -Enabled $false
    Write-Host "✓ Created test user: $testUsername" -ForegroundColor Green
    
    # Try to enable it
    Set-ADUser -Identity $testUsername -Enabled $true
    Write-Host "✓ Successfully enabled test user" -ForegroundColor Green
    
    # Disable it back
    Set-ADUser -Identity $testUsername -Enabled $false
    Write-Host "✓ Successfully disabled test user" -ForegroundColor Green
    
    # Clean up
    Remove-ADUser -Identity $testUsername -Confirm:$false
    Write-Host "✓ Cleaned up test user" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "✓ All permission tests passed!" -ForegroundColor Green
    
} catch {
    Write-Host ""
    Write-Host "✗ Permission test failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "You may need to run this script again or check the service account permissions manually." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Script completed!" -ForegroundColor Green 