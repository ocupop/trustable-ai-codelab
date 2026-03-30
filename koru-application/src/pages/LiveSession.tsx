import { useState, useEffect, useRef, useCallback } from 'react';
import { TelemetryStreamService } from '../services/telemetryStreamService';
import { CoachingService } from '../services/coachingService';
import { AudioService } from '../services/audioService';
import { useTTS } from '../hooks/useTTS';
import { THUNDERHILL_EAST } from '../data/trackData';
import TelemetryCharts from '../components/TelemetryCharts';
import TrackMap from '../components/TrackMap';
import CoachPanel, { type CoachMessage } from '../components/CoachPanel';
import GaugeCluster from '../components/GaugeCluster';
import type { TelemetryFrame, SSEConnectionStatus, TTSProvider } from '../types';
import { Radio, Unplug } from 'lucide-react';

interface LiveSessionProps {
  apiKey: string | null;
}

export default function LiveSession({ apiKey }: LiveSessionProps) {
  const [frames, setFrames] = useState<TelemetryFrame[]>([]);
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [status, setStatus] = useState<SSEConnectionStatus>('disconnected');
  const [activeCoach, setActiveCoach] = useState('superaj');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [sseUrl, setSseUrl] = useState('');

  const streamRef = useRef(TelemetryStreamService.getInstance());
  const coachRef = useRef(new CoachingService());
  const audioRef = useRef(new AudioService());
  const { speak, setProvider, provider } = useTTS(apiKey, activeCoach);

  useEffect(() => {
    const audio = audioRef.current;
    audio.init();
    return () => audio.destroy();
  }, []);

  useEffect(() => {
    if (apiKey) coachRef.current.setApiKey(apiKey);
  }, [apiKey]);

  useEffect(() => {
    const stream = streamRef.current;

    const unsubStatus = stream.onStatus(setStatus);
    const unsubFrame = stream.onFrame((frame) => {
      setFrames(prev => [...prev.slice(-500), frame]);
      coachRef.current.processFrame(frame);
    });

    const unsubCoach = coachRef.current.onCoaching(msg => {
      const coachMsg: CoachMessage = {
        id: `${Date.now()}-${Math.random()}`,
        path: msg.path,
        text: msg.text,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, coachMsg]);

      if (audioEnabled && msg.text) {
        speak(msg.text);
      }
    });

    return () => { unsubStatus(); unsubFrame(); unsubCoach(); };
  }, [audioEnabled, speak]);

  const handleConnect = useCallback(() => {
    if (status === 'connected') {
      streamRef.current.disconnect();
    } else {
      const url = sseUrl.trim() || '/mock-telemetry.txt';
      streamRef.current.connect(url);
    }
  }, [status, sseUrl]);

  const handleCoachChange = useCallback((id: string) => {
    setActiveCoach(id);
    coachRef.current.setCoach(id);
  }, []);

  const currentFrame = frames[frames.length - 1] || null;

  return (
    <div className="page live-session">
      <header className="page-header">
        <h1><Radio size={20} /> Live Session</h1>
        <div className="live-controls">
          <input
            type="text"
            placeholder="SSE URL or .txt file path"
            value={sseUrl}
            onChange={e => setSseUrl(e.target.value)}
            className="sse-input"
          />
          <button
            className={`connect-btn ${status === 'connected' ? 'connected' : ''}`}
            onClick={handleConnect}
          >
            {status === 'connected' ? <><Unplug size={14} /> Disconnect</> : <><Radio size={14} /> Connect</>}
          </button>
          <span className={`status-badge status-${status}`}>{status}</span>
          <select
            className="tts-select"
            value={provider}
            onChange={e => setProvider(e.target.value as TTSProvider)}
          >
            <option value="browser">Browser TTS</option>
            <option value="gemini">Gemini TTS</option>
          </select>
        </div>
      </header>

      <div className="live-grid">
        {/* Left: Gauges + Track */}
        <div className="live-left">
          <GaugeCluster frame={currentFrame} />
          <TrackMap track={THUNDERHILL_EAST} currentFrame={currentFrame ?? undefined} />
        </div>

        {/* Center: Charts */}
        <div className="live-center">
          <TelemetryCharts frames={frames} />
        </div>

        {/* Right: Coach */}
        <div className="live-right">
          <CoachPanel
            messages={messages}
            activeCoach={activeCoach}
            onCoachChange={handleCoachChange}
            audioEnabled={audioEnabled}
            onAudioToggle={() => setAudioEnabled(!audioEnabled)}
          />
        </div>
      </div>
    </div>
  );
}
