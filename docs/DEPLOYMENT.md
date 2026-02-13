# AIHospital Deployment Guide

## Architecture Overview

This is a monorepo with two separate deployments:
- **Frontend**: Static React app deployed to Vercel
- **Backend**: Express.js API deployed to Railway (or similar)

## Frontend Deployment (Vercel)

The frontend is already configured for Vercel deployment.

### Environment Variables (Vercel Dashboard)

Set these in your Vercel project settings:

```
VITE_API_URL=https://your-backend-url.railway.app/api
```

## Backend Deployment (Railway)

### Step 1: Create Railway Account
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub

### Step 2: Create New Project
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose the `aihospital` repository
4. Select the `backend` folder as the root directory

### Step 3: Add PostgreSQL Database
1. In your Railway project, click "New"
2. Select "Database" → "PostgreSQL"
3. Railway will automatically set `DATABASE_URL`

### Step 4: Set Environment Variables
In Railway dashboard, add these variables:

```
DATABASE_URL=<auto-set by Railway>
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-key-min-32-chars
PORT=3000
NODE_ENV=production
ALLOWED_ORIGINS=https://aihospital-frontend.vercel.app
```

### Step 5: Deploy
Railway will automatically build and deploy when you push to main.

Build command: `npm install && npx prisma generate && npm run build`
Start command: `npx prisma migrate deploy && npm run start`

### Step 6: Update Frontend
After backend is deployed, get the Railway URL and update Vercel:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add: `VITE_API_URL=https://your-app.railway.app/api`
3. Redeploy the frontend

## Alternative: Render Deployment

### Backend on Render

1. Go to [render.com](https://render.com)
2. Create a new "Web Service"
3. Connect your GitHub repo
4. Set root directory to `backend`
5. Build command: `npm install && npx prisma generate && npm run build`
6. Start command: `npx prisma migrate deploy && npm run start`
7. Add environment variables (same as Railway)

## Local Development

### Backend
```bash
cd backend
cp .env.example .env  # Configure your local database
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Database Migrations

When you make schema changes:

```bash
cd backend
npx prisma migrate dev --name your_migration_name
git add prisma/migrations
git commit -m "Add migration: your_migration_name"
git push
```

Railway/Render will automatically run `prisma migrate deploy` on startup.
