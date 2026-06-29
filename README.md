# 🚀 INverge
### Trust-Based Startup–Investor Discovery Platform

**INverge** redefines how founders and investors connect. Instead of cold outreach and "noise," INverge utilizes a proprietary **Trust Score** system, structured connection requests, and verified endorsements to ensure high-quality, meaningful professional relationships.

---

## ✨ Key Features

- **Trust-Based Discovery:** Algorithms prioritize users based on profile completeness and platform engagement.
- **Role-Based Workflows:** Distinct interfaces and permissions for **Founders** and **Investors**.
- **Structured Connections:** No random spam. Messaging is only unlocked after a connection request is accepted.
- **Endorsement System:** Users can endorse each other post-connection to boost their Trust Scores.
- **Pitch Deck Management:** Securely upload and share startup decks via Cloudinary.
- **Real-time Interaction:** Instant messaging and notifications powered by Socket.IO.

---

## 🛠 Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Zustand, Axios |
| **Backend** | Node.js, Express, TypeScript, Socket.IO |
| **Database** | PostgreSQL, Prisma ORM |
| **Validation** | Zod |
| **Storage** | Cloudinary (PDF Pitch Decks) |
| **Security** | JWT (Access/Refresh), bcrypt, Helmet, CORS, Rate Limiting |

---

## 📈 Trust Score Formula

The platform calculates credibility using four key pillars:

$$Score = (0.3 \times PC) + (0.2 \times RR) + (0.3 \times E) + (0.2 \times AC)$$

- **PC (Profile Completeness):** How much of the user's bio/data is filled.
- **RR (Response Rate):** Speed and frequency of responding to connection requests.
- **E (Endorsements):** Quality and quantity of endorsements from other users.
- **AC (Activity Consistency):** Frequency of platform logins and updates.

---

## 📂 Project Structure

```bash
inVerge/
├── backend/                # Express API (MVC Architecture)
│   └── src/
│       ├── services/       # Business logic (TrustScore, Auth, Messaging)
│       ├── sockets/        # Real-time event handlers
│       ├── middleware/     # RBAC and JWT validation
│       └── validations/    # Zod schemas
├── frontend/               # Next.js App Router
│   ├── app/                # Pages and layouts
│   ├── components/         # Shadcn/ui & custom components
│   ├── services/           # API client layer
│   └── store/              # Zustand state management
```

---

## ⚙️ Local Setup

### Prerequisites
- Node.js 18+ 
- PostgreSQL (Local or hosted via [Neon.tech](https://neon.tech))
- Cloudinary Account (for pitch deck storage)

### 1. Database Setup
1. Create a PostgreSQL database named `inverge`.
2. Copy `backend/.env.example` to `backend/.env` and update your `DATABASE_URL`.

### 2. Backend Installation
```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run dev
```
*API will be available at `http://localhost:5000`*

### 3. Frontend Installation
```bash
cd frontend
npm install
npm run dev
```
*Application will be available at `http://localhost:3000`*

---

## 🔑 Environment Variables

### Backend (`/backend/.env`)
```env
PORT=5000
DATABASE_URL="postgresql://user:pass@localhost:5432/inverge"
JWT_ACCESS_SECRET="your_long_random_string_here"
JWT_REFRESH_SECRET="another_long_random_string_here"
CLOUDINARY_CLOUD_NAME="your_name"
CLOUDINARY_API_KEY="your_key"
CLOUDINARY_API_SECRET="your_secret"
CLIENT_URL="http://localhost:3000"
```

### Frontend (`/frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL="http://localhost:5000/api"
NEXT_PUBLIC_SOCKET_URL="http://localhost:5000"
```

---

## 📡 API Overview

| Method | Endpoint | Description | Auth |
|:-------|:---------|:------------|:-----|
| `POST` | `/api/auth/signup` | Register a new user (Founder/Investor) | No |
| `POST` | `/api/auth/login` | Login & receive JWT tokens | No |
| `GET` | `/api/startups/discover` | Filter & search startups | Yes |
| `POST` | `/api/requests` | Send a connection request | Yes |
| `PATCH` | `/api/requests/:id` | Accept/Reject a connection | Yes |
| `GET` | `/api/trust-score` | Get detailed score breakdown | Yes |
| `POST` | `/api/upload/pitch-deck` | Upload PDF to Cloudinary | Yes (Founder) |

---

## 🛡 Security Measures

- **Role-Based Access Control (RBAC):** Middleware ensures Investors cannot edit startup profiles and Founders cannot "invest" in themselves.
- **JWT Rotation:** Short-lived access tokens with secure refresh token rotation stored in HttpOnly cookies.
- **Input Sanitization:** Every request is validated against **Zod** schemas to prevent injection attacks.
- **Rate Limiting:** Protects sensitive auth routes from brute-force attacks.

---

## 📜 License

This project is licensed under the **MIT License**. Feel free to use it for portfolio purposes or as a foundation for your own startup platform.
