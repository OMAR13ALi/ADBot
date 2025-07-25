#!/usr/bin/env python3
"""
ADBot Authentication API Startup Script
"""

import os
import sys
import subprocess
from pathlib import Path

def check_requirements():
    """Check if required packages are installed"""
    required_packages = [
        'fastapi', 'uvicorn', 'pypsrp', 'pyjwt', 'python-dotenv', 'pydantic'
    ]
    
    missing_packages = []
    for package in required_packages:
        try:
            __import__(package.replace('-', '_'))
        except ImportError:
            missing_packages.append(package)
    
    if missing_packages:
        print("❌ Missing required packages:")
        for package in missing_packages:
            print(f"   - {package}")
        print("\n🔧 Install missing packages with:")
        print(f"   pip install {' '.join(missing_packages)}")
        return False
    
    print("✅ All required packages are installed")
    return True

def check_config():
    """Check if configuration file exists"""
    config_files = ['.env', 'config.env']
    config_found = False
    
    for config_file in config_files:
        if os.path.exists(config_file):
            print(f"✅ Configuration file found: {config_file}")
            config_found = True
            break
    
    if not config_found:
        print("⚠️  No configuration file found (.env or config.env)")
        print("   Using default configuration")
        
        # Create a basic config file
        with open('config.env', 'w') as f:
            f.write("""# Authentication API Configuration
SECRET_KEY=adbot-auth-secret-key-2024-production-secure
ACCESS_TOKEN_EXPIRE_MINUTES=30
AUTH_API_PORT=8001
LOG_LEVEL=INFO

# Default credentials for testing
DEFAULT_USERNAME=Administrator
DEFAULT_PASSWORD=OMARali0201**
DEFAULT_SERVER_IP=localhost
""")
        print("✅ Created config.env with default settings")
    
    return True

def check_templates():
    """Check if templates directory exists"""
    templates_dir = Path("templates")
    if not templates_dir.exists():
        print("📁 Creating templates directory...")
        templates_dir.mkdir()
    
    login_html = templates_dir / "login.html"
    if not login_html.exists():
        print("⚠️  Login template not found")
        print("   Please ensure templates/login.html exists")
        return False
    
    print("✅ Login template found")
    return True

def main():
    """Main startup function"""
    print("🤖 ADBot Authentication API Startup")
    print("=" * 40)
    
    # Check current directory
    if not os.path.exists('main.py'):
        print("❌ Error: main.py not found")
        print("   Please run this script from the auth_api directory")
        sys.exit(1)
    
    # Check requirements
    if not check_requirements():
        sys.exit(1)
    
    # Check configuration
    check_config()
    
    # Check templates
    if not check_templates():
        print("   You can still use the API endpoints directly")
    
    # Get port from config
    port = 8001
    try:
        if os.path.exists('.env'):
            with open('.env', 'r') as f:
                for line in f:
                    if line.startswith('AUTH_API_PORT='):
                        port = int(line.split('=')[1].strip())
        elif os.path.exists('config.env'):
            with open('config.env', 'r') as f:
                for line in f:
                    if line.startswith('AUTH_API_PORT='):
                        port = int(line.split('=')[1].strip())
    except:
        port = 8001
    
    print(f"\n🚀 Starting ADBot Authentication API on port {port}")
    print(f"   Login page: http://localhost:{port}")
    print(f"   API docs: http://localhost:{port}/docs")
    print(f"   Status: http://localhost:{port}/status")
    print("\n" + "=" * 40)
    
    # Start the server
    try:
        subprocess.run([
            sys.executable, "-m", "uvicorn", 
            "main:app", 
            "--host", "0.0.0.0", 
            "--port", str(port), 
            "--reload"
        ], check=True)
    except KeyboardInterrupt:
        print("\n\n👋 ADBot Authentication API stopped")
    except subprocess.CalledProcessError as e:
        print(f"\n❌ Error starting server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 