# AD Bot Authentication API

A FastAPI-based authentication service for AD Bot that validates Windows credentials and establishes WinRM connections.

## Features

- ✅ WinRM connection testing to Windows servers
- ✅ JWT token generation and verification
- ✅ Secure authentication with domain credentials
- ✅ CORS support for frontend integration
- ✅ Auto-generated API documentation
- ✅ Comprehensive logging

## Prerequisites

- Python 3.8 or higher
- Windows Server with WinRM enabled
- Domain credentials with administrative access

## Installation

1. **Navigate to the auth_api directory**
   ```bash
   cd auth_api
   ```

2. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up environment variables**
   ```bash
   # Copy the example environment file
   cp .env.example .env
   
   # Edit .env with your configuration
   # Update SECRET_KEY with a strong secret
   ```

## Configuration

Edit the `.env` file with your settings:

```bash
# Authentication API Configuration
SECRET_KEY=your-super-secret-key-change-this-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=30
AUTH_API_PORT=8001
LOG_LEVEL=INFO
```

## Running the API

### Development Mode
```bash
python main.py
```

### With Uvicorn (Recommended)
```bash
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

### Production Mode
```bash
uvicorn main:app --host 0.0.0.0 --port 8001 --workers 4
```

## API Endpoints

### Health Check
- `GET /` - Basic health check
- `GET /auth/health` - Detailed health information

### Authentication
- `POST /auth/login` - Authenticate and get JWT token
- `GET /auth/verify` - Verify JWT token
- `POST /auth/logout` - Logout (client-side token removal)

## API Documentation

Once running, visit:
- **Swagger UI**: http://localhost:8001/docs
- **ReDoc**: http://localhost:8001/redoc

## Usage Examples

### Login Request
```bash
curl -X POST http://localhost:8001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "DOMAIN\\AdminUsername",
    "password": "your-password",
    "server_ip": "192.168.1.10"
  }'
```

### Verify Token
```bash
curl http://localhost:8001/auth/verify \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Health Check
```bash
curl http://localhost:8001/auth/health
```

## Testing WinRM Connection

Use the provided test utility to debug connection issues:

```bash
python test_winrm.py
```

## Windows Server Setup

Ensure your Windows server has WinRM enabled:

```powershell
# On Windows Server (run as Administrator)
Enable-PSRemoting -Force
Get-Service WinRM
```

## Development Machine Setup

Configure your development machine to trust the Windows server:

```powershell
# On your development machine (run as Administrator)
Set-Item WSMan:\localhost\Client\TrustedHosts -Value "192.168.1.10"
```

## Security Considerations

1. **Change the SECRET_KEY** in production
2. **Use HTTPS** in production environments
3. **Implement rate limiting** for production use
4. **Store passwords securely** - never log them
5. **Use strong JWT secrets**
6. **Implement token refresh** for long sessions

## Troubleshooting

### Common Issues

1. **WinRM Connection Failed**
   - Check if WinRM is enabled on the server
   - Verify server IP and credentials
   - Ensure firewall allows WinRM traffic (port 5985/5986)

2. **Authentication Failed**
   - Verify domain username format (DOMAIN\\username)
   - Check password correctness
   - Ensure user has administrative privileges

3. **CORS Issues**
   - Update allowed origins in main.py for your frontend URL

### Logs

Check the console output for detailed error messages and connection logs.

## Integration with Frontend

This API is designed to work with:
- Angular frontend (adbot_frontend)
- Next.js frontend (adbot-nextjs)
- Any other frontend that can make HTTP requests

## License

This project is part of the AD Bot system. 