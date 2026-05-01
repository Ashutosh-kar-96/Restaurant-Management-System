# RMS Backend — Restaurant Management System

## Requirements
- Node.js 18+
- MySQL 8+

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy environment file and fill in your values
cp .env.example .env

# 3. Run database migrations
npx prisma migrate deploy

# 4. (Optional) Seed initial data
npx prisma db seed

# 5. Start server
npm start           # production
npm run dev         # development (nodemon)
```

## Environment Variables (.env)

| Variable | Description | Default |
|---|---|---|
| `PORT` | Server port | `9001` |
| `DATABASE_URL` | MySQL connection string | — |
| `JWT_SECRET` | Long random string for access tokens | — |
| `JWT_REFRESH_SECRET` | Long random string for refresh tokens | — |
| `JWT_EXPIRES_IN` | Access token expiry | `15m` |
| `JWT_REFRESH_EXPIRES` | Refresh token expiry | `7d` |
| `FRONTEND_URL` | Allowed frontend origin(s), comma-separated | `http://localhost:5173` |
| `NODE_ENV` | `production` or `development` | `development` |

## API Endpoints

| Method | Path | Access |
|---|---|---|
| POST | `/api/auth/login` | Public |
| POST | `/api/auth/register` | Public |
| GET | `/api/analytics/platform/revenue` | Super Admin |
| GET | `/api/analytics/dashboard/:branchId` | Manager+ |
| GET | `/api/analytics/revenue/:branchId` | Manager+ |
| PATCH | `/api/restaurants/:id/staff/:userId/role` | Restaurant Admin+ |
| ... | All other existing routes | Per role |

## Roles & Access

| Role | Access |
|---|---|
| `SUPER_ADMIN` | Full platform — all restaurants, users, platform revenue |
| `RESTAURANT_ADMIN` | Own restaurant — branches, staff, menu |
| `MANAGER` | Own branch — orders, tables, inventory, billing, analytics |
| `WAITER` | Own branch — create orders, manage tables |
| `CHEF` | Own branch — kitchen queue only |
| `CASHIER` | Own branch — billing and payments |

## Port
Server runs on **port 9001** by default.
