# Deployment Configuration & Guide

This document outlines the steps to deploy the **Signy Document Signature App** to production using **Supabase** (Database + Storage), **Render** (Backend), and **Vercel** (Frontend).

---

## 1. Supabase Database & Storage Setup

Since this project connects to Supabase, you must initialize the PostgreSQL database schema and create a Storage bucket.

### A. Database Tables SQL Migration
Go to the **SQL Editor** in your Supabase Dashboard and run the following queries to create the tables:

```sql
-- 1. Create Users Table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Documents Table
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'Pending', -- Pending, Signed, Rejected
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Signatures Table
CREATE TABLE signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  x DOUBLE PRECISION NOT NULL,
  y DOUBLE PRECISION NOT NULL,
  page INTEGER DEFAULT 1,
  status TEXT DEFAULT 'Pending', -- Pending, Signed, Rejected
  signer_email TEXT NOT NULL,
  reason TEXT DEFAULT '',
  signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create Audit Logs Table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  user_email TEXT NOT NULL,
  ip_address TEXT DEFAULT '127.0.0.1',
  user_agent TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### B. Storage Bucket Setup
1. Go to **Storage** in your Supabase Dashboard.
2. Click **New Bucket**.
3. Set the Bucket Name to **`pdfs`** (or matches `SUPABASE_BUCKET_NAME` in your `.env`).
4. Make the bucket **Public** (so the frontend preview can load document URLs directly).

---

## 2. Backend Deployment (Render / Railway)

### Environment Variables
Configure the following environment variables in your Render Web Service settings:

| Key | Value | Description |
|---|---|---|
| `PORT` | `5000` | Port for Express app |
| `JWT_SECRET` | *[Random Secret]* | Secret key for JWT signing |
| `JWT_REFRESH_SECRET` | *[Random Secret]* | Refresh token secret key |
| `SUPABASE_URL` | *[Your Supabase URL]* | Supabase API connection URL |
| `SUPABASE_SERVICE_ROLE_KEY` | *[Your Supabase Service Key]* | Key used by Express server to bypass RLS |
| `SUPABASE_BUCKET_NAME` | `pdfs` | Name of the Supabase storage bucket |
| `FRONTEND_URL` | *[Vercel URL]* | URL of your deployed frontend (Vite) |

### Build & Start Commands
- **Build Command:** `npm install`
- **Start Command:** `node index.js`

---

## 3. Frontend Deployment (Vercel / Netlify)

Vite projects deploy seamlessly to Vercel.

### Environment Variables
Set the following environment variable in the Vercel project configuration:

| Key | Value | Description |
|---|---|---|
| `VITE_API_URL` | *[Your Render URL]*/api | URL pointing to your deployed Express backend |

### Build & Output Settings
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Framework Preset:** `Vite`
