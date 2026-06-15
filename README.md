# Smart Hospital Bed & Ambulance Management Platform

A full-stack, real-time web platform connecting **patients**, **hospitals**, and **ambulance drivers** — find available beds, book OP appointments, and track ambulances live.

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | React (Vite), React Router v6, Tailwind CSS, Axios, Socket.IO Client |
| Backend | Node.js, Express.js, Socket.IO |
| Database | MongoDB + Mongoose |
| Auth | JWT (role-based) |
| Maps | Google Maps JavaScript API |
| QR | qrcode (server), html5-qrcode (client) |

## Features

### Patient Portal
- GPS-based nearby hospital search with live bed counts
- Hospital details with resource breakdown
- OP appointment booking with daily token numbers
- Bed request submission with real-time status updates
- Ambulance request with live driver tracking

### Hospital Portal
- Real-time dashboard (beds, ICU, ventilators, OP capacity)
- Bed management with auto-generated QR codes
- QR scanner for nurse-side bed status updates
- Live bed request queue (approve/reject with 15-min reservation)
- Ambulance fleet monitoring with live map

### Driver Portal
- Status toggle (Available / Busy / Offline)
- GPS location sharing every 10 seconds via Socket.IO
- Ride request popup with Accept/Reject
- Google Maps navigation to patient and hospital

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB running locally (or MongoDB Atlas URI)

### 1. Backend Setup

```bash
cd server
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret
npm install
npm run seed    # Creates demo data
npm run dev     # Starts on http://localhost:5000
```

### 2. Frontend Setup

```bash
cd client
cp .env.example .env
# Add VITE_GOOGLE_MAPS_KEY for map features
npm install
npm run dev     # Starts on http://localhost:5173
```

### Demo Credentials (after seeding)

| Role | Email | Password |
|------|-------|----------|
| Patient | patient@test.com | password123 |
| Hospital | hospital@test.com | password123 |
| Driver | driver@test.com | password123 |

## Project Structure

```
CSB-Project/
├── server/
│   ├── index.js              # Express + Socket.IO entry
│   ├── config/               # DB & socket setup
│   ├── models/               # 8 Mongoose schemas
│   ├── routes/               # REST API routes
│   ├── controllers/          # Business logic
│   ├── middleware/           # JWT auth, error handler
│   ├── jobs/                 # Bed reservation expiry (60s)
│   ├── utils/                # QR & token generators
│   └── seed.js               # Demo data seeder
└── client/
    └── src/
        ├── pages/            # Patient, Hospital, Driver portals
        ├── components/       # Shared UI
        ├── context/          # Auth & Socket providers
        ├── hooks/            # Geolocation
        └── services/         # API & Socket clients
```

## API Overview

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/patient/register | Public | Patient registration |
| POST | /api/auth/patient/login | Public | Patient login |
| GET | /api/hospitals/nearby?lat=&lng= | Public | Nearby hospitals |
| POST | /api/op-bookings | Patient | Book OP slot |
| POST | /api/bed-requests | Patient | Submit bed request |
| POST | /api/ambulance-requests | Patient | Request ambulance |
| GET | /api/hospital/dashboard | Hospital | Dashboard stats |
| POST | /api/hospital/beds | Hospital | Create bed + QR |
| PATCH | /api/hospital/bed-requests/:id/approve | Hospital | Approve & reserve bed |
| PATCH | /api/driver/status | Driver | Update driver status |

## Socket.IO Events

**Rooms:** `hospital:{id}`, `patient:{id}`, `driver:{id}`

| Event | Direction | Description |
|-------|-----------|-------------|
| bedRequest:new | Server → Hospital | New patient bed request |
| bedRequest:statusChanged | Server → Patient | Approval/rejection |
| bed:statusChanged | Server → Hospital | Bed status update |
| ambulance:request | Server → Driver | New ride request |
| ambulance:accepted | Server → Patient | Driver accepted |
| driver:locationUpdate | Client → Server | GPS update every 10s |

## License

College Major Project — MIT License
