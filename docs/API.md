# BankGuard API & Socket.IO Reference

## Authentication Endpoints (`/api/auth`)
- `POST /api/auth/login`: `{ employeeId, password }` -> returns `{ token, user }`
- `POST /api/auth/logout`: Invalidates session, logs audit record
- `GET /api/auth/me`: Retrieves current authenticated staff profile

## Personnel Management (`/api/users`) - Manager Only
- `GET /api/users`: List all bank personnel
- `POST /api/users`: `{ name, employeeId, email, role, password, rfidUid }`
- `PUT /api/users/:id`: Edit user details
- `PUT /api/users/:id/password`: Reset employee password
- `DELETE /api/users/:id`: Soft-deactivate employee account

## Actuator & Physical Controls (`/api/actuators`, `/api/vault`)
- `POST /api/actuators/entrance/unlock`: Commands Pi entrance servo
- `POST /api/actuators/entrance/lock`: Commands Pi entrance servo to secure
- `POST /api/vault/unlock`: Manager-only vault clearance
- `POST /api/vault/lock`: Manager-only vault lock
- `GET /api/vault/status`: Query latest vault telemetry

## Live Sensor Diagnostics (`/api/sensors`)
- `GET /api/sensors/live`: Return full in-memory telemetry state snapshot
- `GET /api/sensors/health`: Formatted diagnostic state for each physical hardware unit

## Incident & System Logs (`/api/events`, `/api/alerts`)
- `GET /api/events`: Paginated, filterable chronological audit records
- `GET /api/events/export`: Export filtered logs to CSV
- `GET /api/alerts`: List alerts (Active, Acknowledged, Resolved)
- `PUT /api/alerts/:id/acknowledge`: Manager acknowledges alert
- `PUT /api/alerts/:id/resolve`: Manager resolves alert

---

## Socket.IO Events

### Pi -> Backend
- `pi:connect` -> `{ secret, deviceId }`
- `pi:heartbeat` -> `{ timestamp }`
- `pi:dht11` -> `{ temperature, humidity, timestamp }`
- `pi:mq2` -> `{ rawAdc, timestamp }`
- `pi:reed_entrance` -> `{ state: 'OPEN'|'CLOSED', timestamp }`
- `pi:reed_vault` -> `{ state: 'OPEN'|'CLOSED', timestamp }`
- `pi:ultrasonic` -> `{ distanceCm, timestamp }`
- `pi:adxl335` -> `{ x, y, z, timestamp }`
- `pi:pir` -> `{ state: 'MOTION_DETECTED'|'NO_MOTION', timestamp }`
- `pi:rfid_scan` -> `{ uid, timestamp }`

### Backend -> Pi
- `cmd:entrance_servo` -> `{ command: 'LOCK'|'UNLOCK', commandId }`
- `cmd:vault_servo` -> `{ command: 'LOCK'|'UNLOCK', commandId }`

### Backend -> Frontend Clients
- `sensor:update` -> Full in-memory sensorState object
- `pi:status` -> `{ connected: boolean, lastSeen }`
- `alert:new` -> Broadcasts new alert
- `alert:updated` -> Updated alert (Acknowledge/Resolved)
- `event:new` -> Newly logged event record
- `system:monitoring_mode` -> `{ mode: 'ON'|'MAINTENANCE' }`

