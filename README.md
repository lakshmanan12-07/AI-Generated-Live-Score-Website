
# Cric Live Fullstack

Monorepo containing:

- `frontend` – Next.js + TypeScript + Tailwind CSS client
- `backend` – Node.js + Express + TypeScript + MongoDB + Socket.IO API server

## Quick Start

1. Unzip the project.
2. In the root folder, copy `.env.example` files and create real `.env` files:

   - `backend/.env` from `backend/.env.example`
   - `frontend/.env.local` from `frontend/.env.example`

3. From the root directory:

```bash
npm install
npm run dev
```

- Backend runs on `http://localhost:4000`
- Frontend runs on `http://localhost:3000`

Make sure MongoDB is running locally or update the `MONGODB_URI` in `backend/.env`.
