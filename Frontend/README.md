# RMS Frontend — Restaurant Management System

## Requirements
- Node.js 18+

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy environment file
cp .env.example .env

# 3. Start dev server
npm run dev

# 4. Build for production
npm run build
```

## Environment Variables (.env)

| Variable | Description | Default |
|---|---|---|
| `VITE_API_URL` | Backend API URL | `http://localhost:9001/api` |
| `VITE_SOCKET_URL` | Backend WebSocket URL | `http://localhost:9001` |
| `VITE_APP_NAME` | App display name | `RMS` |

## Role-based Routes

| Role | Home Route |
|---|---|
| Super Admin | `/superadmin` |
| Restaurant Admin | `/admin` |
| Manager | `/manager` |
| Waiter | `/waiter` |
| Chef | `/chef` |
| Cashier | `/cashier` |

## New in this version
- **Super Admin Revenue** — `/superadmin/revenue` — platform-wide revenue across all branches with charts
- **Staff Management** — Create new staff accounts or assign existing users with role editing
- **Full Billing Flow** — Bill preview → confirm → invoice modal with print support
- **Branch-scoped login** — Staff automatically see their assigned branch data on login
