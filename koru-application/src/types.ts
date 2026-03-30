// ── Telemetry ──────────────────────────────────────────────

export interface TelemetryFrame {
  time: number;          // seconds from session start
  latitude: number;
  longitude: number;
  altitude?: number;
  speed: number;         // mph
  rpm?: number;
  throttle: number;      // 0-100
  brake: number;         // 0-100
  steering?: number;     // degrees
  gLat: number;          // lateral G
  gLong: number;         // longitudinal G
  gear?: number;
  distance?: number;     // cumulative meters
}

export interface GpsSSEPoint {
  time: string | number;
  lat: number;
  lon: number;
  alt?: number;
  speed: number;         // m/s or mph
  climb?: number;
  track?: number;        // heading
  mode?: number;
  brake?: number;
  throttle?: number;
  rpm?: number;
  gear?: number;
  steering?: number;
  gLat?: number;
  gLong?: number;
}

// ── Track ──────────────────────────────────────────────────

export interface Corner {
  id: number;
  name: string;
  entryDist: number;
  apexDist: number;
  exitDist: number;
  lat: number;
  lon: number;
  advice: string;
}

export interface Sector {
  id: number;
  name: string;
  startDist: number;
  endDist: number;
}

export interface Track {
  name: string;
  length: number;        // meters
  sectors: Sector[];
  corners: Corner[];
  mapPoints: { x: number; y: number }[];
  recordLap: number;     // seconds
  center?: { lat: number; lng: number };
  zoom?: number;
}

// ── Lap & Session ──────────────────────────────────────────

export interface Lap {
  id: string;
  lapNumber: number;
  time: number;          // total seconds
  valid: boolean;
  frames: TelemetryFrame[];
  sectors: number[];     // sector times
  isComplete: boolean;
}

export interface Session {
  id: string;
  trackName: string;
  date: string;
  laps: Lap[];
  bestLapId: string;
  weather: 'Sunny' | 'Cloudy' | 'Rain';
  trackTemp: number;
}

// ── Coaching ───────────────────────────────────────────────

export interface CoachPersona {
  id: string;
  name: string;
  style: string;
  systemPrompt: string;
  icon: string;
}

export type CoachAction =
  | 'THRESHOLD' | 'TRAIL_BRAKE' | 'BRAKE' | 'WAIT'
  | 'TURN_IN' | 'COMMIT' | 'ROTATE' | 'APEX'
  | 'THROTTLE' | 'PUSH' | 'FULL_THROTTLE'
  | 'STABILIZE' | 'MAINTAIN' | 'COAST'
  | 'DONT_BE_A_WUSS';

export type SSEConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export type TTSProvider = 'browser' | 'gemini';

export type CloudModel = 'flash' | 'pro';
