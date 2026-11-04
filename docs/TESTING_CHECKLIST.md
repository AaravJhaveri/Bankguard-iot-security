# BankGuard System Verification Checklist

## 1. Authentication & Role-Based Access Control
- [ ] Manager login with `MGR001` / `ChangeMe@123` succeeds and routes to `/overview`.
- [ ] Employee login with `EMP001` / `ChangeMe@123` succeeds.
- [ ] Employee attempting to access `/vault` cannot see or trigger the Vault Unlock button.
- [ ] Direct unauthorized API call `POST /api/vault/unlock` with Employee token returns `403 Forbidden`.

## 2. Real-Time Telemetry & WebSocket Connection
- [ ] When Raspberry Pi runs `main.py`, Navbar indicator turns green (`Pi: ONLINE`).
- [ ] When Raspberry Pi script is terminated, Navbar indicator turns red (`Pi: DISCONNECTED`) within 10-15s and raises a HIGH alert.
- [ ] Sensor readings in `sensorState` update on Overview and Vault pages without manual browser page refresh.

## 3. Physical Security & Passage Verification
- [ ] Entrance reed switch opening updates state badge to `OPEN` and creates an audit entry in `EventLogs`.
- [ ] Presenting RFID card triggers `pi:rfid_scan` event showing UID on screen.
- [ ] Ultrasonic detection without valid prior login triggers `SUSPECTED_UNAUTHORIZED_ENTRY` HIGH severity alert.
- [ ] Ultrasonic detection within 30s after employee authentication registers `AUTHORIZED_PASSAGE`.

## 4. Vault Safeguards & Environmental Anomaly Logic
- [ ] Opening vault reed switch without prior manager unlock triggers `VAULT_UNAUTHORIZED_OPEN` CRITICAL alert.
- [ ] High temperature (>45°C) AND Smoke (>300 ADC) sustained triggers `POSSIBLE_FIRE` Critical alert banner.
- [ ] Motion detected inside closed vault triggers `VAULT_PIR_MOTION` HIGH severity alert.
- [ ] Excessive physical vibration or tilt on ADXL335 triggers `VAULT_TAMPER_SUSPECTED`.

## 5. Persistence & CSV Audit Export
- [ ] Logs survive page reloads and server restarts.
- [ ] Clicking "Export CSV" on Access Control or Event Logs downloads a structured `.csv` file.

