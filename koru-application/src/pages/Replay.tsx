import { useState, useRef, useCallback, useEffect } from 'react';
import { parseTelemetryCSV } from '../utils/telemetryParser';
import { CoachingService } from '../services/coachingService';
import { useGeminiCloud } from '../hooks/useGeminiCloud';
import { useTTS } from '../hooks/useTTS';
import { usePredictiveCoaching } from '../hooks/usePredictiveCoaching';
import TelemetryCharts from '../components/TelemetryCharts';
import PlaybackControls from '../components/PlaybackControls';
import GaugeCluster from '../components/GaugeCluster';
import TrackMap from '../components/TrackMap';
import CoachPanel, { type CoachMessage } from '../components/CoachPanel';
import { THUNDERHILL_EAST } from '../data/trackData';
import type { TelemetryFrame, TTSProvider } from '../types';
import { Upload } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ReplayProps {
  apiKey: string | null;
}

export default function Replay({ apiKey }: ReplayProps) {
  const [frames, setFrames] = useState<TelemetryFrame[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [activeCoach, setActiveCoach] = useState('superaj');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [analysisResult, setAnalysisResult] = useState('');

  const { generateFeedback, status: cloudStatus } = useGeminiCloud();
  const { speak, setProvider, provider, isSpeaking } = useTTS(apiKey, activeCoach);
  const { analyzeLap, checkLookahead } = usePredictiveCoaching();

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const coachRef = useRef(new CoachingService());

  // Wire up coaching service
  useEffect(() => {
    if (apiKey) coachRef.current.setApiKey(apiKey);
  }, [apiKey]);

  useEffect(() => {
    coachRef.current.setCoach(activeCoach);
  }, [activeCoach]);

  const audioEnabledRef = useRef(audioEnabled);
  useEffect(() => { audioEnabledRef.current = audioEnabled; }, [audioEnabled]);

  const speakRef = useRef(speak);
  useEffect(() => { speakRef.current = speak; }, [speak]);

  useEffect(() => {
    const unsub = coachRef.current.onCoaching(msg => {
      const coachMsg: CoachMessage = {
        id: `coach-${Date.now()}-${Math.random()}`,
        path: msg.path,
        text: msg.text,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, coachMsg]);

      // Speak coaching messages
      if (audioEnabledRef.current && msg.text) {
        speakRef.current(msg.text);
      }
    });
    return unsub;
  }, []);

  // File upload
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const parsed = parseTelemetryCSV(text);
      setFrames(parsed);
      setCurrentIdx(0);
      setIsPlaying(false);
      setMessages([]);
      setAnalysisResult('');
    };
    reader.readAsText(file);
  }, []);

  // Playback loop
  useEffect(() => {
    if (isPlaying && frames.length > 0) {
      const intervalMs = Math.max(10, 100 / speed);
      timerRef.current = setInterval(() => {
        setCurrentIdx(prev => {
          if (prev >= frames.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, intervalMs);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isPlaying, frames.length, speed]);

  // Run coaching engine + predictive coaching on frame change
  useEffect(() => {
    if (frames.length === 0) return;
    const frame = frames[currentIdx];
    if (!frame) return;

    // Process through hot/cold/feedforward coaching engine
    coachRef.current.processFrame(frame);

    // Predictive coaching lookahead
    const zone = checkLookahead(frame);
    if (zone) {
      const msg: CoachMessage = {
        id: `pred-${Date.now()}`,
        path: 'feedforward',
        text: `Ahead: ${zone.cornerName} — ${zone.advice} (lost ${Math.abs(zone.speedDelta).toFixed(0)} mph last lap)`,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, msg]);
      if (audioEnabled) speak(msg.text);
    }
  }, [currentIdx, frames, checkLookahead, audioEnabled, speak]);

  // AI Analysis
  const handleAnalyze = useCallback(async () => {
    if (frames.length === 0) return;
    const start = Math.max(0, currentIdx - 100);
    const end = Math.min(frames.length - 1, currentIdx + 100);
    const slice = frames.slice(start, end);
    const context = slice.map((f, i) =>
      `[${i}] Speed:${f.speed.toFixed(0)} Thr:${f.throttle.toFixed(0)} Brk:${f.brake.toFixed(0)} GLat:${f.gLat.toFixed(2)} GLong:${f.gLong.toFixed(2)}`
    ).join('\n');
    const result = await generateFeedback('flash', context);
    setAnalysisResult(result);
    if (result) {
      const msg: CoachMessage = {
        id: `cloud-${Date.now()}`,
        path: 'cold',
        text: result,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, msg]);
    }
  }, [frames, currentIdx, generateFeedback]);

  const currentFrame = frames[currentIdx] || null;

  return (
    <div className="page replay">
      <header className="page-header">
        <h1>Replay</h1>
        <div className="replay-controls">
          <label className="upload-btn">
            <Upload size={14} />
            <span>Upload CSV</span>
            <input type="file" accept=".csv,.txt" onChange={handleFileUpload} hidden />
          </label>
          <button
            className="analyze-btn"
            onClick={handleAnalyze}
            disabled={frames.length === 0 || cloudStatus.state === 'loading'}
          >
            {cloudStatus.state === 'loading' ? 'Analyzing...' : 'AI Analyze'}
          </button>
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

      {frames.length === 0 ? (
        <div className="empty-state">
          <Upload size={40} />
          <h2>Upload Telemetry Data</h2>
          <p>Drop a CSV file from your OBD datalogger to begin replay analysis</p>
        </div>
      ) : (
        <>
          <PlaybackControls
            isPlaying={isPlaying}
            onPlayPause={() => setIsPlaying(!isPlaying)}
            currentFrame={currentIdx}
            totalFrames={frames.length}
            onSeek={setCurrentIdx}
            speed={speed}
            onSpeedChange={setSpeed}
          />

          <div className="replay-grid">
            <div className="replay-left">
              <GaugeCluster frame={currentFrame} />
              <TrackMap track={THUNDERHILL_EAST} currentFrame={currentFrame ?? undefined} />
            </div>
            <div className="replay-center">
              <TelemetryCharts frames={frames.slice(Math.max(0, currentIdx - 100), currentIdx + 1)} />
              {analysisResult && (
                <div className="analysis-card">
                  <h3>AI Analysis</h3>
                  <ReactMarkdown>{analysisResult}</ReactMarkdown>
                </div>
              )}
            </div>
            <div className="replay-right">
              <CoachPanel
                messages={messages}
                activeCoach={activeCoach}
                onCoachChange={setActiveCoach}
                audioEnabled={audioEnabled}
                onAudioToggle={() => setAudioEnabled(!audioEnabled)}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
