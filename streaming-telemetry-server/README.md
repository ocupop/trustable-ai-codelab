# Streaming telemetry

Python **FastAPI** service that simulates or streams **GPS data** over **Server-Sent Events (SSE)**.

## Overview

- **Mock mode**: Run without hardware to emit a simulated GPS stream for development and tests.
- **Live mode**: Read NMEA from a serial GPS device (e.g. VK-162) and stream parsed positions over SSE.

Clients (browsers, other services) subscribe to the SSE endpoint and receive live updates.

If you are interested in running a simulated GPS telemetry stream as part of the "Trustable AI at 100 MPH" codelab, please follow the instructions in that codelab.
If you are interested in reading GPS telemetry from an actual car's GPS receiver, follow the instructions in this README.

## Setup

1. Go to this directory: `cd streaming-telemetry`
2. Create a virtual environment: `python3 -m venv venv`
3. Activate it: `source venv/bin/activate` (on Windows: `venv\Scripts\activate`)
4. Install dependencies: `pip install -r requirements.txt`
5. Run the server (mock): `python ingest.py --mock`

### Connecting to live GPS (VK-162)

This stack is tested with the **VK-162 G-Mouse USB GPS Dongle** (Raspberry Pi, Google Earth, Windows, Linux).

> **Note**: Vehicle installation may be handled separately; the steps below are for local setup and testing.

1. Connect the VK-162 over USB.
2. **Find the serial port**
   - **macOS/Linux**: `ls /dev/tty.*` (e.g. `/dev/tty.usbserial-XXXX` or `/dev/ttyUSB0`)
   - **Windows**: Device Manager → Ports (COM & LPT)
3. **Run with serial arguments**:
   ```bash
   python ingest.py --port /dev/tty.usbserial-XXXX --baud 9600
   ```
   Replace the port with your device path. The VK-162 often uses **9600** baud (standard NMEA). If that fails, try `4800` or `115200`.

## Configuration

### Environment variables

Create `.env` in this directory:

```bash
PORT=8000
HOST=0.0.0.0
```

### Data stream

The service exposes SSE at:

`http://localhost:8000/stream` (defaults)

Point any frontend or client at this URL. If your app uses a build-time API base URL (e.g. Vite’s `VITE_API_URL`), set it to match the host and port (e.g. `http://localhost:8000`).
