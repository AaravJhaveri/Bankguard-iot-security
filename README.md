# BankGuard — IoT Bank Branch Security & Vault Monitoring System

BankGuard is a full-stack, local-network IoT security monitoring platform designed for bank branch operations and secure vault oversight. It features continuous hardware telemetry streaming from a Raspberry Pi 3 Model B, role-based security clearance, and immutable event auditing.

---

## Tech Stack
- **Frontend**: React.js (JavaScript, Vite), Light Mode SOC theme, Recharts, Socket.IO client
- **Backend**: Node.js + Express.js, Socket.IO real-time server
- **Database**: MongoDB (via Mongoose) — **stores logs, events, alerts, users, and audit records only** (live telemetry is streamed in-memory)
- **Edge Controller**: Raspberry Pi 3 Model B running asynchronous Python (`python-socketio`)

---

## Getting Started

### 1. Backend Setup
```bash
cd bankguard/backend
# Copy environment file
cp .env.example .env
# Install dependencies
npm install
# Seed initial Manager and Employee accounts + thresholds
npm run seed
# Start development server
npm run dev
```
Backend runs on `http://localhost:5000`.

### 2. Frontend Setup
```bash
cd bankguard/frontend
npm install
npm run dev
```
Open your browser at `http://localhost:5173`.

### 3. Raspberry Pi Client
```bash
cd bankguard/raspberry_pi
pip install -r requirements.txt
# Update host IP in config.yaml to your laptop's local network IP
python main.py
```

---

## Default Seed Credentials
- **Manager Account**:
  - Employee ID: `MGR001`
  - Password: `ChangeMe@123`
- **Employee Account**:
  - Employee ID: `EMP001`
  - Password: `ChangeMe@123`

*(Please change default passwords immediately after initial deployment.)*

