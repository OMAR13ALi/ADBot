#!/usr/bin/env python3
"""
Direct WinRM Connection Test
This script tests WinRM connection directly to help debug authentication issues
"""

from pypsrp.client import Client
import sys

def test_winrm_direct(server_ip, username, password):
    """Test WinRM connection directly"""
    print(f"Testing WinRM connection to {server_ip}")
    print(f"Username: {username}")
    print(f"Password: {'*' * len(password)}")
    print("-" * 50)
    
    # Test with basic authentication (for local admin)
    print("Testing with BASIC authentication...")
    try:
        client = Client(
            server=server_ip,
            username=username,
            password=password,
            ssl=False,
            cert_validation=False,
            auth="basic",
            transport="plaintext"
        )
        
        print("✓ Client created successfully")
        
        # Test simple command
        print("Executing test command...")
        stdout, stderr, rc = client.execute_ps("Get-ComputerInfo | Select-Object WindowsProductName")
        
        print(f"Return code: {rc}")
        print(f"Output: {stdout}")
        if stderr:
            print(f"Error: {stderr}")
        
        if rc == 0:
            print("✓ BASIC authentication successful!")
            client.close()
            return True
        else:
            print("✗ BASIC authentication failed")
            client.close()
            
    except Exception as e:
        print(f"✗ BASIC authentication error: {str(e)}")
    
    # Test with negotiate authentication (for domain accounts)
    print("\nTesting with NEGOTIATE authentication...")
    try:
        client = Client(
            server=server_ip,
            username=username,
            password=password,
            ssl=False,
            cert_validation=False,
            auth="negotiate",
            transport="plaintext"
        )
        
        print("✓ Client created successfully")
        
        # Test simple command
        print("Executing test command...")
        stdout, stderr, rc = client.execute_ps("Get-ComputerInfo | Select-Object WindowsProductName")
        
        print(f"Return code: {rc}")
        print(f"Output: {stdout}")
        if stderr:
            print(f"Error: {stderr}")
        
        if rc == 0:
            print("✓ NEGOTIATE authentication successful!")
            client.close()
            return True
        else:
            print("✗ NEGOTIATE authentication failed")
            client.close()
            
    except Exception as e:
        print(f"✗ NEGOTIATE authentication error: {str(e)}")
    
    return False

def main():
    print("WinRM Direct Connection Test")
    print("=" * 40)
    
    # Get credentials from user
    server_ip = input("Server IP (e.g., 192.168.1.10): ").strip()
    username = input("Username (e.g., Administrator): ").strip()
    password = input("Password: ").strip()
    
    if not all([server_ip, username, password]):
        print("Error: All fields are required")
        sys.exit(1)
    
    print("\n" + "=" * 40)
    
    # Test the connection
    success = test_winrm_direct(server_ip, username, password)
    
    print("\n" + "=" * 40)
    if success:
        print("✓ WinRM connection test successful!")
        print("The authentication API should work with these credentials.")
    else:
        print("✗ WinRM connection test failed!")
        print("Please check:")
        print("1. Server IP is correct and reachable")
        print("2. Username and password are correct")
        print("3. WinRM is enabled on the server")
        print("4. Firewall allows WinRM traffic (port 5985)")

if __name__ == "__main__":
    main() 