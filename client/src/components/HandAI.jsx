import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera as CameraIcon, XCircle, Plus, Trash2 } from 'lucide-react';

const HAND_API = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const CAPTURE_INTERVAL_MS = 2500; // CPU inference takes ~2s; don't pile up
const SEND_SIZE = 224;            // Match model input size exactly

const HandAI = ({ onBack }) => {
  const videoRef    = useRef(null);
  const canvasRef   = useRef(null);
  const intervalRef = useRef(null);
  const streamRef   = useRef(null);
  const isPredicting = useRef(false); // Prevents request pile-up

  const [result,       setResult]       = useState('–');
  const [confidence,   setConfidence]   = useState(null);
  const [sentence,     setSentence]     = useState('');
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isLoading,    setIsLoading]    = useState(false);
  const [error,        setError]        = useState(null);
  const [backend,      setBackend]      = useState(null);

  // ── Start webcam ─────────────────────────────────────────────────────────
  useEffect(() => {
    let active = true;

    navigator.mediaDevices
      .getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' } })
      .then((stream) => {
        if (!active) return;
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        // Wait for metadata so videoWidth/Height are known before capturing
        video.onloadedmetadata = () => {
          video.play().then(() => {
            if (active) setIsCameraReady(true);
          });
        };
      })
      .catch((err) => setError('Camera access denied: ' + err.message));

    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      clearInterval(intervalRef.current);
    };
  }, []);

  // ── Capture one frame & send to backend ─────────────────────────────────
  const captureAndPredict = useCallback(async () => {
    if (isPredicting.current) return; // Skip if previous request is still running
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return; // Video not ready

    const ctx = canvas.getContext('2d');
    canvas.width  = SEND_SIZE;
    canvas.height = SEND_SIZE;
    // Draw without mirroring — model expects natural (unflipped) hand orientation
    ctx.drawImage(video, 0, 0, SEND_SIZE, SEND_SIZE);

    canvas.toBlob(
      async (blob) => {
        if (!blob) return;
        isPredicting.current = true;
        setIsLoading(true);
        try {
          const form = new FormData();
          form.append('file', blob, 'frame.jpg');
          const res = await fetch(`${HAND_API}/api/hand/predict`, {
            method: 'POST',
            body: form,
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();

          if (data.error) {
            setError(data.error);
          } else {
            setError(null);
            setResult(data.prediction ?? '–');
            setConfidence(data.confidence ?? null);
            setBackend(data.backend ?? null);
          }
        } catch (err) {
          setError('Prediction failed: ' + err.message);
        } finally {
          isPredicting.current = false;
          setIsLoading(false);
        }
      },
      'image/jpeg',
      0.8
    );
  }, []);

  // ── Start / stop prediction loop ─────────────────────────────────────────
  useEffect(() => {
    if (!isCameraReady) return;
    intervalRef.current = setInterval(captureAndPredict, CAPTURE_INTERVAL_MS);
    return () => clearInterval(intervalRef.current);
  }, [isCameraReady, captureAndPredict]);

  const handleAdd = () => {
    if (result && result !== '–') setSentence((s) => s + result);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="hand-ai-container" style={{ animation: 'fadeIn 0.5s ease-out' }}>

      {/* Header */}
      <div className="hand-ai-header">
        <button className="back-button" onClick={onBack}>
          <XCircle size={24} />
          <span>Close Hand AI</span>
        </button>
        <div className="count-display">
          <span className="count-label">ASL Letter</span>
          <h2 className="count-number">
            {isLoading ? '…' : result}
          </h2>
          {confidence !== null && !isLoading && (
            <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>
              {confidence.toFixed(1)}% confidence
            </span>
          )}
        </div>
      </div>

      {/* Status bar */}
      {(error || backend) && (
        <div style={{
          textAlign: 'center',
          fontSize: '0.75rem',
          padding: '0.3rem 1rem',
          color: error ? '#f87171' : '#6ee7b7',
          background: error ? 'rgba(239,68,68,0.1)' : 'rgba(110,231,183,0.08)',
        }}>
          {error || `✓ Backend: ${backend}`}
        </div>
      )}

      {/* Camera feed */}
      <div className="camera-wrapper" style={{ position: 'relative' }}>
        {/* Live video — mirrored for natural selfie feel */}
        <video
          ref={videoRef}
          width={640}
          height={480}
          className="hand-canvas"
          autoPlay
          muted
          playsInline
          style={{ transform: 'scaleX(-1)', display: 'block' }}
        />
        {/* Hidden canvas used only for frame capture */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {!isCameraReady && (
          <div className="camera-loading">
            <CameraIcon className="animate-pulse" size={48} />
            <p>Initializing Camera...</p>
          </div>
        )}

        {/* Scanning indicator */}
        {isCameraReady && isLoading && (
          <div style={{
            position: 'absolute', top: 8, right: 8,
            background: 'rgba(99,102,241,0.85)',
            color: '#fff', fontSize: '0.7rem', padding: '2px 8px',
            borderRadius: 999,
          }}>
            Scanning…
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="hand-instructions">
        <p>Hold your ASL sign steady — the camera reads it every 2.5 seconds.</p>
      </div>

      {/* Sentence builder */}
      <div className="asl-sentence-builder">
        <h3 className="builder-title">ASL Sentence Builder</h3>
        <div className="sentence-box">
          {sentence || (
            <span className="placeholder">
              Press "Add" after each letter to build a word…
            </span>
          )}
        </div>
        <div className="sentence-controls">
          <button className="control-btn add" onClick={handleAdd} disabled={result === '–'}>
            <Plus size={16} />
            Add "{result}"
          </button>
          <button className="control-btn space" onClick={() => setSentence((s) => s + ' ')}>
            ␣ Space
          </button>
          <button className="control-btn clear" onClick={() => setSentence('')}>
            <Trash2 size={16} />
            Clear
          </button>
        </div>
      </div>
    </div>
  );
};

export default HandAI;
