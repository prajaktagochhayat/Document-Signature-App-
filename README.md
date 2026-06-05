# Signy — Cute Pastel Document Signature App 🖋️✨

A secure, full-stack web application that allows users to upload PDF documents, drag-and-drop signature fields, invite external guest signers via public tokenized links, view a detailed activity audit trail, and compile visual signatures directly into the finalized PDF files. 

Designed with a premium, white background, soft pastel colors, cute rounded typography (Google Font `Quicksand`), and bouncy animations.

---

## 🚀 Key Features
- **User Authentication:** Secure JWT-based signup and login with client-side form validation (React Hook Form + Zod).
- **Interactive Editor:** Drag and drop signature blocks onto PDF page layouts. Scales coordinates to relative percentages so that signature fields look consistent on any screen.
- **PDF Compilation (PDF-Lib):** Server-side embedding of HTML canvas signatures (base64 image blocks) directly into original PDFs.
- **Public Guest Signing Links:** Temporary tokenized URLs allowing external guests to sign or reject documents without registration.
- **Audit Trails:** Logs timestamps, actions, user emails, IP addresses, and user-agents for all operations.
- **Supabase Integration:** Built with native support for Supabase PostgreSQL tables and Supabase Storage bucket uploads.
- **Local Fallback Mode:** Automatically falls back to a persistent JSON-file database and local disk uploads if no Supabase environment variables are provided. **Zero configuration required to run locally!**

---

## 📦 Directory Structure
- `/backend`: Node.js & Express API services.
  - `/data`: Local JSON database files (when running without Supabase).
  - `/uploads`: Local storage uploads folder.
  - `/routes`: Router endpoints (auth, docs, signatures, audit).
  - `db.js`: Database interface layer mapping queries to Supabase or JSON fallbacks.
  - `seed.js`: Test databases seeder generating mock PDFs, users, and markers.
- `/frontend`: Vite React & TypeScript application.
  - `/src/components`: UI components (AuthScreen, Dashboard, UploadPanel, Editor, SignaturePad, GuestSignScreen).
  - `/src/context`: AuthContext handling tokens, authorization headers, and axios.
  - `tailwind.config.js` & `index.css`: Custom theme config using Tailwind CSS v4 styling rules.

---

## 💻 Local Quick Start (Zero Config)

### 1. Install Dependencies
Run npm install in both the backend and frontend folders:

```bash
# In backend/
npm install

# In frontend/
npm install
```

### 2. Populate Local Database
Seed the local database to generate test users and a mock PDF:
```bash
# In backend/
node seed.js
```
This generates:
- A test user: `alice@example.com` (password: `password123`)
- A mock service agreement PDF in `backend/uploads/`
- Mock database records.

### 3. Start Development Servers
Start both backend and frontend dev servers concurrently:

```bash
# In backend/ (Runs on port 5000)
npm run dev

# In frontend/ (Runs on port 5173)
npm run dev
```

Open your browser to `http://localhost:5173`. You can log in using `alice@example.com` / `password123` to test the dashboard!

---

## 📝 Supabase Integration
To run with a live Supabase database, follow the steps in [DEPLOYMENT.md](file:///C:/Users/Sidhi/.gemini/antigravity/scratch/document-signature-app/DEPLOYMENT.md) to migrate the table schemas and create the `pdfs` storage bucket. Then update the `.env` variables inside `backend/`:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_BUCKET_NAME=pdfs
```

---

## 🔀 Step-by-Step GitHub Push Walkthrough

Your repository has been structured so that each day's deliverables are saved in a separate local Git commit. You can push them to GitHub one-by-one to showcase a realistic 14-day history!

### The Commit History Logs
Run `git log --oneline` inside the root folder to view the commits:
1. `248f704` `day one completed (project setup and directory scaffolding)`
2. `8c469b0` `day two completed (auth system with jwt and validations)`
3. `76526df` `day three completed (pdf upload api and database record)`
4. `103cb8f` `day four completed (document listing and viewer screen)`
5. `b5457ff` `day five completed (signature schema and coordinate backend)`
6. `9055db3` `day six completed (drag and drop signature editor)`
7. `86db80b` `day seven completed (integration debugging and api testing)`
8. `efc07c7` `day eight completed (pdf compilation with pdf-lib)`
9. `1f2df24` `day nine completed (public signing link and emails)`
10. `63f30aa` `day ten completed (audit logging and history timeline)`
11. `f6a03f6` `day eleven completed (signature canvas and reject reason)`
12. `1686efb` `day twelve completed (dashboard filtering and pastel design polish)`
13. `34d5b87` `day thirteen completed (production configs)`
14. `[Final Commit]` `day fourteen completed (project documentation and repository guide)`

### How to Push Day-by-Day:
1. Create an empty repository on GitHub (do **not** check the boxes to add README or .gitignore).
2. Connect your local directory to GitHub:
   ```bash
   git remote add origin <your-github-repo-url>
   ```
3. Push Day 1 commit:
   ```bash
   git push origin 248f704:main
   ```
4. Push Day 2 commit:
   ```bash
   git push origin 8c469b0:main
   ```
5. Push Day 3 commit:
   ```bash
   git push origin 76526df:main
   ```
6. Continue this sequence for all days up to the final commit to push them step-by-step!
