# 🤖 ADBot Authentication API Setup

A separate authentication service for ADBot that validates Windows credentials and provides JWT tokens.

## 🚀 Quick Start

### Option 1: Windows Batch File (Easiest)
```bash
# Navigate to auth_api directory
cd auth_api

# Run the batch file (Windows)
start_auth.bat
```

### Option 2: Python Script
```bash
# Navigate to auth_api directory
cd auth_api

# Run the startup script
python start_auth.py
```

### Option 3: Manual Start
```bash
# Navigate to auth_api directory
cd auth_api

# Install dependencies
pip install -r requirements.txt

# Start the server
python main.py
```

## 🔧 Configuration

The API will automatically create a `config.env` file with your credentials:

```env
# Authentication API Configuration
SECRET_KEY=adbot-auth-secret-key-2024-production-secure
ACCESS_TOKEN_EXPIRE_MINUTES=30
AUTH_API_PORT=8001
LOG_LEVEL=INFO

# Default credentials for testing
DEFAULT_USERNAME=Administrator
DEFAULT_PASSWORD=OMARali0201**
DEFAULT_SERVER_IP=localhost
```

## 🌐 Access Points

Once running, you can access:

- **Login Page**: http://localhost:8001
- **API Documentation**: http://localhost:8001/docs
- **Status Check**: http://localhost:8001/status

## 🔐 How to Use

1. **Start the Auth API** (port 8001)
2. **Visit** http://localhost:8001
3. **Login with**:
   - Username: `Administrator`
   - Password: `OMARali0201**`
   - Server IP: `localhost`
4. **Get redirected** to your ADBot frontend (port 3000)

## 🔄 Integration with ADBot

The auth API runs separately and doesn't interfere with your existing ADBot FastAPI backend (port 8000) or Next.js frontend (port 3000).

### Ports Used:
- **Auth API**: 8001 (this service)
- **ADBot Backend**: 8000 (your existing FastAPI)
- **ADBot Frontend**: 3000 (your existing Next.js)

## 🛠️ Troubleshooting

### Missing Dependencies
```bash
pip install fastapi uvicorn pypsrp pyjwt python-dotenv pydantic
```

### Port Already in Use
Edit `config.env` and change `AUTH_API_PORT=8001` to a different port.

### Login Template Not Found
The startup script will check for `templates/login.html`. If missing, you can still use the API endpoints directly.

## 📋 API Endpoints

- `GET /` - Login page (HTML)
- `POST /auth/login` - Authenticate and get JWT token
- `GET /auth/verify` - Verify JWT token
- `POST /auth/logout` - Logout
- `GET /auth/health` - Health check
- `GET /status` - API status

## 🔒 Security Notes

- The JWT tokens expire after 30 minutes by default
- Tokens are stored in browser localStorage
- The secret key should be changed in production
- WinRM communication is used to validate credentials

## ✅ What This Doesn't Change

- Your existing ADBot FastAPI backend (port 8000) continues to work normally
- Your Next.js frontend (port 3000) continues to work normally
- All existing enable/disable functionality remains unchanged
- This is purely an additional authentication layer 