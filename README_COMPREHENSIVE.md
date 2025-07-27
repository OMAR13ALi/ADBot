# ADBot - Active Directory Management System

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Documentation](#documentation)
- [API Reference](#api-reference)
- [Features](#features)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage Examples](#usage-examples)
- [Contributing](#contributing)
- [Security](#security)
- [Troubleshooting](#troubleshooting)

## 🔍 Overview

ADBot is a comprehensive Active Directory management system that provides a modern web interface for managing AD users, groups, computers, and organizational units. It consists of multiple components working together to provide secure, efficient AD administration capabilities.

### Key Components

- **Authentication API** (`auth_api/`) - JWT-based authentication service with WinRM validation
- **Main API** (`adbot_fastapi/`) - FastAPI-based REST API for AD operations
- **Next.js Frontend** (`adbot-nextjs/`) - Modern React-based web interface
- **Angular Frontend** (`adbot_frontend/`) - Legacy Angular web interface
- **PowerShell Client** - WinRM-based PowerShell execution engine

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Auth API      │    │   Main API      │
│  (Next.js/      │◄──►│  (Port 8001)    │◄──►│  (Port 8000)    │
│   Angular)      │    │  JWT Auth       │    │  AD Operations  │
│  (Port 3000)    │    │  WinRM Test     │    │  REST Endpoints │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                       │
                                                       ▼
                              ┌─────────────────────────────────────┐
                              │     PowerShell Client               │
                              │     WinRM Connection                │
                              │     Active Directory Server         │
                              └─────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Python 3.8+
- Node.js 18+
- Windows Server with Active Directory
- WinRM configured on AD server

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd adbot
   ```

2. **Set up environment variables**
   ```bash
   cp auth_api/env.example auth_api/.env
   # Edit with your AD server details
   ```

3. **Install dependencies**
   ```bash
   # Backend dependencies
   cd auth_api && pip install -r requirements.txt
   cd ../adbot_fastapi && pip install -r requirements.txt
   
   # Frontend dependencies
   cd ../adbot-nextjs && npm install
   ```

4. **Start services**
   ```bash
   # Terminal 1: Auth API
   cd auth_api && python main.py
   
   # Terminal 2: Main API
   cd adbot_fastapi && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   
   # Terminal 3: Frontend
   cd adbot-nextjs && npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Main API: http://localhost:8000
   - Auth API: http://localhost:8001

## 📚 Documentation

### Complete Documentation Suite

- **[API Documentation](API_DOCUMENTATION.md)** - Comprehensive API reference with examples
- **[Core Utilities Documentation](CORE_UTILITIES_DOCUMENTATION.md)** - PowerShell client and configuration
- **[Implementation Guide](ADBot_Implementation_Guide.md)** - Step-by-step implementation guide

### Quick Links

- **[Authentication Setup](adbot-nextjs/AUTHENTICATION_SETUP.md)** - Auth configuration guide
- **[Frontend README](adbot-nextjs/README.md)** - Next.js frontend documentation
- **[Auth API README](auth_api/README.md)** - Authentication service documentation

## 🔗 API Reference

### Authentication API (Port 8001)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/login` | Authenticate user and get JWT token |
| GET | `/verify` | Verify JWT token validity |
| GET | `/health` | Health check endpoint |

### Main API (Port 8000)

#### User Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users` | List all users with filtering |
| GET | `/users/{username}` | Get specific user details |
| POST | `/users` | Create new user |
| PUT | `/users/{username}` | Update user |
| DELETE | `/users/{username}` | Delete user |
| PUT | `/users/enable/{username}` | Enable user account |
| PUT | `/users/disable/{username}` | Disable user account |

#### Group Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/groups` | List all groups |
| GET | `/groups/{groupname}` | Get specific group details |
| POST | `/groups` | Create new group |
| PUT | `/groups/{groupname}` | Update group |
| DELETE | `/groups/{groupname}` | Delete group |
| POST | `/groups/{groupname}/members` | Add member to group |
| DELETE | `/groups/{groupname}/members/{username}` | Remove member from group |

#### Computer Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/computers` | List all computers |
| GET | `/computers/domain/{domain}` | List computers by domain |

#### Organizational Units
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/ous` | List all organizational units |
| POST | `/ous` | Create new OU |
| PUT | `/ous/{ou_dn}` | Update OU |
| DELETE | `/ous/{ou_dn}` | Delete OU |

#### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard/stats` | Get AD statistics |
| GET | `/dashboard/health` | Dashboard health check |

## ✨ Features

### User Management
- ✅ Create, read, update, delete AD users
- ✅ Enable/disable user accounts
- ✅ Password reset functionality
- ✅ Bulk operations (enable/disable multiple users)
- ✅ User search and filtering
- ✅ Move users between OUs
- ✅ Detailed user property management

### Group Management
- ✅ Create, read, update, delete AD groups
- ✅ Group membership management
- ✅ Add/remove users from groups
- ✅ Group search and filtering
- ✅ Protection status checking

### Computer Management
- ✅ List and view computer accounts
- ✅ Filter computers by domain
- ✅ Computer status monitoring

### Organizational Units
- ✅ OU hierarchy management
- ✅ Create and delete OUs
- ✅ OU protection status
- ✅ Domain information retrieval

### Dashboard & Monitoring
- ✅ Real-time AD statistics
- ✅ Connection testing
- ✅ Health monitoring
- ✅ Activity logging

### Security Features
- ✅ JWT-based authentication
- ✅ WinRM credential validation
- ✅ CORS protection
- ✅ Input validation and sanitization
- ✅ PowerShell injection prevention

## ⚙️ Configuration

### Environment Variables

Create `.env` files in the appropriate directories:

#### `auth_api/.env`
```bash
WINRM_SERVER=192.168.1.10
WINRM_USERNAME=Administrator
WINRM_PASSWORD=YourPassword
SECRET_KEY=your-super-secret-key-change-this-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=30
AUTH_API_PORT=8001
LOG_LEVEL=INFO
```

#### `adbot_fastapi/.env`
```bash
WINRM_SERVER=192.168.1.10
WINRM_USERNAME=Administrator
WINRM_PASSWORD=YourPassword
```

### WinRM Configuration

On your Active Directory server, configure WinRM:

```powershell
# Enable WinRM
Enable-PSRemoting -Force

# Configure authentication
Set-Item WSMan:\localhost\Service\Auth\Negotiate $true
Set-Item WSMan:\localhost\Service\Auth\Basic $true

# Configure firewall
New-NetFirewallRule -Name "WinRM-HTTP" -DisplayName "WinRM HTTP" -Protocol TCP -LocalPort 5985 -Action Allow
```

## 💡 Usage Examples

### Create a User via API

```bash
curl -X POST "http://localhost:8000/users" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "samaccountname": "john.doe",
    "password": "SecurePassword123!",
    "email": "john.doe@company.com",
    "department": "IT",
    "enabled": true
  }'
```

### Search Users with Filters

```bash
curl "http://localhost:8000/users?search=john&enabled=true&department=IT&limit=20"
```

### Enable Multiple Users

```bash
curl -X PUT "http://localhost:8000/users/bulk-enable" \
  -H "Content-Type: application/json" \
  -d '["john.doe", "jane.smith", "bob.wilson"]'
```

### Frontend Component Usage

```tsx
import { usersService } from '@/lib/services/users';

// Get users with filtering
const response = await usersService.getUsers({
  search: 'john',
  enabled: true,
  limit: 50
});

// Create a new user
await usersService.createUser({
  name: 'Jane Smith',
  samaccountname: 'jane.smith',
  password: 'SecurePass123!',
  email: 'jane.smith@company.com'
});
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style
- Add tests for new features
- Update documentation for API changes
- Ensure all tests pass before submitting PR

## 🔒 Security

### Best Practices

1. **Environment Variables**: Never commit sensitive data like passwords
2. **JWT Tokens**: Use strong secret keys and appropriate expiration times
3. **WinRM**: Use negotiate authentication over basic when possible
4. **CORS**: Configure specific origins, not wildcards
5. **Input Validation**: Always validate and sanitize user inputs
6. **Logging**: Never log passwords or sensitive information

### Security Considerations

- Run with least-privilege service account
- Use HTTPS in production environments
- Regular security updates for dependencies
- Monitor and log all AD operations
- Implement rate limiting for API endpoints

## 🛠️ Troubleshooting

### Common Issues

#### WinRM Connection Failures
```bash
# Check WinRM service status
Get-Service WinRM

# Test WinRM connectivity
Test-WSMan -ComputerName your-ad-server

# Check authentication methods
winrm get winrm/config/service/auth
```

#### Authentication Issues
- Verify JWT secret key is consistent across services
- Check token expiration settings
- Ensure WinRM credentials are correct

#### PowerShell Errors
- Check Active Directory module is available
- Verify service account permissions
- Review PowerShell execution policy

#### Frontend Issues
- Check API endpoint configuration
- Verify CORS settings
- Check browser console for errors

### Debug Mode

Enable debug logging:

```bash
# Set LOG_LEVEL=DEBUG in environment variables
export LOG_LEVEL=DEBUG

# Check logs for detailed information
tail -f logs/adbot.log
```

### Health Checks

Test service health:

```bash
# Auth API health
curl http://localhost:8001/health

# Main API health
curl http://localhost:8000/

# Dashboard stats
curl http://localhost:8000/dashboard/stats
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:

- Check the [troubleshooting section](#troubleshooting)
- Review the [documentation](#documentation)
- Open an issue for bugs or feature requests
- Check existing issues for known problems

## 🔄 Version History

### v1.0.0 (Current)
- Initial release with full AD management capabilities
- JWT authentication system
- Modern React/Next.js frontend
- Comprehensive REST API
- PowerShell/WinRM integration

### Roadmap
- [ ] Role-based access control (RBAC)
- [ ] Audit logging and reporting
- [ ] Multi-domain support
- [ ] Docker containerization
- [ ] Active Directory health monitoring
- [ ] Automated user provisioning workflows

---

**ADBot** - Simplifying Active Directory Management with Modern Web Technologies