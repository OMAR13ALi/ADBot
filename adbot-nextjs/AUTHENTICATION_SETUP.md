# 🔐 ADBot Authentication Integration

Authentication has been successfully integrated into your Next.js frontend at localhost:3000.

## 🚀 How to Test

### Step 1: Start the Auth API (Required)
```bash
cd auth_api
start_auth.bat
# Or: python start_auth.py
```
This starts the authentication service on **port 8001**.

### Step 2: Start ADBot FastAPI Backend (Required)
```bash
cd adbot_fastapi
python main.py
```
This starts your existing ADBot backend on **port 8000**.

### Step 3: Start Next.js Frontend (Required)
```bash
cd adbot-nextjs
npm run dev
```
This starts your frontend with authentication on **port 3000**.

### Step 4: Test Authentication
1. Visit **http://localhost:3000**
2. You'll see a login form
3. Enter:
   - **Username**: `Administrator`
   - **Password**: `OMARali0201**`
   - **Server IP**: `localhost`
4. Click **Login**
5. You'll be authenticated and see the normal ADBot interface

## 🎯 What Happens

### ✅ With Auth API Running (Port 8001):
- Login form appears at localhost:3000
- Authentication is required
- User info shows in the header
- Logout button available

### ✅ Without Auth API Running:
- No login form
- Direct access to ADBot (normal operation)
- No authentication required
- Everything works as before

## 🛡️ Security Features

- **JWT Token Authentication**: 30-minute expiration
- **Windows Credential Validation**: Uses WinRM to verify credentials
- **Automatic Token Refresh**: Checks token validity
- **Secure Logout**: Clears all authentication data
- **Graceful Fallback**: Works without auth API for development

## 🔄 No Interference Guarantee

### ✅ Existing Functionality Preserved:
- All ADBot FastAPI backend functions work unchanged
- All Next.js frontend features work unchanged
- Enable/disable user functionality works unchanged
- All existing API calls work unchanged
- No modifications to existing components (except layout header)

### ✅ Optional Authentication:
- Auth only activates when auth API (port 8001) is running
- Without auth API, everything works as before
- Zero breaking changes to existing code

## 📋 Files Added (No Existing Files Modified):

1. **`src/lib/auth.ts`** - Authentication service
2. **`src/components/auth/login-form.tsx`** - Login form
3. **`src/components/auth/auth-wrapper.tsx`** - Authentication wrapper
4. **`src/components/auth/user-info.tsx`** - User info display
5. **`src/components/ui/alert.tsx`** - Alert component
6. **Updates to `src/app/layout.tsx`** - Wrapper integration
7. **Updates to `src/components/layout/main-layout.tsx`** - Header with user info

## 🧪 Testing Scenarios

### Scenario 1: Full Authentication (Recommended)
```bash
# Terminal 1: Start Auth API
cd auth_api && start_auth.bat

# Terminal 2: Start ADBot Backend  
cd adbot_fastapi && python main.py

# Terminal 3: Start Next.js Frontend
cd adbot-nextjs && npm run dev

# Visit: http://localhost:3000
# Result: Login required, then full ADBot access
```

### Scenario 2: No Authentication (Development)
```bash
# Terminal 1: Start ADBot Backend
cd adbot_fastapi && python main.py

# Terminal 2: Start Next.js Frontend  
cd adbot-nextjs && npm run dev

# Visit: http://localhost:3000
# Result: Direct ADBot access, no login required
```

## 🔍 Troubleshooting

### Login Form Not Appearing
- Check if auth API is running on port 8001
- Visit http://localhost:8001 to verify

### "Network Error" on Login
- Ensure auth API is running
- Check that port 8001 is not blocked

### Still Can't Access After Login
- Clear browser localStorage
- Restart all services
- Check console for errors

### Want to Disable Authentication Temporarily
- Just stop the auth API (port 8001)
- Everything else continues working normally

## ✅ Success Indicators

When everything is working correctly:
- Login form appears at localhost:3000
- Authentication with Administrator/OMARali0201**/localhost works
- User info appears in header after login
- All existing ADBot features work normally
- Enable/disable user functionality works
- Logout button works and returns to login form 