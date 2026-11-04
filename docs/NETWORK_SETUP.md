# BankGuard Network Setup & Raspberry Pi Connectivity

## Architecture Arrangement
The BankGuard system is configured for continuous local communication without requiring an external Internet connection:
1. **Laptop-hosted Mode**:
   - The laptop runs the MongoDB database, Node/Express backend, and the React client application.
   - The Raspberry Pi connects continuously to the laptop backend via WebSocket (`python-socketio`).
   - Telemetry from sensors is streamed live to backend memory and pushed in real-time to the React frontend.

---

## Connection Options

### Option A: Common Local Wi-Fi Router
1. Connect both the Laptop and the Raspberry Pi to the same local Wi-Fi router.
2. On your Laptop, open terminal and check your local IPv4 address:
   - Windows: `ipconfig` (Look for `IPv4 Address`, e.g., `192.168.1.100`)
3. On the Raspberry Pi, open `bankguard/raspberry_pi/config.yaml` and set:
   ```yaml
   backend:
     host: "192.168.1.100"   # Replace with your laptop's IP
     port: 5000
   ```
4. Verify laptop firewall allows incoming TCP traffic on port `5000`.

### Option B: Direct Ethernet Cable (Peer-to-Peer)
1. Connect an Ethernet cable directly between the Laptop Ethernet port and the Raspberry Pi Ethernet port.
2. Assign static IP addresses to both devices:
   - **Laptop Ethernet Adapter**:
     - IP: `192.168.10.1`
     - Subnet Mask: `255.255.255.0`
   - **Raspberry Pi Ethernet**:
     - IP: `192.168.10.2`
     - Subnet Mask: `255.255.255.0`
3. In `config.yaml` on the Raspberry Pi:
   ```yaml
   backend:
     host: "192.168.10.1"
     port: 5000
   ```

